import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Resource {
  name: string;
  tag?: string;
  current: number;
  max: string; // The user requested text field without restriction, evaluated as number later if needed
  isVisible: boolean;
  color: 'red' | 'blue' | 'purple' | 'green' | 'yellow';
}

export interface Stat {
  name: string;
  tag?: string;
  current: number;
  isVisible: boolean;
}

export interface Spell {
  id: string;
  icon: string;
  name: string;
  tag?: string;
  description?: string;
  dice: string;
  r1: string;
  r2: string;
  r3: string;
  r4: string;
  uses: number;
  maxUses: string; // number or 'unlimited'
  isDisabled?: boolean;
  isBlocked?: boolean;
}

export interface PlayerState {
  photo: string | null;
  name: string;
  tag?: string;
  resources: [Resource, Resource, Resource];
  stats: Stat[];
  spells: Spell[];
  notes: string;
  textSizeLevel: number;
  
  updatePhoto: (photo: string | null) => void;
  updateName: (name: string) => void;
  updateResource: (index: number, data: Partial<Resource>) => void;
  updateStat: (index: number, data: Partial<Stat>) => void;
  addSpell: (spell: Spell) => void;
  removeSpell: (id: string) => void;
  updateSpellUses: (id: string, delta: number) => void;
  toggleSpellStatus: (id: string) => void;
  moveSpell: (index: number, direction: 'up' | 'down') => void;
  updateNotes: (notes: string) => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  loadState: (state: Partial<PlayerState>) => void;
}

const defaultResources: [Resource, Resource, Resource] = [
  { name: 'HP', current: 3, max: '3', isVisible: true, color: 'red' },
  { name: 'MP', current: 0, max: '0', isVisible: true, color: 'blue' },
  { name: 'EXP', current: 0, max: '3', isVisible: true, color: 'purple' },
];

const defaultStats: Stat[] = Array.from({ length: 12 }, (_, i) => ({
  name: `Stat ${i + 1}`,
  current: 0,
  isVisible: false,
}));

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      photo: null,
      name: 'Unknown Hero',
      resources: defaultResources,
      stats: defaultStats,
      spells: [],
      notes: '',
      textSizeLevel: 0,

      updatePhoto: (photo) => set({ photo }),
      updateName: (name) => set({ name }),
      updateResource: (index, data) => set((state) => {
        const newResources = [...state.resources] as [Resource, Resource, Resource];
        newResources[index] = { ...newResources[index], ...data };
        return { resources: newResources };
      }),
      updateStat: (index, data) => set((state) => {
        const newStats = [...state.stats];
        newStats[index] = { ...newStats[index], ...data };
        return { stats: newStats };
      }),
      addSpell: (spell) => set((state) => ({ spells: [...state.spells, spell] })),
      removeSpell: (id) => set((state) => ({ spells: state.spells.filter(s => s.id !== id) })),
      toggleSpellStatus: (id) => set((state) => ({
        spells: state.spells.map(s => s.id === id ? { ...s, isDisabled: !s.isDisabled } : s)
      })),
      moveSpell: (index, direction) => set((state) => {
        const newSpells = [...state.spells];
        if (direction === 'up' && index > 0) {
          [newSpells[index - 1], newSpells[index]] = [newSpells[index], newSpells[index - 1]];
        } else if (direction === 'down' && index < newSpells.length - 1) {
          [newSpells[index + 1], newSpells[index]] = [newSpells[index], newSpells[index + 1]];
        }
        return { spells: newSpells };
      }),
      updateSpellUses: (id, delta) => set((state) => ({
        spells: state.spells.map(s => {
          if (s.id === id) {
            const cleanMax = (s.maxUses || '').trim();
            const isNumeric = /^\d+$/.test(cleanMax);
            if (!isNumeric) {
              // Non-numeric max uses (e.g. 'unlimited', '1/Combat', 'Special') are not modifiable via +/- counters
              return s;
            }
            let newUses = s.uses + delta;
            if (newUses < 0) newUses = 0;
            const max = parseInt(cleanMax, 10);
            if (newUses > max) {
              newUses = max;
            }
            return { ...s, uses: newUses };
          }
          return s;
        })
      })),
      updateNotes: (notes) => set({ notes }),
      increaseTextSize: () => set((state) => ({ textSizeLevel: Math.min(state.textSizeLevel + 1, 4) })),
      decreaseTextSize: () => set((state) => ({ textSizeLevel: Math.max(state.textSizeLevel - 1, 0) })),
      loadState: (newState) => set((state) => ({ ...state, ...newState })),
    }),
    {
      name: 'hud-player-storage-v5',
    }
  )
);
