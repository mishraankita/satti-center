import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the host IP from Expo's debugger host (works on physical devices)
const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  
  // For mobile devices, use the Metro bundler host IP
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    // Extract IP from "192.168.1.224:8082" format
    const hostIP = debuggerHost.split(':')[0];
    return `http://${hostIP}:8000`;
  }
  
  // Fallback to localhost
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CardConfig {
  ranks: Record<string, { name: string; label: string; value: number; prompt: string }>;
  suits: Record<string, { name: string; color: string; symbol: string }>;
}

export interface Player {
  id: string;
  name: string;
  is_host: boolean;
  is_ai?: boolean;
  hand: Card[];
}

export interface Card {
  rank: string;
  suit: string;
}

export interface BoardState {
  [suit: string]: {
    low: number | null;
    high: number | null;
    has_seven: boolean;
    cards: Card[];
  };
}

export interface GameState {
  board: BoardState;
  current_player_index: number;
  players: Player[];
  winner: string | null;
  last_action: string;
  turn_number: number;
}

export interface Room {
  room_code: string;
  host_name: string;
  players: Player[];
  game_state: GameState | null;
  status: 'waiting' | 'playing' | 'finished';
  is_ai_game?: boolean;
  updated_at?: string;
  created_at: string;
}

// API functions
export const getCardConfig = async (): Promise<CardConfig> => {
  const response = await api.get('/card-config');
  return response.data;
};

export const generateCardImage = async (rank: string): Promise<{ rank: string; image_base64: string; cached: boolean }> => {
  const response = await api.post('/generate-card-image', { rank });
  return response.data;
};

export const getAllCardImages = async (): Promise<{ rank: string; image_base64: string }[]> => {
  const response = await api.get('/card-images');
  return response.data;
};

export const getCardImage = async (rank: string): Promise<{ rank: string; image_base64: string } | null> => {
  try {
    const response = await api.get(`/card-images/${rank}`);
    return response.data;
  } catch {
    return null;
  }
};

export const createRoom = async (hostName: string): Promise<{ room_code: string; player_id: string; player: Player; room: Room }> => {
  const response = await api.post('/rooms/create', { host_name: hostName });
  return response.data;
};

export const createAIGame = async (
  playerName: string, 
  numAiPlayers: number = 1, 
  difficulty: string = 'medium'
): Promise<{ room_code: string; player_id: string; player: Player; game_state: GameState; is_ai_game: boolean }> => {
  const response = await api.post('/rooms/create-ai-game', { 
    player_name: playerName, 
    num_ai_players: numAiPlayers,
    difficulty 
  });
  return response.data;
};

export const joinRoom = async (roomCode: string, playerName: string): Promise<{ room_code: string; player_id: string; player: Player; room: Room }> => {
  const response = await api.post('/rooms/join', { room_code: roomCode, player_name: playerName });
  return response.data;
};

export const getRoom = async (roomCode: string): Promise<Room> => {
  const response = await api.get(`/rooms/${roomCode}`);
  return response.data;
};

export const startGame = async (roomCode: string): Promise<{ message: string; game_state: GameState }> => {
  const response = await api.post(`/rooms/${roomCode}/start`);
  return response.data;
};

export const playCard = async (roomCode: string, playerId: string, card: Card): Promise<{ success: boolean; game_state: GameState }> => {
  const response = await api.post(`/rooms/${roomCode}/play`, { room_code: roomCode, player_id: playerId, card });
  return response.data;
};

export const passTurn = async (roomCode: string, playerId: string): Promise<{ success: boolean; game_state: GameState }> => {
  const response = await api.post(`/rooms/${roomCode}/pass`, { room_code: roomCode, player_id: playerId });
  return response.data;
};

export const getPlayableCards = async (roomCode: string, playerId: string): Promise<{ playable_cards: Card[] }> => {
  const response = await api.get(`/rooms/${roomCode}/playable/${playerId}`);
  return response.data;
};

export default api;
