'use client'

import React, { useState } from 'react'
import { validatePlayerName, validateRoomCode, sanitizeString } from '../utils/validation'

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
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Join Room
      </h2>

      {/* Global Error Display */}
      {(error || externalError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {externalError || error}
        </div>
      )}

      <div className="space-y-4">
        {/* Player Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => handleNameChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.name
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Enter your name"
            maxLength={20}
            disabled={isJoining}
          />
          {validationErrors.name && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
          )}
        </div>

        {/* Room Code Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room Code (6 characters)
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-center font-mono text-lg ${
              validationErrors.code
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="ABC123"
            maxLength={6}
            disabled={isJoining}
          />
          {validationErrors.code && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleJoinRoom}
          disabled={isJoining}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isJoining ? 'Joining Room...' : 'Join Room'}
        </button>
      </div>
    </div>
  )
}