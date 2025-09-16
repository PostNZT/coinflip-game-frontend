"use client";

import Layout from "@/components/layouts/Layout";
import { AlertCircle, Coins, Plus, Users, Wifi, WifiOff } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import GameRoom from "../components/GameRoom";
import RoomCreation from "../components/RoomCreation";
import RoomJoining from "../components/RoomJoining";
import { useWebSocket } from "../hooks/useWebSocket";
import { Player, TempPlayer } from "../types/game";
import { logError, logInfo } from "../utils/logger";

type GameMode = "menu" | "create" | "join" | "game";

export default function Home(): React.JSX.Element {
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState<boolean>(false);
  const {
    room,
    isConnected,
    error,
    createRoom,
    joinRoom,
    clearRoom,
    forceReconnect,
    forceGameStart,
  } = useWebSocket();

  React.useEffect(() => {
    if (room && room.players && currentPlayer) {
      const currentPlayerName = currentPlayer.name;
      const currentPlayerSide = currentPlayer.side || currentPlayer.choice;

      let updatedCurrentPlayer = null;

      if (currentPlayerName) {
        updatedCurrentPlayer = room.players.find(
          (p) => p.name === currentPlayerName
        );
      }

      if (!updatedCurrentPlayer) {
        updatedCurrentPlayer = room.players.find(
          (p) => p.side === currentPlayerSide
        );
      }

      if (updatedCurrentPlayer && updatedCurrentPlayer.name) {
        const needsUpdate =
          currentPlayer.id !== updatedCurrentPlayer.id ||
          currentPlayer.socket_id !== updatedCurrentPlayer.socket_id ||
          currentPlayer.is_creator !== updatedCurrentPlayer.is_creator ||
          currentPlayer.has_paid !== updatedCurrentPlayer.has_paid ||
          currentPlayer.stake_amount !== updatedCurrentPlayer.stake_amount;

        if (needsUpdate) {
          setCurrentPlayer({
            ...updatedCurrentPlayer,
            choice: currentPlayer.choice || updatedCurrentPlayer.side,
          });
        }
      }
    }
  }, [room?.players, room?.code]);

  const [finalGameResult, setFinalGameResult] = useState<any>(null);

  const handleRoomCreated = (
    playerName: string,
    choice: "heads" | "tails",
    bet: number
  ): void => {
    try {
      const tempPlayer: TempPlayer = {
        id: "temp-id",
        name: playerName,
        side: choice,
        choice,
        bet,
      };

      const player: Player = {
        ...tempPlayer,
        choice: tempPlayer.choice,
      };
      setCurrentPlayer(player);
      createRoom(choice, playerName);
      setGameMode("game");
    } catch (error) {
      logError("Error in handleRoomCreated", error);
    }
  };

  const handleRoomJoined = (code: string, playerName: string): void => {
    try {
      const tempPlayer: TempPlayer = {
        id: "temp-id",
        name: playerName,
        side: "heads",
        choice: "heads",
        bet: 10,
      };

      const player: Player = {
        ...tempPlayer,
        choice: tempPlayer.choice,
      };
      setCurrentPlayer(player);
      joinRoom(code, playerName);
      setGameMode("game");
    } catch (error) {
      logError("Error in handleRoomJoined", error);
    }
  };

  const handleLeaveRoom = (): void => {
    try {
      setCurrentPlayer(null);
      setFinalGameResult(null);
      clearRoom();

      setGameMode("menu");

      toast.success("Left room successfully", {
        id: "leave-room-success",
        duration: 2000,
      });
    } catch (error) {
      logError("Error in handleLeaveRoom", error);
    }
  };

  React.useEffect(() => {
    if (room && currentPlayer && gameMode !== "game") {
      setGameMode("game");
    }
  }, [room, currentPlayer, gameMode]);

  React.useEffect(() => {
    if (gameMode === "menu" && !isConnected && !isAutoReconnecting) {
      setIsAutoReconnecting(true);
      const reconnectTimer = setTimeout(() => {
        logInfo("Auto-reconnecting - connection was lost...");
        forceReconnect();

        toast.loading("Connecting to server...", {
          id: "auto-reconnect-menu",
          duration: 5000,
        });
      }, 1000);

      return () => clearTimeout(reconnectTimer);
    }

    if (isConnected && isAutoReconnecting) {
      setIsAutoReconnecting(false);
      toast.dismiss("auto-reconnect-menu");
      toast.success("Connected to server!", {
        id: "auto-reconnect-success",
        duration: 2000,
      });
    }

    return undefined;
  }, [gameMode, isConnected, isAutoReconnecting, forceReconnect]);

  React.useEffect(() => {
    if (room && room.status === "completed" && room.result) {
      setFinalGameResult({
        ...room,
        completedAt: new Date().toISOString(),
      });

      if (gameMode !== "game") {
        setGameMode("game");
      }
    }
  }, [room, gameMode]);

  React.useEffect(() => {
    try {
      if (error && (gameMode === "create" || gameMode === "join")) {
        const errorLower = error.toLowerCase();

        if (
          errorLower.includes("full") ||
          errorLower.includes("not found") ||
          errorLower.includes("not available")
        ) {
          const timer = setTimeout(() => {
            setGameMode("menu");
          }, 3000);
          return () => clearTimeout(timer);
        }
      }
    } catch (effectError) {
      logError("Error in error handling effect", effectError);
    }
    return undefined;
  }, [error, gameMode]);

  if (gameMode === "game") {
    const gameRoom = finalGameResult || room;
    const gamePlayer =
      currentPlayer ||
      (gameRoom
        ? ({
            id: "temp-player",
            name: "You",
            side: gameRoom.yourSide || "heads",
            choice: gameRoom.yourSide || "heads",
          } as Player)
        : null);

    if (gameRoom && gamePlayer) {
      return (
        <Layout>
          <GameRoom
            room={gameRoom}
            currentPlayer={gamePlayer}
            onStartGame={forceGameStart}
            onFlipCoin={() => {}}
            onLeaveRoom={handleLeaveRoom}
          />
          {!isConnected && (
            <div className="fixed top-4 right-4">
              <div className="alert alert-error text-sm shadow-md">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </div>
            </div>
          )}

          {error && (
            <div className="fixed top-4 left-4">
              <div className="alert alert-error text-sm shadow-md">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            </div>
          )}
        </Layout>
      );
    }

    return (
      <Layout>
        <div
          className="
          backdrop-blur-xl bg-white/20 
          rounded-2xl border border-white/30 
          shadow-2xl p-8 w-full max-w-xl 
          mx-auto space-y-6 text-center
        "
        >
          <h2 className="text-xl font-bold text-yellow-400 flex items-center justify-center gap-2">
            <Coins className="h-6 w-6" />
            Loading Game...
          </h2>

          {error ? (
            <div className="space-y-4">
              <div className="alert alert-error">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
              <button
                onClick={handleLeaveRoom}
                className="relative inline-flex items-center rounded-xl 
                bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 
                px-4 py-2 text-sm font-bold text-yellow-300 
                shadow-[0_0_5px_rgba(0,0,0,0.2)] 
                hover:shadow-[0_0_20px_rgba(138,43,226,1),0_0_40px_rgba(138,43,226,0.9)] 
                transition-all duration-300 
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                ← Back to Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
              <p className="text-base-content/70">Connecting to game...</p>
              <button
                onClick={handleLeaveRoom}
                className="btn btn-outline w-full"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {gameMode === "menu" && (
        <div className="text-center space-y-6 p-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-3 text-gray-800 mb-2">
              <Coins className="h-8 w-8 text-yellow-500" />
              Coinflip Game
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Create a room and share the code with a friend, or join an
              existing room to play!
            </p>
          </div>

          {/* Connection Status */}
          <div className="space-y-3">
            {isConnected ? (
              <div className="alert bg-green-50 border-green-200 text-green-800 flex items-center justify-center gap-3">
                <Wifi className="h-5 w-5" />
                <span className="font-medium">Connected to Server</span>
              </div>
            ) : isAutoReconnecting ? (
              <div className="alert bg-yellow-50 border-yellow-200 text-yellow-800 flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex items-center gap-3">
                  <span className="loading loading-spinner loading-sm"></span>
                  <div className="text-center">
                    <div className="font-medium">Connecting to Server...</div>
                    <div className="text-sm opacity-75">
                      Auto-reconnecting after leaving room
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert border-red-200 text-red-800 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <WifiOff className="h-5 w-5" />
                    <span className="font-medium">Not Connected to Server</span>
                  </div>
                  <button
                    onClick={forceReconnect}
                    className="btn bg-red-600 hover:bg-red-700 text-white border-red-600 btn-sm"
                  >
                    Click to reconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="alert bg-red-50 border-red-200 text-red-800 flex items-center justify-center gap-3 text-center">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-row gap-3 items-center justify-center">
            <button
              type="button"
              onClick={() => setGameMode("create")}
              disabled={!isConnected}
              className="relative inline-flex items-center rounded-xl 
                  bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 
                  px-4 py-2 text-sm font-extrabold text-purple-900 
                  shadow-[0_0_5px_rgba(0,0,0,0.2)] 
                  hover:shadow-[0_0_20px_rgba(255,223,0,1),0_0_40px_rgba(255,215,0,0.9)] 
                  transition-all duration-300 
                  focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Room
            </button>

            <button
              type="button"
              onClick={() => setGameMode("join")}
              disabled={!isConnected}
              className="relative inline-flex items-center rounded-xl 
                bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 
                px-4 py-2 text-sm font-bold text-yellow-300 
                shadow-[0_0_5px_rgba(0,0,0,0.2)] 
                hover:shadow-[0_0_20px_rgba(138,43,226,1),0_0_40px_rgba(138,43,226,0.9)] 
                transition-all duration-300 
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Join Room
            </button>
          </div>
        </div>
      )}

      {gameMode === "create" && (
        <div className="space-y-6 w-full flex flex-col items-center justify-center text-center">
          <RoomCreation onRoomCreated={handleRoomCreated} />

          {error && (
            <div className="max-w-md w-full mx-auto">
              <div className="alert bg-red-900/80 border-red-400/50 text-red-100 flex items-center justify-center gap-3 mx-auto text-center backdrop-blur-sm">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="text-center flex justify-center">
            <button
              onClick={() => setGameMode("menu")}
              className="relative inline-flex items-center rounded-xl 
      bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 
      px-4 py-2 text-sm font-bold text-yellow-300 
      shadow-[0_0_5px_rgba(0,0,0,0.2)] 
      hover:shadow-[0_0_20px_rgba(138,43,226,1),0_0_40px_rgba(138,43,226,0.9)] 
      transition-all duration-300 
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      )}

      {gameMode === "join" && (
        <div className="space-y-6 w-full flex flex-col items-center justify-center text-center">
          <RoomJoining onRoomJoined={handleRoomJoined} externalError={error} />

          <div className="text-center flex justify-center">
            <button
              onClick={() => setGameMode("menu")}
              className="relative inline-flex items-center rounded-xl 
      bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 
      px-4 py-2 text-sm font-bold text-yellow-300 
      shadow-[0_0_5px_rgba(0,0,0,0.2)] 
      hover:shadow-[0_0_20px_rgba(138,43,226,1),0_0_40px_rgba(138,43,226,0.9)] 
      transition-all duration-300 
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
