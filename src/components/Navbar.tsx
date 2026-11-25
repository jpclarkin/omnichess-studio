import React from "react";
import type { GameMode, BoardTheme, PerformancePlan } from "../types/chess";
import { Cpu, Users, BarChart2, Target, BookOpen, GraduationCap, Volume2, VolumeX, Palette, Globe, Bot } from "lucide-react";

interface NavbarProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  theme: BoardTheme;
  onChangeTheme: (theme: BoardTheme) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenImportModal: () => void;
  onOpenCoach?: () => void;
  playerProfile?: PerformancePlan;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  theme,
  onChangeTheme,
  isMuted,
  onToggleMute,
  onOpenImportModal,
  onOpenCoach,
  playerProfile,
  onOpenProfile,
}) => {
  const modes: { id: GameMode; label: string; icon: React.ReactNode }[] = [
    { id: "vs-computer", label: "Play vs Engine", icon: <Cpu className="w-4 h-4" /> },
    { id: "pass-play", label: "Pass & Play", icon: <Users className="w-4 h-4" /> },
    { id: "analysis", label: "Game Review", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "training", label: "Coach & Drills", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "puzzles", label: "Tactics Trainer", icon: <Target className="w-4 h-4" /> },
    { id: "openings", label: "Opening Explorer", icon: <BookOpen className="w-4 h-4" /> },
  ];

  const themes: { id: BoardTheme; label: string }[] = [
    { id: "emerald", label: "Emerald Classic" },
    { id: "wood", label: "Heritage Wood" },
    { id: "slate", label: "Tournament Slate" },
    { id: "cyberpunk", label: "High Contrast" },
  ];

  return (
    <header className="w-full bg-[#11131a] border-b border-[#232733] sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1a1d27] border border-[#2f3547] flex items-center justify-center text-emerald-400 font-bold text-lg select-none">
            ♞
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-widest uppercase">OMNICHESS</span>
              <span className="text-[10px] font-mono text-emerald-300 border border-emerald-600/60 px-1.5 py-0.2 rounded bg-emerald-950/60 font-semibold">
                Stockfish 19
              </span>
            </div>
            <p className="hidden 2xl:block text-[11px] text-slate-400">
              Chess Analysis, Engine Play & Repertoire Training
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="order-last xl:order-none w-full xl:w-auto flex flex-wrap items-center justify-center gap-1 bg-[#161821] p-1 rounded-lg border border-[#262a36]">
          {modes.map((m) => {
            const isActive = currentMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#222736] text-white border border-[#373e52] shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1c1f2b]"
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Utilities & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Player Profile Button */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              title="View Player Profile & Diagnostics"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-[#161821] hover:bg-[#222736] text-slate-200 hover:text-white rounded-lg border border-[#262a36] text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                {playerProfile?.profileUsername?.charAt(0) || playerProfile?.playerName?.charAt(0) || "P"}
              </div>
              <span className="font-semibold max-w-[90px] truncate hidden sm:inline">
                {playerProfile?.profileUsername || playerProfile?.playerName || "Profile"}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-[#10121a] px-1.5 py-0.2 rounded border border-[#293246]">
                {playerProfile?.overallRating || 1600}
              </span>
            </button>
          )}

          {/* AI Coach Button */}
          {onOpenCoach && (
            <button
              onClick={onOpenCoach}
              title="Open Grandmaster AI Coach"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/50 text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Coach</span>
            </button>
          )}

          {/* Import from Chess.com / Lichess */}
          <button
            onClick={onOpenImportModal}
            title="Import games from Chess.com or Lichess"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161821] hover:bg-[#222736] text-slate-200 hover:text-white rounded-lg border border-[#262a36] text-xs font-medium transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Games</span>
          </button>

          {/* Board Theme */}
          <div className="flex items-center gap-1.5 bg-[#161821] px-2.5 py-1.5 rounded-lg border border-[#262a36]">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={theme}
              onChange={(e) => onChangeTheme(e.target.value as BoardTheme)}
              className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#161821] text-slate-200">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? "Enable Audio" : "Mute Audio"}
            className="p-1.5 bg-[#161821] hover:bg-[#222736] text-slate-300 hover:text-white rounded-lg border border-[#262a36] transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
