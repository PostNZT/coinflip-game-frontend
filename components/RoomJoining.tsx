"use client";

import { AlertCircle, Users } from "lucide-react";
import React, { useState } from "react";
import {
  sanitizeString,
  validatePlayerName,
  validateRoomCode,
} from "../utils/validation";

interface RoomJoiningProps {
  readonly onRoomJoined: (roomCode: string, playerName: string) => void;
  readonly externalError?: string | null;
}

interface ValidationErrors {
  name?: string;
  code?: string;
}

export default function RoomJoining({
  onRoomJoined,
  externalError,
}: RoomJoiningProps): React.JSX.Element {
  const [playerName, setPlayerName] = useState<string>("");
  const [roomCode, setRoomCode] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  const validateInputs = (): boolean => {
    const errors: ValidationErrors = {};

    const nameValidation = validatePlayerName(playerName);
    if (!nameValidation.isValid && nameValidation.error) {
      errors.name = nameValidation.error;
    }

    const codeValidation = validateRoomCode(roomCode);
    if (!codeValidation.isValid && codeValidation.error) {
      errors.code = codeValidation.error;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleJoinRoom = (): void => {
    setError(null);
    setValidationErrors({});

    if (!validateInputs()) {
      return;
    }

    setIsJoining(true);

    try {
      const sanitizedName: string = sanitizeString(playerName);
      const sanitizedCode: string = roomCode.trim().toUpperCase();

      onRoomJoined(sanitizedCode, sanitizedName);
    } catch (err: unknown) {
      console.error("Error joining room:", err);

      if (err instanceof Error) {
        if (err.message.toLowerCase().includes("full")) {
          setError(
            "This room is already full (2/2 players). Please try a different room."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(
          "Failed to join room. Please check your connection and try again."
        );
      }

      setIsJoining(false);
    }
  };

  const handleNameChange = (value: string): void => {
    setPlayerName(value);
    if (validationErrors.name) {
      setValidationErrors((prev) => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCodeChange = (value: string): void => {
    const formattedCode: string = value.toUpperCase().substring(0, 6);
    setRoomCode(formattedCode);

    if (validationErrors.code) {
      setValidationErrors((prev) => {
        const { code, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <div className="card bg-white/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/60">
      <div className="card-body space-y-6">
        <div className="text-center">
          <h2 className="card-title text-2xl justify-center gap-3 mb-2 text-gray-800">
            <Users className="h-7 w-7 text-purple-500" />
            Join Room
          </h2>
          <p className="text-gray-600">
            Enter a room code to join an existing game
          </p>
        </div>

        {(error || externalError) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/80 border border-red-400/50 text-red-100 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5" />
            <span>{externalError || error}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="form-control w-full">
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleNameChange(e.target.value)
              }
              placeholder="Enter your name"
              maxLength={20}
              disabled={isJoining}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 shadow-sm ${
                validationErrors.name
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-yellow-500"
              }`}
            />
            {validationErrors.name && (
              <label className="label">
                <span className="label-text-alt text-red-500">
                  {validationErrors.name}
                </span>
              </label>
            )}
          </div>

          <div className="form-control w-full">
            <label
              htmlFor="roomCode"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Room Code (6 characters)
            </label>

            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleCodeChange(e.target.value)
              }
              placeholder="ABC123"
              maxLength={6}
              disabled={isJoining}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 shadow-sm ${
                validationErrors.name
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-purple-500"
              }`}
            />
            {validationErrors.code && (
              <label className="label">
                <span className="label-text-alt text-red-500">
                  {validationErrors.code}
                </span>
              </label>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="relative inline-flex items-center justify-center rounded-xl 
                bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 
                px-4 py-2 text-sm font-extrabold text-purple-900 
                shadow-[0_0_5px_rgba(0,0,0,0.2)] 
                hover:shadow-[0_0_20px_rgba(255,223,0,1),0_0_40px_rgba(255,215,0,0.9)] 
                transition-all duration-300 
                focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 w-full disabled:opacity-70"
            >
              {isJoining ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Joining Room...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Join Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
