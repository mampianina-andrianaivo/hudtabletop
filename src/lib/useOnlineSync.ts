import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useGMStore } from '@/store/useGMStore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';

export function sendOnlineRoll(text: string) {
  const { roomName, role, joinCode, pseudo, gmSessionId, isConnected } = useMultiplayerStore.getState();
  if (!isConnected || !roomName) return;

  fetch('/api/rooms/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName,
      role,
      joinCode,
      gmSessionId,
      newRoll: {
        pseudo: role === 'gm' ? 'MJ' : (pseudo || 'Player'),
        text
      }
    })
  }).catch(err => console.error('Error sending online roll:', err));
}

export function useOnlineSync() {
  const isConnected = useMultiplayerStore(state => state.isConnected);
  const roomName = useMultiplayerStore(state => state.roomName);
  const role = useMultiplayerStore(state => state.role);
  const joinCode = useMultiplayerStore(state => state.joinCode);
  const gmSessionId = useMultiplayerStore(state => state.gmSessionId);
  const onDisconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isConnected || !roomName) return;

    let active = true;
    let timerId: NodeJS.Timeout;

    const performSync = async () => {
      if (!active) return;

      try {
        const payload: any = {
          roomName,
          role,
          joinCode,
          gmSessionId,
        };

        if (role === 'gm') {
          const gmState = useGMStore.getState();
          const mpState = useMultiplayerStore.getState();
          payload.publishedEncounter = gmState.currentDraw;
          payload.publicNotes = mpState.publicNotes;
          payload.shopSpells = gmState.shopSpells;
        } else {
          // Player pushes their state
          const state = usePlayerStore.getState();
          payload.playerState = {
            name: state.name,
            photo: state.photo,
            resources: state.resources,
            stats: state.stats,
            spells: state.spells,
            notes: state.notes,
          };
        }

        const res = await fetch('/api/rooms/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error('Sync failed with status: ' + res.status);
        }

        const data = await res.json();

        if (data.roomDeleted) {
          if (role === 'player') {
            alert('The Game Master has closed this online session.');
          }
          useMultiplayerStore.getState().disconnect();
          if (onDisconnectRef.current) onDisconnectRef.current();
          return;
        }

        // Update local store with server response data
        const updates: any = {
          rollLogs: data.rollLogs || [],
          roomPlayers: data.players || {},
        };

        if (role === 'player') {
          updates.publishedEncounter = data.publishedEncounter;
          updates.publicNotes = data.publicNotes || '';
          
          // Also sync shopSpells from server to player
          if (data.shopSpells) {
            updates.shopSpells = data.shopSpells;
          }
        } else if (role === 'gm') {
          // Sync any shopSpells if updated externally, or keep it synced
          if (data.shopSpells) {
            // Keep local store in sync with master
            useGMStore.getState().loadShopSpells(data.shopSpells);
          }
        }

        useMultiplayerStore.setState(updates);

      } catch (err) {
        console.error('Multiplayer Sync Error:', err);
      } finally {
        if (active) {
          timerId = setTimeout(performSync, 1500);
        }
      }
    };

    performSync();

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [isConnected, roomName, role, joinCode, gmSessionId]);

  const registerOnDisconnect = useCallback((cb: () => void) => {
    onDisconnectRef.current = cb;
  }, []);

  return {
    registerOnDisconnect
  };
}
