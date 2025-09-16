'use client'

import React, { useState } from 'react'
import { validatePlayerName, sanitizeString } from '../utils/validation'
import { ButtonClickHandler } from '../types/game'
import { Plus, DollarSign, AlertCircle } from 'lucide-react'

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
    <div className="card bg-base-300 shadow-lg p-8 w-full max-w-md">
      <div className="card-body space-y-6">
        <div className="text-center">
          <h2 className="card-title text-2xl justify-center gap-3 mb-2">
            <Plus className="h-7 w-7 text-primary" />
            Create New Room
          </h2>
          <p className="text-base-content/70">
            Set up a new game and invite a friend to join
          </p>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

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
            disabled={isCreating}
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

        {/* Side Selection */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Choose Your Side</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleChoiceChange('heads')}
              disabled={isCreating}
              className={`btn h-12 text-base ${
                choice === 'heads' ? 'btn-primary' : 'btn-outline'
              } ${isCreating ? 'btn-disabled' : ''}`}
            >
              Heads
            </button>
            <button
              onClick={handleChoiceChange('tails')}
              disabled={isCreating}
              className={`btn h-12 text-base ${
                choice === 'tails' ? 'btn-primary' : 'btn-outline'
              } ${isCreating ? 'btn-disabled' : ''}`}
            >
              Tails
            </button>
          </div>
        </div>

        {/* Fixed Bet Amount Display */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Bet Amount (Fixed)</span>
          </label>
          <div className="alert alert-success">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="h-6 w-6" />
              <span className="text-3xl font-bold">10.00</span>
            </div>
            <p className="text-sm text-center mt-2">
              Fixed stake amount for all games
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          className={`btn w-full h-14 text-lg gap-3 ${
            isCreating ? 'btn-disabled' : 'btn-primary'
          }`}
        >
          {isCreating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating Room...
            </>
          ) : (
            <>
              <Plus className="h-6 w-6" />
              Create Room
            </>
          )}
        </button>
      </div>
    </div>
  )
}