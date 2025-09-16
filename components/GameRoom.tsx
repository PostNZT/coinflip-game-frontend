"use client";

import React, { useEffect, useState } from "react";
import { Room, Player } from "../types/game";
import { Copy, Crown, Users, DollarSign, Coins } from "lucide-react";

interface GameRoomProps {
  readonly room: Room;
  readonly currentPlayer: Player;
  readonly onStartGame: () => void;
  readonly onFlipCoin: () => void;
  readonly onLeaveRoom: () => void;
}

export default function GameRoom({
  room,
  currentPlayer,
  onStartGame: _onStartGame,
  onFlipCoin: _onFlipCoin,
  onLeaveRoom,
}: GameRoomProps): React.JSX.Element {
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (room.status === "flipping") {
      setIsFlipping(true);
      timer = setTimeout(() => setIsFlipping(false), 2000);
    } else {
      setIsFlipping(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [room.status]);

  const isWaiting: boolean = room.status === "waiting";
  const isFinished: boolean = room.status === "completed";

  const actualCurrentPlayer: Player | undefined =
    room.players?.find((p) => p.id === currentPlayer.id) ??
    room.players?.find((p) => p.name === currentPlayer.name) ??
    room.players?.[0];

  const isCreator: boolean = !!actualCurrentPlayer?.is_creator;

  const otherPlayer: Player | undefined = room.players?.find(
    (p) => p.id !== actualCurrentPlayer?.id
  );

  const playerSide: string | undefined =
    actualCurrentPlayer?.side ?? currentPlayer.side ?? currentPlayer.choice;

  const playerWon: boolean = !!(
    isFinished &&
    room.result &&
    (room.personalResult === "win" ||
      (playerSide && room.result && playerSide === room.result))
  );

  return (
    <>
      <div className="text-center space-y-3">
        <h1 className="text-lg sm:text-xl font-extrabold flex items-center justify-center gap-2 text-gray-900">
          <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
          Coinflip Game
        </h1>

        <div className="bg-gradient-to-r from-purple-100 via-yellow-50 to-purple-100 border border-yellow-300/40 rounded-lg p-2 shadow-inner max-w-[220px] mx-auto">
          <p className="text-[10px] font-medium text-gray-600 mb-1">
            ROOM CODE
          </p>
          <div className="text-lg font-extrabold font-mono tracking-wider text-purple-900 mb-1">
            {room.code}
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => void navigator.clipboard.writeText(room.code)}
              className="inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold text-purple-900 shadow-[0_0_4px_rgba(0,0,0,0.2)] transition-all duration-200"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-sm sm:text-base mt-2">
        {isWaiting && (
          <p className="text-gray-700">🕐 Waiting for another player...</p>
        )}
        {room.status === "full" && (
          <p className="text-green-600">✅ Both players ready! Starting...</p>
        )}
        {room.status === "playing" && (
          <p className="text-blue-600">🎮 Preparing coin flip...</p>
        )}
        {(isFlipping || room.status === "flipping") && (
          <p className="text-purple-600">🪙 Flipping coin...</p>
        )}
        {isFinished && (
          <p className="text-purple-700 font-bold">🎉 Game finished!</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <div className="bg-gradient-to-br from-yellow-50 to-purple-50 rounded-md p-2 border border-yellow-300/40 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-1 text-sm">
            {isCreator ? (
              <Crown className="h-4 w-4 text-yellow-500" />
            ) : (
              <Users className="h-4 w-4 text-purple-600" />
            )}
            You {isCreator ? "(Creator)" : "(Joiner)"}
          </h3>
          <p className="truncate">
            {actualCurrentPlayer?.name ?? currentPlayer.name}
          </p>
          <p className="mt-1 font-bold text-purple-700 text-xs">
            {(playerSide ?? "UNKNOWN").toUpperCase()}
          </p>
          <p className="mt-2 flex items-center gap-1 text-gray-700 text-xs">
            <DollarSign className="h-4 w-4" /> $10
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-yellow-50 rounded-md p-2 border border-purple-300/40 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-1 text-sm">
            {otherPlayer?.is_creator ? (
              <Crown className="h-4 w-4 text-yellow-500" />
            ) : (
              <Users className="h-4 w-4 text-purple-600" />
            )}
            Opponent {otherPlayer?.is_creator ? "(Creator)" : "(Joiner)"}
          </h3>
          {otherPlayer ? (
            <>
              <p className="truncate">{otherPlayer.name}</p>
              <p className="mt-1 font-bold text-yellow-700 text-xs">
                {(otherPlayer.side ?? "UNKNOWN").toUpperCase()}
              </p>
              <p className="mt-2 flex items-center gap-1 text-gray-700 text-xs">
                <DollarSign className="h-4 w-4" /> $10
              </p>
            </>
          ) : (
            <p className="italic text-gray-500">Waiting...</p>
          )}
        </div>
      </div>

      <div className="text-center mt-4 space-y-3">
        <div className="flex justify-center">
          <div
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-[0_0_10px_rgba(255,215,0,0.6)] flex items-center justify-center text-purple-900 font-bold text-lg ${
              isFlipping ? "animate-spin" : ""
            }`}
          >
            {isFlipping ? "?" : room.result?.toUpperCase() ?? "?"}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-green-700 font-bold text-sm">
          <DollarSign className="h-4 w-4" />
          Pot: <span className="text-green-600">${room.totalPot ?? 20}</span>
        </div>
      </div>

      {isFinished && room.result && (
        <div className="text-center mt-3">
          <h3
            className={`text-lg font-extrabold ${
              playerWon ? "text-green-600" : "text-red-600"
            }`}
          >
            {playerWon ? "🎉 You Win!" : "😢 You Lose!"}
          </h3>
          <p
            className={`${playerWon ? "text-green-700" : "text-red-700"} mt-1`}
          >
            Coin Result: {room.result.toUpperCase()}
          </p>
          <p
            className={`mt-2 text-sm font-bold ${
              playerWon ? "text-green-600" : "text-red-600"
            }`}
          >
            {playerWon
              ? `You win $${room.winnings ?? room.totalPot ?? 20}!`
              : `You lose $${(room.totalPot ?? 20) - (room.winnings ?? 10)}`}
          </p>
        </div>
      )}

      <div className="flex justify-center mt-4">
        <button
          onClick={onLeaveRoom}
          className="relative inline-flex items-center rounded-xl 
          bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 
          px-4 py-2 text-sm font-bold text-yellow-300 
          shadow-[0_0_5px_rgba(0,0,0,0.2)] 
          hover:shadow-[0_0_20px_rgba(138,43,226,1),0_0_40px_rgba(138,43,226,0.9)] 
          transition-all duration-300 
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Leave the Game
        </button>
      </div>
    </>
  );
}
