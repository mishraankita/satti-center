import { create } from 'zustand';
import type { Room, Player, Card, GameState, CardConfig } from '../lib/api';

interface GameStore {
  // Player info
  playerId: string | null;
  playerName: string | null;
  
  // Room info
  roomCode: string | null;
  room: Room | null;
  
  // Game state
  gameState: GameState | null;
  playableCards: Card[];
  
  // Card config
  cardConfig: CardConfig | null;
  cardImages: Record<string, string>; // rank -> base64
  
  // UI state
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // Actions
  setPlayer: (id: string, name: string) => void;
  setRoom: (code: string, room: Room) => void;
  setGameState: (state: GameState) => void;
  setPlayableCards: (cards: Card[]) => void;
  setCardConfig: (config: CardConfig) => void;
  addCardImage: (rank: string, base64: string) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  playerId: null,
  playerName: null,
  roomCode: null,
  room: null,
  gameState: null,
  playableCards: [],
  cardConfig: null,
  cardImages: {},
  isLoading: false,
  isSyncing: false,
  error: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  
  setPlayer: (id, name) => set({ playerId: id, playerName: name }),
  
  setRoom: (code, room) => set({ roomCode: code, room }),
  
  setGameState: (state) => set({ gameState: state }),
  
  setPlayableCards: (cards) => set({ playableCards: cards }),
  
  setCardConfig: (config) => set({ cardConfig: config }),
  
  addCardImage: (rank, base64) => set((state) => ({
    cardImages: { ...state.cardImages, [rank]: base64 }
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));
