'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { Room } from '../types/game'
import { API_CONFIG, WEBSOCKET_EVENTS } from '../utils/api'
import { logError, logWarn, logInfo, logDebug } from '../utils/logger'

/**
 * Configuration for Socket.IO connection
 */
const SOCKET_CONFIG = {
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const

/**
 * Return type for the useWebSocket hook
 */
interface UseWebSocketReturn {
  readonly room: Room | null;
  readonly isConnected: boolean;
  readonly error: string | null;
  readonly reconnectAttempts: number;
  readonly createRoom: (side: 'heads' | 'tails', playerName?: string) => void;
  readonly joinRoom: (code: string, playerName?: string) => void;
  readonly disconnect: () => void;
  readonly clearRoom: () => void; // Clear room state without disconnecting
  readonly forceReconnect: () => void; // Force reconnection if needed
  readonly forceGameStart: () => void; // Fallback manual trigger
  // startGame, flipCoin, and startNewGame removed - auto-game flow
}

/**
 * Custom hook for managing Socket.IO connection to the game server
 * Provides real-time communication with automatic reconnection and error handling
 *
 * @returns Object containing room state, connection status, and control functions
 */
export function useWebSocket(): UseWebSocketReturn {
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Add error boundary for the hook itself
  const [hookError, setHookError] = useState<string | null>(null)

  // Safe error setter that won't crash the app
  const safeSetError = useCallback((errorMessage: string | null) => {
    try {
      logDebug('Safe setting error:', errorMessage)
      setError(errorMessage)
    } catch (setErrorError) {
      logError('Failed to set error state', setErrorError)
      // As a last resort, show toast notification
      try {
        toast.error('Critical error occurred in error handling', {
          id: 'critical-error',
        })
      } catch (toastError) {
        logError('Even toast failed', toastError)
      }
    }
  }, [])

  const socket = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const roomRef = useRef<Room | null>(null)

  // Keep roomRef in sync with room state
  React.useEffect(() => {
    roomRef.current = room
  }, [room])

  /**
   * Establishes Socket.IO connection with error handling
   */
  const connectSocket = useCallback(() => {
    try {
      // Clean up existing connection
      if (socket.current) {
        socket.current.disconnect()
      }

      // Connect to Socket.IO server
      socket.current = io(API_CONFIG.WEBSOCKET_URL, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
      })

      // Connection event handlers
      socket.current.on('connect', () => {
        logInfo('Socket.IO connected with ID:', socket.current?.id)
        setIsConnected(true)
        safeSetError(null)
        setReconnectAttempts(0)

        // Show success toast on reconnection (including force reconnect)
        if (reconnectAttempts > 0) {
          toast.success('Reconnected to server', {
            id: 'connection-success',
          })
        } else {
          // Also show success for force reconnects (when reconnectAttempts is 0)
          toast.dismiss('force-reconnect')
          toast.dismiss('auto-reconnect-menu')
          toast.success('Connected to server', {
            id: 'connection-success',
            duration: 2000,
          })
        }

        // Test connection by sending a ping
        if (socket.current) {
          socket.current.emit('ping')
        }
      })

      socket.current.on('disconnect', (reason) => {
        console.log(`🔌 Socket.IO disconnected: ${reason}`)
        logInfo('Socket.IO disconnected:', reason)
        setIsConnected(false)

        // Check if we have an active room when disconnecting
        const currentRoom = roomRef.current
        if (currentRoom && currentRoom.status !== 'completed') {
          console.log(`⚠️ CRITICAL: Disconnected during active game! Room status: ${currentRoom.status}`)
          toast.error(`Disconnected during game! Status was: ${currentRoom.status}`, {
            id: 'critical-disconnect',
            duration: 6000,
          })
        }

        // Only attempt to reconnect if it wasn't a manual disconnect
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect immediately
          // This might be normal after game completion
          console.log('🔌 Server disconnected - checking if this is normal after game completion')
          logWarn('Server disconnected - this might be normal after game completion')

          if (currentRoom && currentRoom.status === 'completed') {
            console.log('✅ Disconnect after game completion is normal')
          } else {
            console.log('❌ Unexpected server disconnect during game')
            safeSetError('Disconnected by server. Game may have ended.')
          }
        } else if (reason === 'io client disconnect') {
          // Manual disconnect, don't reconnect
          logInfo('Manual disconnect - not reconnecting')
        } else if (reconnectAttempts < SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          setReconnectAttempts(prev => prev + 1)

          // Show reconnecting message
          toast.loading('Reconnecting...', {
            id: 'reconnecting',
            duration: SOCKET_CONFIG.RECONNECT_DELAY,
          })

          reconnectTimeoutRef.current = setTimeout(connectSocket, SOCKET_CONFIG.RECONNECT_DELAY)
        } else {
          safeSetError('Connection failed. Please refresh the page.')
        }
      })

      socket.current.on('connect_error', (error) => {
        logError('Socket.IO connection error', error)
        const errorMessage = `Connection error: ${error.message}`
        toast.error(errorMessage, {
          id: 'connection-error',
        })
        safeSetError(errorMessage)
        setIsConnected(false)
      })

      // Game event handlers
      socket.current.on(WEBSOCKET_EVENTS.ROOM_CREATED, (data) => {
        logInfo('Room created:', data)

        // Backend returns: { room, playerSide, stakeAmount, totalPot }
        // playerSide is the creator's chosen side
        const roomData = data.room ? {
          ...data.room,
          players: data.players,
          // Store the creator's chosen side
          creatorPlayerSide: data.playerSide // Same as room.creator_side
        } : data

        logInfo('Creator chose side:', data.playerSide)
        setRoom(roomData)
        safeSetError(null)

        // Show confirmation of chosen side
        toast.success(`Room created! You chose: ${data.playerSide?.toUpperCase()}`, {
          id: 'room-created-side',
          duration: 4000,
        })
      })

      socket.current.on(WEBSOCKET_EVENTS.ROOM_JOINED, (data) => {
        logInfo('Room joined with automatic side assignment:', data)

        // Backend returns: { room, playerSide, players, stakeAmount, totalPot }
        // playerSide is AUTOMATICALLY ASSIGNED as opposite of creator
        const roomData = data.room ? {
          ...data.room,
          players: data.players,
          // Store the automatically assigned side for the joiner
          joinedPlayerSide: data.playerSide // "heads" or "tails" - opposite of creator
        } : data

        logInfo(`Joiner assigned side: ${data.playerSide}, opposite of creator side: ${data.room?.creator_side}`)
        setRoom(roomData)
        safeSetError(null)

        // Show notification about automatic side assignment
        toast.success(`You were assigned: ${data.playerSide?.toUpperCase()} (opposite of room creator)`, {
          id: 'side-assigned',
          duration: 4000,
        })
      })

      socket.current.on(WEBSOCKET_EVENTS.ROOM_READY, (data) => {
        logInfo('Room ready - game will auto-start:', data)

        // Verify that players have opposite sides
        if (data.players && data.players.length === 2) {
          const player1Side = data.players[0].side
          const player2Side = data.players[1].side

          logInfo('Verifying opposite sides:', {
            player1: { id: data.players[0].id, side: player1Side, is_creator: data.players[0].is_creator },
            player2: { id: data.players[1].id, side: player2Side, is_creator: data.players[1].is_creator }
          })

          if (player1Side === player2Side) {
            logError('ERROR: Both players have the same side!', { player1Side, player2Side })
            toast.error('Error: Both players have the same side! This should not happen.', {
              id: 'same-side-error',
              duration: 6000,
            })
          } else {
            logInfo('✅ Verified: Players have opposite sides as expected')
            toast.success(`✅ Sides verified: ${player1Side.toUpperCase()} vs ${player2Side.toUpperCase()}`, {
              id: 'sides-verified',
              duration: 3000,
            })
          }
        }

        // Handle nested room structure from backend
        const roomData = data.room ? { ...data.room, players: data.players } : data
        setRoom(roomData)
        safeSetError(null)

        // Show auto-start notification
        toast.success('Both players ready! Game will start automatically...', {
          id: 'room-ready',
          duration: 5000,
        })

        // Debug: Log what we expect to happen next
        logInfo('Expected next events: coin_flip_started (in 2s) → coin_flip_result (in 5s total)')

        // Add a fallback check in case backend doesn't auto-start
        setTimeout(() => {
          const currentRoom = roomRef.current
          logWarn('Auto-start timeout - checking if game started. Current room status:', currentRoom?.status)
          if (currentRoom?.status === 'full') {
            toast.error('Game not auto-starting. Backend may need manual trigger.', {
              id: 'auto-start-fallback',
              duration: 4000,
            })
          }
        }, 8000) // Wait 8 seconds for auto-start
      })

      socket.current.on(WEBSOCKET_EVENTS.COIN_FLIP_STARTED, (data) => {
        logInfo('Coin flip started - auto-flip beginning:', data)

        // Update room to flipping status
        setRoom(prevRoom => prevRoom ? ({
          ...prevRoom,
          status: 'flipping'
        }) : null)

        // Show flip starting notification
        toast.loading('Coin flip starting...', {
          id: 'coin-flip-started',
          duration: 3000,
        })
      })

      socket.current.on(WEBSOCKET_EVENTS.COIN_FLIP_RESULT, (data) => {
        logInfo('Coin flip result received:', data)

        // CRITICAL: Ensure we always have a room object to prevent "Loading Game..."
        const currentRoom = roomRef.current || {
          id: 'temp-id',
          code: 'RESULT',
          creator_side: 'heads' as const,
          stake_amount: 10,
          total_pot: 20,
          nonce: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Backend sends: { flipResult, winnerSide, winnerPlayer, totalPot, players, game, verification }
        const updatedRoom = {
          ...currentRoom,
          status: 'completed' as const,
          result: data.flipResult, // "heads" or "tails"
          winnerSide: data.winnerSide, // "heads" or "tails"
          winner: data.winnerPlayer, // winner player object
          totalPot: data.totalPot, // 20.00
          players: data.players, // both players array
          game: data.game, // game record
          verification: data.verification // provably fair data
        }

        logInfo('Updated room with coin_flip_result:', updatedRoom)
        setRoom(updatedRoom)

        // Clear any errors to ensure UI shows properly
        safeSetError(null)

        // Show general result notification
        toast.success(`🪙 Coin landed: ${data.flipResult?.toUpperCase()}!`, {
          id: 'coin-result',
          duration: 4000,
        })
      })

      // NEW: Handle individual game completion results
      socket.current.on(WEBSOCKET_EVENTS.GAME_COMPLETED, (data) => {
        logInfo('Game completed - individual result received:', data)

        // CRITICAL: Ensure we always have a room object to prevent "Loading Game..."
        const currentRoom = roomRef.current || {
          id: 'temp-id',
          code: 'RESULT',
          creator_side: 'heads' as const,
          stake_amount: 10,
          total_pot: 20,
          nonce: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Backend sends individual results:
        // { result: "win"|"lose", flipResult: "heads"|"tails", yourSide: "heads"|"tails",
        //   winnerSide: "heads"|"tails", winnings: number, verification: {...}, game: {...} }

        const personalizedResult = {
          ...currentRoom,
          status: 'completed' as const,
          result: data.flipResult, // Coin result
          personalResult: data.result, // "win" or "lose" for this player
          yourSide: data.yourSide, // Player's chosen side
          winnerSide: data.winnerSide, // Winning side
          winnings: data.winnings, // Amount won (20.00 for winner, 0 for loser)
          totalPot: data.winnings > 0 ? data.winnings : 20, // Ensure total pot is set
          game: data.game, // Game record
          verification: data.verification, // Provably fair data
          // Keep existing room data
          winner: data.result === 'win' ? 'you' : 'opponent'
        }

        logInfo('Updated room with game_completed result:', personalizedResult)
        setRoom(personalizedResult)

        // Clear any errors when game completes successfully
        safeSetError(null)

        // Show personalized result toast based on individual result
        if (data.result === 'win') {
          toast.success(`🎉 YOU WIN! Coin: ${data.flipResult?.toUpperCase()} - You chose ${data.yourSide?.toUpperCase()} - Won $${data.winnings}!`, {
            id: 'personal-game-result',
            duration: 8000,
          })
        } else {
          toast.error(`😢 You lose! Coin: ${data.flipResult?.toUpperCase()} - You chose ${data.yourSide?.toUpperCase()}, winner was ${data.winnerSide?.toUpperCase()}`, {
            id: 'personal-game-result',
            duration: 8000,
          })
        }
      })

      socket.current.on(WEBSOCKET_EVENTS.ROOM_STATUS, (data) => {
        logInfo('Room status:', data)
        setRoom(data)
      })

      socket.current.on(WEBSOCKET_EVENTS.ERROR, (data) => {
        try {
          // Check if data is empty or invalid first
          if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
            logWarn('Received empty error object from backend, ignoring')
            return // Silently ignore empty error objects
          }

          logError('WebSocket Error Received:', {
            rawData: data,
            type: typeof data,
            keys: Object.keys(data || {}),
            values: {
              message: data?.message,
              type: data?.type,
              error: data?.error,
              msg: data?.msg
            }
          })

          // Handle both string and object error formats
          let errorMessage = 'An error occurred'

          if (typeof data === 'string') {
            errorMessage = data
          } else if (data && typeof data === 'object') {
            // Try multiple possible error message fields
            const possibleMessage = data.message || data.error || data.msg || data.description

            if (possibleMessage && possibleMessage.trim()) {
              // Check for specific error messages
              const message = possibleMessage.toLowerCase()

              // Handle join_room_error type specifically
              if (data.type === 'join_room_error') {
                if (message.includes('not found') || message.includes('not available')) {
                  errorMessage = 'Room not found. Please check the room code and try again.'
                } else if (message.includes('full')) {
                  errorMessage = 'Room is already full (2/2 players). Please try a different room.'
                } else {
                  errorMessage = possibleMessage
                }
              } else if (message.includes('not found') || message.includes('not available')) {
                errorMessage = 'Room not found. Please check the room code and try again.'
              } else if (message.includes('full')) {
                errorMessage = 'Room is already full (2/2 players). Please try a different room.'
              } else {
                errorMessage = possibleMessage
              }
            } else if (data.type) {
              // If we have a type but no message, create a helpful error
              switch (data.type) {
                case 'validation_error':
                  errorMessage = 'Invalid input provided. Please check your room code and try again.'
                  break
                case 'room_not_found':
                  errorMessage = 'Room not found. Please check the room code and try again.'
                  break
                case 'join_room_error':
                  // This is the specific case we need to handle
                  errorMessage = 'Room is full. Cannot join this room.'
                  break
                case 'room_full':
                  errorMessage = 'Room is full. Cannot join this room.'
                  break
                default:
                  errorMessage = `Server error: ${data.type}`
              }
            } else {
              errorMessage = 'Unknown server error occurred'
            }
          }

          logDebug('Setting error message in ERROR handler:', errorMessage)

          // Show toast notification for better UX
          toast.error(errorMessage, {
            id: 'websocket-error', // Prevent duplicate toasts
          })

          // Also set error state for components that might need it
          safeSetError(errorMessage)
        } catch (errorHandlingError) {
          logError('Error while handling WebSocket error', errorHandlingError)
          const fallbackMessage = 'An unexpected error occurred. Please try again.'
          toast.error(fallbackMessage)
          safeSetError(fallbackMessage)
        }
      })

      // Note: connect_error is already handled above

      // Add handler for any other events (but don't duplicate error handling)
      socket.current.onAny((event, ...args) => {
        // Enhanced logging for all events
        console.log(`🔌 WebSocket Event [${event}]:`, args)
        logDebug(`WebSocket Event [${event}]:`, args)


        // If we receive an unknown event, it might indicate backend mismatch
        const knownEvents = [
          'connect', 'disconnect', 'connect_error',
          WEBSOCKET_EVENTS.ROOM_CREATED, WEBSOCKET_EVENTS.ROOM_JOINED,
          WEBSOCKET_EVENTS.ROOM_READY, WEBSOCKET_EVENTS.COIN_FLIP_STARTED,
          WEBSOCKET_EVENTS.COIN_FLIP_RESULT, WEBSOCKET_EVENTS.GAME_COMPLETED,
          WEBSOCKET_EVENTS.ROOM_STATUS, WEBSOCKET_EVENTS.ERROR,
          WEBSOCKET_EVENTS.JOIN_ROOM_ERROR, 'exception', 'join_error',
          'ping', 'pong'
        ]

        if (!knownEvents.includes(event)) {
          logWarn(`Unknown WebSocket event [${event}] - this might be the response we expected:`, args)

          // If this unknown event has room-like data, try to handle it
          const data = args[0]
          if (data && typeof data === 'object' && (data.code || data.id || data.room)) {
            logDebug('Treating unknown event as room data:', data)
            // Handle nested room structure from backend
            const roomData = data.room ? { ...data.room, players: data.players } : data
            setRoom(roomData as Room)
            safeSetError(null)
          }
        }
      })

      // Add specific error event handlers in case backend uses different names
      socket.current.on('exception', (data) => {
        // Ignore empty or invalid data
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          logWarn('Received empty exception object from backend, ignoring')
          return
        }

        logError('Exception event', data)
        const errorMessage = `Server exception: ${JSON.stringify(data)}`
        toast.error(errorMessage, {
          id: 'server-exception',
        })
        safeSetError(errorMessage)
      })

      socket.current.on('join_error', (data) => {
        // Ignore empty or invalid data
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          logWarn('Received empty join_error object from backend, ignoring')
          return
        }

        logError('Join error event', data)
        const errorMessage = `Join error: ${JSON.stringify(data)}`
        toast.error(errorMessage, {
          id: 'join-error',
        })
        safeSetError(errorMessage)
      })

      // Handle specific join_room_error from backend
      socket.current.on(WEBSOCKET_EVENTS.JOIN_ROOM_ERROR, (data) => {
        try {
          // Ignore empty or invalid data
          if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
            logWarn('Received empty join_room_error object from backend, ignoring')
            return
          }

          logError('Join Room Error', data)

          // Handle different types of join room errors
          let errorMessage = 'Failed to join room'

          if (data && typeof data === 'object') {
            // Check for specific error types
            if (data.type === 'join_room_error' && data.message) {
              const message = data.message.toLowerCase()

              if (message.includes('full')) {
                errorMessage = 'Room is already full (2/2 players). Please try a different room.'
              } else if (message.includes('not found') || message.includes('not available')) {
                errorMessage = 'Room not found. Please check the room code and try again.'
              } else {
                errorMessage = data.message
              }
            } else if (data.statusCode === 409 || data.message?.toLowerCase().includes('full')) {
              errorMessage = 'Room is already full (2/2 players). Please try a different room.'
            } else if (data.message) {
              errorMessage = data.message
            } else if (data.error) {
              errorMessage = data.error
            }
          } else if (typeof data === 'string') {
            errorMessage = data
          }

          logDebug('Setting error message in JOIN_ROOM_ERROR handler:', errorMessage)

          // Show toast notification for better UX
          toast.error(errorMessage, {
            id: 'join-room-error', // Prevent duplicate toasts
          })

          // Also set error state for components that might need it
          safeSetError(errorMessage)
        } catch (errorHandlingError) {
          logError('Error while handling JOIN_ROOM_ERROR', errorHandlingError)
          const fallbackMessage = 'Failed to join room. Please try again.'
          toast.error(fallbackMessage)
          safeSetError(fallbackMessage)
        }
      })

      // Catch-all listeners for potential backend event variations
      const possibleResultEvents = [
        'coinFlipResult', 'coin_flip_result', 'flipResult', 'flip_result',
        'gameCompleted', 'game_completed', 'gameResult', 'game_result',
        'result', 'flip_complete', 'coinFlip', 'flip_finished'
      ]

      possibleResultEvents.forEach(eventName => {
        socket.current!.on(eventName, (data) => {
          // Try to process as game result
          if (data && (data.result || data.flipResult || data.winner)) {

            const currentRoom = roomRef.current
            const resultData = currentRoom ? {
              ...currentRoom,
              status: 'completed' as const,
              result: data.result || data.flipResult || data.flip_result,
              winner: data.winner || data.winnerPlayer,
              personalResult: data.personalResult || (data.result === 'win' ? 'win' : 'lose'),
              winnings: data.winnings || (data.result === 'win' ? 20 : 0),
              game: data.game,
              verification: data.verification
            } : null

            if (resultData) {
              setRoom(resultData)
              safeSetError(null)
            }
          }
        })
      })

    } catch (error) {
      logError('Failed to connect to Socket.IO', error)
      safeSetError('Failed to establish connection')
    }
  }, [reconnectAttempts, safeSetError])

  /**
   * Sends a Socket.IO event with validation
   */
  const sendEvent = useCallback((event: string, data: Record<string, unknown>): boolean => {
    if (!socket.current || !socket.current.connected) {
      logWarn('Cannot send event - not connected to server')
      const errorMessage = 'Not connected to server'
      toast.error(errorMessage, {
        id: 'not-connected',
      })
      setError(errorMessage)
      return false
    }

    try {
      logDebug('Sending WebSocket event:', { event, data })
      socket.current.emit(event, data)
      return true
    } catch (error: unknown) {
      logError('Error sending event', error)
      const errorMessage = 'Failed to send message'
      toast.error(errorMessage, {
        id: 'send-failed',
      })
      setError(errorMessage)
      return false
    }
  }, [])

  /**
   * Game action: Create a new room
   */
  const createRoom = useCallback((side: 'heads' | 'tails', playerName?: string) => {
    const eventData = playerName ? { side, playerName } : { side }
    logDebug('Creating room with data:', eventData)
    sendEvent(WEBSOCKET_EVENTS.CREATE_ROOM, eventData)
  }, [sendEvent])

  /**
   * Game action: Join an existing room
   */
  const joinRoom = useCallback((code: string, playerName?: string) => {
    try {
      logDebug('Attempting to join room with code:', { code, playerName })

      // Validate room code format before sending
      if (!code || code.length !== 6) {
        const errorMessage = 'Invalid room code format. Room code must be 6 characters.'
        toast.error(errorMessage, {
          id: 'invalid-code',
        })
        setError(errorMessage)
        return
      }

      // Check if we're already in a room
      if (room && room.code === code.toUpperCase()) {
        const errorMessage = 'You are already in this room.'
        toast.error(errorMessage, {
          id: 'already-in-room',
        })
        setError(errorMessage)
        return
      }

      const upperCode = code.toUpperCase()
      const eventData = playerName ? { code: upperCode, playerName } : { code: upperCode }
      logDebug('Joining room with data:', eventData)

      // Clear any previous errors
      setError(null)

      sendEvent(WEBSOCKET_EVENTS.JOIN_ROOM, eventData)
    } catch (error) {
      logError('Error in joinRoom function', error)
      const errorMessage = 'Failed to join room. Please try again.'
      toast.error(errorMessage, {
        id: 'join-room-function-error',
      })
      setError(errorMessage)
    }
  }, [sendEvent, room])

  // startGame and flipCoin functions removed - auto-game flow handles this

  /**
   * Force reconnection if WebSocket is disconnected
   */
  const forceReconnect = useCallback(() => {
    try {
      if (!isConnected) {
        setReconnectAttempts(0) // Reset attempts
        connectSocket()

        toast.loading('Reconnecting to server...', {
          id: 'force-reconnect',
          duration: 3000,
        })
      }
    } catch (error) {
      logError('Error in forceReconnect', error)
      toast.error('Failed to reconnect. Please refresh the page.', {
        id: 'force-reconnect-error',
      })
    }
  }, [isConnected, connectSocket])


  /**
   * Fallback manual trigger for game start (in case backend auto-start isn't implemented)
   */
  const forceGameStart = useCallback(() => {
    if (room?.code) {
      logInfo('Force starting game manually via room status check')
      sendEvent(WEBSOCKET_EVENTS.GET_ROOM_STATUS, { code: room.code })

      // Also try to start via flip_coin using room code
      setTimeout(() => {
        logInfo('Force triggering coin flip manually')
        sendEvent(WEBSOCKET_EVENTS.FLIP_COIN, { code: room.code })
      }, 1000)
    }
  }, [sendEvent, room])

  /**
   * Clear room state without disconnecting from Socket.IO
   */
  const clearRoom = useCallback(() => {
    setRoom(null)
    setError(null)
    logInfo('Room state cleared, keeping connection alive')
  }, [])

  /**
   * Manually disconnect from Socket.IO
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socket.current) {
      socket.current.disconnect()
      socket.current = null
    }

    setIsConnected(false)
    setRoom(null)
    setError(null)
    setReconnectAttempts(0)
  }, [])

  // Effect for managing Socket.IO connection with error handling
  useEffect(() => {
    try {
      connectSocket()
    } catch (effectError) {
      logError('Error in WebSocket effect', effectError)
      const errorMessage = 'Failed to initialize WebSocket connection'
      toast.error(errorMessage, {
        id: 'websocket-init-error',
      })
      setHookError(errorMessage)
    }

    return () => {
      try {
        disconnect()
      } catch (cleanupError) {
        logError('Error during WebSocket cleanup', cleanupError)
      }
    }
  }, [connectSocket, disconnect])

  // Return safe wrapped functions
  const safeCreateRoom = useCallback((side: 'heads' | 'tails', playerName?: string) => {
    try {
      createRoom(side, playerName)
    } catch (error) {
      logError('Error in createRoom', error)
      toast.error('Failed to create room. Please try again.', {
        id: 'create-room-error',
      })
    }
  }, [createRoom])

  const safeJoinRoom = useCallback((code: string, playerName?: string) => {
    try {
      joinRoom(code, playerName)
    } catch (error) {
      logError('Error in joinRoom', error)
      toast.error('Failed to join room. Please try again.', {
        id: 'join-room-wrapper-error',
      })
    }
  }, [joinRoom])

  // safeStartGame and safeFlipCoin removed - auto-game flow

  const safeDisconnect = useCallback(() => {
    try {
      disconnect()
    } catch (error) {
      logError('Error in disconnect', error)
      // Don't show toast for disconnect errors as user might be leaving
    }
  }, [disconnect])

  return {
    room,
    isConnected,
    error: hookError || error,
    reconnectAttempts,
    createRoom: safeCreateRoom,
    joinRoom: safeJoinRoom,
    disconnect: safeDisconnect,
    clearRoom,
    forceReconnect,
    forceGameStart,
    // startGame, flipCoin, and startNewGame removed - auto-game flow
  }
}