import React, { useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "./Chessboard";
import { OPENINGS_DATABASE, detectOpening } from "../data/openings";
import { findBestMove } from "../engine/chessEngine";
import { soundManager } from "../audio/soundManager";
import type { OpeningData, BoardTheme } from "../types/chess";
import { BookOpen, Cpu, Search, RotateCcw, GitBranch } from "lucide-react";

interface OpeningExplorerProps {
  theme: BoardTheme;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({ theme }) => {
  const [game, setGame] = useState<Chess>(new Chess());
  const [currentOpening, setCurrentOpening] = useState<OpeningData>(OPENINGS_DATABASE[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [engineSuggestion, setEngineSuggestion] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const loadOpening = (opening: OpeningData) => {
    const newGame = new Chess();
    const tokens = opening.moves.split(" ").filter(Boolean);
    let lastM = null;
    for (const t of tokens) {
      try {
        lastM = newGame.move(t);
      } catch {}
    }
    setGame(newGame);
    setCurrentOpening(opening);
    setEngineSuggestion(null);
    setLastMove(lastM ? { from: lastM.from, to: lastM.to } : null);
  };

  const handleBoardMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    const gameCopy = new Chess(game.fen());
    try {
      const m = gameCopy.move({ from: from as Square, to: to as Square, promotion: (promotion || "q") as "q" | "r" | "b" | "n" });
      if (m) {
        if (m.captured) soundManager.playCapture();
        else soundManager.playMove();

        setGame(gameCopy);
        setLastMove({ from, to });
        setEngineSuggestion(null);

        const moves = gameCopy.history().join(" ");
        const matched = detectOpening(moves);
        if (matched) {
          setCurrentOpening(matched);
        }
      }
    } catch {}
  };

  const handlePlayContinuation = (san: string) => {
    const gameCopy = new Chess(game.fen());
    try {
      const m = gameCopy.move(san);
      if (m) {
        if (m.captured) soundManager.playCapture();
        else soundManager.playMove();

        setGame(gameCopy);
        setLastMove({ from: m.from, to: m.to });
        setEngineSuggestion(null);

        const moves = gameCopy.history().join(" ");
        const matched = detectOpening(moves);
        if (matched) {
          setCurrentOpening(matched);
        }
      }
    } catch {}
  };

  const handleFindNextMove = () => {
    const best = findBestMove(game, 3);
    if (best && best.san) {
      setEngineSuggestion(best.san);
      soundManager.playSuccess();
    }
  };

  const handleReset = () => {
    loadOpening(currentOpening);
  };

  const filteredOpenings = OPENINGS_DATABASE.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.eco.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto items-start">
      {/* Chessboard Column */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <Chessboard
          game={game}
          onMove={handleBoardMove}
          isFlipped={false}
          theme={theme}
          lastMove={lastMove}
          interactive={true}
        />
        <div className="mt-3 w-full max-w-[620px] flex items-center justify-between text-xs text-slate-400 bg-[#11131a] px-4 py-2 rounded-lg border border-[#232733]">
          <span className="font-mono text-[11px]">FEN: {game.fen().substring(0, 34)}...</span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Variation
          </button>
        </div>
      </div>

      {/* Opening Details & Continuations Tree */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Active Opening Specification */}
        <div className="bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[10px] font-mono font-bold bg-[#222736] text-slate-300 px-2 py-0.5 rounded border border-[#333a4d]">
                {currentOpening.eco}
              </span>
              <h3 className="text-white font-bold text-base mt-1">{currentOpening.name}</h3>
            </div>
            <button
              onClick={handleFindNextMove}
              className="py-1.5 px-2.5 bg-[#222736] hover:bg-[#2c3245] text-slate-200 text-xs font-semibold rounded-lg border border-[#333a4d] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Engine Move
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-[#11131a] p-3 rounded-lg border border-[#232733] mb-3">
            {currentOpening.description}
          </p>

          {/* Engine Suggestion */}
          {engineSuggestion && (
            <div className="bg-[#11131a] border border-emerald-500/50 p-2.5 rounded-lg mb-3 flex items-center justify-between animate-in fade-in">
              <span className="text-xs text-slate-300">
                Engine Evaluation: <strong className="font-mono text-emerald-400 text-xs ml-1">{engineSuggestion}</strong>
              </span>
              <button
                onClick={() => handlePlayContinuation(engineSuggestion)}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-2.5 py-1 rounded transition cursor-pointer"
              >
                Execute
              </button>
            </div>
          )}

          {/* Master Statistics */}
          {currentOpening.stats && (
            <div className="mb-4 bg-[#11131a] p-3 rounded-lg border border-[#232733]">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
                <span className="text-slate-200">White {currentOpening.stats.whiteWinPct}%</span>
                <span className="text-slate-400">Draw {currentOpening.stats.drawPct}%</span>
                <span className="text-slate-200">Black {currentOpening.stats.blackWinPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#1e222d] border border-[#2a2f3e]">
                <div
                  className="bg-slate-300 h-full transition-all"
                  style={{ width: `${currentOpening.stats.whiteWinPct}%` }}
                />
                <div
                  className="bg-slate-600 h-full transition-all"
                  style={{ width: `${currentOpening.stats.drawPct}%` }}
                />
                <div
                  className="bg-slate-900 h-full transition-all"
                  style={{ width: `${currentOpening.stats.blackWinPct}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                Sample: {currentOpening.stats.games.toLocaleString()} master tournament games
              </span>
            </div>
          )}

          {/* Continuations Tree */}
          <div className="bg-[#11131a] p-3 rounded-lg border border-[#232733]">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              Candidate Continuations
            </h4>
            <div className="flex flex-col gap-1.5">
              {currentOpening.continuations.map((cont) => (
                <div
                  key={cont.san}
                  onClick={() => handlePlayContinuation(cont.san)}
                  className="flex items-center justify-between p-2 rounded bg-[#171a24] hover:bg-[#202534] border border-[#242938] cursor-pointer transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-white text-xs group-hover:text-emerald-400 transition">
                      {cont.san}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({cont.games.toLocaleString()} games)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <span className="text-slate-300">{cont.whiteWinPct}%</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-400">{cont.drawPct}%</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-300">{cont.blackWinPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Repertoire Catalog */}
        <div className="bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Opening Encyclopedia
            </h4>
          </div>

          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by opening name or ECO code..."
              className="w-full bg-[#11131a] text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#2e3444] focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-1">
            {filteredOpenings.map((op) => (
              <div
                key={op.eco + op.name}
                onClick={() => loadOpening(op)}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition text-xs ${
                  currentOpening.name === op.name
                    ? "bg-[#222736] border border-emerald-500 text-white font-medium"
                    : "bg-[#11131a] hover:bg-[#191d28] border border-[#232733] text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[10px] text-slate-400 bg-[#1e222d] px-1.5 py-0.5 rounded">
                    {op.eco}
                  </span>
                  <span className="truncate">{op.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                  {op.stats?.games.toLocaleString()} games
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
