import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Generate random player join codes
function generateJoinCodes(): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  for (let i = 0; i < 10; i++) {
    let code = '';
    for (let j = 0; j < 6; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(`P-${code}`);
  }
  return codes;
}

interface Player {
  joinCode: string;
  pseudo: string;
  characterState: any;
  lastActive: number;
}

interface Room {
  roomName: string;
  passwordHash: string;
  gmSessionId: string;
  links: string[];
  players: Record<string, Player>; // joinCode -> Player
  publishedEncounter: any;
  publicNotes: string;
  shopSpells: any[];
  rollLogs: any[];
  lastUpdate: number;
}

// In-memory rooms database
const rooms: Record<string, Room> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large base64 photo payloads (up to 20MB)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // API: Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API: Create GM Room
  app.post('/api/rooms/create', (req, res) => {
    const { roomName, password, shopSpells, publicNotes } = req.body;
    if (!roomName || !password) {
      return res.status(400).json({ error: 'Room name and password are required' });
    }

    const cleanName = roomName.trim().toLowerCase();
    
    // Create new room (overwrites existing on create/load as requested)
    const gmSessionId = 'GM-' + Math.random().toString(36).substring(2, 15);
    const links = generateJoinCodes();

    rooms[cleanName] = {
      roomName: roomName.trim(),
      passwordHash: password,
      gmSessionId,
      links,
      players: {},
      publishedEncounter: null,
      publicNotes: publicNotes || '',
      shopSpells: shopSpells || [],
      rollLogs: [{ id: 'init', pseudo: 'System', text: `Room ${roomName} created!`, timestamp: Date.now() }],
      lastUpdate: Date.now()
    };

    console.log(`Room created: "${cleanName}" with 10 shareable join codes.`);
    res.json({
      roomName: rooms[cleanName].roomName,
      gmSessionId,
      links,
      message: 'Room created successfully'
    });
  });

  // API: Resolve room name by join code
  app.get('/api/rooms/resolve-join', (req, res) => {
    const { joinCode } = req.query;
    if (!joinCode) {
      return res.status(400).json({ error: 'joinCode query parameter is required' });
    }
    const cleanCode = (joinCode as string).trim().toUpperCase();
    for (const roomKey in rooms) {
      const room = rooms[roomKey];
      if (room.links.includes(cleanCode)) {
        return res.json({ roomName: room.roomName });
      }
    }
    return res.status(404).json({ error: 'Room not found for this join code' });
  });

  // API: Join Room as Player
  app.post('/api/rooms/join', (req, res) => {
    const { roomName, password, joinCode, pseudo } = req.body;
    if (!password || !joinCode) {
      return res.status(400).json({ error: 'Password and join code are required' });
    }

    const cleanCode = joinCode.trim().toUpperCase();
    let room: Room | null = null;

    if (roomName && roomName.trim()) {
      const cleanName = roomName.trim().toLowerCase();
      room = rooms[cleanName] || null;
    } else {
      // Find room by join code
      for (const roomKey in rooms) {
        if (rooms[roomKey].links.includes(cleanCode)) {
          room = rooms[roomKey];
          break;
        }
      }
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.passwordHash !== password) {
      return res.status(403).json({ error: 'Incorrect personal password' });
    }

    if (!room.links.includes(cleanCode)) {
      return res.status(400).json({ error: 'Invalid join code link' });
    }

    const resolvedPseudo = (pseudo || '').trim() || 'Awaiting Hero Name...';
    const existingPlayer = room.players[cleanCode];

    // Register or update player
    room.players[cleanCode] = {
      joinCode: cleanCode,
      pseudo: resolvedPseudo,
      characterState: existingPlayer?.characterState || {},
      lastActive: Date.now()
    };

    // Add log
    room.rollLogs.push({
      id: `join-${Date.now()}`,
      pseudo: 'System',
      text: `${resolvedPseudo} joined the room!`,
      timestamp: Date.now()
    });

    room.lastUpdate = Date.now();

    res.json({
      roomName: room.roomName,
      pseudo: resolvedPseudo,
      joinCode: cleanCode,
      message: 'Joined successfully'
    });
  });

  // API: Synchronize Room State (Both Player and GM poll here)
  app.post('/api/rooms/sync', (req, res) => {
    const { roomName, role, joinCode, gmSessionId, playerState, publishedEncounter, publicNotes, shopSpells, newRoll } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const cleanName = roomName.trim().toLowerCase();
    const room = rooms[cleanName];

    if (!room) {
      return res.json({ roomDeleted: true });
    }

    // Authentication Checks
    if (role === 'gm') {
      if (room.gmSessionId !== gmSessionId) {
        return res.status(403).json({ error: 'Unauthorized GM session' });
      }

      // GM updates the master state
      if (publishedEncounter !== undefined) {
        room.publishedEncounter = publishedEncounter;
      }
      if (publicNotes !== undefined) {
        room.publicNotes = publicNotes;
      }
      if (shopSpells !== undefined) {
        room.shopSpells = shopSpells;
      }
    } else if (role === 'player') {
      if (!joinCode) {
        return res.status(400).json({ error: 'Player join code is required' });
      }
      const player = room.players[joinCode];
      if (!player) {
        return res.status(404).json({ error: 'Player not found in this room' });
      }

      // Player updates their active sheet state
      if (playerState) {
        player.characterState = playerState;
        player.lastActive = Date.now();
        if (playerState.name) {
          player.pseudo = playerState.name;
        }
      }
    }

    // Append any new dice rolls
    if (newRoll) {
      room.rollLogs.push({
        id: `roll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pseudo: newRoll.pseudo,
        text: newRoll.text,
        timestamp: Date.now()
      });
      // Keep only last 50 roll logs
      if (room.rollLogs.length > 50) {
        room.rollLogs.shift();
      }
    }

    // Respond with synchronized data
    res.json({
      roomDeleted: false,
      publishedEncounter: room.publishedEncounter,
      publicNotes: room.publicNotes,
      shopSpells: room.shopSpells,
      rollLogs: room.rollLogs,
      players: room.players
    });
  });

  // API: Disconnect / Close Room (GM Only)
  app.post('/api/rooms/disconnect', (req, res) => {
    const { roomName, gmSessionId } = req.body;
    if (!roomName || !gmSessionId) {
      return res.status(400).json({ error: 'Room name and GM session ID are required' });
    }

    const cleanName = roomName.trim().toLowerCase();
    const room = rooms[cleanName];

    if (room && room.gmSessionId === gmSessionId) {
      delete rooms[cleanName];
      console.log(`Room "${cleanName}" has been deleted by the GM.`);
      return res.json({ success: true, message: 'Room successfully deleted' });
    }

    res.status(403).json({ error: 'Unauthorized or room does not exist' });
  });

  // Serve static files in production / use Vite dev server in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-Stack dev server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
