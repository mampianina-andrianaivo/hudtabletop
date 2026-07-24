import React, { useState } from 'react';
import { Shield, ScrollText, Swords, Upload, Sparkles, User, Key, Link } from 'lucide-react';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useGMStore } from '@/store/useGMStore';

// Helper to wipe Firestore players if configured (to wipe everything)
async function wipeFirestorePlayers() {
  try {
    const { db } = await import('@/lib/firebase');
    if (!db) return;
    const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
    const colRef = collection(db, 'players');
    const snapshot = await getDocs(colRef);
    const promises = snapshot.docs.map(document => deleteDoc(doc(db, 'players', document.id)));
    await Promise.all(promises);
    console.log("Firestore 'players' collection successfully wiped.");
  } catch (err) {
    console.error("Gracefully handled error during Firestore wipe:", err);
  }
}

interface HomeProps {
  onSelectRole: (role: 'player' | 'gm') => void;
}

export function Home({ onSelectRole }: HomeProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // GM Create fields
  const [gmRoomName, setGmRoomName] = useState('');
  const [gmPassword, setGmPassword] = useState('');
  const [loadedCampaignData, setLoadedCampaignData] = useState<any | null>(null);
  const [jsonLoadedName, setJsonLoadedName] = useState<string | null>(null);

  // Player Join fields
  const [playRoomName, setPlayRoomName] = useState('');
  const [playPassword, setPlayPassword] = useState('');
  const [playLink, setPlayLink] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setPlayLink(joinCode.toUpperCase());
      setShowJoinModal(true);
      const rName = params.get('room');
      if (rName) {
        setPlayRoomName(rName);
      }
    }
  }, []);

  // Auto-resolve room name from join code when it changes
  React.useEffect(() => {
    let code = playLink.trim().toUpperCase();
    if (code.startsWith('S-')) {
      code = 'P-' + code.slice(2);
    } else if (code.length === 6 && /^[A-Z0-9]+$/.test(code)) {
      code = 'P-' + code;
    }
    if (code.startsWith('P-') && code.length === 8) {
      import('@/lib/firebase').then(async ({ db }) => {
        if (!db) return;
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'rooms'), where('links', 'array-contains', code));
        try {
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setPlayRoomName(data.roomName);
          } else {
            setPlayRoomName('');
          }
        } catch (err) {
          console.log('Join code does not map to an active room yet:', err);
          setPlayRoomName('');
        }
      });
    } else {
      setPlayRoomName('');
    }
  }, [playLink]);

  const handleJsonLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim() === '') {
          alert('Loaded file is empty.');
          return;
        }
        const data = JSON.parse(text);
        
        // Supports full GM store export or shop spells array
        if (Array.isArray(data)) {
          setLoadedCampaignData({ shopSpells: data });
        } else if (data) {
          setLoadedCampaignData(data);
        } else {
          alert('Invalid JSON file format.');
          return;
        }
        
        setJsonLoadedName(file.name);
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loadedCampaignData) {
      setErrorMessage('A campaign JSON file is REQUIRED to create a room.');
      return;
    }

    const roomNameToUse = (loadedCampaignData.roomName || gmRoomName || '').trim();
    if (!roomNameToUse) {
      setErrorMessage('The campaign JSON file must contain a room name ("roomName").');
      return;
    }

    if (!gmPassword.trim()) {
      setErrorMessage('Connection password is required.');
      return;
    }

    // Optional environment password restriction
    const envPassword = import.meta.env.VITE_GAME_PASSWORD;
    if (envPassword && gmPassword !== envPassword) {
      setErrorMessage('Incorrect connection password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Wipe Firestore Players collection (completely wipe Firebase)
      await wipeFirestorePlayers();

      // Extract shop spells & public notes from loaded JSON campaign if exists
      const shopSpells = loadedCampaignData?.shopSpells || [];
      const publicNotes = loadedCampaignData?.publicNotes || '';

      // 2. Request new room creation on server
      const { db } = await import('@/lib/firebase');
      if (!db) throw new Error("Firebase database not initialized.");
      const { doc, setDoc } = await import('firebase/firestore');

      const cleanName = roomNameToUse.toLowerCase();
      const gmSessionId = 'GM-' + Math.random().toString(36).substring(2, 15);
      
      const { useGMStore } = await import('@/store/useGMStore');
      const gmState = useGMStore.getState();
      
      const baseLinks = loadedCampaignData?.scratchLinks || gmState.scratchLinks || [];
      const basePlayersData = loadedCampaignData?.scratchPlayers || gmState.scratchPlayers || {};
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const generateLink = () => 'P-' + Array.from({length: 6}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      
      const links = baseLinks.length > 0 ? [...baseLinks] : Array.from({length: 6}, generateLink);
      while (links.length < 6) links.push(generateLink());

      const initialPlayers: any = {};
      Object.keys(basePlayersData).forEach(link => {
        const sp = basePlayersData[link];
        if (sp && sp.pseudo) {
          initialPlayers[link] = {
            pseudo: sp.pseudo,
            joinCode: link,
            lastActive: Date.now(),
            characterState: sp.characterState || null
          };
        }
      });

      await setDoc(doc(db, 'rooms', cleanName), {
        roomName: roomNameToUse,
        passwordHash: gmPassword.trim(),
        gmSessionId,
        links,
        players: initialPlayers,
        publishedEncounter: null,
        publicNotes: publicNotes,
        shopSpells: shopSpells,
        rollLogs: [],
        lastUpdate: Date.now()
      });

      const data = {
        roomName: roomNameToUse,
        gmSessionId,
        links,
        rollLogs: []
      };

      // 3. Initialize GM local state
      if (loadedCampaignData) {
        // Load completely from parsed campaign data
        useGMStore.setState({
          shopSpells: loadedCampaignData.shopSpells || [],
          encounters: loadedCampaignData.encounters || [{ id: 'default-1', actionName: '', isSub: false, isEnabled: true }],
          currentDraw: null,
          notes: loadedCampaignData.notes || '',
        });
        useMultiplayerStore.setState({
          publicNotes: loadedCampaignData.publicNotes || '',
          localPublicNotes: loadedCampaignData.publicNotes || '',
        });
      } else {
        // Initialize as completely clean slate (scratch)
        useGMStore.setState({
          shopSpells: [],
          encounters: [{ id: 'default-1', actionName: '', isSub: false, isEnabled: true }],
          currentDraw: null,
          notes: '',
        });
        useMultiplayerStore.setState({
          publicNotes: '',
          localPublicNotes: '',
        });
      }

      // Save credentials and connect
      useMultiplayerStore.getState().disconnect(); // Reset previous session
      useMultiplayerStore.getState().setCredentials({
        roomName: data.roomName,
        password: gmPassword,
        role: 'gm',
        gmSessionId: data.gmSessionId,
        links: data.links,
        isConnected: true,
        rollLogs: data.rollLogs || [],
        roomPlayers: {},
      });

      setShowCreateModal(false);
      onSelectRole('gm');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while creating.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playPassword.trim() || !playLink.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { db } = await import('@/lib/firebase');
      if (!db) throw new Error("Firebase not initialized.");
      
      const { collection, query, where, getDocs, doc, getDoc, updateDoc } = await import('firebase/firestore');

      const characterName = usePlayerStore.getState().name || 'Unknown Hero';

      let joinCode = playLink.trim().toUpperCase();
      if (joinCode.startsWith('S-')) {
        joinCode = 'P-' + joinCode.slice(2);
      } else if (joinCode.length === 6 && /^[A-Z0-9]+$/.test(joinCode)) {
        joinCode = 'P-' + joinCode;
      }
      let roomData = null;
      let actualRoomName = playRoomName.trim().toLowerCase();

      if (!actualRoomName) {
        if (!joinCode) throw new Error("Invitation code (P-XXXXXX) is required.");
        const q = query(collection(db, 'rooms'), where('links', 'array-contains', joinCode));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("Room not found for this invitation code.");
        actualRoomName = snapshot.docs[0].id;
        roomData = snapshot.docs[0].data();
      } else {
        const docSnap = await getDoc(doc(db, 'rooms', actualRoomName));
        if (!docSnap.exists()) throw new Error("Room '" + actualRoomName + "' not found.");
        roomData = docSnap.data();
      }

      const envPassword = import.meta.env.VITE_GAME_PASSWORD;
      const providedPassword = playPassword.trim();
      const effectivePassword = providedPassword || 'master';
      
      const roomPass = roomData.passwordHash || 'master';
      const isMasterPassword = envPassword && (providedPassword === envPassword || effectivePassword === envPassword);
      const isRoomPassword = (providedPassword === roomPass || effectivePassword === roomPass);

      if (!isMasterPassword && !isRoomPassword) {
        throw new Error("Invalid password.");
      }

      if (!joinCode) {
        throw new Error("Invitation code (P-XXXXXX) is required.");
      }

      if (!roomData.links.includes(joinCode)) {
        throw new Error("This invitation code is not valid for room '" + (roomData.roomName || actualRoomName) + "'.");
      }

      const existingPlayer = roomData.players?.[joinCode];
      const actualCharacterName = existingPlayer?.pseudo || characterName;

      if (existingPlayer?.characterState) {
        usePlayerStore.setState(existingPlayer.characterState);
      } else {
        usePlayerStore.setState({ name: actualCharacterName });
      }

      // Add player join log
      const rollLogs = roomData.rollLogs || [];
      const newRoll = {
        id: `join-${Date.now()}`,
        pseudo: 'System',
        text: `${actualCharacterName} joined the room!`,
        timestamp: Date.now()
      };
      
      await updateDoc(doc(db, 'rooms', actualRoomName), {
        [`players.${joinCode}`]: {
          pseudo: actualCharacterName,
          lastActive: Date.now(),
          joinCode,
          characterState: existingPlayer?.characterState || null
        },
        rollLogs: [...rollLogs.slice(-49), newRoll]
      });

      const data = {
        roomName: roomData.roomName,
        rollLogs: [...rollLogs.slice(-49), newRoll]
      };

      // Save credentials and connect
      useMultiplayerStore.getState().disconnect(); // Reset previous session
      useMultiplayerStore.getState().setCredentials({
        roomName: data.roomName,
        password: providedPassword,
        role: 'player',
        joinCode: joinCode,
        pseudo: actualCharacterName,
        isConnected: true,
        rollLogs: [],
        roomPlayers: {},
        gmSessionId: roomData.gmSessionId || null,
      });

      setShowJoinModal(false);
      onSelectRole('player');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while joining.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-iron text-white flex flex-col items-center justify-center p-4  relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Swords size={600} />
      </div>

      <div className="wow-panel max-w-xl w-full p-8 flex flex-col items-center shadow-2xl relative z-10">
        <h1 className="font-cinzel font-bold text-5xl text-wow-gold mb-2 text-center drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">
          D12 Roll
        </h1>
        <h2 className="font-macondo text-2xl text-wow-gold mb-10 text-center tracking-widest uppercase drop-shadow-md">
          Dashboard
        </h2>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mb-8"></div>

        <div className="flex flex-col w-full gap-8 px-4">
          
          {/* Offline Section */}
          <div className="text-center space-y-4">
            <h3 className="font-cinzel text-white text-sm tracking-widest border-b border-[#5a4b3c] pb-2 inline-block">Scratch Play</h3>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  useMultiplayerStore.getState().disconnect();
                  useMultiplayerStore.setState({ role: 'gm' });
                  onSelectRole('gm');
                }}
                className="wow-button py-3 text-lg flex items-center justify-center gap-2"
              >
                <ScrollText size={20} className="text-wow-gold" />
                Scratch Play
              </button>
            </div>
          </div>

          {/* Online Section */}
          <div className="text-center space-y-4 mt-2">
            <h3 className="font-cinzel text-wow-gold text-sm tracking-widest border-b border-wow-gold/30 pb-2 inline-block">Play Online</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setErrorMessage(null);
                  setShowJoinModal(true);
                }}
                className="wow-button py-4 text-lg flex items-center justify-center gap-2 border-green-700/60 hover:border-green-500 bg-green-950/20"
              >
                <User size={20} className="text-wow-gold" />
                Join as Player
              </button>

              <button 
                onClick={() => {
                  setErrorMessage(null);
                  setShowCreateModal(true);
                }}
                className="wow-button py-4 text-lg flex items-center justify-center gap-2 border-wow-gold/40 hover:border-wow-gold bg-wow-gold/5"
              >
                <Sparkles size={20} className="text-wow-gold animate-spin-slow" />
                Create as GM
              </button>
            </div>
          </div>

        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5a4b3c] to-transparent mt-8 mb-4"></div>
        <p className="font-cinzel text-xs text-white text-center">Copyright Mampianina</p>
      </div>

      {/* CREATE AS GAME MASTER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-wow-dark border-2 border-wow-gold/50 p-6 rounded shadow-2xl w-full max-w-md relative flex flex-col gap-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wow-gold m-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wow-gold m-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wow-gold m-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wow-gold m-1"></div>

            <h3 className="font-cinzel text-wow-gold text-2xl text-center border-b border-[#5a4b3c]/40 pb-2">Create Online Room</h3>

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4 font-sans text-sm">
              <div className="border border-wow-gold/40 rounded p-3 bg-black/60 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-cinzel text-xs text-wow-gold uppercase tracking-wider font-bold">Campaign JSON File (Required)</span>
                    <span className="text-[11px] text-white font-mono mt-0.5 truncate max-w-[200px]">{jsonLoadedName || 'No file loaded'}</span>
                  </div>
                  <label className="wow-button px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload size={13} /> Load JSON
                    <input type="file" accept=".json" className="hidden" onChange={handleJsonLoad} />
                  </label>
                </div>
                <div className="min-h-[30px] flex flex-col justify-center">
                  {loadedCampaignData?.roomName ? (
                    <div className="text-xs font-mono text-wow-gold bg-wow-gold/10 border border-wow-gold/30 px-2.5 py-1.5 rounded flex items-center justify-between">
                      <span className="text-white font-cinzel">Room Name :</span>
                      <span className="font-bold text-white text-sm">{loadedCampaignData.roomName}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 font-mono italic text-center py-1 select-none opacity-50">
                      (Awaiting campaign file upload...)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-cinzel text-wow-gold mb-1 uppercase tracking-wider">Connection Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wow-gold/50"><Key size={16} /></span>
                  <input 
                    type="password" 
                    required
                    value={gmPassword}
                    onChange={(e) => setGmPassword(e.target.value)}
                    className="wow-input w-full pl-10 pr-3 py-2 bg-black/60 border border-[#5a4b3c] rounded text-white font-mono focus:border-wow-gold focus:outline-none transition-colors"
                    placeholder="Shared room password..."
                  />
                </div>
              </div>

              <div className="min-h-[38px] flex items-center justify-center">
                {errorMessage ? (
                  <div className="w-full text-red-400 text-xs text-center font-semibold bg-red-950/30 border border-red-900/40 py-2 px-3 rounded">
                    {errorMessage}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="wow-button flex-1 py-2 text-sm"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="wow-button flex-1 py-2 text-sm text-wow-gold font-bold bg-wow-gold/10 hover:bg-wow-gold/20"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN AS PLAYER MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-wow-dark border-2 border-green-900/50 p-6 rounded shadow-2xl w-full max-w-md relative flex flex-col gap-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500 m-1 opacity-50"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500 m-1 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500 m-1 opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500 m-1 opacity-50"></div>

            <h3 className="font-cinzel text-green-400 text-2xl text-center border-b border-green-900/40 pb-2">Join Campaign</h3>

            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4 font-sans text-sm">
              <div>
                <label className="block text-xs font-cinzel text-green-400 mb-1 uppercase tracking-wider">S-CODE (Join Link or Code)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-500/50"><Link size={16} /></span>
                  <input 
                    type="text" 
                    required
                    value={playLink}
                    onChange={(e) => setPlayLink(e.target.value)}
                    className="wow-input w-full pl-10 pr-3 py-2 bg-black/60 border border-green-900/40 rounded text-white font-mono focus:border-green-400 focus:outline-none transition-colors"
                    placeholder="S-XXXXXX"
                  />
                </div>
                <div className="min-h-[26px] mt-1.5 flex flex-col justify-center">
                  {playRoomName ? (
                    <div className="text-green-400 text-xs font-mono flex items-center gap-1 bg-black/40 border border-green-500/20 px-2 py-1 rounded">
                      <span>✓ Room detected:</span>
                      <span className="font-bold underline">{playRoomName}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 font-mono italic text-center py-1 select-none opacity-50">
                      (Awaiting valid join code...)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-cinzel text-green-400 mb-1 uppercase tracking-wider">Connection Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-500/50"><Key size={16} /></span>
                  <input 
                    type="password" 
                    required
                    value={playPassword}
                    onChange={(e) => setPlayPassword(e.target.value)}
                    className="wow-input w-full pl-10 pr-3 py-2 bg-black/60 border border-green-900/40 rounded text-white font-mono focus:border-green-400 focus:outline-none transition-colors"
                    placeholder="Enter Room password..."
                  />
                </div>
              </div>

              <div className="min-h-[38px] flex items-center justify-center">
                {errorMessage ? (
                  <div className="text-red-400 text-xs text-center font-semibold bg-red-950/30 border border-red-900/40 py-2 px-3 rounded">
                    {errorMessage}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowJoinModal(false)}
                  className="wow-button flex-1 py-2 text-sm"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="wow-button flex-1 py-2 text-sm text-green-400 font-bold bg-green-950/20 hover:bg-green-950/40 border-green-700/60"
                  disabled={isLoading}
                >
                  {isLoading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
