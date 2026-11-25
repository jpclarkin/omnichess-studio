/**
 * Plain-language move comments built only from facts the engine gave us
 * (grade, evaluations, best move). It never invents strategic reasons.
 */
import type { MoveGrade } from "../types/chess";

export interface MoveCommentaryParams {
  grade: MoveGrade;
  san: string;
  piece: string;
  from: string;
  to: string;
  color: "w" | "b";
  captured?: string;
  promotion?: string;
  flags?: string;
  bestMoveSan: string;
  /** White-POV centipawns; mates are encoded as ±(10000 − 10·n). */
  evalBefore?: number;
  evalAfter?: number;
  ply: number;
  moveNumber: number;
  fenBefore?: string;
  fenAfter?: string;
  allSansSoFar?: string[];
  knownOpeningName?: string;
}

const PIECE_NAMES: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

/** Format a White-POV eval from one side's point of view, e.g. "+1.4" or "mate in 3". */
export function describeEval(cp: number, color: "w" | "b"): string {
  const mine = color === "w" ? cp : -cp;
  if (Math.abs(mine) >= 9000) {
    const n = Math.max(1, Math.round((10000 - Math.abs(mine)) / 10));
    return mine > 0 ? `you have mate in ${n}` : `you get mated in ${n}`;
  }
  const p = mine / 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}`;
}

export function generateCoachExplanation(params: MoveCommentaryParams): string {
  const { grade, san, piece, captured, bestMoveSan, color } = params;
  const before = params.evalBefore ?? 0;
  const after = params.evalAfter ?? 0;
  const pieceName = PIECE_NAMES[piece] ?? "piece";
  const mover = color === "w" ? "White" : "Black";
  const alt = bestMoveSan && bestMoveSan !== san ? bestMoveSan : null;
  const swing = `${describeEval(before, color)} → ${describeEval(after, color)}`;

  if (san.endsWith("#")) return `${san} is checkmate.`;

  const what = captured ? `${san} takes the ${PIECE_NAMES[captured] ?? "piece"}` : `${san} moves the ${pieceName}`;

  switch (grade) {
    case "brilliant":
      return `${what}, giving up material that the engine says is fully justified — the evaluation holds (${swing}). A real sacrifice.`;
    case "great":
      return `${san} is the only good move here: the engine's next-best option was clearly worse. Evaluation ${swing}.`;
    case "best":
      return alt ? `${san} is as good as the engine's choice ${alt} (${swing}).` : `${san} is the engine's top move (${swing}).`;
    case "good":
      return alt ? `${san} is fine; ${alt} was slightly more precise (${swing}).` : `${san} is fine (${swing}).`;
    case "inaccuracy":
      return `${san} gives away a little (${swing}).${alt ? ` ${alt} was better.` : ""}`;
    case "mistake":
      return `${san} is a mistake for ${mover}: the evaluation drops ${swing}.${alt ? ` ${alt} was better.` : ""}`;
    case "blunder":
      return `${san} is a blunder: ${swing}.${alt ? ` ${alt} was the move.` : ""} Check what your opponent can capture or threaten after this move.`;
    case "missed_win":
      return `You were winning before ${san}, but after it the advantage is gone (${swing}).${alt ? ` ${alt} kept the win.` : ""}`;
    default:
      return `${san} (${swing}).`;
  }
}
