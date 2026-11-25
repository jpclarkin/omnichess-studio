import React, { useState, useEffect, useCallback } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "./Chessboard";
import { OPENINGS_DATABASE, detectOpening } from "../data/openings";
import { stockfishService } from "../engine/stockfishService";
import { soundManager } from "../audio/soundManager";
import { queryLiveOpening, type CloudOpeningResponse } from "../services/cloudOpeningService";
import { queryTablebase, countPiecesOnBoard, type TablebaseEvaluation } from "../services/tablebaseService";
import type { OpeningData, BoardTheme } from "../types/chess";
import {
  BookOpen,
  Cpu,
  Search,
  RotateCcw,
  GitBranch,
  Globe,
  ChevronLeft,
  Copy,
  Check,
  RotateCw,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface OpeningExplorerProps {
  theme: BoardTheme;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({ theme }) => {
  const [game, setGame] = useState<Chess>(new Chess());
  const [currentOpening, setCurrentOpening] = useState<OpeningData>(OPENINGS_DATABASE[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [engineSuggestion, setEngineSuggestion] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);

  // Phase 2: Live Cloud Explorer & 7-Piece Tablebase states
  const [activeTab, setActiveTab] = useState<"cloud" | "encyclopedia">("cloud");
  const [cloudResult, setCloudResult] = useState<{ fen: string; data: CloudOpeningResponse | null } | null>(null);
  const [tablebaseResult, setTablebaseResult] = useState<{ fen: string; data: TablebaseEvaluation | null } | null>(null);

  const currentFen = game.fen();
  const wantsTablebase = countPiecesOnBoard(currentFen) <= 7;
  const cloudOpening = cloudResult?.fen === currentFen ? cloudResult.data : null;
  const isLoadingCloud = cloudResult?.fen !== currentFen;
  const tablebaseEval = wantsTablebase && tablebaseResult?.fen === currentFen ? tablebaseResult.data : null;
  const isLoadingTablebase = wantsTablebase && tablebaseResult?.fen !== currentFen;

  // Sync Live Cloud Book & Tablebase on FEN changes
  useEffect(() => {
    let isCancelled = false;
    if (wantsTablebase) {
      queryTablebase(currentFen).then((tb) => {
        if (!isCancelled) setTablebaseResult({ fen: currentFen, data: tb });
      });
    }
    queryLiveOpening(currentFen).then((cloud) => {
      if (!isCancelled) setCloudResult({ fen: currentFen, data: cloud });
    });
    return () => {
      isCancelled = true;
    };
  }, [currentFen, wantsTablebase]);

  const loadOpening = useCallback((opening: OpeningData) => {
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
  }, []);

  const handleBoardMove = ({ from, to, promotion }: { from: string; to: string; promotion?: string }) => {
    const gameCopy = new Chess(game.fen());
    try {
      const m = gameCopy.move({
        from: from as Square,
        to: to as Square,
        promotion: (promotion || "q") as "q" | "r" | "b" | "n",
      });
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

  const handleUndoMove = () => {
    const history = game.history();
    if (history.length === 0) return;

    const newGame = new Chess();
    let prevMove = null;
    for (let i = 0; i < history.length - 1; i++) {
      try {
        prevMove = newGame.move(history[i]);
      } catch {}
    }

    soundManager.playMove();
    setGame(newGame);
    setEngineSuggestion(null);
    setLastMove(prevMove ? { from: prevMove.from, to: prevMove.to } : null);

    const moves = newGame.history().join(" ");
    const matched = detectOpening(moves);
    if (matched) {
      setCurrentOpening(matched);
    }
  };

  const handleReset = () => {
    loadOpening(currentOpening);
  };

  const handleResetToStart = () => {
    setGame(new Chess());
    setLastMove(null);
    setEngineSuggestion(null);
    setCurrentOpening(OPENINGS_DATABASE[0]);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(game.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const handleFindNextMove = async () => {
    const res = await stockfishService.analyze(game.fen(), { depth: 18 }, { priority: "high", key: "explorer" }).catch(() => null);
    if (res?.source === "stockfish" && res.bestMoveSan) {
      setEngineSuggestion(res.bestMoveSan);
      soundManager.playSuccess();
    } else {
      setEngineSuggestion(null);
    }
  };

  const filteredOpenings = OPENINGS_DATABASE.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.eco.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pieceCount = countPiecesOnBoard(game.fen());
  const historyMoves = game.history();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto items-start">
      {/* Left Column: Chessboard & Navigation Toolbar */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <Chessboard
          game={game}
          onMove={handleBoardMove}
          isFlipped={isFlipped}
          theme={theme}
          lastMove={lastMove}
          interactive={true}
        />

        {/* Move History Breadcrumbs */}
        {historyMoves.length > 0 && (
          <div className="mt-2.5 w-full max-w-[var(--board-size)] bg-[#11131a] px-3 py-1.5 rounded-lg border border-[#232733] flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            <span className="text-slate-400 font-sans text-[11px] shrink-0">Line:</span>
            {historyMoves.map((m, idx) => (
              <span key={idx} className="text-slate-300 shrink-0">
                {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}.` : ""} <strong className="text-white">{m}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Board Utility Toolbar */}
        <div className="mt-2 w-full max-w-[var(--board-size)] flex items-center justify-between text-xs text-slate-400 bg-[#11131a] px-3.5 py-2 rounded-lg border border-[#232733]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoMove}
              disabled={historyMoves.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181c28] hover:bg-[#222736] disabled:opacity-30 text-slate-300 hover:text-white transition cursor-pointer"
              title="Undo last move"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Step Back</span>
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181c28] hover:bg-[#222736] text-slate-300 hover:text-white transition cursor-pointer"
              title="Flip chessboard perspective"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Flip</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181c28] hover:bg-[#222736] text-slate-300 hover:text-white transition cursor-pointer"
              title="Reset to selected opening root"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Line</span>
            </button>

            <button
              onClick={handleResetToStart}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer underline ml-1"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFen}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              title="Copy FEN string"
            >
              {copiedFen ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedFen ? "Copied" : "Copy FEN"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Opening & Endgame Explorer Panel */}
      <div className="lg:col-span-5 flex flex-col gap-3.5">
        {/* Active Position / Opening Header */}
        <div className="bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold bg-[#222736] text-slate-300 px-2 py-0.5 rounded border border-[#333a4d]">
                  {currentOpening.eco}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                  {game.turn() === "w" ? "White to move" : "Black to move"}
                </span>
              </div>
              <h3 className="text-white font-bold text-base mt-1">{currentOpening.name}</h3>
            </div>

            <button
              onClick={() => void handleFindNextMove()}
              className="py-1.5 px-2.5 bg-[#222736] hover:bg-[#2c3245] text-slate-200 text-xs font-semibold rounded-lg border border-[#333a4d] flex items-center gap-1.5 transition cursor-pointer"
              title="Calculate best move with Stockfish"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Engine Move
            </button>
          </div>

          {/* Engine Suggestion Banner */}
          {engineSuggestion && (
            <div className="bg-[#11131a] border border-emerald-500/50 p-2.5 rounded-lg mb-3 flex items-center justify-between animate-in fade-in">
              <span className="text-xs text-slate-300">
                Stockfish: <strong className="font-mono text-emerald-400 text-xs ml-1">{engineSuggestion}</strong>
              </span>
              <button
                onClick={() => handlePlayContinuation(engineSuggestion)}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-2.5 py-1 rounded transition cursor-pointer"
              >
                Execute
              </button>
            </div>
          )}

          {/* 7-PIECE SYZYGY ENDGAME TABLEBASE (Phase 2) */}
          {pieceCount <= 7 && (
            <div className="mb-3.5 bg-gradient-to-br from-[#121622] to-[#171e2e] p-3.5 rounded-xl border border-sky-500/40 shadow-lg animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                    Syzygy 7-Piece Tablebase
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({pieceCount} pieces)</span>
                </div>

                {isLoadingTablebase ? (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                    <span>Resolving...</span>
                  </div>
                ) : tablebaseEval ? (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                      tablebaseEval.category === "win"
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
                        : tablebaseEval.category === "draw"
                        ? "bg-sky-950/80 text-sky-300 border-sky-500/60"
                        : "bg-rose-950/80 text-rose-300 border-rose-500/60"
                    }`}
                  >
                    {tablebaseEval.category === "win"
                      ? "Theoretical Win"
                      : tablebaseEval.category === "draw"
                      ? "Theoretical Draw"
                      : "Theoretical Loss"}
                  </span>
                ) : null}
              </div>

              {tablebaseEval && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-300 bg-[#0d1017] p-2 rounded border border-[#21283a]">
                    {tablebaseEval.summary}
                  </p>

                  {/* Tablebase Moves */}
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                    {tablebaseEval.moves.slice(0, 6).map((m) => {
                      const isWin = m.category === "win";
                      const isDraw = m.category === "draw";
                      return (
                        <div
                          key={m.uci}
                          onClick={() => handlePlayContinuation(m.san)}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition text-xs border ${
                            isWin
                              ? "bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-200"
                              : isDraw
                              ? "bg-sky-950/30 hover:bg-sky-900/40 border-sky-500/30 text-sky-200"
                              : "bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/30 text-rose-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <strong className="font-mono text-white text-xs">{m.san}</strong>
                            <span className="text-[10px] opacity-75 uppercase font-mono">
                              {m.category}
                              {m.dtm !== null && isWin ? ` (Mate in ${Math.ceil(Math.abs(m.dtm) / 2)})` : ""}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40">
                            Play ➔
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode Selector Tabs: Live Cloud Book vs Curated Encyclopedia */}
          <div className="flex border-b border-[#232733] pb-2 mb-3 gap-2">
            <button
              onClick={() => setActiveTab("cloud")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "cloud"
                  ? "bg-[#202534] text-white border border-[#2f3648] shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Live Cloud Book</span>
              <span className="text-[9px] font-mono px-1 rounded bg-sky-950 text-sky-300 border border-sky-500/40">
                Millions
              </span>
            </button>

            <button
              onClick={() => setActiveTab("encyclopedia")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "encyclopedia"
                  ? "bg-[#202534] text-white border border-[#2f3648] shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encyclopedia</span>
            </button>
          </div>

          {/* TAB 1: LIVE CLOUD BOOK (Phase 2) */}
          {activeTab === "cloud" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 text-[11px]">
                  <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                  Candidate Continuations (Cloud Book)
                </span>
                {isLoadingCloud && (
                  <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                  </span>
                )}
              </div>

              {cloudOpening && cloudOpening.moves.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {cloudOpening.moves.map((cont, idx) => (
                    <div
                      key={cont.uci + idx}
                      onClick={() => handlePlayContinuation(cont.san)}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#141722] hover:bg-[#1d2232] border border-[#242938] cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 bg-[#0d0f17] px-1.5 py-0.5 rounded border border-[#1e2330]">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-white text-xs group-hover:text-emerald-400 transition">
                          {cont.san}
                        </span>
                        {cont.note && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            {cont.note}
                          </span>
                        )}
                        {cont.gamesCount && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({cont.gamesCount.toLocaleString()} games)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-300 text-xs font-semibold">
                          {cont.evalDisplay}
                        </span>
                        {cont.winrate !== undefined && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            {cont.winrate}% W
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isLoadingCloud ? (
                <div className="bg-[#11131a] p-3 rounded-lg border border-[#232733] text-xs text-slate-400 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Out of Master Book</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This exact position has no direct continuations recorded in the master cloud book. Click
                    <strong> Engine Move</strong> above to calculate the most accurate continuation with Stockfish.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: CURATED REPERTOIRE DETAILS */}
          {activeTab === "encyclopedia" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300 leading-relaxed bg-[#11131a] p-3 rounded-lg border border-[#232733]">
                {currentOpening.description}
              </p>

              {/* Master Statistics */}
              {currentOpening.stats && (
                <div className="bg-[#11131a] p-3 rounded-lg border border-[#232733]">
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

              {/* Curated Continuations */}
              <div className="bg-[#11131a] p-3 rounded-lg border border-[#232733]">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                  Primary Lines
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
          )}
        </div>

        {/* Repertoire Catalog Search */}
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

