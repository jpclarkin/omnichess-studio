/**
 * Pure move-grading and scoring helpers.
 *
 * Win probability and accuracy follow the formulas Lichess publishes
 * (https://lichess.org/page/accuracy), so numbers are comparable to what
 * players see on Lichess. Thresholds for inaccuracy / mistake / blunder use
 * Lichess's win-chance drops (0.05 / 0.10 / 0.15 on a 0–1 scale).
 */
import type { EngineScore, GamePhase, MoveGrade } from "../types/chess";

/** An engine score from White's point of view. Exactly one of cp / mate is meaningful. */
export type Score = EngineScore;

const CP_CEILING = 1000;

/** Collapse a score to centipawns (White POV), clamping mates and huge evals to ±1000. */
export function scoreToCp(s: Score): number {
  if (s.mate !== null) {
    if (s.mate === 0) return 0;
    return s.mate > 0 ? CP_CEILING : -CP_CEILING;
  }
  return Math.max(-CP_CEILING, Math.min(CP_CEILING, s.cp));
}

/** Lichess winning-chances curve mapped to 0..1 (probability-like). */
export function winProb(cp: number): number {
  const c = Math.max(-CP_CEILING, Math.min(CP_CEILING, cp));
  return 1 / (1 + Math.exp(-0.00368208 * c));
}

/** Win probability for `color` given a White-POV score. */
export function winProbFor(s: Score, color: "w" | "b"): number {
  const wp = winProb(scoreToCp(s));
  return color === "w" ? wp : 1 - wp;
}

/** Lichess per-move accuracy from the mover's win probability before/after (0..1). */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  const drop = Math.max(0, wpBefore - wpAfter) * 100;
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669;
  return Math.min(100, Math.max(0, raw));
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material balance (White minus Black) from the piece-placement field of a FEN. */
export function materialBalance(fen: string): number {
  const placement = fen.split(" ")[0];
  let bal = 0;
  for (const ch of placement) {
    const lower = ch.toLowerCase();
    const v = PIECE_VALUES[lower];
    if (v === undefined) continue;
    bal += ch === lower ? -v : v;
  }
  return bal;
}

/** Number of non-pawn, non-king pieces on the board (both sides). */
export function pieceCount(fen: string): number {
  const placement = fen.split(" ")[0];
  let n = 0;
  for (const ch of placement) if ("nbrqNBRQ".includes(ch)) n++;
  return n;
}

/** Simple, explainable phase split: endgame when ≤ 6 pieces remain, opening through move 12. */
export function gamePhase(fen: string, moveNumber: number): GamePhase {
  if (pieceCount(fen) <= 6) return "endgame";
  if (moveNumber <= 12) return "opening";
  return "middlegame";
}

export interface GradeInput {
  color: "w" | "b";
  /** Engine score of the position before the move (White POV). */
  before: Score;
  /** Engine score of the position after the move (White POV). */
  after: Score;
  /** True if the played move equals the engine's top choice. */
  playedBest: boolean;
  /** Score of the engine's 2nd-best move before the move, if MultiPV ≥ 2 was available. */
  secondBest?: Score | null;
  /** Material balance (White POV) before the move. */
  materialBefore: number;
  /**
   * Material balance (White POV) at the end of the engine's best continuation
   * from the position after the move (a few plies), used to detect sacrifices.
   */
  materialAfterLine?: number | null;
}

/**
 * Grade a move. Returns the grade plus the mover's win-probability drop.
 *
 * - blunder / mistake / inaccuracy: win-chance drop ≥ 0.15 / 0.10 / 0.05.
 * - missed_win: you were clearly winning (≥ 0.75) and fell to ≤ 0.55.
 * - brilliant: best (or near-best) move that gives up ≥ 2 points of material
 *   in the engine line and still keeps you at least equal — a real sacrifice.
 * - great: the only good move (the 2nd-best option was ≥ 0.10 worse).
 * - best: engine's top move or within 0.02.
 */
export function gradeMove(g: GradeInput): { grade: MoveGrade; drop: number; accuracy: number } {
  const wpBefore = winProbFor(g.before, g.color);
  const wpAfter = winProbFor(g.after, g.color);
  const drop = Math.max(0, wpBefore - wpAfter);
  const accuracy = moveAccuracy(wpBefore, wpAfter);

  if (wpBefore >= 0.75 && wpAfter <= 0.55 && drop >= 0.1) {
    return { grade: "missed_win", drop, accuracy };
  }
  if (drop >= 0.15) return { grade: "blunder", drop, accuracy };
  if (drop >= 0.1) return { grade: "mistake", drop, accuracy };
  if (drop >= 0.05) return { grade: "inaccuracy", drop, accuracy };

  const nearBest = g.playedBest || drop <= 0.02;
  if (nearBest) {
    const sign = g.color === "w" ? 1 : -1;
    if (g.materialAfterLine !== undefined && g.materialAfterLine !== null) {
      const materialGiven = sign * (g.materialBefore - g.materialAfterLine);
      if (materialGiven >= 2 && wpAfter >= 0.5 && wpBefore < 0.9) {
        return { grade: "brilliant", drop, accuracy };
      }
    }
    if (g.secondBest) {
      const wpSecond = winProbFor(g.secondBest, g.color);
      if (g.playedBest && wpBefore - wpSecond >= 0.1 && wpBefore < 0.9) {
        return { grade: "great", drop, accuracy };
      }
    }
    return { grade: "best", drop, accuracy };
  }
  return { grade: "good", drop, accuracy };
}

/** Parse a "[%clk 0:01:23.4]" comment into seconds. */
export function parseClock(comment: string | undefined): number | null {
  if (!comment) return null;
  const m = comment.match(/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/);
  if (!m) return null;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3]);
}

export interface PerformanceEstimate {
  /** Estimated performance rating, rounded to the nearest 50. */
  rating: number;
  /** ± uncertainty, rounded to the nearest 50. Widens for short games. */
  margin: number;
  /** Average centipawn loss per move (each move's loss capped at 500). */
  acpl: number;
  moves: number;
}

const MAX_MOVE_LOSS_CP = 500;

/**
 * Rough performance-rating estimate for one side of a reviewed game, from average
 * centipawn loss: rating ≈ 3100·e^(−0.01·ACPL). This is an empirical fit, not a
 * platform rating — treat it as a ballpark. Needs a handful of moves to mean anything.
 */
export function estimatePerformance(
  moves: { color: "w" | "b"; scoreBefore?: Score; scoreAfter?: Score; evalBefore: number; evalAfter: number }[],
  color: "w" | "b",
): PerformanceEstimate | null {
  const losses: number[] = [];
  for (const m of moves) {
    if (m.color !== color) continue;
    const clamp = (x: number) => Math.max(-CP_CEILING, Math.min(CP_CEILING, x));
    const before = m.scoreBefore ? scoreToCp(m.scoreBefore) : clamp(m.evalBefore);
    const after = m.scoreAfter ? scoreToCp(m.scoreAfter) : clamp(m.evalAfter);
    const loss = color === "w" ? before - after : after - before;
    losses.push(Math.min(MAX_MOVE_LOSS_CP, Math.max(0, loss)));
  }
  if (losses.length < 5) return null;
  const acpl = losses.reduce((a, b) => a + b, 0) / losses.length;
  const round50 = (x: number) => Math.round(x / 50) * 50;
  const rating = Math.max(400, Math.min(2900, round50(3100 * Math.exp(-0.01 * acpl))));
  const margin = Math.max(150, Math.min(450, round50(900 / Math.sqrt(losses.length))));
  return { rating, margin, acpl: Math.round(acpl), moves: losses.length };
}
