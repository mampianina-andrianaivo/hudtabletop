import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useGMStore } from '@/store/useGMStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';

export async function sendOnlineRoll(text: string) {
  const { roomName, role, pseudo, isConnected } = useMultiplayerStore.getState();
  if (!isConnected || !roomName || !db) return;

  try {
    const roomRef = doc(db, 'rooms', roomName.trim().toLowerCase());
    await updateDoc(roomRef, {
      rollLogs: arrayUnion({
        id: `roll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pseudo: role === 'gm' ? 'MJ' : (pseudo || 'Player'),
        text,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    console.error('Error sending online roll:', err);
  }
}

export function useOnlineSync() {
  const isConnected = useMultiplayerStore(state => state.isConnected);
  const roomName = useMultiplayerStore(state => state.roomName);
  const role = useMultiplayerStore(state => state.role);
  const joinCode = useMultiplayerStore(state => state.joinCode);
  const gmSessionId = useMultiplayerStore(state => state.gmSessionId);
  const onDisconnectRef = useRef<(() => void) | null>(null);

  // Poll state to Firestore periodically
  useEffect(() => {
    if (!isConnected || !roomName || !db) return;

    const interval = setInterval(async () => {
      try {
        const roomRef = doc(db, 'rooms', roomName.trim().toLowerCase());
        
        if (role === 'gm') {
          const gmState = useGMStore.getState();
          const mpState = useMultiplayerStore.getState();
          await updateDoc(roomRef, {
            publishedEncounter: gmState.currentDraw,
            publicNotes: mpState.publicNotes,
            shopSpells: gmState.shopSpells,
            isFreeEdit: gmState.isFreeEdit,
            lastUpdate: Date.now()
          });
        } else if (role === 'player') {
          const state = usePlayerStore.getState();
          const playerState = {
            name: state.name,
            photo: state.photo,
            resources: state.resources,
            stats: state.stats,
            spells: state.spells,
            notes: state.notes,
          };
          await updateDoc(roomRef, {
            [`players.${joinCode}.characterState`]: playerState,
            [`players.${joinCode}.lastActive`]: Date.now(),
            [`players.${joinCode}.pseudo`]: playerState.name,
            [`players.${joinCode}.joinCode`]: joinCode
          });
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isConnected, roomName, role, joinCode, gmSessionId]);

  // Real-time listener for room changes
  useEffect(() => {
    if (!isConnected || !roomName || !db) return;

    const roomRef = doc(db, 'rooms', roomName.trim().toLowerCase());
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (!docSnap.exists()) {
        if (role === 'player') {
          alert('The Game Master has closed this online session.');
        }
        useMultiplayerStore.getState().disconnect();
        if (onDisconnectRef.current) onDisconnectRef.current();
        return;
      }

      const data = docSnap.data();

      // Only keep the last 50 rolls
      if (data.rollLogs && data.rollLogs.length > 50) {
        const trimmedLogs = data.rollLogs.slice(-50);
        updateDoc(roomRef, { rollLogs: trimmedLogs }).catch(console.error);
      }

      const updates: any = {
        rollLogs: data.rollLogs || [],
        roomPlayers: data.players || {},
        isFreeEdit: data.isFreeEdit || false,
        gmRequests: data.gmRequests || []
      };

      if (role === 'player') {
        updates.publishedEncounter = data.publishedEncounter;
        updates.publicNotes = data.publicNotes || '';
        if (data.shopSpells) updates.shopSpells = data.shopSpells;

        // Process pending commands
        const myPlayer = data.players?.[joinCode || ''];
        if (myPlayer?.pendingCommands?.length > 0) {
          const pStore = usePlayerStore.getState();
          let newResources = [...pStore.resources];
          
          let mpIndex = newResources.findIndex(r => r.name === 'MP');
          let hpIndex = newResources.findIndex(r => r.name === 'HP');
          
          myPlayer.pendingCommands.forEach((cmd: any) => {
            if (cmd.type === 'add_mp' && mpIndex !== -1) {
              const res = newResources[mpIndex];
              const max = Number(res.max) || 0;
              let newCurrent = res.current + cmd.value;
              if (newCurrent > max) newCurrent = max;
              if (newCurrent < 0) newCurrent = 0;
              newResources[mpIndex] = { ...res, current: newCurrent };
            } else if (cmd.type === 'damage_mp' && mpIndex !== -1 && hpIndex !== -1) {
              // HP drops only if MP is 0
              if (newResources[mpIndex].current > 0) {
                 newResources[mpIndex] = { ...newResources[mpIndex], current: newResources[mpIndex].current - 1 };
              } else {
                 newResources[hpIndex] = { ...newResources[hpIndex], current: Math.max(0, newResources[hpIndex].current - 1) };
              }
            } else if (cmd.type === 'deduct_exp') {
              const expIndex = newResources.findIndex(r => r.name === 'EXP');
              if (expIndex !== -1) {
                 newResources[expIndex] = { ...newResources[expIndex], current: Math.max(0, newResources[expIndex].current - cmd.value) };
              }
            } else if (cmd.type === 'add_spell' && cmd.spell) {
              const currentSpells = pStore.spells;
              if (!currentSpells.some(s => s.name.toLowerCase() === cmd.spell.name.toLowerCase())) {
                const cleanMax = (cmd.spell.maxUses || '').trim();
                const isNumeric = /^\d+$/.test(cleanMax);
                const initialUses = isNumeric ? parseInt(cleanMax, 10) : 0;
                pStore.addSpell({
                  ...cmd.spell,
                  id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                  uses: initialUses,
                });
              }
            }
          });
          
          usePlayerStore.setState({ resources: newResources as any });
          
          // Clear commands
          updateDoc(roomRef, {
            [`players.${joinCode}.pendingCommands`]: []
          }).catch(console.error);
        }

      } else if (role === 'gm') {
        if (data.shopSpells) {
          useGMStore.getState().loadShopSpells(data.shopSpells);
        }
      }

      useMultiplayerStore.setState(updates);
    });

    return () => unsubscribe();
  }, [isConnected, roomName, role, gmSessionId]);

  const registerOnDisconnect = useCallback((cb: () => void) => {
    onDisconnectRef.current = cb;
  }, []);

  return { registerOnDisconnect };
}
