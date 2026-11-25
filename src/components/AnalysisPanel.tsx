import React, { useState, useEffect, useRef, useMemo } from "react";
import type { GameAnalysisReport, AnalyzedMove, MoveGrade, EngineCandidateLine } from "../types/chess";
import { queryTablebase, countPiecesOnBoard, type TablebaseEvaluation } from "../services/tablebaseService";
import { queryLiveOpening, type CloudOpeningResponse } from "../services/cloudOpeningService";
import {
  Copy,
  Check,
  Upload,
  Play,
  Pause,
  BarChart2,
  Activity,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Bot,
  ArrowRight,
  Eye,
  RotateCcw,
  ListTree,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Loader2,
} from "lucide-react";

interface AnalysisPanelProps {
  report: GameAnalysisReport;
  selectedPly: number;
  onSelectPly: (ply: number) => void;
  onRetryBlunder: (move: AnalyzedMove) => void;
  currentFen: string;
  pgn: string;
  onLoadPgn: (pgn: string) => void;
  onAddToTrainingPlan?: (report: GameAnalysisReport) => void;
  onOpenCoach?: () => void;
  onPreviewEngineMove?: (bestMoveSan: string | string[], fenBefore: string) => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  report,
  selectedPly,
  onSelectPly,
  onRetryBlunder,
  currentFen,
  pgn,
  onLoadPgn,
  onAddToTrainingPlan,
  onOpenCoach,
  onPreviewEngineMove,
}) => {
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [customPgnInput, setCustomPgnInput] = useState("");
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewingEngine, setIsPreviewingEngine] = useState(false);
  const [previewingLineRank, setPreviewingLineRank] = useState<number | null>(null);
  const [previewingMoveSan, setPreviewingMoveSan] = useState<string | null>(null);
  const [maxLines, setMaxLines] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<"moves" | "overview">("moves");

  // Tablebase & Opening Book state (Phase 2)
  // Lookups are stored with the FEN they belong to; "loading" and "stale" are derived from that.
  const [tablebaseResult, setTablebaseResult] = useState<{ fen: string; data: TablebaseEvaluation | null } | null>(null);
  const [cloudResult, setCloudResult] = useState<{ fen: string; data: CloudOpeningResponse | null } | null>(null);
  const [previewResetPly, setPreviewResetPly] = useState(selectedPly);

  const moveListRef = useRef<HTMLDivElement>(null);

  const totalPlies = report.moves.length;
  const currentIndex = Math.max(0, Math.min(totalPlies - 1, selectedPly - 1));
  const selectedMove: AnalyzedMove | undefined = report.moves[currentIndex] || report.moves[totalPlies - 1];

  // Reset engine preview state when the selected ply changes (render-time reset pattern)
  if (previewResetPly !== selectedPly) {
    setPreviewResetPly(selectedPly);
    setIsPreviewingEngine(false);
    setPreviewingLineRank(null);
    setPreviewingMoveSan(null);
  }

  const lookupFen = selectedMove?.fenBefore ?? "";
  const wantsTablebase = !!selectedMove && countPiecesOnBoard(lookupFen) <= 7;
  const wantsCloud = !!selectedMove && selectedMove.moveNumber <= 15;
  const tablebaseData = wantsTablebase && tablebaseResult?.fen === lookupFen ? tablebaseResult.data : null;
  const isLoadingTablebase = wantsTablebase && tablebaseResult?.fen !== lookupFen;
  const cloudOpeningData = wantsCloud && cloudResult?.fen === lookupFen ? cloudResult.data : null;
  const isLoadingCloudOpening = wantsCloud && cloudResult?.fen !== lookupFen;

  // Query Syzygy Tablebase or Cloud Opening Book for the selected move
  useEffect(() => {
    let isCancelled = false;
    if (wantsTablebase) {
      queryTablebase(lookupFen).then((tb) => {
        if (!isCancelled) setTablebaseResult({ fen: lookupFen, data: tb });
      });
    }
    if (wantsCloud) {
      queryLiveOpening(lookupFen).then((co) => {
        if (!isCancelled) setCloudResult({ fen: lookupFen, data: co });
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [lookupFen, wantsTablebase, wantsCloud]);

  // Autoplay / Replay functionality
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      onSelectPly(selectedPly >= totalPlies ? 1 : selectedPly + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying, selectedPly, totalPlies, onSelectPly]);

  // Keyboard navigation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsPreviewingEngine(false);
        setPreviewingLineRank(null);
        if (selectedPly > 1) onSelectPly(selectedPly - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIsPreviewingEngine(false);
        setPreviewingLineRank(null);
        if (selectedPly < totalPlies) onSelectPly(selectedPly + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPly, totalPlies, onSelectPly]);

  // Auto-scroll selected move into view
  useEffect(() => {
    if (moveListRef.current) {
      const activeEl = moveListRef.current.querySelector("[data-active='true']");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedPly]);

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(pgn);
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentFen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  // Top candidate lines for the currently selected move position
  const candidateLines: EngineCandidateLine[] = useMemo(() => {
    if (!selectedMove) return [];
    if (selectedMove.topLines && selectedMove.topLines.length > 0) {
      return selectedMove.topLines;
    }
    return [
      {
        rank: 1,
        san: selectedMove.bestMoveSan,
        score: selectedMove.evalBefore,
        pv: selectedMove.bestLineSan?.length ? selectedMove.bestLineSan : [selectedMove.bestMoveSan],
      },
    ];
  }, [selectedMove]);

  const formatEval = (score: number, isMate?: boolean, mateIn?: number) => {
    if (isMate || Math.abs(score) >= 9000) {
      const n = mateIn || Math.max(1, Math.round((10000 - Math.abs(score)) / 10));
      return score >= 0 ? `+M${n}` : `-M${n}`;
    }
    const val = score / 100;
    return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
  };

  const formatPvText = (pv: string[] | undefined, moveNum: number, color: "w" | "b") => {
    if (!pv || pv.length === 0) return "";
    let res = "";
    let curMove = moveNum;
    let curColor = color;
    pv.forEach((san, idx) => {
      if (idx === 0) {
        res += curColor === "w" ? `${curMove}. ${san}` : `${curMove}... ${san}`;
      } else {
        res += curColor === "w" ? ` ${curMove}. ${san}` : ` ${san}`;
      }
      if (curColor === "b") {
        curMove++;
        curColor = "w";
      } else {
        curColor = "b";
      }
    });
    return res;
  };

  const handlePreviewCandidateLine = (line: EngineCandidateLine) => {
    if (!selectedMove) return;
    if (previewingLineRank === line.rank && isPreviewingEngine) {
      setPreviewingLineRank(null);
      setIsPreviewingEngine(false);
      onSelectPly(selectedMove.ply);
    } else {
      setPreviewingLineRank(line.rank);
      setIsPreviewingEngine(true);
      if (onPreviewEngineMove) {
        const movesToPlay = line.pv && line.pv.length > 0 ? line.pv : [line.san];
        onPreviewEngineMove(movesToPlay, selectedMove.fenBefore);
      }
    }
  };

  const handleResetToPlayed = () => {
    if (!selectedMove) return;
    setPreviewingLineRank(null);
    setPreviewingMoveSan(null);
    setIsPreviewingEngine(false);
    onSelectPly(selectedMove.ply);
  };

  const handlePreviewCustomMove = (san: string) => {
    if (!selectedMove) return;
    if (previewingMoveSan === san && isPreviewingEngine) {
      handleResetToPlayed();
    } else {
      setPreviewingMoveSan(san);
      setPreviewingLineRank(null);
      setIsPreviewingEngine(true);
      if (onPreviewEngineMove) {
        onPreviewEngineMove(san, selectedMove.fenBefore);
      }
    }
  };

  const handleToggleEnginePreview = () => {
    if (!selectedMove) return;
    if (isPreviewingEngine) {
      setIsPreviewingEngine(false);
      setPreviewingLineRank(null);
      onSelectPly(selectedMove.ply);
    } else {
      setIsPreviewingEngine(true);
      setPreviewingLineRank(1);
      if (onPreviewEngineMove) {
        const line1 = candidateLines[0];
        const movesToPlay = line1?.pv && line1.pv.length > 0 ? line1.pv : selectedMove.bestMoveSan;
        onPreviewEngineMove(movesToPlay, selectedMove.fenBefore);
      }
    }
  };

  const gradeInfo: Record<MoveGrade, { label: string; badgeClass: string; dotClass: string; glyph: string }> = {
    brilliant: { label: "Brilliant", badgeClass: "bg-cyan-950/80 text-cyan-300 border-cyan-500/60", dotClass: "bg-cyan-400", glyph: "!!" },
    great: { label: "Great", badgeClass: "bg-sky-950/80 text-sky-300 border-sky-500/60", dotClass: "bg-sky-400", glyph: "!" },
    best: { label: "Best", badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/60", dotClass: "bg-emerald-400", glyph: "★" },
    good: { label: "Good", badgeClass: "bg-slate-800 text-slate-300 border-slate-600", dotClass: "bg-slate-400", glyph: "✓" },
    inaccuracy: { label: "Inaccuracy", badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/60", dotClass: "bg-amber-400", glyph: "?!" },
    mistake: { label: "Mistake", badgeClass: "bg-orange-950/80 text-orange-300 border-orange-500/60", dotClass: "bg-orange-400", glyph: "?" },
    blunder: { label: "Blunder", badgeClass: "bg-red-950/80 text-red-300 border-red-500/60", dotClass: "bg-red-400", glyph: "??" },
    missed_win: { label: "Missed Win", badgeClass: "bg-rose-950/80 text-rose-300 border-rose-500/60", dotClass: "bg-rose-400", glyph: "✗" },
  };

  const chartWidth = 320;
  const chartHeight = 70;
  const midY = chartHeight / 2;

  const points = report.moves.map((m, idx) => {
    const x = (idx / Math.max(1, report.moves.length - 1)) * chartWidth;
    const clampedEval = Math.max(-800, Math.min(800, m.evalAfter));
    const y = midY - (clampedEval / 800) * (midY - 4);
    return { x, y, ply: m.ply, eval: m.evalAfter };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  // Pair moves into rows for the score sheet table
  const moveRows: { moveNumber: number; white?: AnalyzedMove; black?: AnalyzedMove }[] = [];
  for (let i = 0; i < report.moves.length; i += 2) {
    moveRows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: report.moves[i],
      black: report.moves[i + 1],
    });
  }

  return (
    <div className="flex flex-col gap-3.5 w-full bg-[#161821] p-4 rounded-xl border border-[#2d3342] shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#262a36] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#222736] border border-[#333a4d] flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
              GAME ANALYSIS & ENGINE REVIEW
              <span className="text-[10px] uppercase font-mono tracking-wider bg-[#222736] text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40">
                {report.engineName ?? "Stockfish"}{report.depth ? ` · depth ${report.depth}` : ""}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Move-by-move comparative engine analysis & diagnostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCoach && (
            <button
              onClick={onOpenCoach}
              className="text-xs bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-500/50 flex items-center gap-1.5 transition cursor-pointer font-semibold"
              title="Open AI Coach"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Coach</span>
            </button>
          )}

          <button
            onClick={() => setShowPgnModal(true)}
            className="text-xs bg-[#222736] hover:bg-[#2c3245] text-slate-300 hover:text-white px-2 py-1.5 rounded-lg border border-[#333a4d] flex items-center gap-1 transition cursor-pointer"
            title="Import PGN"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>PGN</span>
          </button>
        </div>
      </div>

      {/* Move-by-Move Navigation Bar */}
      <div className="bg-[#11131a] p-2 rounded-xl border border-[#242938] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsPreviewingEngine(false);
              onSelectPly(1);
            }}
            disabled={selectedPly <= 1}
            title="Start of game (|<<)"
            className="p-1.5 rounded-lg hover:bg-[#202534] disabled:opacity-30 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPreviewingEngine(false);
              if (selectedPly > 1) onSelectPly(selectedPly - 1);
            }}
            disabled={selectedPly <= 1}
            title="Previous move (Left arrow)"
            className="p-1.5 rounded-lg hover:bg-[#202534] disabled:opacity-30 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause autoplay" : "Autoplay moves"}
            className="p-1.5 rounded-lg bg-[#202534] hover:bg-[#2a3144] text-emerald-400 transition cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={() => {
              setIsPreviewingEngine(false);
              if (selectedPly < totalPlies) onSelectPly(selectedPly + 1);
            }}
            disabled={selectedPly >= totalPlies}
            title="Next move (Right arrow)"
            className="p-1.5 rounded-lg hover:bg-[#202534] disabled:opacity-30 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPreviewingEngine(false);
              onSelectPly(totalPlies);
            }}
            disabled={selectedPly >= totalPlies}
            title="End of game (>>|)"
            className="p-1.5 rounded-lg hover:bg-[#202534] disabled:opacity-30 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Ply</span>
          <span className="text-white font-bold bg-[#1b1f2b] px-2 py-0.5 rounded border border-[#2c3344]">
            {selectedPly} / {totalPlies}
          </span>
          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
            (Use ← / → keys)
          </span>
        </div>
      </div>

      {/* Selected Move Comparative Card (Played Move vs Stockfish) */}
      {selectedMove && (
        <div className="bg-[#11131a] p-3.5 rounded-xl border border-[#2b3142] shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#202534] pb-2">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Move {selectedMove.moveNumber} — {selectedMove.color === "w" ? "White" : "Black"} to move
              </span>
              <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <span>{selectedMove.san}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold uppercase ${
                    gradeInfo[selectedMove.grade]?.badgeClass || "bg-slate-800 text-slate-300"
                  }`}
                >
                  {gradeInfo[selectedMove.grade]?.glyph} {gradeInfo[selectedMove.grade]?.label}
                </span>
              </h4>
            </div>

            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block uppercase">Eval</span>
              <span className="text-xs font-bold text-slate-200">
                {formatEval(selectedMove.evalAfter)}
              </span>
            </div>
          </div>

          {/* Engine Best Move Comparison & Commentary */}
          <div className="bg-[#171a24] p-3 rounded-lg border border-[#242938] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Played:</span>
                <strong className="font-mono text-white text-sm">{selectedMove.san}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400">Engine Best:</span>
                <strong className="font-mono text-emerald-400 font-bold bg-[#11131a] px-2 py-0.5 rounded border border-emerald-500/40 text-sm">
                  {selectedMove.bestMoveSan} ★
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed text-[11px] pt-1 border-t border-[#232733]">
              {selectedMove.explanation}
            </p>

            {/* Top Engine Candidate Recommendations (Multi-PV Lines) */}
            <div className="bg-[#12141d] p-2.5 rounded-lg border border-[#222736] flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between border-b border-[#202533] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <ListTree className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Engine Recommendations
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    (Multi-PV)
                  </span>
                </div>

                {/* Lines count selector (1 | 2 | 3) */}
                <div className="flex items-center gap-1 bg-[#0d0f17] p-0.5 rounded border border-[#1e2330]">
                  <span className="text-[9px] text-slate-400 px-1 font-sans">Lines:</span>
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxLines(num)}
                      className={`px-1.5 py-0.2 text-[10px] font-mono rounded transition cursor-pointer ${
                        maxLines === num
                          ? "bg-emerald-700 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title={`Display top ${num} candidate move${num > 1 ? "s" : ""}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Lines Rows */}
              <div className="flex flex-col gap-1.5">
                {candidateLines.slice(0, maxLines).map((line) => {
                  const isPlayed = line.san === selectedMove.san;
                  const isCurrentlyPreviewed = isPreviewingEngine && previewingLineRank === line.rank;
                  const rankColor =
                    line.rank === 1
                      ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                      : line.rank === 2
                      ? "bg-sky-950/80 border-sky-500/60 text-sky-300"
                      : "bg-slate-800/80 border-slate-600 text-slate-300";

                  const pvText = formatPvText(line.pv, selectedMove.moveNumber, selectedMove.color);

                  return (
                    <div
                      key={line.rank}
                      onClick={() => handlePreviewCandidateLine(line)}
                      className={`flex flex-col gap-1 p-2 rounded-lg border transition cursor-pointer ${
                        isCurrentlyPreviewed
                          ? "bg-[#1c2333] border-emerald-500 shadow-md ring-1 ring-emerald-500/40"
                          : "bg-[#151824] hover:bg-[#1a1f2e] border-[#222736]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Rank Badge */}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${rankColor}`}>
                            #{line.rank} {line.rank === 1 ? "Best" : line.rank === 2 ? "Alt" : ""}
                          </span>

                          {/* Move SAN */}
                          <span className="font-mono text-xs font-bold text-white tracking-wide">
                            {line.san}
                          </span>

                          {/* Played in Game indicator */}
                          {isPlayed && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded flex items-center gap-1 font-sans">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Played in Game
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Evaluation score */}
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#10121a] text-slate-200 border border-[#272e3d]">
                            {formatEval(line.score, line.isMate, line.mateIn)}
                          </span>

                          {/* Preview button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewCandidateLine(line);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded font-sans transition flex items-center gap-1 cursor-pointer ${
                              isCurrentlyPreviewed
                                ? "bg-emerald-600 text-white font-bold"
                                : "bg-[#202534] hover:bg-[#2c3346] text-slate-300 hover:text-white"
                            }`}
                            title="Preview this continuation on the chessboard"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            {isCurrentlyPreviewed ? "Viewing" : "Preview"}
                          </button>
                        </div>
                      </div>

                      {/* Continuation Sequence (PV) */}
                      {pvText && (
                        <div className="text-[11px] font-mono text-slate-400 pl-1.5 border-l-2 border-[#2b3347] truncate">
                          {pvText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Played move comparison if not in top lines */}
              {!candidateLines.slice(0, maxLines).some((l) => l.san === selectedMove.san) && (
                <div className="text-[11px] text-slate-400 bg-[#151824] p-2 rounded border border-[#222736] flex items-center justify-between">
                  <span>
                    Played <strong className="text-white font-mono">{selectedMove.san}</strong> (
                    {formatEval(selectedMove.evalAfter)}), engine recommends{" "}
                    <strong className="text-emerald-400 font-mono">{selectedMove.bestMoveSan}</strong> (
                    {formatEval(
                      candidateLines[0]?.score ?? selectedMove.evalBefore,
                      candidateLines[0]?.isMate,
                      candidateLines[0]?.mateIn
                    )}
                    ).
                  </span>
                  {isPreviewingEngine && (
                    <button
                      onClick={handleResetToPlayed}
                      className="text-[10px] text-emerald-400 hover:underline ml-2 cursor-pointer font-sans"
                    >
                      Restore
                    </button>
                  )}
                </div>
              )}

              {/* Active Preview Banner */}
              {isPreviewingEngine && (
                <div className="flex items-center justify-between text-[11px] bg-emerald-950/80 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-500/50">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Previewing {previewingLineRank ? `Line #${previewingLineRank}` : previewingMoveSan ? `Continuation ${previewingMoveSan}` : "Engine Move"} on board
                    </span>
                  </span>
                  <button
                    onClick={handleResetToPlayed}
                    className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                  >
                    Show Played Move
                  </button>
                </div>
              )}
            </div>

            {/* Syzygy 7-Piece Endgame Tablebase (Phase 2) */}
            {(tablebaseData || isLoadingTablebase) && (
              <div className="bg-gradient-to-br from-[#121622] to-[#161c2b] p-3 rounded-lg border border-sky-500/40 flex flex-col gap-2 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                      7-Piece Syzygy Tablebase
                    </span>
                    {tablebaseData && (
                      <span className="text-[9px] font-mono text-slate-400">
                        ({tablebaseData.pieceCount} pieces)
                      </span>
                    )}
                  </div>

                  {isLoadingTablebase ? (
                    <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" /> Resolving...
                    </span>
                  ) : tablebaseData ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                        tablebaseData.category === "win"
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
                          : tablebaseData.category === "draw"
                          ? "bg-sky-950/80 text-sky-300 border-sky-500/60"
                          : "bg-rose-950/80 text-rose-300 border-rose-500/60"
                      }`}
                    >
                      {tablebaseData.category === "win"
                        ? "Theoretical Win"
                        : tablebaseData.category === "draw"
                        ? "Theoretical Draw"
                        : "Theoretical Loss"}
                    </span>
                  ) : null}
                </div>

                {tablebaseData && (
                  <>
                    <p className="text-[11px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#202738]">
                      {tablebaseData.summary}
                    </p>

                    {/* Tablebase Candidate Moves */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Optimal Tablebase Continuations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tablebaseData.moves.slice(0, 5).map((m) => {
                          const isWin = m.category === "win";
                          const isDraw = m.category === "draw";
                          const isPreviewed = isPreviewingEngine && previewingMoveSan === m.san;
                          return (
                            <button
                              key={m.uci}
                              type="button"
                              onClick={() => handlePreviewCustomMove(m.san)}
                              className={`px-2 py-1 rounded text-xs font-mono font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                                isPreviewed
                                  ? "bg-emerald-600 text-white border-emerald-400 shadow ring-1 ring-emerald-400/50"
                                  : isWin
                                  ? "bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border-emerald-500/40"
                                  : isDraw
                                  ? "bg-sky-950/50 hover:bg-sky-900 text-sky-200 border-sky-500/40"
                                  : "bg-rose-950/50 hover:bg-rose-900 text-rose-200 border-rose-500/40"
                              }`}
                              title={`Preview ${m.san} (${m.category}${m.dtm !== null ? `, mate in ${Math.ceil(Math.abs(m.dtm) / 2)}` : ""})`}
                            >
                              <span>{m.san}</span>
                              <span className="text-[9px] uppercase opacity-75 font-sans">
                                {m.category}
                                {m.dtm !== null && isWin ? ` (M${Math.ceil(Math.abs(m.dtm) / 2)})` : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Master Opening Theory (Phase 2) */}
            {cloudOpeningData && cloudOpeningData.moves.length > 0 && (
              <div className="bg-[#12141d] p-2.5 rounded-lg border border-[#222736] flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-[#202533] pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      Master Opening Book
                    </span>
                    {isLoadingCloudOpening && <Loader2 className="w-3 h-3 animate-spin text-sky-400" />}
                  </div>

                  {cloudOpeningData.moves.some((m) => m.san === selectedMove.san) ? (
                    <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Book Move
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono">
                      Novelty / Off-Book
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {cloudOpeningData.moves.slice(0, 3).map((m, idx) => {
                    const isPlayedInGame = m.san === selectedMove.san;
                    const isPreviewed = isPreviewingEngine && previewingMoveSan === m.san;
                    return (
                      <div
                        key={m.uci + idx}
                        onClick={() => handlePreviewCustomMove(m.san)}
                        className={`flex items-center justify-between p-1.5 rounded text-xs border transition cursor-pointer ${
                          isPreviewed
                            ? "bg-[#1c2333] border-sky-500 text-white"
                            : "bg-[#151824] hover:bg-[#1a1f2e] border-[#222736] text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                          <strong className="font-mono text-white text-xs">{m.san}</strong>
                          {isPlayedInGame && (
                            <span className="text-[9px] text-emerald-400 font-mono">(Played)</span>
                          )}
                          {m.gamesCount && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({m.gamesCount.toLocaleString()} games)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-300">{m.evalDisplay}</span>
                          {m.winrate !== undefined && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              {m.winrate}% W
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewCustomMove(m.san);
                            }}
                            className="text-[10px] px-1.5 py-0.2 bg-[#202534] hover:bg-[#2c3346] text-slate-300 rounded cursor-pointer"
                          >
                            {isPreviewed ? "Viewing" : "Preview"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar for Selected Move */}
            <div className="flex items-center justify-between pt-1 gap-2 border-t border-[#232733]">
              <button
                onClick={handleToggleEnginePreview}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                  isPreviewingEngine
                    ? "bg-emerald-700 text-white border-emerald-500"
                    : "bg-[#1f2432] text-slate-300 hover:text-white border-[#2f3647]"
                }`}
                title="Toggle viewing the engine move on the chessboard"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isPreviewingEngine ? "Show Played Move" : "Preview Top Engine Move"}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {(selectedMove.grade === "blunder" ||
                  selectedMove.grade === "mistake" ||
                  selectedMove.grade === "missed_win") && (
                  <button
                    onClick={() => onRetryBlunder(selectedMove)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#1f2432] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-[#2f3647] flex items-center gap-1 transition cursor-pointer"
                    title="Retry this position against the engine"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Retry</span>
                  </button>
                )}

                {onOpenCoach && (
                  <button
                    onClick={onOpenCoach}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-600/40 flex items-center gap-1 transition cursor-pointer"
                    title="Ask AI Coach for detailed explanation"
                  >
                    <Bot className="w-3 h-3 text-emerald-400" />
                    <span>Ask Coach</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Move Sheet vs Evaluation Graph */}
      <div className="flex border-b border-[#232733] pb-1 gap-2">
        <button
          onClick={() => setActiveTab("moves")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "moves"
              ? "bg-[#202534] text-white border border-[#2f3648]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Move Sheet ({totalPlies})
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-[#202534] text-white border border-[#2f3648]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Evaluation Timeline & Accuracy
        </button>
      </div>

      {/* TAB 1: INTERACTIVE MOVE SHEET */}
      {activeTab === "moves" && (
        <div
          ref={moveListRef}
          className="w-full h-56 overflow-y-auto bg-[#11131a] rounded-xl border border-[#232733] p-1.5 font-mono text-xs shadow-inner"
        >
          <div className="flex flex-col gap-0.5">
            {moveRows.map((row) => (
              <div
                key={row.moveNumber}
                className={`flex items-center py-1 px-2 rounded ${
                  row.moveNumber % 2 === 0 ? "bg-[#151822]" : "bg-[#10121a]"
                }`}
              >
                <span className="w-8 text-slate-500 text-[11px] font-sans font-medium">
                  {row.moveNumber}.
                </span>

                {/* White Move */}
                <div
                  data-active={row.white?.ply === selectedPly}
                  onClick={() => {
                    setIsPreviewingEngine(false);
                    setPreviewingLineRank(null);
                    if (row.white) onSelectPly(row.white.ply);
                  }}
                  className={`flex-1 flex items-center justify-between px-2 py-1 rounded cursor-pointer transition mr-1 ${
                    row.white?.ply === selectedPly
                      ? "bg-emerald-700 text-white font-bold shadow"
                      : "hover:bg-[#1f2432] text-slate-200"
                  }`}
                >
                  <span>{row.white?.san}</span>
                  {row.white && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                        gradeInfo[row.white.grade]?.badgeClass || ""
                      }`}
                    >
                      {gradeInfo[row.white.grade]?.glyph}
                    </span>
                  )}
                </div>

                {/* Black Move */}
                <div
                  data-active={row.black?.ply === selectedPly}
                  onClick={() => {
                    setIsPreviewingEngine(false);
                    setPreviewingLineRank(null);
                    if (row.black) onSelectPly(row.black.ply);
                  }}
                  className={`flex-1 flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
                    row.black?.ply === selectedPly
                      ? "bg-emerald-700 text-white font-bold shadow"
                      : "hover:bg-[#1f2432] text-slate-200"
                  }`}
                >
                  <span>{row.black?.san || ""}</span>
                  {row.black && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                        gradeInfo[row.black.grade]?.badgeClass || ""
                      }`}
                    >
                      {gradeInfo[row.black.grade]?.glyph}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: EVALUATION GRAPH & ACCURACY OVERVIEW */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-3">
          {/* Accuracy Meters */}
          <div className="grid grid-cols-2 gap-3 bg-[#11131a] p-3 rounded-xl border border-[#232733]">
            <div className="flex flex-col items-center bg-[#171a24] p-2.5 rounded-lg border border-[#2b3040]">
              <span className="text-xs font-medium text-slate-400 mb-0.5">White Accuracy</span>
              <div className="text-2xl font-black text-white font-mono">
                {report.whiteAccuracy}%
              </div>
              <div className="w-full bg-[#242938] h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${report.whiteAccuracy}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center bg-[#171a24] p-2.5 rounded-lg border border-[#2b3040]">
              <span className="text-xs font-medium text-slate-400 mb-0.5">Black Accuracy</span>
              <div className="text-2xl font-black text-white font-mono">
                {report.blackAccuracy}%
              </div>
              <div className="w-full bg-[#242938] h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${report.blackAccuracy}%` }}
                />
              </div>
            </div>
          </div>

          {/* SVG Advantage Evaluation Timeline */}
          <div className="bg-[#11131a] p-3 rounded-xl border border-[#232733]">
            <div className="flex items-center justify-between mb-1.5 text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Advantage Curve
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{points.length} plies</span>
            </div>

            <div className="w-full bg-[#0a0c10] rounded-lg p-2 border border-[#1e222d] relative overflow-hidden">
              <div
                className="absolute inset-x-0 border-b border-dashed border-slate-800 pointer-events-none"
                style={{ top: `${midY + 8}px` }}
              />
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-16 overflow-visible">
                <path d={`${pathD} L ${chartWidth} ${midY} L 0 ${midY} Z`} fill="url(#evalGrad)" opacity="0.25" />
                <defs>
                  <linearGradient id="evalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                {points.map((pt) => (
                  <circle
                    key={pt.ply}
                    cx={pt.x}
                    cy={pt.y}
                    r={selectedPly === pt.ply ? "4.5" : "2"}
                    fill={selectedPly === pt.ply ? "#ffffff" : "#94a3b8"}
                    stroke={selectedPly === pt.ply ? "#0284c7" : "none"}
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onClick={() => {
                      setIsPreviewingEngine(false);
                      onSelectPly(pt.ply);
                    }}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Add to Personal Training Plan Button */}
      {onAddToTrainingPlan && (
        <button
          onClick={() => onAddToTrainingPlan(report)}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md border border-emerald-500/40 group"
        >
          <GraduationCap className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
          <span>Save to My Games (adds its mistakes to your drills)</span>
        </button>
      )}

      {/* Copy FEN / PGN Utilities */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyPgn}
          className="flex-1 py-1.5 px-2 bg-[#171a24] hover:bg-[#222634] text-slate-300 text-xs rounded-lg border border-[#2b3040] flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedPgn ? "PGN Copied" : "Copy PGN"}
        </button>
        <button
          onClick={handleCopyFen}
          className="flex-1 py-1.5 px-2 bg-[#171a24] hover:bg-[#222634] text-slate-300 text-xs rounded-lg border border-[#2b3040] flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedFen ? "FEN Copied" : "Copy FEN"}
        </button>
      </div>

      {/* PGN Import Modal */}
      {showPgnModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171a24] p-5 rounded-xl border border-[#333a4d] shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-white font-bold text-sm mb-1.5">Import PGN Game</h4>
            <p className="text-xs text-slate-400 mb-3">
              Paste standard Portable Game Notation (PGN) to generate engine analysis:
            </p>
            <textarea
              value={customPgnInput}
              onChange={(e) => setCustomPgnInput(e.target.value)}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5..."
              rows={6}
              className="w-full bg-[#0f1117] text-slate-200 font-mono text-xs p-3 rounded-lg border border-[#2e3444] focus:outline-none focus:border-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPgnModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customPgnInput.trim()) {
                    onLoadPgn(customPgnInput.trim());
                    setShowPgnModal(false);
                    setCustomPgnInput("");
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow cursor-pointer"
              >
                Analyze Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
