import React, { useState } from "react";
import type { BotProfile, TimeControl, GameMode } from "../types/chess";
import { BOT_PROFILES, TIME_CONTROLS } from "../data/bots";
import { X, Play, Clock, Cpu, Users } from "lucide-react";

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (config: {
    mode: GameMode;
    bot: BotProfile | null;
    playerColor: "w" | "b" | "random";
    timeControl: TimeControl;
  }) => void;
  initialMode?: GameMode;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  initialMode = "vs-computer",
}) => {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [selectedBot, setSelectedBot] = useState<BotProfile>(BOT_PROFILES[2]); // Club
  const [selectedColor, setSelectedColor] = useState<"w" | "b" | "random">("w");
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[3]); // 10 min Rapid

  if (!isOpen) return null;

  const handleStart = () => {
    onStartGame({
      mode,
      bot: mode === "vs-computer" ? selectedBot : null,
      playerColor: selectedColor,
      timeControl: selectedTimeControl,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161821] p-5 md:p-6 rounded-xl border border-[#333a4d] shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262a36] mb-4">
          <div>
            <h3 className="text-white font-bold text-base">Game Configuration</h3>
            <p className="text-xs text-slate-400">Configure opponent, time controls, and side</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#222736] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
            Game Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("vs-computer")}
              className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                mode === "vs-computer"
                  ? "bg-[#222736] text-white border-emerald-500 shadow-sm"
                  : "bg-[#11131a] text-slate-400 border-[#232733] hover:bg-[#1a1d28]"
              }`}
            >
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Computer Engine</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("pass-play")}
              className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
                mode === "pass-play"
                  ? "bg-[#222736] text-white border-emerald-500 shadow-sm"
                  : "bg-[#11131a] text-slate-400 border-[#232733] hover:bg-[#1a1d28]"
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Pass & Play (2 Player)</span>
            </button>
          </div>
        </div>

        {/* Engine Tier Selection */}
        {mode === "vs-computer" && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
              Engine Difficulty
            </label>
            <p className="text-[10px] text-slate-500 mb-2">
              All levels are Stockfish with its strength limiter. "Engine Elo" is Stockfish's own scale, not a Chess.com or Lichess rating.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BOT_PROFILES.map((bot) => (
                <div
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
                    selectedBot.id === bot.id
                      ? "bg-[#222736] border-emerald-500 shadow-sm"
                      : "bg-[#11131a] border-[#232733] hover:bg-[#1a1d28]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#181a24] border border-[#2e3444] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {bot.level.replace("Level ", "L")}
                    </span>
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">{bot.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 block">
                      {bot.strengthLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {bot.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side Selection */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
            Play Side
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedColor("w")}
              className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                selectedColor === "w"
                  ? "bg-slate-200 text-slate-900 border-white shadow"
                  : "bg-[#11131a] text-slate-300 border-[#232733] hover:bg-[#1a1d28]"
              }`}
            >
              <span>White</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedColor("random")}
              className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                selectedColor === "random"
                  ? "bg-[#222736] text-white border-emerald-500 shadow"
                  : "bg-[#11131a] text-slate-300 border-[#232733] hover:bg-[#1a1d28]"
              }`}
            >
              <span>Random</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedColor("b")}
              className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                selectedColor === "b"
                  ? "bg-slate-800 text-white border-slate-600 shadow"
                  : "bg-[#11131a] text-slate-300 border-[#232733] hover:bg-[#1a1d28]"
              }`}
            >
              <span>Black</span>
            </button>
          </div>
        </div>

        {/* Time Control */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Time Control
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => setSelectedTimeControl(tc)}
                className={`py-2 px-2 rounded-lg border text-xs font-medium text-center truncate transition cursor-pointer ${
                  selectedTimeControl.id === tc.id
                    ? "bg-[#222736] text-emerald-300 border-emerald-500 shadow-sm"
                    : "bg-[#11131a] text-slate-400 border-[#232733] hover:bg-[#1a1d28]"
                }`}
              >
                {tc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          Initialize Game
        </button>
      </div>
    </div>
  );
};
