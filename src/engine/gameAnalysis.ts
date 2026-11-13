/**
 * Full-game review with Stockfish.
 *
 * Every position is searched exactly once (MultiPV 2); the score of position
 * N+1 is reused as the "after" score of move N. If the engine is unavailable
 * the review fails loudly instead of silently substituting a weaker engine.
 */
import { Chess, type Move } from "chess.js";
import type { AnalyzedMove, EngineCandidateLine, GameAnalysisReport, MoveGrade } from "../types/chess";
import { stockfishService, uciLineFens, type SearchResult } from "./stockfishService";
import { gamePhase, gradeMove, materialBalance, parseClock, type Score } from "./grading";
import { generateCoachExplanation } from "./commentaryEngine";

export class EngineUnavailableError extends Error {
  constructor() {
    super("Stockfish could not be started in this browser, so the game was not analyzed.");
    this.name = "EngineUnavailableError";
  }
}

export interface AnalyzeOptions {
  depth?: number;
  priority?: "high" | "low";
  onProgress?: (percent: number, done: number, total: number) => void;
  /** Return true to abort (e.g. user navigated away). */
  isCancelled?: () => boolean;
}

interface ParsedGame {
  moves: Move[];
  clocks: (number | null)[];
}

export function parseGame(pgnOrSans: string | string[]): ParsedGame {
  const g = new Chess();
  if (Array.isArray(pgnOrSans)) {
    const moves: Move[] = [];
    for (const san of pgnOrSans) moves.push(g.move(san));
    return { moves, clocks: moves.map(() => null) };
  }
  g.loadPgn(pgnOrSans);
  const moves = g.history({ verbose: true });
  const comments = new Map(g.getComments().map((c) => [c.fen, c.comment]));
  const clocks = moves.map((m) => parseClock(comments.get(m.after)));
  return { moves, clocks };
}

function terminalScore(fen: string): Score | null {
  const g = new Chess(fen);
  // Side to move is mated: report it as a mate score against them.
  if (g.isCheckmate()) return { cp: 0, mate: g.turn() === "w" ? -1 : 1 };
  if (g.isDraw() || g.isStalemate()) return { cp: 0, mate: null };
  return null;
}

/** White-POV score suitable for the eval bar/graph (mates shown as ±10000-ish). */
export function scoreToDisplayCp(s: Score): number {
  if (s.mate !== null) return s.mate > 0 ? 10000 - s.mate * 10 : -10000 - s.mate * 10;
  return s.cp;
}

function toCandidateLines(res: SearchResult): EngineCandidateLine[] {
  return res.lines.slice(0, 3).map((l) => ({
    rank: l.rank,
    san: l.pvSan[0] ?? "",
    uci: l.pvUci[0],
    score: scoreToDisplayCp(l.score),
    isMate: l.score.mate !== null,
    mateIn: l.score.mate !== null ? Math.abs(l.score.mate) : undefined,
    pv: l.pvSan.slice(0, 8),
  }));
}

const emptyCounts = (): Record<MoveGrade, number> => ({
  brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0,
});

