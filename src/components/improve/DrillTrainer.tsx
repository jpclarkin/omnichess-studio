import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Lightbulb, Eye, ChevronRight, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Chessboard } from "../Chessboard";
import type { BoardTheme } from "../../types/chess";
import { MISTAKE_LABELS, type MistakeExample } from "../../services/insights";
import { recordDrillAttempt, type DrillProgress } from "../../services/coachPlan";
import { stockfishService } from "../../engine/stockfishService";
import { winProbFor } from "../../engine/grading";
import { soundManager } from "../../audio/soundManager";
import { fmtDate } from "./hooks";

type State =
  | { kind: "solving" }
  | { kind: "checking" }
  | { kind: "correct"; note: string }
  | { kind: "wrong"; note: string };

interface Props {
  drill: MistakeExample;
  progress?: DrillProgress;
  theme: BoardTheme;
  onNext: () => void;
  onProgress: (all: Record<string, DrillProgress>) => void;
  onOpenGame: (gameId: string, ply: number) => void;
}

/** "Find the better move" from a position where you made a mistake. Keyed by drill id. */
export function DrillTrainer({ drill, progress, theme, onNext, onProgress, onOpenGame }: Props) {
  const [game, setGame] = useState(() => new Chess(drill.fen));
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [state, setState] = useState<State>({ kind: "solving" });
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const bestLine = useMemo(() => drill.bestLineSan.slice(0, 6).join(" "), [drill]);
  const hintPiece = useMemo(() => {
    try {
      const m = new Chess(drill.fen).move(drill.bestSan);
      const names: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
      return `Look at your ${names[m.piece]} on ${m.from}.`;
    } catch {
      return "Look for checks, captures and threats first.";
    }
  }, [drill]);

  const record = (correct: boolean) => {
    if (recorded) return;
    setRecorded(true);
    onProgress(recordDrillAttempt(drill.id, correct));
  };

  const reset = () => {
    setGame(new Chess(drill.fen));
    setLastMove(null);
    setState({ kind: "solving" });
  };

  const onMove = async (mv: { from: string; to: string; promotion?: string }) => {
    if (state.kind !== "solving") return;
    const g = new Chess(drill.fen);
    let played;
    try {
      played = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? "q" });
    } catch {
      return;
    }
    setGame(g);
    setLastMove({ from: played.from, to: played.to });

    if (played.san === drill.bestSan) {
      soundManager.playSuccess();
      setState({ kind: "correct", note: `${played.san} is the engine's top move.` });
      record(!showHint && !revealed);
      return;
    }
    if (played.san === drill.playedSan) {
      soundManager.playBlunder();
      setState({ kind: "wrong", note: `${played.san} is the move you played in the game — it's the mistake. Try again.` });
      record(false);
      return;
    }
    // Some other move: ask Stockfish whether it's as good as the best move.
    setState({ kind: "checking" });
    const res = await stockfishService.analyze(g.fen(), { depth: 14 }, { priority: "high", key: "drill-check" }).catch(() => null);
    if (!res || res.source !== "stockfish" || !res.lines[0] || !drill.scoreBefore) {
      setState({ kind: "wrong", note: `Not the expected move (${drill.bestSan}). The engine couldn't check alternatives right now.` });
      record(false);
      return;
    }
    const target = winProbFor(drill.scoreBefore, drill.color);
    const got = winProbFor(res.lines[0].score, drill.color);
    if (target - got <= 0.03) {
      soundManager.playSuccess();
      setState({ kind: "correct", note: `${played.san} also works — the engine rates it about as well as ${drill.bestSan}.` });
      record(!showHint && !revealed);
    } else {
      soundManager.playBlunder();
      setState({ kind: "wrong", note: `${played.san} is better than the game move, but not good enough. Try again.` });
      record(false);
    }
  };

  const solved = state.kind === "correct";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 flex justify-center">
        <Chessboard
          game={game}
          onMove={(m) => void onMove(m)}
          isFlipped={drill.color === "b"}
          theme={theme}
          lastMove={lastMove}
          interactive={state.kind === "solving"}
        />
      </div>
      <div className="lg:col-span-5 flex flex-col gap-3">
        <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">{MISTAKE_LABELS[drill.type]}</div>
          <h3 className="text-white font-bold mt-1">
            {drill.color === "w" ? "White" : "Black"} to move — find a better move than {drill.playedSan}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            From your game vs {drill.opponent} ({fmtDate(drill.endTime)}), move {drill.moveNumber}
            {drill.timeTrouble ? " · you were low on time" : ""}.
          </p>
          {progress && (
            <p className="text-[11px] text-slate-500 mt-1">
              Attempted {progress.attempts}× · solved {progress.solved}× · next review {fmtDate(progress.dueAt)}
            </p>
          )}
        </div>

        {state.kind === "checking" && (
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking your move with Stockfish…
          </div>
        )}
        {(state.kind === "correct" || state.kind === "wrong") && (
          <div className={`rounded-xl p-3 text-sm flex gap-2 ${solved ? "bg-emerald-950/50 border border-emerald-700/50 text-emerald-200" : "bg-rose-950/40 border border-rose-700/40 text-rose-200"}`}>
            {solved ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{state.note}</span>
          </div>
        )}

        {showHint && !solved && <div className="text-xs text-amber-200 bg-amber-950/30 border border-amber-800/40 rounded-lg p-3">{hintPiece}</div>}
        {(revealed || solved) && (
          <div className="text-xs text-slate-300 bg-[#11131a] border border-[#232733] rounded-lg p-3">
            <span className="text-slate-500">Engine line: </span>
            <span className="font-mono text-emerald-300">{bestLine}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {state.kind === "wrong" && (
            <button onClick={reset} className="px-3 py-1.5 bg-[#212634] text-slate-200 text-xs rounded-lg border border-[#30384c] cursor-pointer">
              Try again
            </button>
          )}
          {!solved && !showHint && (
            <button onClick={() => setShowHint(true)} className="px-3 py-1.5 bg-[#212634] text-slate-200 text-xs rounded-lg border border-[#30384c] flex items-center gap-1.5 cursor-pointer">
              <Lightbulb className="w-3.5 h-3.5" /> Hint
            </button>
          )}
          {!solved && !revealed && (
            <button
              onClick={() => {
                setRevealed(true);
                record(false);
              }}
              className="px-3 py-1.5 bg-[#212634] text-slate-200 text-xs rounded-lg border border-[#30384c] flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Show answer
            </button>
          )}
          <button onClick={() => onOpenGame(drill.gameId, drill.ply)} className="px-3 py-1.5 bg-[#212634] text-slate-200 text-xs rounded-lg border border-[#30384c] flex items-center gap-1.5 cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" /> Open game
          </button>
          <button onClick={onNext} className="ml-auto px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
