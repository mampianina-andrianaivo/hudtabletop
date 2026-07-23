import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MultiplayerState {
  roomName: string | null;
  password: string | null;
  role: 'gm' | 'player' | null;
  joinCode: string | null;
  gmSessionId: string | null;
  pseudo: string | null;
  links: string[];
  isConnected: boolean;
  activePlayerView: string | null; // joinCode of player being viewed, or null/'me'
  publishedEncounter: any;
  publicNotes: string;
  localPublicNotes: string; // for GM
  rollLogs: any[];
  roomPlayers: Record<string, { joinCode: string, pseudo: string, characterState: any, lastActive: number }>;
  isEncounterViewActive: boolean; // toggle to show published encounter in character zone
  shopSpells: any[];
  isFreeEdit: boolean;
  isFreeShop: boolean;
  blockPlayerRolls: boolean;
  gmRequests: any[];
  playerNotes: string[]; // 3 tabs for private notes
  playerNotesTab: number; // 0, 1, 2 (private notes), 3 (PUB public notes)

  setCredentials: (data: Partial<MultiplayerState>) => void;
  disconnect: () => void;
  setActivePlayerView: (view: string | null) => void;
  setIsEncounterViewActive: (active: boolean) => void;
  setLocalPublicNotes: (notes: string) => void;
  setPlayerNote: (index: number, content: string) => void;
  setPlayerNotesTab: (tab: number) => void;
}

export const useMultiplayerStore = create<MultiplayerState>()(
  persist(
    (set) => ({
      roomName: null,
      password: null,
      role: null,
      joinCode: null,
      gmSessionId: null,
      pseudo: null,
      links: [],
      isConnected: false,
      activePlayerView: null,
      publishedEncounter: null,
      publicNotes: '',
      localPublicNotes: '',
      rollLogs: [],
      roomPlayers: {},
      isEncounterViewActive: false,
      shopSpells: [],
      isFreeEdit: false, isFreeShop: false,
      blockPlayerRolls: false,
      gmRequests: [],
      playerNotes: ['', '', ''],
      playerNotesTab: 3, // Default to PUB (public) tab

      setCredentials: (data) => set((state) => ({ ...state, ...data })),
      disconnect: () => set({
        roomName: null,
        password: null,
        role: null,
        joinCode: null,
        gmSessionId: null,
        pseudo: null,
        links: [],
        isConnected: false,
        activePlayerView: null,
        publishedEncounter: null,
        publicNotes: '',
        localPublicNotes: '',
        rollLogs: [],
        roomPlayers: {},
        isEncounterViewActive: false,
        shopSpells: [],
        isFreeEdit: false, isFreeShop: false,
        blockPlayerRolls: false,
        gmRequests: [],
        playerNotes: ['', '', ''],
        playerNotesTab: 3
      }),
      setActivePlayerView: (view) => set({ activePlayerView: view }),
      setIsEncounterViewActive: (active) => set({ isEncounterViewActive: active }),
      setLocalPublicNotes: (notes) => set({ localPublicNotes: notes }),
      setPlayerNote: (index, content) => set((state) => {
        const notes = [...state.playerNotes];
        notes[index] = content;
        return { playerNotes: notes };
      }),
      setPlayerNotesTab: (tab) => set({ playerNotesTab: tab }),
    }),
    {
      name: 'hud-multiplayer-storage-v1',
    }
  )
);
