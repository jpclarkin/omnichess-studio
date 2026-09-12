import React, { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "./Chessboard";
import { diagnosticService } from "../services/diagnosticService";
import { soundManager } from "../audio/soundManager";
import type { BoardTheme, PerformancePlan, PlayerDrill } from "../types/chess";
import {
  GraduationCap,
  Target,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Play,
  Lightbulb,
  History,
  TrendingUp,
  Brain,
  ShieldAlert,
  ChevronRight,
  User,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";

interface TrainingPlanViewProps {
  theme: BoardTheme;
  onOpenImportModal: () => void;
  onLoadGamePgn?: (pgn: string) => void;
}

export const TrainingPlanView: React.FC<TrainingPlanViewProps> = ({
  theme,
  onOpenImportModal,
  onLoadGamePgn,
}) => {
  const [plan, setPlan] = useState<PerformancePlan>(() => diagnosticService.getPerformancePlan());
  const [activeTab, setActiveTab] = useState<"diagnostics" | "drills" | "history">("diagnostics");

  const handleResetProfile = () => {
    if (window.confirm("Reset profile to default baseline and clear imported archive history?")) {
      const reset = diagnosticService.resetPlan();
      setPlan(reset);
    }
  };

  // Drill Lab State
  const [selectedDrillIndex, setSelectedDrillIndex] = useState<number>(0);
  const [drillFilter, setDrillFilter] = useState<"all" | "personal" | "curated">("all");
  const [drillGame, setDrillGame] = useState<Chess>(() => new Chess());
  const [drillStatus, setDrillStatus] = useState<"active" | "solved" | "failed">("active");
  const [drillMessage, setDrillMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [isCalibratingRating, setIsCalibratingRating] = useState(false);
  const [ratingInput, setRatingInput] = useState(plan.overallRating.toString());

  useEffect(() => {
    setRatingInput(plan.overallRating.toString());
  }, [plan.overallRating]);

  const handleSaveCalibratedRating = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(ratingInput, 10);
    if (isNaN(val) || val < 400 || val > 3000) {
      alert("Please enter a valid Elo rating between 400 and 3000.");
      return;
    }
    const updated = diagnosticService.setPlayerRating(val);
    setPlan(updated);
    setIsCalibratingRating(false);
  };

  // Subscribe to live plan updates (calibrations, migrations, batch imports)
  useEffect(() => {
    const current = diagnosticService.getPerformancePlan();
    setPlan(current);
    return diagnosticService.subscribe((updated) => {
      setPlan(updated);
    });
  }, []);

  // Sync plan updates
  const refreshPlan = () => {
    setPlan(diagnosticService.getPerformancePlan());
  };

  const filteredDrills = plan.drills.filter((d) => {
    if (drillFilter === "personal") return d.category === "personal-blunder";
    if (drillFilter === "curated") return d.category !== "personal-blunder";
    return true;
  });

  const currentDrill: PlayerDrill | undefined = filteredDrills[selectedDrillIndex] || filteredDrills[0];

  // Initialize Drill Board when selected drill changes
  useEffect(() => {
    if (currentDrill) {
      const g = new Chess();
      try {
        g.load(currentDrill.fen);
      } catch {
        console.warn("Invalid drill FEN:", currentDrill.fen);
      }
      setDrillGame(g);
      setDrillStatus(currentDrill.solved ? "solved" : "active");
      setDrillMessage(null);
      setShowHint(false);
      setShowSolution(false);
    }
  }, [currentDrill]);

  // Handle move played in the drill
  const handleDrillMove = (moveObj: { from: string; to: string; promotion?: string }) => {
    if (!currentDrill || drillStatus === "solved") return;

    const gameCopy = new Chess(drillGame.fen());
    let moveRes = null;
    try {
      moveRes = gameCopy.move({
        from: moveObj.from,
        to: moveObj.to,
        promotion: (moveObj.promotion || "q") as "q" | "r" | "b" | "n",
      });
    } catch {
      return;
    }

    if (!moveRes) return;

    setDrillGame(gameCopy);

    // Check if move matches the winning master solution
    const targetSan = currentDrill.solutionMoves[0];
    const isCorrect = moveRes.san === targetSan;

    if (isCorrect) {
      soundManager.playSuccess();
      setDrillStatus("solved");
      setDrillMessage(`Brilliant! ${moveRes.san} is the exact continuation identified by Stockfish 19.`);
      diagnosticService.markDrillSolved(currentDrill.id);
      refreshPlan();
    } else {
      soundManager.playBlunder();
      setDrillStatus("failed");
      setDrillMessage(`${moveRes.san} is imprecise. Concedes tactical tempo.`);
    }
  };

  const handleResetDrill = () => {
    if (currentDrill) {
      const g = new Chess();
      g.load(currentDrill.fen);
      setDrillGame(g);
      setDrillStatus("active");
      setDrillMessage(null);
      setShowHint(false);
      setShowSolution(false);
    }
  };

  const solvedCount = plan.drills.filter((d) => d.solved).length;
  const totalDrills = plan.drills.length;
  const solvedPercent = totalDrills > 0 ? Math.round((solvedCount / totalDrills) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Header Card */}
      <div className="bg-[#151822] border border-[#2b3142] p-5 md:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Personal Training & Diagnostics
              </h2>
              <span className="text-[10px] font-mono text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded bg-emerald-950/60 font-semibold">
                Stockfish 19 Calibrated
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Personalized performance plans and tactical drills derived from your analyzed games
            </p>
          </div>
        </div>

        {/* Rating & Stats Cards */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end overflow-x-auto">
          <div className="bg-[#1b1e2a] border border-[#30384c] px-3.5 py-2 rounded-xl flex flex-col items-center shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-400">Est. Rating</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {plan.overallRating}
            </span>
          </div>

          <div className="bg-[#1b1e2a] border border-[#30384c] px-3.5 py-2 rounded-xl flex flex-col items-center shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-400">Avg Accuracy</span>
            <span className="text-lg font-bold font-mono text-slate-200">
              {plan.overallAccuracyAvg}%
            </span>
          </div>

          <div className="bg-[#1b1e2a] border border-[#30384c] px-3.5 py-2 rounded-xl flex flex-col items-center shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-400">Drills Solved</span>
            <span className="text-lg font-bold font-mono text-teal-300">
              {solvedCount}/{totalDrills}
            </span>
          </div>

          <button
            onClick={onOpenImportModal}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Import games from Chess.com or Lichess to refresh diagnostics"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sync Games</span>
          </button>
        </div>
      </div>

      {/* Active Player Profile Banner */}
      <div className="bg-[#12141d] border border-[#262c3d] px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Player:</span>
            <span className="font-bold text-white font-mono">{plan.playerName}</span>
            {plan.profilePlatform && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#1e2332] text-emerald-300 border border-[#30384c] font-semibold">
                {plan.profilePlatform}
              </span>
            )}
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rating:</span>
            {isCalibratingRating ? (
              <form onSubmit={handleSaveCalibratedRating} className="flex items-center gap-1">
                <input
                  type="number"
                  min="400"
                  max="3000"
                  value={ratingInput}
                  onChange={(e) => setRatingInput(e.target.value)}
                  className="w-16 bg-[#10121a] border border-emerald-500 px-1.5 py-0.5 rounded text-white text-xs font-mono font-bold"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded cursor-pointer"
                  title="Save calibrated rating"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalibratingRating(false)}
                  className="p-1 bg-[#232838] hover:bg-[#2d3448] text-slate-300 rounded cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-emerald-400">
                  {plan.overallRating} Elo
                </span>
                <button
                  onClick={() => {
                    setRatingInput(plan.overallRating.toString());
                    setIsCalibratingRating(true);
                  }}
                  className="text-slate-500 hover:text-emerald-400 transition cursor-pointer p-0.5"
                  title="Calibrate your rating manually (e.g. 1000 Elo)"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Match Record:</span>
            <span className="font-mono font-bold text-teal-300">
              {plan.winLossRecord
                ? `${plan.winLossRecord.wins}W - ${plan.winLossRecord.losses}L - ${plan.winLossRecord.draws}D`
                : "Initial Baseline"}
            </span>
            {plan.winLossRecord &&
              plan.winLossRecord.wins + plan.winLossRecord.losses + plan.winLossRecord.draws > 0 && (
                <span className="text-[11px] font-mono text-slate-400">
                  (
                  {Math.round(
                    (plan.winLossRecord.wins /
                      (plan.winLossRecord.wins + plan.winLossRecord.losses + plan.winLossRecord.draws)) *
                      100
                  )}
                  % Win Rate)
                </span>
              )}
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400">
            <span className="text-slate-200 font-bold font-mono">{plan.totalGamesAnalyzed}</span> games contributing
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-[#1b202e] hover:bg-[#252c40] text-emerald-300 hover:text-emerald-200 rounded-lg border border-[#333d54] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Batch ingest archives from Chess.com or Lichess"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Batch Ingest Archive</span>
          </button>
          <button
            onClick={handleResetProfile}
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition cursor-pointer"
            title="Reset Profile & History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#232733] pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "diagnostics"
                ? "bg-[#222736] text-white border border-[#373e52] shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
            }`}
          >
            <Brain className="w-4 h-4 text-emerald-400" />
            <span>Diagnostics & 7-Day Regimen</span>
          </button>

          <button
            onClick={() => setActiveTab("drills")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "drills"
                ? "bg-[#222736] text-white border border-[#373e52] shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
            }`}
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Personal Drill Lab ({filteredDrills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "history"
                ? "bg-[#222736] text-white border border-[#373e52] shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
            }`}
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>Game History ({plan.gamesHistory.length})</span>
          </button>
        </div>

        {/* Solved Progress Meter */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span>Curriculum Mastery:</span>
          <div className="w-28 bg-[#1a1d27] h-2 rounded-full overflow-hidden border border-[#2d3446]">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${solvedPercent}%` }}
            />
          </div>
          <span className="font-mono text-emerald-400 text-xs font-bold">{solvedPercent}%</span>
        </div>
      </div>

      {/* TAB 1: DIAGNOSTICS & 7-DAY REGIMEN */}
      {activeTab === "diagnostics" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Coach Assessment & Summary */}
          <div className="bg-[#151822] border border-[#2d3342] p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Personalized Assessment by Stockfish 19
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono bg-[#1b1e2a] px-2.5 py-1 rounded-lg border border-[#2e3547]">
                <span className="text-slate-400">Estimated Rating:</span>
                <span className="font-bold text-emerald-400">{plan.overallRating} Elo</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#1b1e2a] p-3.5 rounded-lg border border-[#2b3040]">
              {plan.coachPrescription}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Strengths */}
              <div className="bg-[#12141c] border border-emerald-900/40 p-3.5 rounded-lg">
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Demonstrated Strengths
                </h4>
                <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
                  {plan.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-[#12141c] border border-rose-900/40 p-3.5 rounded-lg">
                <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Identified Tactical & Positional Deficits
                </h4>
                <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
                  {plan.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 5 Core Competency Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Technical Competency Breakdown
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {plan.totalGamesAnalyzed} games analyzed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.values(plan.competencies).map((comp) => {
                const isWeakness = comp.score < 75;
                return (
                  <div
                    key={comp.name}
                    className={`bg-[#151822] p-4 rounded-xl border flex flex-col justify-between shadow transition ${
                      isWeakness ? "border-amber-500/40 bg-[#171720]" : "border-[#2b3142]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {comp.level}
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {comp.rating}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-2 leading-tight">
                        {comp.name}
                      </h4>

                      {/* Score Bar */}
                      <div className="w-full bg-[#202534] h-2 rounded-full overflow-hidden mb-3 border border-[#2a3040]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            comp.score >= 80
                              ? "bg-emerald-500"
                              : comp.score >= 70
                              ? "bg-teal-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${comp.score}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug mb-2">
                        {comp.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#232733] text-[10px] text-slate-400 font-mono">
                      <span className="text-slate-500 font-semibold block mb-0.5">Tendency:</span>
                      <span className="text-slate-300 line-clamp-2">{comp.tendency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-Day Performance Improvement Regimen */}
          <div className="bg-[#151822] border border-[#2b3142] p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Prescribed 7-Day Performance Improvement Regimen
                </h3>
              </div>
              <span className="text-xs text-slate-400">Customized for your diagnosed deficiencies</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {plan.weeklyPlan.map((day, idx) => {
                const isToday = ((new Date().getDay() + 6) % 7) === idx;
                return (
                  <div
                    key={day.dayNumber}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                      isToday
                        ? "bg-[#1c2233] border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                        : "bg-[#12141c] border-[#252b3b]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-200">{day.dayName}</span>
                        {isToday && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-bold">
                            Today
                          </span>
                        )}
                      </div>

                      <h5 className="text-[11px] font-semibold text-emerald-400 mb-1.5 leading-tight">
                        {day.focusTitle}
                      </h5>

                      <p className="text-[10px] text-slate-400 leading-snug mb-2">
                        {day.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#232733] flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Drills Target:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {day.drillsCompleted} / {day.targetDrillCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE DRILL LAB */}
      {activeTab === "drills" && currentDrill && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-150">
          {/* Left: Drill Selector List */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* Filter Toggle */}
            <div className="bg-[#151822] p-1.5 rounded-xl border border-[#2b3142] flex gap-1">
              <button
                onClick={() => {
                  setDrillFilter("all");
                  setSelectedDrillIndex(0);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  drillFilter === "all" ? "bg-[#222736] text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                All Drills ({plan.drills.length})
              </button>
              <button
                onClick={() => {
                  setDrillFilter("personal");
                  setSelectedDrillIndex(0);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  drillFilter === "personal" ? "bg-[#222736] text-emerald-400 shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                From Games ({plan.drills.filter((d) => d.category === "personal-blunder").length})
              </button>
              <button
                onClick={() => {
                  setDrillFilter("curated");
                  setSelectedDrillIndex(0);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  drillFilter === "curated" ? "bg-[#222736] text-teal-400 shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Curriculum
              </button>
            </div>

            {/* Drills Scroll List */}
            <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-2 flex flex-col gap-2 max-h-[560px] overflow-y-auto">
              {filteredDrills.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 italic">
                  No drills match the selected filter. Play or import games to generate more personal drills.
                </div>
              )}

              {filteredDrills.map((drill, idx) => {
                const isSelected = idx === selectedDrillIndex;
                const isPersonal = drill.category === "personal-blunder";

                return (
                  <div
                    key={drill.id}
                    onClick={() => setSelectedDrillIndex(idx)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-[#202534] border-emerald-500 shadow-md"
                        : "bg-[#11131a] hover:bg-[#181c26] border-[#232733]"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold ${
                            isPersonal
                              ? "bg-rose-950/70 text-rose-300 border border-rose-800/60"
                              : "bg-teal-950/70 text-teal-300 border border-teal-800/60"
                          }`}
                        >
                          {isPersonal ? "From Your Game" : "Targeted Regimen"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {drill.turn === "w" ? "White" : "Black"} to move
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-white truncate">{drill.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{drill.sourceDescription}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {drill.solved ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Playable Board & Drill Controller */}
          <div className="lg:col-span-8 flex flex-col items-center gap-4">
            {/* Drill Header Information */}
            <div className="w-full bg-[#151822] border border-[#2b3142] p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#202534] border border-[#30384c] flex items-center justify-center text-emerald-400 font-bold">
                  {currentDrill.turn === "w" ? "♔" : "♚"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{currentDrill.title}</h3>
                    <span className="text-[10px] font-mono text-slate-400 border border-[#30384c] px-1.5 py-0.2 rounded bg-[#1b1e2a]">
                      {currentDrill.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{currentDrill.sourceDescription}</p>
                </div>
              </div>

              {currentDrill.badMovePlayed && (
                <div className="bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    Played in game: <strong className="font-mono text-red-200">{currentDrill.badMovePlayed}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Objective Banner */}
            <div className="w-full max-w-[620px] bg-[#11131a] border border-[#232733] px-4 py-2 rounded-lg text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{currentDrill.objective}</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 font-bold uppercase shrink-0">
                {drillGame.turn() === "w" ? "White to Move" : "Black to Move"}
              </span>
            </div>

            {/* Interactive Chessboard (Click-to-Move + Drag-and-Drop) */}
            <Chessboard
              game={drillGame}
              onMove={handleDrillMove}
              isFlipped={currentDrill.playerColor === "b"}
              theme={theme}
              interactive={drillStatus !== "solved"}
            />

            {/* Feedback & Coaching Response */}
            {drillMessage && (
              <div
                className={`w-full max-w-[620px] p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  drillStatus === "solved"
                    ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-200"
                    : "bg-red-950/40 border-red-800/50 text-red-200"
                }`}
              >
                {drillStatus === "solved" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{drillMessage}</p>
                  {drillStatus === "solved" && (
                    <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
                      {currentDrill.coachExplanation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Hint Box */}
            {showHint && (
              <div className="w-full max-w-[620px] bg-[#141824] border border-amber-500/40 p-3 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Stockfish Hint: </span>
                  <span>{currentDrill.hint}</span>
                </div>
              </div>
            )}

            {/* Solution Box */}
            {showSolution && (
              <div className="w-full max-w-[620px] bg-[#141824] border border-emerald-500/40 p-3 rounded-lg text-xs text-emerald-200 flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Master Solution: </span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {currentDrill.solutionMoves.join(" ")}
                  </span>
                  <p className="mt-1 text-slate-300 text-[11px]">{currentDrill.coachExplanation}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetDrill}
                className="px-3 py-1.5 bg-[#1b1e2a] hover:bg-[#242938] text-slate-300 text-xs font-semibold rounded-lg border border-[#2f3547] transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Position
              </button>

              <button
                onClick={() => setShowHint(true)}
                className="px-3 py-1.5 bg-[#1b1e2a] hover:bg-[#242938] text-amber-300 text-xs font-semibold rounded-lg border border-[#2f3547] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Show Hint
              </button>

              <button
                onClick={() => setShowSolution(true)}
                className="px-3 py-1.5 bg-[#1b1e2a] hover:bg-[#242938] text-teal-300 text-xs font-semibold rounded-lg border border-[#2f3547] transition flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                Show Solution
              </button>

              {drillStatus === "solved" && selectedDrillIndex < filteredDrills.length - 1 && (
                <button
                  onClick={() => setSelectedDrillIndex((idx) => idx + 1)}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next Drill</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSTIC GAMES HISTORY */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="bg-[#151822] border border-[#2b3142] p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Analyzed Games Diagnostic Feed</h3>
              <p className="text-xs text-slate-400">
                Games contributing to your personalized tactical profile and custom drills
              </p>
            </div>
            <button
              onClick={onOpenImportModal}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Import More Games
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {plan.gamesHistory.length === 0 && (
              <div className="bg-[#151822] border border-[#2b3142] p-8 rounded-xl text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <History className="w-8 h-8 text-slate-600 mb-1" />
                <span>No games have been analyzed yet in this session.</span>
                <span>Play a game against the Engine or import recent games from Chess.com or Lichess.</span>
              </div>
            )}

            {plan.gamesHistory.map((game) => (
              <div
                key={game.id}
                className="bg-[#151822] border border-[#2b3142] hover:border-emerald-500/50 p-4 rounded-xl shadow transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                      game.userResultOutcome === "win"
                        ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                        : game.userResultOutcome === "loss"
                        ? "bg-rose-950/60 border-rose-800/60 text-rose-300"
                        : "bg-[#202534] border-[#30384c] text-slate-200"
                    }`}
                  >
                    {game.userResultOutcome === "win"
                      ? "W"
                      : game.userResultOutcome === "loss"
                      ? "L"
                      : game.playerColor === "w"
                      ? "♔"
                      : "♚"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white">{game.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400 border border-[#30384c] px-1.5 py-0.2 rounded bg-[#1b1e2a] uppercase">
                        {game.platform}
                      </span>
                      {game.userResultOutcome && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            game.userResultOutcome === "win"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                              : game.userResultOutcome === "loss"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {game.userResultOutcome}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {game.date} • Result: {game.result}
                      {game.openingName ? ` • ${game.openingName}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500">Accuracy</span>
                    <span className="font-bold text-slate-200">{game.accuracy}%</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500">Blunders</span>
                    <span className="font-bold text-rose-400">{game.blundersCount}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500">Missed Wins</span>
                    <span className="font-bold text-amber-400">{game.missedWinsCount}</span>
                  </div>

                  {onLoadGamePgn && game.pgn && (
                    <button
                      onClick={() => onLoadGamePgn(game.pgn)}
                      className="px-3 py-1.5 bg-[#202534] hover:bg-emerald-700 text-slate-200 hover:text-white rounded-lg transition text-xs font-sans font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Review</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
