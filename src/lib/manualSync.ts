import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useMultiplayerStore } from '@/store/useMultiplayerStore';
import { useGMStore } from '@/store/useGMStore';
import { usePlayerStore } from '@/store/usePlayerStore';

export async function manualSync() {
  const { roomName, role, joinCode } = useMultiplayerStore.getState();
  if (!roomName || !db) {
    throw new Error("offline");
  }

  const roomRef = doc(db, 'rooms', roomName.trim().toLowerCase());
  const docSnap = await getDoc(roomRef);
  if (!docSnap.exists()) {
    throw new Error("not_found");
  }

  const data = docSnap.data();

  // 1. Common updates
  const updates: any = {
    links: data.links || [],
    rollLogs: data.rollLogs || [],
    roomPlayers: data.players || {},
    isFreeEdit: data.isFreeEdit || false,
    isFreeShop: data.isFreeShop || false,
    blockPlayerRolls: data.blockPlayerRolls || false,
    gmRequests: data.gmRequests || []
  };

  // 2. Role-specific updates
  if (role === 'player') {
    updates.publishedEncounter = data.publishedEncounter || null;
    updates.publicNotes = data.publicNotes || '';
    if (data.shopSpells) {
      updates.shopSpells = data.shopSpells;
    }

    // Process pending commands if any
    const myPlayer = data.players?.[joinCode || ''];
    if (myPlayer?.pendingCommands?.length > 0) {
      const pStore = usePlayerStore.getState();
      let newResources = [...pStore.resources];
      
      const hpIndex = 0;
      const mpIndex = 1;
      const expIndex = 2;
      
      const parseMaxVal = (val: string) => {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      };
      
      myPlayer.pendingCommands.forEach((cmd: any) => {
        if (cmd.type === 'add_mp') {
          const res = newResources[mpIndex];
          const max = parseMaxVal(res.max);
          let newCurrent = res.current + cmd.value;
          if (max > 0 && newCurrent > max) newCurrent = max;
          if (newCurrent < 0) newCurrent = 0;
          newResources[mpIndex] = { ...res, current: newCurrent };
        } else if (cmd.type === 'damage_mp') {
          const res = newResources[mpIndex];
          if (res.current > 0) {
             newResources[mpIndex] = { ...res, current: res.current - 1 };
          } else {
             const hpRes = newResources[hpIndex];
             newResources[hpIndex] = { ...hpRes, current: Math.max(0, hpRes.current - 1) };
          }
        } else if (cmd.type === 'deduct_exp') {
          const res = newResources[expIndex];
          newResources[expIndex] = { ...res, current: Math.max(0, res.current - cmd.value) };
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
      
      // Clear commands on server
      await updateDoc(roomRef, {
        [`players.${joinCode}.pendingCommands`]: []
      });
    }
  } else if (role === 'gm') {
    if (data.shopSpells) {
      useGMStore.getState().loadShopSpells(data.shopSpells);
    }
  }

  useMultiplayerStore.setState(updates);
}
