'use client'

import React, { useState, useEffect } from 'react'
import { Room, Player } from '../types/game'
import { Copy, Crown, Users, DollarSign, Coins } from 'lucide-react'

/**
 * Props for the GameRoom component
 */
interface GameRoomProps {
  /** Current room state */
  readonly room: Room;
  /** Current player information */
  readonly currentPlayer: Player;
  /** Callback to start the game (deprecated - auto-game flow) */
  readonly onStartGame: () => void;
  /** Callback to flip the coin (deprecated - auto-game flow) */
  readonly onFlipCoin: () => void;
  /** Callback to leave the room */
  readonly onLeaveRoom: () => void;
}

/**
 * GameRoom component for displaying the active game state
 * Shows players, game status, coin animation, and controls
 */
export default function GameRoom({
  room,
  currentPlayer,
  onStartGame: _onStartGame, // Fallback manual trigger (unused)
  onFlipCoin: _onFlipCoin, // Deprecated
  onLeaveRoom
}: GameRoomProps): React.JSX.Element {
  const [isFlipping, setIsFlipping] = useState<boolean>(false)

  useEffect((): (() => void) | void => {
    if (room.status === 'flipping') {
      setIsFlipping(true)
      // Animation duration
      const timer = setTimeout(() => {
        setIsFlipping(false)
      }, 2000)
      return (): void => clearTimeout(timer)
    }
    // Explicit return for when condition is not met
    return undefined
  }, [room.status])

  const isWaiting = room.status === 'waiting'
  const isFinished = room.status === 'completed'

  // Players are identified by the logic below, no need for separate creator/joiner variables

  // FIXED: Use backend player data to determine current player identity
  // Match by name first (most reliable), then by side as fallback
  const currentPlayerName = currentPlayer.name
  const currentPlayerSide = currentPlayer.side || currentPlayer.choice

  let actualCurrentPlayer: Player | null = null
  let isCreator = false
  let otherPlayer: Player | null = null

  if (room.players && room.players.length > 0) {
    // Try to find current player by name first
    if (currentPlayerName) {
      actualCurrentPlayer = room.players.find(p => p.name === currentPlayerName) || null
    }

    // If not found by name, try by side (fallback)
    if (!actualCurrentPlayer) {
      actualCurrentPlayer = room.players.find(p => p.side === currentPlayerSide) || null
    }

    // If still not found, use the first player (should not happen)
    if (!actualCurrentPlayer) {
      actualCurrentPlayer = room.players[0] || null
    }

    // Determine if current player is creator based on backend data
    isCreator = actualCurrentPlayer?.is_creator === true

    // Find the other player (the one that is NOT the current player)
    if (actualCurrentPlayer) {
      otherPlayer = room.players.find(p => p.id !== actualCurrentPlayer!.id) || null
    }
  }


  // Game uses AUTO-GAME FLOW - no manual triggers needed

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center">
          <h1 className="card-title text-2xl md:text-3xl justify-center">
            <Coins className="h-8 w-8 text-primary" />
            Coinflip Game
          </h1>

          {/* Room Code Display */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mt-4">
            <p className="text-sm font-medium mb-2 text-base-content/70">ROOM CODE</p>
            <div className="text-3xl md:text-4xl font-bold font-mono tracking-wider mb-3">
              {room.code}
            </div>
            <p className="mb-4 text-base-content/70">
              Share this code with your opponent to join
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="btn btn-outline btn-sm"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </button>
          </div>
        </div>
      </div>

      {/* Room Status */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          {isWaiting && (
            <div className="text-center space-y-3">
              <div className="badge badge-neutral badge-lg">
                🕐 Waiting for another player to join...
              </div>
              <p className="text-base-content/70 text-sm">
                Game will start automatically when both players are ready
              </p>
            </div>
          )}
          {room.status === 'full' && (
            <div className="text-center space-y-2">
              <div className="badge badge-success badge-lg">
                Both players ready! Game will start automatically...
              </div>
              <p className="text-base-content/70 text-sm">
                ⏱️ Auto-starting in a few seconds...
              </p>
            </div>
          )}
          {room.status === 'playing' && (
            <div className="text-center">
              <div className="badge badge-info badge-lg">
                Game starting... Preparing coin flip...
              </div>
            </div>
          )}
          {(isFlipping || room.status === 'flipping') && (
            <div className="text-center space-y-2">
              <div className="badge badge-info badge-lg">
                🪙 Flipping coin...
              </div>
              <p className="text-base-content/70 text-sm">
                The fate is being decided...
              </p>
            </div>
          )}
          {isFinished && (
            <div className="text-center">
              <div className="badge badge-secondary badge-lg">
                🎉 Game finished! Check results below.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Player */}
        <div className="card bg-primary/5 border border-primary/20 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">
              <Crown className="h-5 w-5 text-primary" />
              You {isCreator ? '(Creator)' : '(Joiner)'}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{actualCurrentPlayer?.name || currentPlayer.name}</p>
                <div className="badge badge-outline mt-1">
                  {(actualCurrentPlayer?.side || currentPlayer.side || currentPlayer.choice || 'UNKNOWN').toUpperCase()}
                </div>
              </div>
              <div className="divider my-2"></div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Bet: $10</span>
                {!isCreator && (
                  <div className="badge badge-neutral badge-sm">
                    Auto-assigned: opposite of creator
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Other Player */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">
              <Users className="h-5 w-5" />
              Opponent {otherPlayer ? (otherPlayer.is_creator ? '(Creator)' : '(Joiner)') : ''}
            </h3>
            <div className="space-y-3">
              {otherPlayer ? (
                <>
                  <div>
                    <p className="font-medium">{otherPlayer.name}</p>
                    <div className="badge badge-outline mt-1">
                      {(otherPlayer.side || 'UNKNOWN').toUpperCase()}
                    </div>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Bet: $10</span>
                    <div className="badge badge-neutral badge-sm">
                      {otherPlayer.is_creator ? 'Chose this side' : 'Auto-assigned'}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-base-content/70 italic">Waiting for player...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coin Animation */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center space-y-6">
          <div className="flex justify-center">
            <div
              className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-accent to-secondary shadow-lg transition-all duration-500 ${
                isFlipping ? 'animate-spin' : ''
              }`}
            >
              <div className="w-full h-full flex items-center justify-center text-accent-content text-xl md:text-2xl font-bold">
                {isFlipping ? '?' : room.result ? room.result.toUpperCase() : '?'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            <span className="text-lg md:text-xl font-semibold">
              Total Pot: <span className="text-success">$20</span>
            </span>
          </div>
        </div>
      </div>

      {/* Game Results */}
      {isFinished && room.result && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            {(() => {
            // Use personalized result from game_completed event if available
            const actualPlayerSide = actualCurrentPlayer?.side || currentPlayer.side || currentPlayer.choice
            const playerWon = room.personalResult === 'win' || actualPlayerSide === room.result
            const resultEmoji = playerWon ? '🎉' : '😢'
            const resultTitle = playerWon ? 'You Win!' : 'You Lose!'

            if (playerWon) {
              return (
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl md:text-2xl font-bold text-success">
                        {resultEmoji} {resultTitle}
                      </h3>
                      <div className="badge badge-success badge-lg">
                        Coin Result: {room.result.toUpperCase()}
                      </div>
                    </div>
                    <div className="divider"></div>
                    <div className="space-y-2">
                      <p className="text-lg md:text-xl font-bold text-success">
                        You win ${room.winnings || room.totalPot || 20}!
                      </p>
                      {room.winner && (
                        <p className="text-sm text-base-content/70">
                          Winner: {typeof room.winner === 'string' ? room.winner : (room.winner?.name || 'Unknown Player')}
                        </p>
                      )}
                    </div>
                  </div>
              )
            } else {
              return (
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl md:text-2xl font-bold text-error">
                        {resultEmoji} {resultTitle}
                      </h3>
                      <div className="badge badge-error badge-lg">
                        Coin Result: {room.result.toUpperCase()}
                      </div>
                    </div>
                    <div className="divider"></div>
                    <div className="space-y-2">
                      <p className="text-lg md:text-xl font-bold text-error">
                        You lose ${room.winnings !== undefined ? (room.totalPot || 20) - room.winnings : 10}
                      </p>
                      {room.winner && (
                        <p className="text-sm text-base-content/70">
                          Winner: {typeof room.winner === 'string' ? room.winner : (room.winner?.name || 'Unknown Player')}
                        </p>
                      )}
                    </div>
                  </div>
              )
            }
          })()}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col items-center space-y-4">
        {/* Auto-Game Flow - No manual triggers needed */}
            {room.status === 'waiting' && (
              <div className="text-center space-y-2">
                <p className="text-base-content/70">
                  Waiting for another player to join...
                </p>
                <p className="text-sm text-base-content/50">
                  Game will start automatically when both players are ready
                </p>
              </div>
            )}

            {room.status === 'full' && (
              <div className="text-center space-y-2">
                <p className="font-medium">
                  🎮 Game starting automatically...
                </p>
                <p className="text-sm text-base-content/70">
                  No action needed - sit back and watch!
                </p>
              </div>
            )}

            {(room.status === 'playing' || room.status === 'flipping') && (
              <div className="text-center space-y-2">
                <p className="font-medium">
                  🪙 Game in progress...
                </p>
                <p className="text-sm text-base-content/70">
                  The coin is being flipped automatically
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {isFinished && (
                <button
                  onClick={onLeaveRoom}
                  className="btn btn-outline w-full sm:w-auto"
                >
                  🚪 Leave Room
                </button>
              )}

              {/* Leave room button - available during active game */}
              {!isFinished && (
                <button
                  onClick={onLeaveRoom}
                  className="btn btn-error w-full sm:w-auto text-sm"
                >
                  🚪 Leave Room
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}