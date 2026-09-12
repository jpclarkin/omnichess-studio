import React, { useState, useEffect } from "react";
import { Chess, type Square } from "chess.js";
import confetti from "canvas-confetti";
import { Chessboard } from "./Chessboard";
import { puzzleService, type PuzzleStats } from "../services/puzzleService";
import { soundManager } from "../audio/soundManager";
import type { TacticalPuzzle, BoardTheme } from "../types/chess";
import {
  ChevronRight,
  RotateCcw,
  CheckCircle,
  Info,
  HelpCircle,
  Target,
  Sparkles,
  Flame,
  Award,
  ExternalLink,
  BookOpen,
  Filter,
} from "lucide-react";

interface PuzzlesViewProps {
  theme: BoardTheme;
  customBlunders?: unknown[];
}

type PuzzleMode = "daily" | "ranked" | "themes";

const THEMES = [
  "All Themes",
  "Fork",
  "Pin",
  "Skewer",
  "Back-Rank Mate",
  "Mate in 1",
  "Smothered Mate",
  "Discovered Attack",
  "Deflection",
  "Sacrifice",
  "Endgame",
];

export const PuzzlesView: React.FC<PuzzlesViewProps> = ({ theme, customBlunders: _customBlunders = [] }) => {
  const [mode, setMode] = useState<PuzzleMode>("daily");
  const [selectedTheme, setSelectedTheme] = useState<string>("All Themes");
  const [difficultyTier, setDifficultyTier] = useState<"novice" | "intermediate" | "advanced" | "master" | "all">("all");

  const [puzzleList, setPuzzleList] = useState<TacticalPuzzle[]>([]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<TacticalPuzzle | null>(null);
  const [game, setGame] = useState<Chess>(new Chess());
  const [moveStep, setMoveStep] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [stats, setStats] = useState<PuzzleStats>(() => puzzleService.getStats());

  const setupBoard = (puz: TacticalPuzzle) => {
    const newGame = new Chess();
    try {
      newGame.load(puz.fen);
    } catch {
      console.warn("Invalid puzzle FEN:", puz.fen);
    }
    setGame(newGame);
    setCurrentPuzzle(puz);
    setMoveStep(0);
    setIsSolved(false);
    setIsFailed(false);
    setShowHint(false);
    setLastMove(null);
  };

  // Load puzzles depending on selected mode
  useEffect(() => {
    let isCancelled = false;

    async function loadPuzzlesForMode() {
      if (mode === "daily") {
        setIsLoadingDaily(true);
        const daily = await puzzleService.fetchDailyPuzzle();
        if (!isCancelled && daily) {
          setPuzzleList([daily]);
          setPuzzleIndex(0);
          setupBoard(daily);
        }
        setIsLoadingDaily(false);
      } else if (mode === "ranked") {
        const list = puzzleService.getPuzzlesByTier(difficultyTier);
        setPuzzleList(list);
        setPuzzleIndex(0);
        if (list[0]) setupBoard(list[0]);
      } else if (mode === "themes") {
        const list =
          selectedTheme === "All Themes"
            ? puzzleService.getPuzzlesByTier("all")
            : puzzleService.getPuzzlesByTheme(selectedTheme);
        setPuzzleList(list);
        setPuzzleIndex(0);
        if (list[0]) setupBoard(list[0]);
      }
    }

    loadPuzzlesForMode();
    return () => {
      isCancelled = true;
    };
  }, [mode, difficultyTier, selectedTheme]);

  const handlePlayerMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    if (!currentPuzzle || isSolved || isFailed) return;

    const gameCopy = new Chess(game.fen());
    let moveObj = null;
    try {
      moveObj = gameCopy.move({
        from: from as Square,
        to: to as Square,
        promotion: (promotion || "q") as "q" | "r" | "b" | "n",
      });
    } catch {
      return;
    }

    if (!moveObj) return;

    const expectedMoveSan = currentPuzzle.moves[moveStep];

    if (moveObj.san === expectedMoveSan) {
      if (moveObj.captured) soundManager.playCapture();
      else soundManager.playMove();

      setGame(gameCopy);
      setLastMove({ from, to });

      const nextStep = moveStep + 1;
      setMoveStep(nextStep);

      // Check if puzzle is completed
      if (nextStep >= currentPuzzle.moves.length) {
        setIsSolved(true);
        soundManager.playSuccess();
        const updatedStats = puzzleService.recordResult(currentPuzzle.id, true);
        setStats(updatedStats);

        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        // Automatic opponent counter-move
        setTimeout(() => {
          const opponentMoveSan = currentPuzzle.moves[nextStep];
          const oppGame = new Chess(gameCopy.fen());
          try {
            const oppMove = oppGame.move(opponentMoveSan);
            if (oppMove) {
              if (oppMove.captured) soundManager.playCapture();
              else soundManager.playMove();

              setGame(oppGame);
              setLastMove({ from: oppMove.from, to: oppMove.to });
              setMoveStep(nextStep + 1);
            }
          } catch {}
        }, 400);
      }
    } else {
      soundManager.playBlunder();
      setIsFailed(true);
      const updatedStats = puzzleService.recordResult(currentPuzzle.id, false);
      setStats(updatedStats);
    }
  };

  const handleNextPuzzle = () => {
    if (puzzleList.length === 0) return;
    const nextIdx = (puzzleIndex + 1) % puzzleList.length;
    setPuzzleIndex(nextIdx);
    setupBoard(puzzleList[nextIdx]);
  };

  const handleRetry = () => {
    if (currentPuzzle) setupBoard(currentPuzzle);
  };

  if (!currentPuzzle) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
        Loading tactical exercises...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto items-start">
      {/* Chessboard Column */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <Chessboard
          game={game}
          onMove={handlePlayerMove}
          isFlipped={currentPuzzle.turn === "b"}
          theme={theme}
          lastMove={lastMove}
          interactive={!isSolved}
        />
      </div>

      {/* Puzzle Controls & Stats Column */}
      <div className="lg:col-span-5 flex flex-col gap-3.5">
        {/* Mode Selector Tabs */}
        <div className="bg-[#151822] p-1.5 rounded-xl border border-[#2b3142] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode("daily")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === "daily"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1d2230]"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoadingDaily && mode === "daily" ? "animate-spin" : ""}`} />
              <span>{isLoadingDaily && mode === "daily" ? "Loading Daily..." : "Lichess Daily"}</span>
            </button>
            <button
              onClick={() => setMode("ranked")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === "ranked"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1d2230]"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Ranked Lab</span>
            </button>
            <button
              onClick={() => setMode("themes")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === "themes"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1d2230]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Themes</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pr-2 font-mono text-[11px] text-slate-400">
            <div className="flex items-center gap-1 text-amber-400 font-bold" title="Current Solve Streak">
              <Flame className="w-3.5 h-3.5" />
              <span>{stats.currentStreak}</span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold" title="Puzzle Elo Rating">
              {stats.rating} Elo
            </span>
          </div>
        </div>

        {/* Sub-Filters for Ranked & Themes */}
        {mode === "ranked" && (
          <div className="flex items-center gap-1.5 bg-[#12141c] p-2 rounded-xl border border-[#262c3d] text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <span className="text-slate-400 text-[11px]">Tier:</span>
            {(["all", "novice", "intermediate", "advanced", "master"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setDifficultyTier(tier)}
                className={`px-2 py-1 rounded text-[11px] capitalize font-mono transition cursor-pointer ${
                  difficultyTier === tier
                    ? "bg-[#252c3f] text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tier === "all" ? "All" : tier === "novice" ? "~1000" : tier === "intermediate" ? "~1400" : tier === "advanced" ? "~1700" : "2000+"}
              </button>
            ))}
          </div>
        )}

        {mode === "themes" && (
          <div className="flex flex-wrap items-center gap-1 bg-[#12141c] p-2 rounded-xl border border-[#262c3d] text-xs max-h-24 overflow-y-auto">
            {THEMES.map((th) => (
              <button
                key={th}
                onClick={() => setSelectedTheme(th)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                  selectedTheme === th
                    ? "bg-emerald-800 text-white font-bold"
                    : "bg-[#181c28] text-slate-400 hover:text-slate-200 border border-[#272e40]"
                }`}
              >
                {th}
              </button>
            ))}
          </div>
        )}

        {/* Main Exercise Card */}
        <div className="bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
          {/* Header & Match Context */}
          <div className="flex items-center justify-between border-b border-[#262a36] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                {mode === "daily" ? "Official Lichess Daily Challenge" : "Tactical Combination"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-[#10121a] px-2 py-0.5 rounded border border-[#2a3244]">
                Est. {currentPuzzle.rating} Elo
              </span>
            </div>
          </div>

          {/* Real Game Attribution */}
          {currentPuzzle.gameDetails && (
            <div className="bg-[#11131c] border border-emerald-900/30 p-2.5 rounded-lg mb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-semibold">
                  Tournament Match
                </span>
                <span className="text-slate-300 font-medium">
                  {currentPuzzle.gameDetails.white.name} ({currentPuzzle.gameDetails.white.rating}) vs{" "}
                  {currentPuzzle.gameDetails.black.name} ({currentPuzzle.gameDetails.black.rating})
                </span>
              </div>
              {currentPuzzle.sourceUrl && (
                <a
                  href={currentPuzzle.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-[#1a2030] transition"
                  title="View original match on Lichess"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Specification Box */}
          <div className="bg-[#11131a] p-3 rounded-lg border border-[#232733] mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-slate-300 bg-[#222736] px-2 py-0.5 rounded border border-[#333a4d]">
                {currentPuzzle.theme}
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                {currentPuzzle.turn === "w" ? "White to move" : "Black to move"}
              </span>
            </div>
            <h4 className="text-white font-semibold text-xs mb-1">{currentPuzzle.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{currentPuzzle.description}</p>
          </div>

          {/* Solution Status */}
          {isSolved && (
            <div className="bg-emerald-950/50 border border-emerald-500/60 p-3 rounded-lg flex items-start gap-2.5 mb-3 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-emerald-300 font-semibold text-xs">Continuation Verified! (+12 Elo)</div>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Optimal sequence executed with master foresight. Calculation accuracy confirmed.
                </p>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-lg flex items-start gap-2.5 mb-3 animate-in fade-in">
              <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-red-300 font-semibold text-xs">Suboptimal Continuation (-8 Elo)</div>
                <p className="text-[11px] text-red-400/80 mt-0.5">
                  Concedes the tactical advantage. Identify the forcing checks, captures, and threats and retry.
                </p>
              </div>
            </div>
          )}

          {/* Analytical Coach Hint */}
          {showHint && (
            <div className="bg-[#11131a] border border-[#2f3547] p-3 rounded-lg text-xs text-slate-300 mb-3 flex items-start gap-2 animate-in fade-in">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Analytical Coach Hint:</strong>
                {currentPuzzle.coachTip}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!showHint && !isSolved && (
              <button
                onClick={() => setShowHint(true)}
                className="flex-1 py-1.5 px-3 bg-[#222736] hover:bg-[#2c3245] text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-[#333a4d] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Show Hint</span>
              </button>
            )}

            {(isSolved || isFailed) && (
              <button
                onClick={handleRetry}
                className="flex-1 py-1.5 px-3 bg-[#222736] hover:bg-[#2c3245] text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-[#333a4d] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={handleNextPuzzle}
              className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Next Puzzle</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Puzzle Statistics Card */}
        <div className="bg-[#161821] p-3.5 rounded-xl border border-[#2d3342] shadow-xl text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono text-[11px]">
            <span>TACTICAL MASTERY METRICS</span>
            <span className="text-slate-300 font-bold">{stats.solvedCount} Solved</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#10121a] p-2 rounded-lg border border-[#222736]">
              <span className="text-[10px] text-slate-500 uppercase block">Solve Streak</span>
              <span className="font-mono text-xs font-bold text-amber-400">{stats.currentStreak}</span>
            </div>
            <div className="bg-[#10121a] p-2 rounded-lg border border-[#222736]">
              <span className="text-[10px] text-slate-500 uppercase block">Best Streak</span>
              <span className="font-mono text-xs font-bold text-emerald-400">{stats.bestStreak}</span>
            </div>
            <div className="bg-[#10121a] p-2 rounded-lg border border-[#222736]">
              <span className="text-[10px] text-slate-500 uppercase block">Success Rate</span>
              <span className="font-mono text-xs font-bold text-white">
                {stats.solvedCount + stats.failedCount > 0
                  ? `${Math.round((stats.solvedCount / (stats.solvedCount + stats.failedCount)) * 100)}%`
                  : "100%"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
