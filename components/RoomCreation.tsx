"use client";

import React, { useState, ChangeEvent } from "react";
import { validatePlayerName, sanitizeString } from "../utils/validation";
import { Plus, AlertCircle } from "lucide-react";

interface RoomCreationProps {
  readonly onRoomCreated: (
    playerName: string,
    choice: "heads" | "tails",
    bet: number
  ) => void;
  readonly externalError?: string | null;
}

interface ValidationErrors {
  name?: string;
}

export default function RoomCreation({
  onRoomCreated,
  externalError,
}: RoomCreationProps): React.JSX.Element {
  const [playerName, setPlayerName] = useState<string>("");
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [bet] = useState<number>(10);
  const [isCreating, setIsCreating] = useState<boolean>(false);
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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRoom = (): void => {
    setError(null);
    setValidationErrors({});

    if (!validateInputs()) {
      return;
    }

    setIsCreating(true);

    try {
      const sanitizedName = sanitizeString(playerName);
      onRoomCreated(sanitizedName, choice, bet);
    } catch (err: unknown) {
      console.error("Error creating room:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to create room. Please check your connection and try again."
        );
      }
      setIsCreating(false);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setPlayerName(value);

    if (validationErrors.name) {
      setValidationErrors((prev) => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleChoiceChange = (newChoice: "heads" | "tails"): void => {
    setChoice(newChoice);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <span className="text-yellow-500">＋</span>
          Create New Room
        </h2>
        <p className="text-gray-500 text-sm">
          Set up a new game and invite a friend to join
        </p>
      </div>

      <div>
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
          onChange={handleNameChange}
          className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 shadow-sm ${
            validationErrors.name
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-yellow-500"
          }`}
          placeholder="Enter your name"
          disabled={isCreating}
        />
        {validationErrors.name && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {validationErrors.name}
          </p>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 mb-2">
          Choose Your Side
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleChoiceChange("heads")}
            disabled={isCreating}
            className={`relative inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              choice === "heads"
                ? "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-purple-900 shadow-[0_0_10px_rgba(255,215,0,0.9)] hover:shadow-[0_0_20px_rgba(255,223,0,1),0_0_40px_rgba(255,215,0,0.9)] focus:ring-yellow-400"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Heads
          </button>
          <button
            type="button"
            onClick={() => handleChoiceChange("tails")}
            disabled={isCreating}
            className={`relative inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              choice === "tails"
                ? "bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-yellow-300 shadow-[0_0_10px_rgba(138,43,226,0.9)] hover:shadow-[0_0_20px_rgba(138,43,226,1),0_0_40px_rgba(138,43,226,0.9)] focus:ring-purple-500"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Tails
          </button>
        </div>
      </div>

      <div className="text-center p-4 border rounded-lg bg-green-50 border-green-200">
        <p className="text-2xl font-bold text-green-600">$ {bet.toFixed(2)}</p>
        <p className="text-sm text-gray-500">
          Fixed stake amount for all games
        </p>
      </div>

      {(error || externalError) && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error || externalError}
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="relative inline-flex items-center justify-center rounded-xl 
            bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 
            px-4 py-2 text-sm font-extrabold text-purple-900 
            shadow-[0_0_5px_rgba(0,0,0,0.2)] 
            hover:shadow-[0_0_20px_rgba(255,223,0,1),0_0_40px_rgba(255,215,0,0.9)] 
            transition-all duration-300 
            focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 w-full disabled:opacity-70"
        >
          {isCreating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating Room...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Room
            </>
          )}
        </button>
      </div>
    </div>
  );
}
