// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
} as const;

// REST API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/game/health',
  CREATE_ROOM: '/api/game/rooms',
  GET_ROOM: (code: string) => `/api/game/rooms/${code}`,
  GET_PLAYERS: (code: string) => `/api/game/rooms/${code}/players`,
  WEBSOCKET_DOCS: '/api/websocket/events',
  SWAGGER_DOCS: '/api/docs',
} as const;

// WebSocket Events
export const WEBSOCKET_EVENTS = {
  // Client to Server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  FLIP_COIN: 'flip_coin',
  GET_ROOM_STATUS: 'get_room_status',

  // Server to Client
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  ROOM_READY: 'room_ready',
  COIN_FLIP_STARTED: 'coin_flip_started',
  COIN_FLIP_RESULT: 'coin_flip_result',
  GAME_COMPLETED: 'game_completed',
  ROOM_STATUS: 'room_status',
  ERROR: 'error',
  JOIN_ROOM_ERROR: 'join_room_error',
} as const;

// Types
export type CoinSide = 'heads' | 'tails';
export type RoomStatus = 'waiting' | 'full' | 'playing' | 'completed';