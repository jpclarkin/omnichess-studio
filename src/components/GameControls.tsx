import React from "react";
import { RotateCw, Flag, Handshake, Undo2, Volume2, VolumeX, BarChart2, PlusCircle, Cpu, User } from "lucide-react";
import type { BotProfile } from "../types/chess";

interface GameControlsProps {
  whiteTime: number;
  blackTime: number;
  turn: "w" | "b";
  isClockActive: boolean;
  bot?: BotProfile | null;
  playerColor?: "w" | "b";
  isMuted: boolean;
  onToggleMute: () => void;
  onFlipBoard: () => void;
  onResign: () => void;
  onDraw: () => void;
  onTakeback: () => void;
  onNewGame: () => void;
  onAnalyzeGame: () => void;
  canTakeback: boolean;
  isGameOver: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  whiteTime,
  blackTime,
  turn,
  isClockActive,
  bot,
  playerColor = "w",
  isMuted,
  onToggleMute,
  onFlipBoard,
  onResign,
  onDraw,
  onTakeback,
  onNewGame,
  onAnalyzeGame,
  canTakeback,
  isGameOver,
}) => {
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isWhiteActive = turn === "w" && isClockActive && !isGameOver;
  const isBlackActive = turn === "b" && isClockActive && !isGameOver;

  return (
    <div className="flex flex-col gap-3 w-full bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
      {/* Black / Opponent Card */}
      <div className="flex items-center justify-between bg-[#11131a] p-3 rounded-lg border border-[#232733]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#222736] border border-[#333a4d] flex items-center justify-center">
            {bot ? <Cpu className="w-4 h-4 text-sky-400" /> : <User className="w-4 h-4 text-slate-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-xs">{bot ? bot.name : "Player 2"}</span>
              {bot && (
                <span className="text-[10px] font-mono font-medium bg-[#222736] text-sky-300 px-1.5 py-0.2 rounded border border-[#333a4d]">
                  {bot.strengthLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {bot ? bot.level : "Black Pieces"}
            </p>
          </div>
        </div>

        {/* Black Clock */}
        <div
          className={`px-3 py-1.5 rounded-lg font-mono font-bold text-base border transition-all ${
            isBlackActive
              ? blackTime < 30
                ? "bg-red-950/80 text-red-300 border-red-500 animate-pulse ring-1 ring-red-500/50"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/80 shadow"
              : "bg-[#1c202c] text-slate-400 border-[#2a3040]"
          }`}
        >
          {formatTime(blackTime)}
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="grid grid-cols-5 gap-1.5 bg-[#11131a] p-1.5 rounded-lg border border-[#232733]">
        <button
          onClick={onFlipBoard}
          title="Flip Board Orientation"
          className="flex flex-col items-center justify-center p-2 rounded hover:bg-[#222736] text-slate-300 hover:text-white transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[10px] font-medium">Flip</span>
        </button>
        <button
          onClick={onTakeback}
          disabled={!canTakeback || isGameOver}
          title="Undo Last Move"
          className="flex flex-col items-center justify-center p-2 rounded hover:bg-[#222736] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[10px] font-medium">Undo</span>
        </button>
        <button
          onClick={onDraw}
          disabled={isGameOver}
          title="Offer or Claim Draw"
          className="flex flex-col items-center justify-center p-2 rounded hover:bg-[#222736] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <Handshake className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[10px] font-medium">Draw</span>
        </button>
        <button
          onClick={onResign}
          disabled={isGameOver}
          title="Resign Current Game"
          className="flex flex-col items-center justify-center p-2 rounded hover:bg-red-950/40 text-red-400 hover:text-red-300 transition cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[10px] font-medium">Resign</span>
        </button>
        <button
          onClick={onToggleMute}
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
          className="flex flex-col items-center justify-center p-2 rounded hover:bg-[#222736] text-slate-300 hover:text-white transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 mb-0.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 mb-0.5" />}
          <span className="text-[10px] font-medium">{isMuted ? "Muted" : "Sound"}</span>
        </button>
      </div>

      {/* White / User Card */}
      <div className="flex items-center justify-between bg-[#11131a] p-3 rounded-lg border border-[#232733]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#222736] border border-[#333a4d] flex items-center justify-center">
            <User className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-white text-xs">Player</div>
            <div className="text-[11px] text-slate-400">
              Playing as {playerColor === "w" ? "White" : "Black"}
            </div>
          </div>
        </div>

        {/* White Clock */}
        <div
          className={`px-3 py-1.5 rounded-lg font-mono font-bold text-base border transition-all ${
            isWhiteActive
              ? whiteTime < 30
                ? "bg-red-950/80 text-red-300 border-red-500 animate-pulse ring-1 ring-red-500/50"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/80 shadow"
              : "bg-[#1c202c] text-slate-400 border-[#2a3040]"
          }`}
        >
          {formatTime(whiteTime)}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onNewGame}
          className="flex-1 py-2 px-3 bg-[#222736] hover:bg-[#2c3245] text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-[#333a4d] transition shadow cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
          New Game
        </button>
        <button
          onClick={onAnalyzeGame}
          className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow border border-emerald-500/50 transition cursor-pointer"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Game Review
        </button>
      </div>
    </div>
  );
};
