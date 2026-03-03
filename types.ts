export enum Color {
  RED = 'RED',
  BLACK = 'BLACK'
}

export enum PieceType {
  GENERAL = 'GENERAL',
  ADVISOR = 'ADVISOR',
  ELEPHANT = 'ELEPHANT',
  HORSE = 'HORSE',
  ROOK = 'ROOK',
  CANNON = 'CANNON',
  SOLDIER = 'SOLDIER'
}

export interface Piece {
  id: string;
  type: PieceType;
  color: Color;
  position: { r: number; c: number };
}

export interface Move {
  from: { r: number; c: number };
  to: { r: number; c: number };
  captured?: Piece;
  notation: string;
}

export enum GameMode {
  LOCAL = 'LOCAL',
  AI = 'AI',
  ONLINE = 'ONLINE'
}

export enum AIDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface GameSettings {
  soundEnabled: boolean; // SFX
  volume: number; // 0 to 1
  theme: 'classic' | 'modern';
  aiDifficulty: AIDifficulty;
  timerLimit: number;
  suggestionsOn: boolean;
}

export interface UserProfile {
  name: string;
  avatar: string;
  stats: {
    wins: number;
    losses: number;
    draws: number;
  };
}

export type BoardState = (Piece | null)[][];

// --- Online Specific Types ---
export type OnlineStatus = 'IDLE' | 'WAITING' | 'CONNECTED' | 'DISCONNECTED';

export interface OnlineState {
  roomCode: string | null;
  playerColor: Color | null;
  status: OnlineStatus;
  opponentName: string;
}