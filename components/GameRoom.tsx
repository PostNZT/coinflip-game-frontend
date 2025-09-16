'use client'

import React, { useState, useEffect } from 'react'
import { Room, Player } from '../types/game'

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
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Coinflip Game
        </h1>

        {/* Prominent Room Code Display */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-blue-600 font-medium mb-1">ROOM CODE</div>
          <div className="text-4xl font-bold font-mono text-blue-800 tracking-wider mb-2">
            {room.code}
          </div>
          <div className="text-sm text-blue-600">
            Share this code with your opponent to join
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(room.code)}
            className="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
          >
            📋 Copy Code
          </button>
        </div>
      </div>

      {/* Room Status */}
      <div className="text-center mb-6">
        {isWaiting && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-4">
            <p className="font-medium text-lg">🕐 Waiting for another player to join...</p>
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-300">
              <p className="text-sm font-medium">Share this room code:</p>
              <div className="text-2xl font-bold font-mono mt-1 text-yellow-800">{room.code}</div>
            </div>
          </div>
        )}
        {room.status === 'full' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
            <p className="font-medium">Both players ready! Game will start automatically...</p>
            <div className="mt-2 text-sm text-green-600">
              ⏱️ Auto-starting in a few seconds...
            </div>
          </div>
        )}
        {room.status === 'playing' && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
            <p className="font-medium">Game starting... Preparing coin flip...</p>
          </div>
        )}
        {(isFlipping || room.status === 'flipping') && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
            <p className="font-medium">🪙 Flipping coin...</p>
            <div className="mt-2 text-sm text-blue-600">
              The fate is being decided...
            </div>
          </div>
        )}
        {isFinished && (
          <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 rounded">
            <p className="font-medium">🎉 Game finished! Check results below.</p>
          </div>
        )}
      </div>

      {/* Players */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Current Player */}
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">
            You {isCreator ? '(Creator)' : '(Joiner)'}
          </h3>
          <p className="text-gray-700">{actualCurrentPlayer?.name || currentPlayer.name}</p>
          <p className="text-lg font-semibold text-blue-600">
            {(actualCurrentPlayer?.side || currentPlayer.side || currentPlayer.choice || 'UNKNOWN').toUpperCase()}
          </p>
          <p className="text-sm text-gray-600">
            Bet: $10
            {!isCreator && (
              <span className="text-blue-600 ml-2">
                (Auto-assigned: opposite of creator)
              </span>
            )}
          </p>
        </div>

        {/* Other Player */}
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
          <h3 className="font-bold text-gray-800 mb-2">
            Opponent {otherPlayer ? (otherPlayer.is_creator ? '(Creator)' : '(Joiner)') : ''}
          </h3>
          {otherPlayer ? (
            <>
              <p className="text-gray-700">{otherPlayer.name}</p>
              <p className="text-lg font-semibold text-gray-600">
                {(otherPlayer.side || 'UNKNOWN').toUpperCase()}
              </p>
              <p className="text-sm text-gray-600">
                Bet: $10
                {otherPlayer.is_creator ? (
                  <span className="text-gray-500 ml-2">(Chose this side)</span>
                ) : (
                  <span className="text-gray-500 ml-2">(Auto-assigned)</span>
                )}
              </p>
            </>
          ) : (
            <div>
              <p className="text-gray-500 italic">Waiting for player...</p>
            </div>
          )}
        </div>
      </div>

      {/* Coin Animation */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <div
            className={`inline-block w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg transition-all duration-500 ${
              isFlipping ? 'animate-spin' : ''
            }`}
          >
            <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
              {isFlipping ? '?' : room.result ? room.result.toUpperCase() : '?'}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Total Pot: <span className="text-green-600">$20</span>
          </p>
        </div>
      </div>

      {/* Game Results */}
      {isFinished && room.result && (
        <div className="text-center mb-6">
          {(() => {
            // Use personalized result from game_completed event if available
            const actualPlayerSide = actualCurrentPlayer?.side || currentPlayer.side || currentPlayer.choice
            const playerWon = room.personalResult === 'win' || actualPlayerSide === room.result
            const resultEmoji = playerWon ? '🎉' : '😢'
            const resultTitle = playerWon ? 'You Win!' : 'You Lose!'

            if (playerWon) {
              return (
                <div className="bg-green-100 border border-green-300 rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-green-800 mb-2">
                    {resultEmoji} {resultTitle}
                  </h3>
                  <p className="text-lg text-green-700 mb-3">
                    Coin Result: <strong>{room.result.toUpperCase()}</strong>
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-3">
                    <p className="text-sm text-gray-600 mb-2">Game Summary:</p>
                    <div className="flex justify-between items-center">
                      <span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800">
                        {actualCurrentPlayer?.name || currentPlayer.name} chose: {(actualCurrentPlayer?.side || currentPlayer.side || currentPlayer.choice || 'UNKNOWN').toUpperCase()}
                      </span>
                      <span className="text-lg font-bold">VS</span>
                      <span className="px-3 py-1 rounded text-sm bg-red-100 text-red-800">
                        {otherPlayer?.name || 'Opponent'}: {(otherPlayer?.side || 'Unknown').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-800">
                    You win ${room.winnings || room.totalPot || 20}!
                  </p>
                  {room.winner && (
                    <p className="text-sm text-gray-600 mt-2">
                      Winner: {typeof room.winner === 'string' ? room.winner : (room.winner?.name || 'Unknown Player')}
                    </p>
                  )}
                </div>
              )
            } else {
              return (
                <div className="bg-red-100 border border-red-300 rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-red-800 mb-2">
                    {resultEmoji} {resultTitle}
                  </h3>
                  <p className="text-lg text-red-700 mb-3">
                    Coin Result: <strong>{room.result.toUpperCase()}</strong>
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-3">
                    <p className="text-sm text-gray-600 mb-2">Game Summary:</p>
                    <div className="flex justify-between items-center">
                      <span className="px-3 py-1 rounded text-sm bg-red-100 text-red-800">
                        {actualCurrentPlayer?.name || currentPlayer.name} chose: {(actualCurrentPlayer?.side || currentPlayer.side || currentPlayer.choice || 'UNKNOWN').toUpperCase()}
                      </span>
                      <span className="text-lg font-bold">VS</span>
                      <span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800">
                        {otherPlayer?.name || 'Opponent'}: {(otherPlayer?.side || 'Unknown').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-red-800">
                    You lose ${room.winnings !== undefined ? (room.totalPot || 20) - room.winnings : 10}
                  </p>
                  {room.winner && (
                    <p className="text-sm text-gray-600 mt-2">
                      Winner: {typeof room.winner === 'string' ? room.winner : (room.winner?.name || 'Unknown Player')}
                    </p>
                  )}
                </div>
              )
            }
          })()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {/* Auto-Game Flow - No manual triggers needed */}
        {room.status === 'waiting' && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Waiting for another player to join...
            </p>
            <p className="text-sm text-gray-500">
              Game will start automatically when both players are ready
            </p>
          </div>
        )}

        {room.status === 'full' && (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-2">
              🎮 Game starting automatically...
            </p>
            <p className="text-sm text-gray-500 mb-4">
              No action needed - sit back and watch!
            </p>

          </div>
        )}

        {(room.status === 'playing' || room.status === 'flipping') && (
          <div className="text-center">
            <p className="text-blue-600 font-medium mb-2">
              🪙 Game in progress...
            </p>
            <p className="text-sm text-gray-500">
              The coin is being flipped automatically
            </p>
          </div>
        )}

        {isFinished && (
          <div className="flex justify-center">
            <button
              onClick={onLeaveRoom}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              🚪 Leave Room
            </button>
          </div>
        )}


        {/* Leave room button - available during active game */}
        {!isFinished && (
          <button
            onClick={onLeaveRoom}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
          >
            🚪 Leave Room
          </button>
        )}
      </div>
    </div>
  )
}