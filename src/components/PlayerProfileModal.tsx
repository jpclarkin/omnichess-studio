import React, { useState } from "react";
import type { PerformancePlan } from "../types/chess";
import { diagnosticService } from "../services/diagnosticService";
import {
  User,
  Target,
  Download,
  Upload,
  RotateCcw,
  X,
  ExternalLink,
  Edit2,
  Check,
  Database,
} from "lucide-react";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PerformancePlan;
  onPlanUpdated: (updatedPlan: PerformancePlan) => void;
  onNavigateToTraining: () => void;
  onOpenImportGames: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  plan,
  onPlanUpdated,
  onNavigateToTraining,
  onOpenImportGames,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(plan.profileUsername || plan.playerName || "Candidate Master");
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;
    const updated = diagnosticService.setProfileName(clean, plan.profilePlatform || "local");
    onPlanUpdated(updated);
    setIsEditingName(false);
  };

  const handleExportBackup = () => {
    const dataStr = diagnosticService.exportProfileJson();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeUser = (plan.profileUsername || plan.playerName || "omnichess_player").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.download = `omnichess_profile_${safeUser}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setCopiedStatus("Backup downloaded!");
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const updated = diagnosticService.importProfileJson(text);
        onPlanUpdated(updated);
        setNameInput(updated.profileUsername || updated.playerName);
        setCopiedStatus("Profile restored successfully!");
        setTimeout(() => setCopiedStatus(null), 3000);
      } catch (err: any) {
        alert(err?.message || "Invalid profile JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetProfile = () => {
    const updated = diagnosticService.resetPlan();
    onPlanUpdated(updated);
    setNameInput(updated.profileUsername || updated.playerName);
    setShowResetConfirm(false);
    setCopiedStatus("Profile reset to default baseline.");
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const wins = plan.winLossRecord?.wins || 0;
  const losses = plan.winLossRecord?.losses || 0;
  const draws = plan.winLossRecord?.draws || 0;
  const totalMatches = wins + losses + draws;
  const winRate = totalMatches > 0 ? Math.round(((wins + draws * 0.5) / totalMatches) * 100) : 0;
  const solvedDrills = plan.drills.filter((d) => d.solved).length;

  const competencies = [
    { key: "opening", label: "Opening Discipline", data: plan.competencies.opening, color: "bg-amber-500" },
    { key: "tactics", label: "Tactical Vigilance", data: plan.competencies.tactics, color: "bg-red-500" },
    { key: "pieceActivity", label: "Piece Harmony", data: plan.competencies.pieceActivity, color: "bg-blue-500" },
    { key: "pawnStructure", label: "Pawn Structure", data: plan.competencies.pawnStructure, color: "bg-emerald-500" },
    { key: "endgame", label: "Endgame Technique", data: plan.competencies.endgame, color: "bg-purple-500" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#141722] w-full max-w-2xl rounded-2xl border border-[#2b3244] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#222838] flex items-center justify-between bg-[#11131c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 border border-emerald-400/40 flex items-center justify-center text-white font-bold text-xl shadow-md select-none">
              ♚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  PLAYER PROFILE & DIAGNOSTICS
                </h2>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 uppercase font-semibold">
                  {plan.profilePlatform === "chess.com"
                    ? "Chess.com Synced"
                    : plan.profilePlatform === "lichess"
                    ? "Lichess Synced"
                    : "Local Studio Profile"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Persistent personal performance profile, rating calibration & history
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1e2333] text-slate-400 hover:text-white transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Identity & Elo Card */}
          <div className="bg-[#191d2a] p-4 rounded-xl border border-[#283042] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#23293b] border border-[#374158] flex items-center justify-center text-slate-300">
                <User className="w-6 h-6 text-emerald-400" />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                  Active Player Name
                </span>

                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-[#10121a] border border-emerald-500 px-2 py-1 rounded text-white text-xs focus:outline-none font-medium"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded cursor-pointer"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 bg-[#232838] hover:bg-[#2d3448] text-slate-300 rounded cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-sm font-bold text-white">
                      {plan.profileUsername || plan.playerName || "Candidate Master"}
                    </h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-slate-400 hover:text-emerald-400 transition cursor-pointer p-0.5"
                      title="Edit player display handle"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <span className="text-[11px] text-slate-400 font-mono">
                  {plan.totalGamesAnalyzed} games contributing to curriculum
                </span>
              </div>
            </div>

            {/* Rating pill */}
            <div className="bg-[#12141d] px-3.5 py-2 rounded-xl border border-[#272e40] text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                Estimated FIDE Rating
              </span>
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {plan.overallRating}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Elo
                </span>
              </div>
            </div>
          </div>

          {/* Session Persistence & Storage Architecture Banner */}
          <div className="bg-[#10131d] p-3.5 rounded-xl border border-[#232a3d] flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 text-xs">
                  Session Persistence: LocalStorage (100% Private & Offline)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Your personal experience, match history, tactical weakness profiles, and drill progress are persisted in your browser's persistent storage under <code className="text-emerald-300 font-mono text-[10px] bg-[#171a26] px-1 py-0.2 rounded border border-[#2c344a]">omnichess_performance_plan_v1</code>. No remote account creation or cloud tracking is required.
              </p>
            </div>
          </div>

          {/* Performance Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#181c28] p-3 rounded-xl border border-[#252c3d]">
              <span className="text-[10px] text-slate-400 uppercase block font-mono">Match Record</span>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                <span className="text-emerald-400">{wins}W</span> - <span className="text-red-400">{losses}L</span> - <span className="text-slate-400">{draws}D</span>
              </div>
            </div>

            <div className="bg-[#181c28] p-3 rounded-xl border border-[#252c3d]">
              <span className="text-[10px] text-slate-400 uppercase block font-mono">Win Rate</span>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {winRate}%
              </div>
            </div>

            <div className="bg-[#181c28] p-3 rounded-xl border border-[#252c3d]">
              <span className="text-[10px] text-slate-400 uppercase block font-mono">Avg Accuracy</span>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {plan.overallAccuracyAvg}%
              </div>
            </div>

            <div className="bg-[#181c28] p-3 rounded-xl border border-[#252c3d]">
              <span className="text-[10px] text-slate-400 uppercase block font-mono">Drills Solved</span>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {solvedDrills} / {plan.drills.length}
              </div>
            </div>
          </div>

          {/* 5 Competencies Progress */}
          <div className="bg-[#181c28] p-3.5 rounded-xl border border-[#252c3d] flex flex-col gap-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
              5 Technical Competency Diagnostics
            </span>

            <div className="flex flex-col gap-2">
              {competencies.map((c) => (
                <div key={c.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">{c.label}</span>
                    <span className="font-mono text-white font-semibold">
                      {c.data.score}/100 <span className="text-[10px] text-slate-500 font-normal">({c.data.rating} Elo • {c.data.level})</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#10121a] rounded-full overflow-hidden border border-[#252c3d]">
                    <div
                      className={`h-full rounded-full ${c.color}`}
                      style={{ width: `${c.data.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status message */}
          {copiedStatus && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-center font-medium">
              {copiedStatus}
            </div>
          )}

          {/* Reset Confirmation Dialog */}
          {showResetConfirm && (
            <div className="bg-red-950/70 border border-red-500/50 p-3 rounded-xl flex flex-col gap-2">
              <span className="text-red-300 font-semibold text-xs">
                Are you sure you want to reset your profile and diagnostic history?
              </span>
              <p className="text-[11px] text-red-200/80">
                This will restore the default baseline profile and clear imported game records. Consider exporting a backup first.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleResetProfile}
                  className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Yes, Reset Profile
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1 bg-[#1e2333] hover:bg-[#282e42] text-slate-300 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#222838] bg-[#11131c] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportBackup}
              className="px-2.5 py-1.5 bg-[#191d2a] hover:bg-[#222738] text-slate-300 hover:text-white rounded-lg border border-[#2c344a] flex items-center gap-1.5 transition cursor-pointer"
              title="Download full profile backup (JSON)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Backup</span>
            </button>

            <label
              className="px-2.5 py-1.5 bg-[#191d2a] hover:bg-[#222738] text-slate-300 hover:text-white rounded-lg border border-[#2c344a] flex items-center gap-1.5 transition cursor-pointer"
              title="Import profile from backup JSON file"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            {!showResetConfirm && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-2.5 py-1.5 bg-[#191d2a] hover:bg-red-950 text-slate-400 hover:text-red-300 rounded-lg border border-[#2c344a] hover:border-red-500/50 flex items-center gap-1.5 transition cursor-pointer"
                title="Reset profile data"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenImportGames();
              }}
              className="px-3 py-1.5 bg-[#1c2232] hover:bg-[#252d42] text-slate-200 hover:text-white rounded-lg border border-[#2f3952] flex items-center gap-1.5 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Import More Games</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onNavigateToTraining();
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Open Coach & Drills</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
