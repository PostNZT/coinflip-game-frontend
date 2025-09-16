'use client'

import React, { useState } from 'react'
import toast from 'react-hot-toast'
import RoomCreation from '../components/RoomCreation'
import RoomJoining from '../components/RoomJoining'
import GameRoom from '../components/GameRoom'
import ErrorBoundary from '../components/ErrorBoundary'
import { useWebSocket } from '../hooks/useWebSocket'
import { Player, TempPlayer } from '../types/game'
import { logError } from '../utils/logger'

/**
 * Application modes for navigation
 */
type GameMode = 'menu' | 'create' | 'join' | 'game'

/**
 * Main application component for the coinflip game
 * Manages global state and navigation between different game modes
 *
 * Features:
 * - Room creation and joining
 * - Real-time multiplayer gameplay via WebSocket
 * - Responsive UI with error handling
 * - Input validation and sanitization
 */
export default function Home(): React.JSX.Element {
  // Navigation state
  const [gameMode, setGameMode] = useState<GameMode>('menu')

  // Player and room state
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)

  // Auto-reconnection state
  const [isAutoReconnecting, setIsAutoReconnecting] = useState<boolean>(false)

  // WebSocket connection and game state (startGame, flipCoin removed - auto-game flow)
  const { room, isConnected, error, createRoom, joinRoom, disconnect, forceReconnect, forceGameStart } = useWebSocket()

  // Update current player when room data changes - FIXED LOGIC
  React.useEffect(() => {
    if (room && room.players && currentPlayer) {
      // Match by name first (most reliable), then by side as fallback
      const currentPlayerName = currentPlayer.name
      const currentPlayerSide = currentPlayer.side || currentPlayer.choice

      let updatedCurrentPlayer = null

      // Try to find current player by name first
      if (currentPlayerName) {
        updatedCurrentPlayer = room.players.find(p => p.name === currentPlayerName)
      }

      // If not found by name, try by side (fallback)
      if (!updatedCurrentPlayer) {
        updatedCurrentPlayer = room.players.find(p => p.side === currentPlayerSide)
      }

      // Only update if we found a player and it has different data than current player
      if (updatedCurrentPlayer && updatedCurrentPlayer.name) {
        // Check if update is actually needed to prevent infinite loops
        const needsUpdate =
          currentPlayer.id !== updatedCurrentPlayer.id ||
          currentPlayer.socket_id !== updatedCurrentPlayer.socket_id ||
          currentPlayer.is_creator !== updatedCurrentPlayer.is_creator ||
          currentPlayer.has_paid !== updatedCurrentPlayer.has_paid ||
          currentPlayer.stake_amount !== updatedCurrentPlayer.stake_amount

        if (needsUpdate) {
          setCurrentPlayer({
            ...updatedCurrentPlayer,
            choice: currentPlayer.choice || updatedCurrentPlayer.side, // Keep original choice for compatibility, fallback to side
          })
        }
      }
    }
  }, [room?.players, room?.code]) // Only depend on room.players and room.code, not currentPlayer

  // Test room functionality removed - using real game results

  // Preserve final game state even if connection is lost
  const [finalGameResult, setFinalGameResult] = useState<any>(null)

  /**
   * Handles successful room creation
   * Transitions the app to game mode with the created room
   */
  const handleRoomCreated = (playerName: string, choice: 'heads' | 'tails', bet: number): void => {
    try {
      const tempPlayer: TempPlayer = {
        id: 'temp-id', // Will be set by backend
        name: playerName,
        side: choice, // Creator's chosen side
        choice, // Frontend compatibility
        bet,
      }
      // Convert to Player interface for state management
      const player: Player = {
        ...tempPlayer,
        choice: tempPlayer.choice,
      }
      setCurrentPlayer(player)
      createRoom(choice, playerName) // Send creator's chosen side to backend
      setGameMode('game')
    } catch (error) {
      logError('Error in handleRoomCreated', error)
    }
  }

  /**
   * Handles successful room joining
   * Transitions the app to game mode with the joined room
   * NOTE: Side will be automatically assigned by backend as opposite of creator
   */
  const handleRoomJoined = (code: string, playerName: string): void => {
    try {
      // Create temporary player - side will be set by backend automatically
      const tempPlayer: TempPlayer = {
        id: 'temp-id', // Will be set by backend
        name: playerName,
        side: 'heads', // TEMPORARY - Will be automatically assigned by backend as opposite of creator
        choice: 'heads', // TEMPORARY - Will be automatically assigned by backend as opposite of creator
        bet: 10, // Fixed stake amount
      }
      // Convert to Player interface for state management
      const player: Player = {
        ...tempPlayer,
        choice: tempPlayer.choice,
      }
      setCurrentPlayer(player)
      joinRoom(code, playerName) // Backend will assign opposite side automatically
      setGameMode('game')
    } catch (error) {
      logError('Error in handleRoomJoined', error)
    }
  }

  /**
   * Handles leaving the current room
   * Disconnects from WebSocket and returns to main menu
   */
  const handleLeaveRoom = (): void => {
    try {
      disconnect() // Clean up WebSocket connection
      setGameMode('menu')
      setCurrentPlayer(null)
      setFinalGameResult(null) // Clear preserved result
    } catch (error) {
      logError('Error in handleLeaveRoom', error)
    }
  }



  // Auto-transition to game mode when room is available
  React.useEffect(() => {
    if (room && currentPlayer && gameMode !== 'game') {
      setGameMode('game')
    }
  }, [room, currentPlayer, gameMode])

  // Auto-reconnect when returning to menu if disconnected
  React.useEffect(() => {
    if (gameMode === 'menu' && !isConnected && !isAutoReconnecting) {
      setIsAutoReconnecting(true)

      // Small delay to let the disconnect settle, then reconnect
      const reconnectTimer = setTimeout(() => {
        forceReconnect()

        toast.loading('Connecting to server...', {
          id: 'auto-reconnect-menu',
          duration: 3000,
        })
      }, 1000) // 1 second delay

      return () => clearTimeout(reconnectTimer)
    }

    // Reset auto-reconnecting state when connected
    if (isConnected && isAutoReconnecting) {
      setIsAutoReconnecting(false)
    }

    // Explicit return for when neither condition is met
    return undefined
  }, [gameMode, isConnected, isAutoReconnecting, forceReconnect])

  // Preserve final game result when room status becomes 'completed'
  React.useEffect(() => {
    if (room && room.status === 'completed' && room.result) {
      setFinalGameResult({
        ...room,
        completedAt: new Date().toISOString()
      })

      // CRITICAL: Force ensure we stay in game mode to show results
      if (gameMode !== 'game') {
        setGameMode('game')
      }
    }
  }, [room, gameMode])

  // Handle WebSocket errors by resetting creation/joining state
  React.useEffect(() => {
    try {
      if (error && (gameMode === 'create' || gameMode === 'join')) {
        const errorLower = error.toLowerCase()

        // For specific errors, automatically go back to menu after showing error
        if (errorLower.includes('full') || errorLower.includes('not found') || errorLower.includes('not available')) {
          const timer = setTimeout(() => {
            setGameMode('menu')
          }, 3000) // Show error for 3 seconds then return to menu
          return () => clearTimeout(timer)
        }
        // For other errors, just let them show
      }
    } catch (effectError) {
      logError('Error in error handling effect', effectError)
    }
    return undefined
  }, [error, gameMode])

  if (gameMode === 'game') {
    // If we have room and player data, show the game
    // Also show if we have a preserved final result even without current player
    const gameRoom = finalGameResult || room
    const gamePlayer = currentPlayer || (gameRoom ? {
      id: 'temp-player',
      name: 'You',
      side: gameRoom.yourSide || 'heads',
      choice: gameRoom.yourSide || 'heads',
    } as Player : null)

    if (gameRoom && gamePlayer) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
          <GameRoom
            room={gameRoom}
            currentPlayer={gamePlayer}
            onStartGame={forceGameStart} // Fallback manual trigger
            onFlipCoin={() => {}} // No-op - auto-game flow
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Connection Status */}
          {!isConnected && (
            <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded">
              Disconnected
            </div>
          )}

          {error && (
            <div className="fixed top-4 left-4 bg-red-500 text-white px-4 py-2 rounded">
              {error}
            </div>
          )}
        </main>
      )
    }

    // Fallback UI when in game mode but missing room/player data
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Loading Game...
          </h2>

          {error ? (
            <div className="text-center">
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
              <button
                onClick={handleLeaveRoom}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              >
                Back to Menu
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Connecting to game...</p>


              <button
                onClick={handleLeaveRoom}
                className="mt-4 text-blue-500 hover:text-blue-600 underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Connection Status */}
          {!isConnected && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
              ❌ Not Connected to Server
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      {gameMode === 'menu' && (
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Coinflip Game
          </h1>

          {/* Connection Status */}
          <div className="mb-4 p-3 rounded text-center">
            {isConnected ? (
              <div className="text-green-600 bg-green-50 border border-green-200 rounded p-2">
                ✅ Connected to Server
              </div>
            ) : isAutoReconnecting ? (
              <div className="text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span>🔄 Connecting to Server...</span>
                </div>
                <div className="text-xs mt-1 text-yellow-500">
                  Auto-reconnecting after leaving room
                </div>
              </div>
            ) : (
              <div className="text-red-600 bg-red-50 border border-red-200 rounded p-2">
                <div>❌ Not Connected to Server</div>
                <div className="text-xs mt-1">
                  <button
                    onClick={forceReconnect}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Click to reconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => setGameMode('create')}
              disabled={!isConnected}
              className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-200 ${
                isConnected
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Create New Room
            </button>

            <button
              onClick={() => setGameMode('join')}
              disabled={!isConnected}
              className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-200 ${
                isConnected
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Join Room
            </button>
          </div>

          <div className="mt-8 text-center text-gray-600">
            <p className="text-sm">
              Create a room and share the code with a friend, or join an existing room to play!
            </p>
          </div>
        </div>
      )}

      {gameMode === 'create' && (
        <div>
          <RoomCreation onRoomCreated={handleRoomCreated} />

          {/* Display WebSocket errors */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="text-center mt-4">
            <button
              onClick={() => setGameMode('menu')}
              className="text-white hover:text-gray-200 underline"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {gameMode === 'join' && (
        <div>
          <RoomJoining onRoomJoined={handleRoomJoined} externalError={error} />

          <div className="text-center mt-4">
            <button
              onClick={() => setGameMode('menu')}
              className="text-white hover:text-gray-200 underline"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
      </main>
    </ErrorBoundary>
  )
}