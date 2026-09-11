import React, { useState, useEffect } from "react";
import { Chess, type Square } from "chess.js";
import confetti from "canvas-confetti";
import { Chessboard } from "./Chessboard";
import { TACTICAL_PUZZLES } from "../data/puzzles";
import { soundManager } from "../audio/soundManager";
import type { TacticalPuzzle, BoardTheme } from "../types/chess";
import { ChevronRight, RotateCcw, CheckCircle, Info, HelpCircle, Target } from "lucide-react";

interface PuzzlesViewProps {
  theme: BoardTheme;
  customBlunders?: unknown[];
}

export const PuzzlesView: React.FC<PuzzlesViewProps> = ({ theme, customBlunders: _customBlunders = [] }) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<TacticalPuzzle>(TACTICAL_PUZZLES[0]);
  const [game, setGame] = useState<Chess>(new Chess());
  const [moveStep, setMoveStep] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const loadPuzzle = (puz: TacticalPuzzle) => {
    const newGame = new Chess();
    newGame.load(puz.fen);
    setGame(newGame);
    setCurrentPuzzle(puz);
    setMoveStep(0);
    setIsSolved(false);
    setIsFailed(false);
    setShowHint(false);
    setLastMove(null);
  };

  useEffect(() => {
    loadPuzzle(TACTICAL_PUZZLES[puzzleIndex]);
  }, [puzzleIndex]);

  const handlePlayerMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    if (isSolved || isFailed) return;

    const gameCopy = new Chess(game.fen());
    let moveObj = null;
    try {
      moveObj = gameCopy.move({ from: from as Square, to: to as Square, promotion: (promotion || "q") as "q" | "r" | "b" | "n" });
    } catch {
      return;
    }

    if (!moveObj) return;

    const expectedMoveSan = currentPuzzle.moves[moveStep];

    if (moveObj.san === expectedMoveSan) {
      if (moveObj.captured) {
        soundManager.playCapture();
      } else {
        soundManager.playMove();
      }
      setGame(gameCopy);
      setLastMove({ from, to });

      const nextStep = moveStep + 1;
      setMoveStep(nextStep);

      if (nextStep >= currentPuzzle.moves.length) {
        setIsSolved(true);
        soundManager.playSuccess();
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);

        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        setTimeout(() => {
          const opponentMoveSan = currentPuzzle.moves[nextStep];
          const oppGame = new Chess(gameCopy.fen());
          try {
            const oppMove = oppGame.move(opponentMoveSan);
            if (oppMove) {
              if (oppMove.captured) {
                soundManager.playCapture();
              } else {
                soundManager.playMove();
              }
              setGame(oppGame);
              setLastMove({ from: oppMove.from, to: oppMove.to });
              setMoveStep(nextStep + 1);
            }
          } catch {}
        }, 350);
      }
    } else {
      soundManager.playBlunder();
      setIsFailed(true);
      setStreak(0);
    }
  };

  const handleNextPuzzle = () => {
    const nextIdx = (puzzleIndex + 1) % TACTICAL_PUZZLES.length;
    setPuzzleIndex(nextIdx);
  };

  const handleRetry = () => {
    loadPuzzle(currentPuzzle);
  };

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

      {/* Puzzle Card & Stats Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Header & Metrics */}
        <div className="bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#262a36] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm tracking-wide">TACTICAL EXERCISES</h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-300 bg-[#222736] px-2 py-0.5 rounded border border-[#333a4d]">
                Streak: {streak}
              </span>
              <span className="text-slate-400">Best: {bestStreak}</span>
            </div>
          </div>

          {/* Current Puzzle Specifications */}
          <div className="bg-[#11131a] p-3.5 rounded-lg border border-[#232733] mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-medium text-slate-300 bg-[#222736] px-2 py-0.5 rounded border border-[#333a4d]">
                {currentPuzzle.theme}
              </span>
              <span className="text-xs font-mono font-medium text-emerald-400">
                Rating {currentPuzzle.rating}
              </span>
            </div>
            <h4 className="text-white font-semibold text-sm mb-1">{currentPuzzle.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentPuzzle.description}
            </p>
            <div className="mt-2.5 text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span>Turn:</span>
              <span className="text-slate-200 font-semibold">
                {currentPuzzle.turn === "w" ? "White to move" : "Black to move"}
              </span>
            </div>
          </div>

          {/* Completion Status */}
          {isSolved && (
            <div className="bg-emerald-950/50 border border-emerald-500/60 p-3 rounded-lg flex items-start gap-2.5 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-emerald-300 font-semibold text-xs">Continuation Verified</div>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Optimal sequence executed. Calculation accuracy confirmed.
                </p>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-lg flex items-start gap-2.5 mb-3">
              <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-red-300 font-semibold text-xs">Suboptimal Move</div>
                <p className="text-[11px] text-red-400/80 mt-0.5">
                  The played move concedes the advantage. Re-evaluate defensive resources and try again.
                </p>
              </div>
            </div>
          )}

          {/* Analytical Hint */}
          {showHint && (
            <div className="bg-[#11131a] border border-[#2f3547] p-3 rounded-lg text-xs text-slate-300 mb-3 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Analytical Hint:</strong>
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
                Show Hint
              </button>
            )}

            {(isSolved || isFailed) && (
              <button
                onClick={handleRetry}
                className="flex-1 py-1.5 px-3 bg-[#222736] hover:bg-[#2c3245] text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-[#333a4d] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              onClick={handleNextPuzzle}
              className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Next Exercise</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tactical Motifs Guide */}
        <div className="bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Core Tactical Motifs
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded bg-[#11131a] border border-[#232733]">
              <span className="text-white font-medium block mb-0.5">Tactical Fork</span>
              <p className="text-[11px] text-slate-400">Simultaneous double-attack against uncoordinated pieces.</p>
            </div>
            <div className="p-2.5 rounded bg-[#11131a] border border-[#232733]">
              <span className="text-white font-medium block mb-0.5">Back-Rank Mate</span>
              <p className="text-[11px] text-slate-400">Penetration along an unobstructed file trapping the king.</p>
            </div>
            <div className="p-2.5 rounded bg-[#11131a] border border-[#232733]">
              <span className="text-white font-medium block mb-0.5">Smothered Mate</span>
              <p className="text-[11px] text-slate-400">Knight checkmate where the opposing king is enclosed by its own pieces.</p>
            </div>
            <div className="p-2.5 rounded bg-[#11131a] border border-[#232733]">
              <span className="text-white font-medium block mb-0.5">Greek Gift</span>
              <p className="text-[11px] text-slate-400">Classical Bxh7+ sacrifice compromising kingside shelter.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
