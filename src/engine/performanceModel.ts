/**
 * Calibrated single-game performance estimate.
 *
 * The weights in performanceModel.json were fitted (scripts/calibration/) on games from the
 * Lichess open database whose players' ratings are known, analyzed with this app's own
 * pipeline (Stockfish depth 12, MultiPV 2, the same grading). So the number is on the
 * LICHESS rating scale, per time control. Chess.com ratings are on a different scale
 * (generally lower at the same strength), so expect an offset there.
 *
 * A single game is a noisy sample: the margin reported is an empirical 80% interval.
 */
import type { AnalyzedMove } from "../types/chess";
import { scoreToCp } from "./grading";
import model from "./performanceModel.json";

/** [cp loss, mover's eval before, grade code, win-prob drop in 0.1%, move accuracy] */
export type MoveTuple = [number, number, number, number, number];

export const GRADE_CODE: Record<string, number> = {
  brilliant: 0, great: 1, best: 2, good: 3, inaccuracy: 4, mistake: 5, blunder: 6, missed_win: 7,
};

type Move = Pick<AnalyzedMove, "color" | "grade" | "evalBefore" | "evalAfter" | "scoreBefore" | "scoreAfter" | "winDrop" | "accuracy">;

/** One move as the calibration data records it. Mates clamp to +-1000cp (scoreToCp). */
export function moveTuple(m: Move, color: "w" | "b"): MoveTuple {
  const sign = color === "w" ? 1 : -1;
  const before = m.scoreBefore ? scoreToCp(m.scoreBefore) : m.evalBefore;
  const after = m.scoreAfter ? scoreToCp(m.scoreAfter) : m.evalAfter;
  return [
    Math.max(0, Math.round(sign * (before - after))),
    Math.round(sign * before),
    GRADE_CODE[m.grade] ?? 3,
    Math.round((m.winDrop ?? 0) * 1000),
    m.accuracy ?? 100,
  ];
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const cap = (x: number, c: number) => Math.min(c, x);

/** Every feature the calibration explored; the model uses the subset named in its JSON. */
export function performanceFeatures(mv: MoveTuple[], acc: number): Record<string, number> {
  const n = mv.length;
  const loss500 = mean(mv.map((m) => cap(m[0], 500)));
  const loss300 = mean(mv.map((m) => cap(m[0], 300)));
  const loss150 = mean(mv.map((m) => cap(m[0], 150)));
  const open = mv.filter((m) => Math.abs(m[1]) <= 400);
  const lossOpen = open.length >= 5 ? mean(open.map((m) => cap(m[0], 300))) : loss300;
  const rate = (codes: number[]) => mv.filter((m) => codes.includes(m[2])).length / n;
  return {
    n,
    acc,
    acpl500: loss500,
    logAcpl500: Math.log(loss500 + 10),
    logAcpl300: Math.log(loss300 + 10),
    logAcpl150: Math.log(loss150 + 10),
    logAcplOpen: Math.log(lossOpen + 10),
    blunder: rate([6, 7]),
    mistake: rate([5]),
    inacc: rate([4]),
    errors: rate([4, 5, 6, 7]),
    meanWinDrop: mean(mv.map((m) => m[3])) / 10,
    decided: mv.filter((m) => Math.abs(m[1]) > 500).length / n,
    logN: Math.log(n),
  };
}

type Basis = "bullet" | "blitz" | "rapid" | "all";

export type PerformanceEstimate =
  | {
      kind: "range";
      /** Typical (median) rating of players who produce games like this, Lichess scale. */
      mid: number;
      /** 80% of such players are rated between low and high. */
      low: number;
      high: number;
      basis: Basis;
      moves: number;
      /** Average centipawn loss per move (each move capped at 300). */
      acpl: number;
    }
  | {
      /** The game's features barely narrow down the rating for this time control (bullet). */
      kind: "uninformative";
      basis: Basis;
      moves: number;
      acpl: number;
    };

interface TableRow { est: number; lo: number; mid: number; hi: number }
interface ClassModel { n: number; weights: number[]; table: TableRow[]; informativeness: number; informative: boolean }
const classes = model.classes as Record<string, ClassModel>;
const FEATURES = model.features as string[];

const round50 = (x: number) => Math.round(x / 50) * 50;
const MIN_MOVES = 10;

/** Piecewise-linear lookup of the calibration table; clamps outside the fitted range. */
export function lookupRange(table: TableRow[], est: number): { lo: number; mid: number; hi: number } {
  if (est <= table[0].est) return table[0];
  const last = table[table.length - 1];
  if (est >= last.est) return last;
  const i = table.findIndex((t) => t.est >= est);
  const a = table[i - 1], b = table[i];
  const t = (est - a.est) / (b.est - a.est);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return { lo: lerp(a.lo, b.lo), mid: lerp(a.mid, b.mid), hi: lerp(a.hi, b.hi) };
}

/** Pure model evaluation on already-extracted move tuples (shared by the app and the tests). */
export function performanceFromTuples(
  mv: MoveTuple[],
  accuracy: number,
  timeClass?: string | null,
): PerformanceEstimate | null {
  if (mv.length < MIN_MOVES) return null;
  const key = (timeClass ?? "").charAt(0).toUpperCase() + (timeClass ?? "").slice(1).toLowerCase();
  const known = !!classes[key];
  const m = classes[known ? key : "ALL"];
  const basis: Basis = known ? (key.toLowerCase() as Basis) : "all";
  const f = performanceFeatures(mv, accuracy);
  const acpl = Math.round(Math.exp(f.logAcpl300) - 10);
  if (!m.informative) return { kind: "uninformative", basis, moves: mv.length, acpl };
  const est = m.weights[0] + FEATURES.reduce((s, name, i) => s + m.weights[i + 1] * f[name], 0);
  const r = lookupRange(m.table, est);
  return { kind: "range", mid: round50(r.mid), low: round50(r.lo), high: round50(r.hi), basis, moves: mv.length, acpl };
}

/**
 * Performance estimate for one side of a reviewed game. `accuracy` is that side's
 * accuracy from the report; `timeClass` selects the per-time-control calibration.
 */
export function estimatePerformance(
  moves: Move[],
  color: "w" | "b",
  opts: { accuracy: number; timeClass?: string | null },
): PerformanceEstimate | null {
  const mv = moves.filter((m) => m.color === color).map((m) => moveTuple(m, color));
  return performanceFromTuples(mv, opts.accuracy, opts.timeClass);
}

/** Shift a range estimate by a rating-scale offset (e.g. Chess.com vs the Lichess-calibrated model). */
export function applyRatingOffset(est: PerformanceEstimate | null, offset: number): PerformanceEstimate | null {
  if (!est || est.kind !== "range" || !offset) return est;
  const shift = (x: number) => Math.max(100, round50(x + offset));
  return { ...est, mid: shift(est.mid), low: shift(est.low), high: shift(est.high) };
}