export async function analyzeGame(pgnOrSans: string | string[], opts: AnalyzeOptions = {}): Promise<GameAnalysisReport> {
  const depth = opts.depth ?? 12;
  const { moves, clocks } = parseGame(pgnOrSans);

  // Positions 0..N (start position and after each move).
  const fens = [moves[0]?.before ?? new Chess().fen(), ...moves.map((m) => m.after)];
  const results: SearchResult[] = [];
  const scores: Score[] = [];

  for (let i = 0; i < fens.length; i++) {
    if (opts.isCancelled?.()) throw new Error("Analysis cancelled");
    const fen = fens[i];
    const terminal = terminalScore(fen);
    if (terminal) {
      results.push({ fen, bestMoveUci: "", bestMoveSan: "", lines: [], depth, source: "stockfish" });
      scores.push(terminal);
    } else {
      const res = await stockfishService.analyze(fen, { depth, multipv: 2 }, { priority: opts.priority ?? "high" });
      if (res.source !== "stockfish" || !res.lines[0]) throw new EngineUnavailableError();
      results.push(res);
      scores.push(res.lines[0].score);
    }
    opts.onProgress?.(Math.round(((i + 1) / fens.length) * 100), i + 1, fens.length);
  }

  const analyzed: AnalyzedMove[] = [];
  const acc = { w: [] as number[], b: [] as number[] };
  const gradeCounts = { w: emptyCounts(), b: emptyCounts() };
  const sans: string[] = [];

  moves.forEach((move, i) => {
    sans.push(move.san);
    const before = results[i];
    const after = results[i + 1];
    const uci = move.from + move.to + (move.promotion ?? "");
    const playedBest = before.bestMoveUci === uci;
    const replyLine = after.lines[0]?.pvUci ?? [];
    const lineFens = uciLineFens(move.after, replyLine.slice(0, 4));
    const materialAfterLine = lineFens.length ? materialBalance(lineFens[lineFens.length - 1]) : materialBalance(move.after);

    const { grade, drop, accuracy } = gradeMove({
      color: move.color,
      before: scores[i],
      after: scores[i + 1],
      playedBest,
      secondBest: before.lines[1]?.score ?? null,
      materialBefore: materialBalance(move.before),
      materialAfterLine,
    });

    acc[move.color].push(accuracy);
    gradeCounts[move.color][grade]++;

    const moveNumber = Math.floor(i / 2) + 1;
    const evalBefore = scoreToDisplayCp(scores[i]);
    const evalAfter = scoreToDisplayCp(scores[i + 1]);
    const bestSan = before.bestMoveSan || move.san;

    analyzed.push({
      ply: i + 1,
      moveNumber,
      san: move.san,
      from: move.from,
      to: move.to,
      color: move.color,
      fenBefore: move.before,
      fenAfter: move.after,
      evalBefore,
      evalAfter,
      grade,
      bestMoveSan: bestSan,
      explanation: generateCoachExplanation({
        grade,
        san: move.san,
        piece: move.piece,
        from: move.from,
        to: move.to,
        color: move.color,
        captured: move.captured,
        promotion: move.promotion,
        flags: move.flags,
        bestMoveSan: bestSan,
        evalBefore,
        evalAfter,
        ply: i + 1,
        moveNumber,
        fenBefore: move.before,
        fenAfter: move.after,
        allSansSoFar: [...sans],
      }),
      topLines: toCandidateLines(before),
      uci,
      bestMoveUci: before.bestMoveUci,
      scoreBefore: scores[i],
      scoreAfter: scores[i + 1],
      winDrop: drop,
      accuracy: Math.round(accuracy),
      phase: gamePhase(move.before, moveNumber),
      clock: clocks[i],
      bestLineSan: before.lines[0]?.pvSan.slice(0, 8) ?? [],
      replyLineUci: replyLine.slice(0, 6),
    });
  });

  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 100);
  const whiteAccuracy = mean(acc.w);
  const blackAccuracy = mean(acc.b);

  let coachOverview: string;
  if (Math.abs(whiteAccuracy - blackAccuracy) < 10) {
    coachOverview = `An evenly played game (White ${whiteAccuracy}%, Black ${blackAccuracy}%).`;
  } else {
    const better = whiteAccuracy > blackAccuracy ? "White" : "Black";
    coachOverview = `${better} played more accurately (White ${whiteAccuracy}%, Black ${blackAccuracy}%).`;
  }

  return {
    whiteAccuracy,
    blackAccuracy,
    totalMoves: analyzed.length,
    moves: analyzed,
    gradeCounts,
    coachOverview,
    blunderPuzzles: analyzed.filter((m) => m.grade === "blunder" || m.grade === "missed_win"),
    engineName: stockfishService.getEngineName(),
    depth,
  };
}
