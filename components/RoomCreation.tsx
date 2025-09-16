'use client'

import React, { useState } from 'react'
import { validatePlayerName, sanitizeString } from '../utils/validation'
import { ButtonClickHandler } from '../types/game'

/**
 * Props for the RoomCreation component
 */
interface RoomCreationProps {
  /** Callback fired when a room is successfully created */
  readonly onRoomCreated: (playerName: string, choice: 'heads' | 'tails', bet: number) => void;
  /** External error message (e.g., from WebSocket) */
  readonly externalError?: string | null;
}

/**
 * Local state interface for validation errors
 */
interface ValidationErrors {
  name?: string;
}

/**
 * Component for creating a new game room
 * Includes input validation and error handling
 */
export default function RoomCreation({ onRoomCreated }: RoomCreationProps): React.JSX.Element {
  const [playerName, setPlayerName] = useState<string>('')
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads')
  const [bet] = useState<number>(10) // Fixed stake amount
  const [isCreating, setIsCreating] = useState<boolean>(false)
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

    // No bet validation needed - fixed amount

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Handles room creation with proper error handling
   */
  const handleCreateRoom = (): void => {
    // Clear previous errors
    setError(null)
    setValidationErrors({})

    // Validate inputs
    if (!validateInputs()) {
      return
    }

    setIsCreating(true)

    try {
      const sanitizedName = sanitizeString(playerName)

      // Success - notify parent component to handle WebSocket room creation
      onRoomCreated(sanitizedName, choice, bet)
    } catch (error: unknown) {
      console.error('Error creating room:', error)

      // Set user-friendly error message
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to create room. Please check your connection and try again.')
      }
      setIsCreating(false)
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
   * Handles choice button clicks
   */
  const handleChoiceChange = (newChoice: 'heads' | 'tails'): ButtonClickHandler => {
    return (): void => {
      setChoice(newChoice)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Create New Room
      </h2>

      {/* Global Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
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
            disabled={isCreating}
          />
          {validationErrors.name && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
          )}
        </div>

        {/* Side Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Your Side
          </label>
          <div className="flex space-x-4">
            <button
              onClick={handleChoiceChange('heads')}
              disabled={isCreating}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors disabled:opacity-50 ${
                choice === 'heads'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Heads
            </button>
            <button
              onClick={handleChoiceChange('tails')}
              disabled={isCreating}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors disabled:opacity-50 ${
                choice === 'tails'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tails
            </button>
          </div>
        </div>

        {/* Fixed Bet Amount Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bet Amount (Fixed)
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-semibold text-center">
            $10.00
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Fixed stake amount for all games
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isCreating ? 'Creating Room...' : 'Create Room'}
        </button>
      </div>
    </div>
  )
}