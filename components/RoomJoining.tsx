'use client'

import React, { useState } from 'react'
import { validatePlayerName, validateRoomCode, sanitizeString } from '../utils/validation'
import { Users, AlertCircle } from 'lucide-react'

/**
 * Props for the RoomJoining component
 */
interface RoomJoiningProps {
  /** Callback fired when successfully joining a room */
  readonly onRoomJoined: (roomCode: string, playerName: string) => void;
  /** External error message (e.g., from WebSocket) */
  readonly externalError?: string | null;
}

/**
 * Local state interface for validation errors
 */
interface ValidationErrors {
  name?: string;
  code?: string;
}

/**
 * Component for joining an existing game room
 * Includes input validation and error handling
 */
export default function RoomJoining({ onRoomJoined, externalError }: RoomJoiningProps): React.JSX.Element {
  const [playerName, setPlayerName] = useState<string>('')
  const [roomCode, setRoomCode] = useState<string>('')
  const [isJoining, setIsJoining] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  /**
   * Validates all form inputs
   * @returns True if all inputs are valid
   */
  const validateInputs = (): boolean => {
    const errors: ValidationErrors = {}

    // Validate player name
    const nameValidation = validatePlayerName(playerName)
    if (!nameValidation.isValid && nameValidation.error) {
      errors.name = nameValidation.error
    }

    // Validate room code
    const codeValidation = validateRoomCode(roomCode)
    if (!codeValidation.isValid && codeValidation.error) {
      errors.code = codeValidation.error
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Handles room joining with proper error handling
   */
  const handleJoinRoom = (): void => {
    // Clear previous errors
    setError(null)
    setValidationErrors({})

    // Validate inputs
    if (!validateInputs()) {
      return
    }

    setIsJoining(true)

    try {
      const sanitizedName = sanitizeString(playerName)
      const sanitizedCode = roomCode.trim().toUpperCase()

      // Success - notify parent component to handle WebSocket room joining
      onRoomJoined(sanitizedCode, sanitizedName)
    } catch (error: unknown) {
      console.error('Error joining room:', error)

      // Set user-friendly error message
      if (error instanceof Error) {
        // Specific handling for room capacity errors
        if (error.message.toLowerCase().includes('full')) {
          setError('This room is already full (2/2 players). Please try a different room.')
        } else {
          setError(error.message)
        }
      } else {
        setError('Failed to join room. Please check your connection and try again.')
      }
      setIsJoining(false)
    }
  }

  /**
   * Handles player name input with validation
   */
  const handleNameChange = (value: string): void => {
    setPlayerName(value)

    // Clear name validation error when user starts typing
    if (validationErrors.name) {
      setValidationErrors(prev => {
        const { name, ...rest } = prev
        return rest
      })
    }
  }

  /**
   * Handles room code input with validation
   */
  const handleCodeChange = (value: string): void => {
    // Convert to uppercase and limit to 6 characters
    const formattedCode = value.toUpperCase().substring(0, 6)
    setRoomCode(formattedCode)

    // Clear code validation error when user starts typing
    if (validationErrors.code) {
      setValidationErrors(prev => {
        const { code, ...rest } = prev
        return rest
      })
    }
  }

  return (
    <div className="card bg-base-300 shadow-lg p-8 w-full max-w-md">
      <div className="card-body space-y-6">
        <div className="text-center">
          <h2 className="card-title text-2xl justify-center gap-3 mb-2">
            <Users className="h-7 w-7 text-primary" />
            Join Room
          </h2>
          <p className="text-base-content/70">
            Enter a room code to join an existing game
          </p>
        </div>

        {/* Global Error Display */}
        {(error || externalError) && (
          <div className="alert alert-error">
            <AlertCircle className="h-5 w-5" />
            <span>{externalError || error}</span>
          </div>
        )}

        <div className="space-y-6">

          {/* Player Name Input */}
          <div className="form-control w-full">
            <label className="label" htmlFor="playerName">
              <span className="label-text">Your Name</span>
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              disabled={isJoining}
              className={`input input-bordered w-full ${
                validationErrors.name ? 'input-error' : ''
              }`}
            />
            {validationErrors.name && (
              <label className="label">
                <span className="label-text-alt text-error">{validationErrors.name}</span>
              </label>
            )}
          </div>

          {/* Room Code Input */}
          <div className="form-control w-full">
            <label className="label" htmlFor="roomCode">
              <span className="label-text">Room Code (6 characters)</span>
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              maxLength={6}
              disabled={isJoining}
              className={`input input-bordered w-full text-center font-mono text-lg tracking-wider ${
                validationErrors.code ? 'input-error' : ''
              }`}
            />
            {validationErrors.code && (
              <label className="label">
                <span className="label-text-alt text-error">{validationErrors.code}</span>
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleJoinRoom}
            disabled={isJoining}
            className="btn btn-primary w-full h-12 text-base"
          >
            {isJoining ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Joining Room...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Join Room
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}