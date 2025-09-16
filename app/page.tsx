'use client'

import React, { useState } from 'react'
import toast from 'react-hot-toast'
import RoomCreation from '../components/RoomCreation'
import RoomJoining from '../components/RoomJoining'
import GameRoom from '../components/GameRoom'
import ErrorBoundary from '../components/ErrorBoundary'
import { useWebSocket } from '../hooks/useWebSocket'
import { Player, TempPlayer } from '../types/game'
import { logError, logInfo } from '../utils/logger'
import { Coins, Plus, Users, Wifi, WifiOff, AlertCircle } from 'lucide-react'

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
  const { room, isConnected, error, createRoom, joinRoom, clearRoom, forceReconnect, forceGameStart } = useWebSocket()

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
   * Clears room state and returns to main menu
   */
  const handleLeaveRoom = (): void => {
    try {
      // Clear room and game state
      setCurrentPlayer(null)
      setFinalGameResult(null) // Clear preserved result

      // Clear room from WebSocket hook (but keep connection alive)
      clearRoom()

      // Return to menu mode
      setGameMode('menu')

      // Show success message that we left the room
      toast.success('Left room successfully', {
        id: 'leave-room-success',
        duration: 2000,
      })
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

  // Auto-reconnect when returning to menu if disconnected (only if truly disconnected)
  React.useEffect(() => {
    // Only try to reconnect if we're actually disconnected AND not auto-reconnecting already
    if (gameMode === 'menu' && !isConnected && !isAutoReconnecting) {
      setIsAutoReconnecting(true)

      // Small delay to let any connection issues settle, then reconnect
      const reconnectTimer = setTimeout(() => {
        logInfo('Auto-reconnecting - connection was lost...')
        forceReconnect()

        toast.loading('Connecting to server...', {
          id: 'auto-reconnect-menu',
          duration: 5000,
        })
      }, 1000) // 1 second delay

      return () => clearTimeout(reconnectTimer)
    }

    // Reset auto-reconnecting state when connected
    if (isConnected && isAutoReconnecting) {
      setIsAutoReconnecting(false)
      toast.dismiss('auto-reconnect-menu')
      toast.success('Connected to server!', {
        id: 'auto-reconnect-success',
        duration: 2000,
      })
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
        <main className="min-h-screen bg-base-100 flex items-center justify-center p-4">
          {/* Game Room Container Card */}
          <div className="card w-full max-w-6xl bg-base-300 shadow-2xl border-2 border-primary/20">
            <div className="card-body p-6">
              <GameRoom
                room={gameRoom}
                currentPlayer={gamePlayer}
                onStartGame={forceGameStart} // Fallback manual trigger
                onFlipCoin={() => {}} // No-op - auto-game flow
                onLeaveRoom={handleLeaveRoom}
              />
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="fixed top-4 right-4">
              <div className="alert alert-error text-sm shadow-md">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </div>
            </div>
          )}

          {error && (
            <div className="fixed top-4 left-4">
              <div className="alert alert-error text-sm shadow-md">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            </div>
          )}
        </main>
      )
    }

    // Fallback UI when in game mode but missing room/player data
    return (
      <main className="min-h-screen bg-base-100 flex items-center justify-center p-4">
        {/* Loading/Error Container Card */}
        <div className="card w-full max-w-2xl bg-base-300 shadow-2xl border-2 border-primary/20">
          <div className="card-body p-8">
            <div className="card w-full bg-base-200 shadow-xl border border-accent/20">
              <div className="card-body">
                <h2 className="card-title justify-center text-primary">
                  <Coins className="h-8 w-8" />
                  Loading Game...
                </h2>

                {error ? (
                  <div className="text-center space-y-4">
                    <div className="alert alert-error">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                    <button
                      onClick={handleLeaveRoom}
                      className="btn btn-primary w-full"
                    >
                      Back to Menu
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                    <p className="text-base-content/70">Connecting to game...</p>
                    <button
                      onClick={handleLeaveRoom}
                      className="btn btn-outline w-full"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Connection Status */}
                {!isConnected && (
                  <div className="alert alert-error">
                    <WifiOff className="h-4 w-4" />
                    <span>Not Connected to Server</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <ErrorBoundary>
      <main className="h-screen bg-base-100 flex items-center justify-center p-6">
        {/* Main Container Card */}
        <div className="card bg-base-200 shadow-2xl p-8 w-full max-w-4xl mx-auto">
          <div className="card-body flex flex-col items-center justify-center space-y-8 text-center">
            {gameMode === 'menu' && (
              <>
                {/* Hero Card */}
                <div className="card bg-base-300 shadow-lg p-8 w-full max-w-lg mx-auto">
                  <div className="card-body text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center gap-4 text-primary mb-4">
                      <Coins className="h-16 w-16 text-secondary" />
                      Coinflip Game
                    </h1>
                    <p className="text-base-content text-lg leading-relaxed">
                      Create a room and share the code with a friend, or join an existing room to play!
                    </p>
                  </div>
                </div>

                {/* Main Action Card */}
                <div className="card bg-base-300 shadow-lg p-8 w-full max-w-md mx-auto">
                  <div className="space-y-6 text-center">
                    {/* Connection Status */}
                    <div className="space-y-3">
                      {isConnected ? (
                        <div className="alert alert-success flex items-center justify-center gap-3 mx-auto">
                          <Wifi className="h-5 w-5" />
                          <span className="font-medium">Connected to Server</span>
                        </div>
                      ) : isAutoReconnecting ? (
                        <div className="alert alert-warning flex flex-col items-center justify-center gap-3 mx-auto text-center">
                          <div className="flex items-center gap-3">
                            <span className="loading loading-spinner loading-sm"></span>
                            <div className="text-center">
                              <div className="font-medium">Connecting to Server...</div>
                              <div className="text-sm opacity-75">Auto-reconnecting after leaving room</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-error text-center mx-auto">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-3">
                              <WifiOff className="h-5 w-5" />
                              <span className="font-medium">Not Connected to Server</span>
                            </div>
                            <button
                              onClick={forceReconnect}
                              className="btn btn-error btn-sm"
                            >
                              Click to reconnect
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="alert alert-error flex items-center justify-center gap-3 mx-auto text-center">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-row gap-6 items-center justify-center mt-6 mb-4">
                      <button
                        onClick={() => setGameMode('create')}
                        disabled={!isConnected}
                        className={`btn w-auto px-8 py-4 h-16 text-lg gap-4 rounded-xl ${
                          isConnected
                            ? 'btn-primary hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200'
                            : 'btn-disabled'
                        }`}
                      >
                        <Plus className="h-7 w-7" />
                        Create New Room
                      </button>

                      <button
                        onClick={() => setGameMode('join')}
                        disabled={!isConnected}
                        className={`btn w-auto px-8 py-4 h-16 text-lg gap-4 rounded-xl ${
                          isConnected
                            ? 'btn-secondary hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200'
                            : 'btn-disabled'
                        }`}
                      >
                        <Users className="h-7 w-7" />
                        Join Room
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {gameMode === 'create' && (
              <div className="space-y-6 w-full flex flex-col items-center justify-center text-center">
                <RoomCreation onRoomCreated={handleRoomCreated} />

                {/* Display WebSocket errors */}
                {error && (
                  <div className="max-w-md w-full mx-auto">
                    <div className="alert alert-error flex items-center justify-center gap-3 mx-auto text-center">
                      <AlertCircle className="h-5 w-5" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <div className="text-center flex justify-center">
                  <button
                    onClick={() => setGameMode('menu')}
                    className="btn btn-ghost gap-2"
                  >
                    ← Back to Menu
                  </button>
                </div>
              </div>
            )}

            {gameMode === 'join' && (
              <div className="space-y-6 w-full flex flex-col items-center justify-center text-center">
                <RoomJoining onRoomJoined={handleRoomJoined} externalError={error} />

                <div className="text-center flex justify-center">
                  <button
                    onClick={() => setGameMode('menu')}
                    className="btn btn-ghost gap-2"
                  >
                    ← Back to Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </ErrorBoundary>
  )
}