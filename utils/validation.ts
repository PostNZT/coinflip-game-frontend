/**
 * Input validation utilities for the coinflip game
 */

import { GameError, ValidationResult } from '../types/game';

/**
 * Validates player name input
 * @param name - The player name to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePlayerName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (trimmedName.length > 20) {
    return { isValid: false, error: 'Name cannot exceed 20 characters' };
  }

  // Basic sanitization check - no HTML/script tags
  if (/<[^>]*>/.test(trimmedName)) {
    return { isValid: false, error: 'Name cannot contain HTML tags' };
  }

  return { isValid: true };
}

/**
 * Validates bet amount
 * @param bet - The bet amount to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateBet(bet: number): ValidationResult {
  if (typeof bet !== 'number' || isNaN(bet)) {
    return { isValid: false, error: 'Bet must be a valid number' };
  }

  if (bet < 1) {
    return { isValid: false, error: 'Minimum bet is $1' };
  }

  if (bet > 1000) {
    return { isValid: false, error: 'Maximum bet is $1000' };
  }

  if (!Number.isInteger(bet)) {
    return { isValid: false, error: 'Bet must be a whole number' };
  }

  return { isValid: true };
}

/**
 * Validates room code format
 * @param code - The room code to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateRoomCode(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Room code is required' };
  }

  const trimmedCode = code.trim().toUpperCase();

  if (trimmedCode.length !== 6) {
    return { isValid: false, error: 'Room code must be exactly 6 characters' };
  }

  // Only allow alphanumeric characters
  if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
    return { isValid: false, error: 'Room code can only contain letters and numbers' };
  }

  return { isValid: true };
}

/**
 * Sanitizes string input to prevent XSS
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 100); // Limit length
}

/**
 * Creates a standardized error object
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns GameError object
 */
export function createError(code: string, message: string, details?: any): GameError {
  return {
    code,
    message,
    details
  };
}