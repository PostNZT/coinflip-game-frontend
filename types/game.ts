/**
 * Core types for the coinflip game application
 */

/**
 * Represents a player in the coinflip game
 */
export interface Player {
  /** Unique identifier for the player */
  id: string;
  /** Player's display name - REQUIRED from backend (max 50 characters) */
  name: string;
  /** Player's choice: heads or tails (frontend compatibility) */
  choice?: 'heads' | 'tails';
  /** Player's side: heads or tails (MAIN FIELD from backend) */
  side: 'heads' | 'tails';
  /** Amount the player has bet (minimum 1, maximum 1000) */
  bet?: number;
  /** Room ID this player belongs to */
  room_id?: string;
  /** Socket ID for this player */
  socket_id?: string;
  /** Whether this player is the creator */
  is_creator?: boolean;
  /** Amount this player staked */
  stake_amount?: number;
  /** Whether player has paid */
  has_paid?: boolean;
  /** When player joined */
  joined_at?: string;
}

/**
 * Backend room structure from API
 */
export interface Room {
  /** Unique identifier for the room */
  id: string;
  /** 6-character room code for joining */
  code: string;
  /** Creator's side choice */
  creator_side: 'heads' | 'tails';
  /** Stake amount per player */
  stake_amount: number;
  /** Total pot amount */
  total_pot: number;
  /** Current status of the game */
  status: 'waiting' | 'full' | 'playing' | 'flipping' | 'completed';
  /** Server seed for randomness */
  server_seed?: string;
  /** Client seed for randomness */
  client_seed?: string;
  /** Nonce for randomness */
  nonce: number;
  /** Result of the coin flip (available after flipping) */
  result?: 'heads' | 'tails';
  /** The winning player (available after game completion) */
  winner?: Player | string;
  /** Players in the room */
  players?: Player[];
  /** ISO timestamp when the room was created */
  created_at: string;
  /** ISO timestamp when the room was updated */
  updated_at: string;

  // Extended properties for backend events
  /** Personal result for the current player ('win' | 'lose') */
  personalResult?: 'win' | 'lose';
  /** Current player's side choice */
  yourSide?: 'heads' | 'tails';
  /** The winning side from coin_flip_result */
  winnerSide?: 'heads' | 'tails';
  /** Amount won by current player from game_completed */
  winnings?: number;
  /** Total pot amount from coin_flip_result */
  totalPot?: number;
  /** Game record data */
  game?: any;
  /** Verification data for provably fair */
  verification?: any;

  // Automatic side assignment tracking
  /** Creator's chosen side (stored for reference) */
  creatorPlayerSide?: 'heads' | 'tails';
  /** Joiner's automatically assigned side (opposite of creator) */
  joinedPlayerSide?: 'heads' | 'tails';
}

/**
 * Backend player structure from database - matches SQL schema exactly
 */
export interface DatabasePlayer {
  /** Unique identifier for the player */
  id: string;
  /** Room ID this player belongs to */
  room_id: string;
  /** Socket ID for this player */
  socket_id: string;
  /** Player's display name - REQUIRED NOT NULL in database */
  name: string;
  /** Player's side choice */
  side: 'heads' | 'tails';
  /** Whether this player is the creator */
  is_creator: boolean;
  /** Amount this player staked */
  stake_amount: number;
  /** Whether player has paid */
  has_paid: boolean;
  /** When player joined */
  joined_at: string;
}

/**
 * Temporary player creation interface for frontend before backend assignment
 */
export interface TempPlayer {
  /** Temporary identifier */
  id: string;
  /** Player's display name */
  name: string;
  /** Player's choice: heads or tails (frontend compatibility) */
  choice: 'heads' | 'tails';
  /** Player's side: heads or tails */
  side: 'heads' | 'tails';
  /** Amount the player has bet */
  bet: number;
}

/**
 * Application-wide game state
 */
export interface GameState {
  /** Current room the player is in */
  room: Room | null;
  /** Current player information */
  currentPlayer: Player | null;
  /** WebSocket connection status */
  isConnected: boolean;
}

/**
 * WebSocket message types for real-time communication
 */
export type WebSocketMessageType = 'room_update' | 'game_start' | 'coin_flip' | 'game_end' | 'error' | 'ping' | 'pong';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: Room | GameError | Record<string, unknown>;
}

/**
 * API response types with strict typing
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Room creation request payload
 */
export interface CreateRoomRequest {
  playerName: string;
  choice: 'heads' | 'tails';
  bet: number;
}

/**
 * Room join request payload
 */
export interface JoinRoomRequest {
  playerName: string;
}

/**
 * Error types for better error handling
 */
export interface GameError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Component event handlers
 */
export type InputChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type ButtonClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;
export type FormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;