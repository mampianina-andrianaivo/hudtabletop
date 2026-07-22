import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Spell } from './usePlayerStore';

export interface EncounterAction {
  id: string;
  actionName: string;
  isSub: boolean;
  isEnabled: boolean;
}

export interface DrawResultAction {
  name: string;
  sub?: string;
}

export interface DrawResult {
  level: number;
  published: boolean;
  lines: DrawResultAction[][];
}

export interface ScratchPlayer {
  pseudo: string;
  characterState: any;
}

export interface GMState {
  roomName: string;
  shopSpells: Spell[];
  encounters: EncounterAction[];
  currentDraw: DrawResult | null;
  notes: string;
  scratchLinks: string[];
  scratchPlayers: Record<string, ScratchPlayer>;
  isFreeEdit: boolean;

  updateRoomName: (roomName: string) => void;
  addShopSpell: (spell: Spell) => void;
  removeShopSpell: (id: string) => void;
  updateShopSpell: (id: string, data: Partial<Spell>) => void;
  toggleShopSpellBlock: (id: string) => void;
  moveShopSpell: (index: number, direction: 'up' | 'down') => void;
  loadShopSpells: (spells: Spell[]) => void;

  addEncounterAction: (action: EncounterAction) => void;
  updateEncounterAction: (id: string, data: Partial<EncounterAction>) => void;
  removeEncounterAction: (id: string) => void;

  drawEncounters: (level: number) => void;
  publishDraw: () => void;
  clearDraw: () => void;
  updateNotes: (notes: string) => void;

  initScratchLinks: () => void;
  updateScratchPlayer: (link: string, pseudo: string) => void;
  saveScratchPlayerState: (link: string, characterState: any) => void;
  setIsFreeEdit: (val: boolean) => void;
}

const defaultEncounter: EncounterAction = {
  id: 'default-1',
  actionName: '',
  isSub: false,
  isEnabled: true,
};

export const useGMStore = create<GMState>()(
  persist(
    (set, get) => ({
      roomName: '',
      shopSpells: [],
      encounters: [defaultEncounter],
      currentDraw: null,
      notes: '',
      scratchLinks: [],
      scratchPlayers: {},
      isFreeEdit: true,

      updateRoomName: (roomName) => set({ roomName }),
      initScratchLinks: () => set((state) => {
        if (state.scratchLinks.length > 0) return state;
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const generateLink = () => 'S-' + Array.from({length: 6}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        return { scratchLinks: Array.from({ length: 6 }, generateLink) };
      }),
      updateScratchPlayer: (link, pseudo) => set((state) => ({
        scratchPlayers: { 
          ...state.scratchPlayers, 
          [link]: { ...state.scratchPlayers[link], pseudo } 
        }
      })),
      saveScratchPlayerState: (link, characterState) => set((state) => ({
        scratchPlayers: {
          ...state.scratchPlayers,
          [link]: { ...state.scratchPlayers[link], characterState }
        }
      })),
      setIsFreeEdit: (val) => set({ isFreeEdit: val }),

      addShopSpell: (spell) => set((state) => ({ shopSpells: [...state.shopSpells, spell] })),
      removeShopSpell: (id) => set((state) => ({ shopSpells: state.shopSpells.filter(s => s.id !== id) })),
      updateShopSpell: (id, data) => set((state) => ({
        shopSpells: state.shopSpells.map(s => s.id === id ? { ...s, ...data } : s)
      })),
      toggleShopSpellBlock: (id) => set((state) => ({
        shopSpells: state.shopSpells.map(s => s.id === id ? { ...s, isBlocked: !s.isBlocked } : s)
      })),
      moveShopSpell: (index, direction) => set((state) => {
        const newSpells = [...state.shopSpells];
        if (direction === 'up' && index > 0) {
          [newSpells[index - 1], newSpells[index]] = [newSpells[index], newSpells[index - 1]];
        } else if (direction === 'down' && index < newSpells.length - 1) {
          [newSpells[index + 1], newSpells[index]] = [newSpells[index], newSpells[index + 1]];
        }
        return { shopSpells: newSpells };
      }),
      loadShopSpells: (spells) => set({ shopSpells: spells }),

      addEncounterAction: (action) => set((state) => ({ encounters: [...state.encounters, action] })),
      updateEncounterAction: (id, data) => set((state) => ({
        encounters: state.encounters.map(e => e.id === id ? { ...e, ...data } : e)
      })),
      removeEncounterAction: (id) => set((state) => ({ encounters: state.encounters.filter(e => e.id !== id) })),

      drawEncounters: (level) => set((state) => {
        const enabledActions = state.encounters.filter(e => e.isEnabled && !e.isSub && e.actionName.trim() !== '');
        const enabledSubs = state.encounters.filter(e => e.isEnabled && e.isSub && e.actionName.trim() !== '');
        
        if (enabledActions.length === 0) return state; // nothing to draw

        const numLines = level;
        let numSubs = 0;
        if (level === 3) numSubs = 1;
        if (level === 4) numSubs = 2;

        const lines: DrawResultAction[][] = [];
        const allDrawnActions: DrawResultAction[] = [];

        for (let i = 0; i < numLines; i++) {
          let pool = [...enabledActions];
          const line: DrawResultAction[] = [];
          for (let j = 0; j < 3; j++) {
            if (pool.length === 0) {
              pool = [...enabledActions]; // refill if empty to allow repeats across (or within if very small)
            }
            const randomIndex = Math.floor(Math.random() * pool.length);
            const action = pool[randomIndex];
            pool.splice(randomIndex, 1);
            const drawAction = { name: action.actionName };
            line.push(drawAction);
            allDrawnActions.push(drawAction);
          }
          lines.push(line);
        }

        // Attach subs randomly to the drawn actions
        let subPool = [...enabledSubs];
        for (let i = 0; i < numSubs; i++) {
           if (subPool.length === 0) {
              subPool = [...enabledSubs];
           }
           if (subPool.length === 0) break;

           const randomSubIndex = Math.floor(Math.random() * subPool.length);
           const sub = subPool[randomSubIndex];
           subPool.splice(randomSubIndex, 1);

           // pick a random action that doesn't have a sub yet
           const availableActions = allDrawnActions.filter(a => !a.sub);
           if (availableActions.length > 0) {
              const targetAction = availableActions[Math.floor(Math.random() * availableActions.length)];
              targetAction.sub = sub.actionName;
           }
        }

        return {
          currentDraw: {
            level,
            published: false,
            lines
          }
        };
      }),

      publishDraw: () => set((state) => {
        if (state.currentDraw) {
          return { currentDraw: { ...state.currentDraw, published: true } };
        }
        return state;
      }),
      clearDraw: () => set({ currentDraw: null }),
      updateNotes: (notes) => set({ notes })
    }),
    {
      name: 'hud-gm-storage-v5',
    }
  )
);
