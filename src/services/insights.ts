/**
 * Turns analyzed games into plain, checkable statistics about your play.
 * Everything here is a pure function of the stored games (no guessing,
 * no invented ratings): ratings come from the platforms themselves.
 */
import { Chess } from "chess.js";
import type { AnalyzedMove, GamePhase } from "../types/chess";
import { materialBalance } from "../engine/grading";
import { uciLineFens } from "../engine/stockfishService";
import type { GameRecord, Outcome, Platform, TimeClass } from "./gameStore";

export type MistakeType =
  | "hung_material"
  | "missed_tactic"
  | "missed_mate"
  | "allowed_mate"
  | "opening"
  | "endgame"
  | "positional";

export const MISTAKE_LABELS: Record<MistakeType, string> = {
  hung_material: "Left material en prise",
  missed_tactic: "Missed a winning tactic",
  missed_mate: "Missed a checkmate",
  allowed_mate: "Allowed a checkmate",
  opening: "Opening inaccuracy",
  endgame: "Endgame technique",
  positional: "Positional / planning error",
};

export interface MistakeExample {
  id: string; // `${gameId}#${ply}`
  gameId: string;
  ply: number;
  moveNumber: number;
  fen: string;
  color: "w" | "b";
  playedSan: string;
  bestSan: string;
  bestLineSan: string[];
  /** Engine score of the position (White POV), used to judge alternative answers in drills. */
  scoreBefore: { cp: number; mate: number | null } | null;
  type: MistakeType;
  grade: AnalyzedMove["grade"];
  winDrop: number;
  phase: GamePhase;
  timeTrouble: boolean;
  opponent: string;
  endTime: number;
  url: string;
}

export interface OpeningStat {
  key: string;
  color: "w" | "b";
  name: string;
  eco: string | null;
  games: number;
  score: number; // 0..1
  avgEvalAt12: number | null; // centipawns from your side
  openingAccuracy: number | null;
  sampleGameIds: string[];
}

export interface RatingSeries {
  platform: Platform;
  timeClass: TimeClass;
  points: { t: number; rating: number }[];
  latest: number;
  change30d: number | null;
}

export interface PeriodStats {
  games: number;
  accuracy: number | null;
  blundersPerGame: number | null;
  score: number | null;
}

export interface Insights {
  gamesTotal: number;
  analyzedGames: number;
  windowGames: number;
  record: Record<Outcome, number>;
  avgAccuracy: number | null;
  phase: Record<GamePhase, { accuracy: number | null; errorsPer100: number | null; moves: number }>;
  mistakes: MistakeExample[];
  mistakeCounts: Record<MistakeType, number>;
  timeTroubleMistakes: number;
  totalMistakes: number;
  conversion: { winningGames: number; converted: number; thrown: string[] };
  openings: OpeningStat[];
  recent: PeriodStats;
  previous: PeriodStats;
  ratings: RatingSeries[];
  byTimeClass: { timeClass: TimeClass; games: number; score: number; accuracy: number | null }[];
}

const MISTAKE_GRADES = new Set(["mistake", "blunder", "missed_win"]);
const sideSign = (c: "w" | "b") => (c === "w" ? 1 : -1);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const scoreOf = (o: Outcome) => (o === "win" ? 1 : o === "draw" ? 0.5 : 0);

function sanLineToUci(fen: string, sans: string[]): string[] {
  const g = new Chess(fen);
  const out: string[] = [];
  for (const s of sans) {
    try {
      const m = g.move(s);
      out.push(m.from + m.to + (m.promotion ?? ""));
    } catch {
      break;
    }
  }
  return out;
}

/** Material (from the mover's side) after following `uci` for up to `plies` moves. */
function materialAfter(fen: string, uci: string[], plies: number, color: "w" | "b"): number {
  const fens = uciLineFens(fen, uci.slice(0, plies));
  return sideSign(color) * materialBalance(fens.length ? fens[fens.length - 1] : fen);
}

export function classifyMistake(m: AnalyzedMove): MistakeType {
  const s = sideSign(m.color);
  const before = m.scoreBefore;
  const after = m.scoreAfter;
  if (after?.mate != null && after.mate * s < 0) return "allowed_mate";
  if (before?.mate != null && before.mate * s > 0 && !(after?.mate != null && after.mate * s > 0)) return "missed_mate";

  // Opponent's best reply wins material you just left hanging.
  if (m.replyLineUci?.length) {
    const matNow = s * materialBalance(m.fenAfter);
    const matLater = materialAfter(m.fenAfter, m.replyLineUci, 2, m.color);
    if (matNow - matLater >= 2) return "hung_material";
  }
  // The engine's best move would have won material and you didn't play it.
  if (m.bestLineSan?.length) {
    const bestUci = sanLineToUci(m.fenBefore, m.bestLineSan);
    const matBefore = s * materialBalance(m.fenBefore);
    const gain = materialAfter(m.fenBefore, bestUci, 3, m.color) - matBefore;
    if (gain >= 2) return "missed_tactic";
  }
  if (m.phase === "opening") return "opening";
  if (m.phase === "endgame") return "endgame";
  return "positional";
}

export function isTimeTrouble(clock: number | null | undefined, initialSeconds: number | null): boolean {
  if (clock == null) return false;
  if (clock < 30) return true;
  return initialSeconds ? clock < initialSeconds * 0.1 : false;
}

function periodStats(games: GameRecord[]): PeriodStats {
  if (!games.length) return { games: 0, accuracy: null, blundersPerGame: null, score: null };
  const accs: number[] = [];
  let blunders = 0;
  for (const g of games) {
    const a = g.analysis!;
    accs.push(g.playerColor === "w" ? a.whiteAccuracy : a.blackAccuracy);
    blunders += a.gradeCounts[g.playerColor].blunder + a.gradeCounts[g.playerColor].missed_win;
  }
  return {
    games: games.length,
    accuracy: mean(accs),
    blundersPerGame: blunders / games.length,
    score: mean(games.map((g) => scoreOf(g.outcome))),
  };
}

function ratingSeries(games: GameRecord[]): RatingSeries[] {
  const groups = new Map<string, GameRecord[]>();
  for (const g of games) {
    if (!g.rated || g.platform === "local") continue;
    const k = `${g.platform}|${g.timeClass}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(g);
  }
  const out: RatingSeries[] = [];
  for (const [k, gs] of groups) {
    const [platform, timeClass] = k.split("|") as [Platform, TimeClass];
    const points = gs
      .map((g) => ({ t: g.endTime, rating: (g.playerColor === "w" ? g.white.rating : g.black.rating) ?? NaN }))
      .filter((p) => !Number.isNaN(p.rating))
      .sort((a, b) => a.t - b.t);
    if (points.length < 2) continue;
    const latest = points[points.length - 1];
    const monthAgo = latest.t - 30 * 86_400_000;
    const base = points.find((p) => p.t >= monthAgo);
    out.push({ platform, timeClass, points, latest: latest.rating, change30d: base ? latest.rating - base.rating : null });
  }
  return out.sort((a, b) => b.points.length - a.points.length);
}

/**
 * @param games all stored games (newest first)
 * @param window how many of the most recent analyzed games to base stats on
 */
export function computeInsights(games: GameRecord[], window = 100): Insights {
  const sorted = [...games].sort((a, b) => b.endTime - a.endTime);
  const analyzed = sorted.filter((g) => g.analysis);
  const win = analyzed.slice(0, window);

  const record: Record<Outcome, number> = { win: 0, loss: 0, draw: 0 };
  const phaseAcc: Record<GamePhase, number[]> = { opening: [], middlegame: [], endgame: [] };
  const phaseErr: Record<GamePhase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const mistakes: MistakeExample[] = [];
  const mistakeCounts = Object.fromEntries(Object.keys(MISTAKE_LABELS).map((k) => [k, 0])) as Record<MistakeType, number>;
  let timeTroubleMistakes = 0;
  const conversion = { winningGames: 0, converted: 0, thrown: [] as string[] };
  const openingMap = new Map<string, { stat: OpeningStat; evals: number[]; accs: number[]; scores: number[] }>();
  const accAll: number[] = [];

  for (const g of win) {
    const a = g.analysis!;
    record[g.outcome]++;
    const mine = a.moves.filter((m) => m.color === g.playerColor);
    accAll.push(g.playerColor === "w" ? a.whiteAccuracy : a.blackAccuracy);
    const s = sideSign(g.playerColor);
    const opponent = g.playerColor === "w" ? g.black.name : g.white.name;

    // Converting winning positions: you reached ≥ +3 (from your side) at some point.
    const wasWinning = a.moves.some((m) => m.color !== g.playerColor && s * m.evalAfter >= 300 && Math.abs(m.evalAfter) < 9000)
      || a.moves.some((m) => m.scoreAfter?.mate != null && m.scoreAfter.mate * s > 0);
    if (wasWinning) {
      conversion.winningGames++;
      if (g.outcome === "win") conversion.converted++;
      else conversion.thrown.push(g.id);
    }

    for (const m of mine) {
      const phase = m.phase ?? "middlegame";
      if (m.accuracy != null) phaseAcc[phase].push(m.accuracy);
      if (!MISTAKE_GRADES.has(m.grade)) continue;
      phaseErr[phase]++;
      const type = classifyMistake(m);
      const tt = isTimeTrouble(m.clock, g.initialSeconds);
      mistakeCounts[type]++;
      if (tt) timeTroubleMistakes++;
      mistakes.push({
        id: `${g.id}#${m.ply}`,
        gameId: g.id,
        ply: m.ply,
        moveNumber: m.moveNumber,
        fen: m.fenBefore,
        color: m.color,
        playedSan: m.san,
        bestSan: m.bestMoveSan,
        bestLineSan: m.bestLineSan ?? [m.bestMoveSan],
        scoreBefore: m.scoreBefore ?? null,
        type,
        grade: m.grade,
        winDrop: m.winDrop ?? 0,
        phase,
        timeTrouble: tt,
        opponent,
        endTime: g.endTime,
        url: g.url,
      });
    }

    // Openings, grouped by your color + opening family (text before ":").
    const family = (g.openingName ?? "Unknown opening").split(":")[0].trim();
    const key = `${g.playerColor}|${family}`;
    if (!openingMap.has(key)) {
      openingMap.set(key, {
        stat: { key, color: g.playerColor, name: family, eco: g.eco, games: 0, score: 0, avgEvalAt12: null, openingAccuracy: null, sampleGameIds: [] },
        evals: [], accs: [], scores: [],
      });
    }
    const o = openingMap.get(key)!;
    o.stat.games++;
    o.scores.push(scoreOf(g.outcome));
    if (o.stat.sampleGameIds.length < 5) o.stat.sampleGameIds.push(g.id);
    const at12 = a.moves.find((m) => m.ply === 24) ?? a.moves[a.moves.length - 1];
    if (at12 && Math.abs(at12.evalAfter) < 9000) o.evals.push(s * at12.evalAfter);
    mine.filter((m) => m.moveNumber <= 12 && m.accuracy != null).forEach((m) => o.accs.push(m.accuracy!));
  }

  const openings = [...openingMap.values()]
    .map(({ stat, evals, accs, scores }) => ({
      ...stat,
      score: mean(scores) ?? 0,
      avgEvalAt12: evals.length ? Math.round(mean(evals)!) : null,
      openingAccuracy: accs.length ? Math.round(mean(accs)!) : null,
    }))
    .sort((a, b) => b.games - a.games);

  const phase = Object.fromEntries(
    (["opening", "middlegame", "endgame"] as GamePhase[]).map((p) => {
      const n = phaseAcc[p].length;
      return [p, { moves: n, accuracy: n ? Math.round(mean(phaseAcc[p])!) : null, errorsPer100: n ? (phaseErr[p] / n) * 100 : null }];
    })
  ) as Insights["phase"];

  const tcMap = new Map<TimeClass, GameRecord[]>();
  win.forEach((g) => tcMap.set(g.timeClass, [...(tcMap.get(g.timeClass) ?? []), g]));

  return {
    gamesTotal: sorted.length,
    analyzedGames: analyzed.length,
    windowGames: win.length,
    record,
    avgAccuracy: accAll.length ? Math.round(mean(accAll)!) : null,
    phase,
    mistakes: mistakes.sort((a, b) => b.endTime - a.endTime || b.winDrop - a.winDrop),
    mistakeCounts,
    timeTroubleMistakes,
    totalMistakes: mistakes.length,
    conversion,
    openings,
    recent: periodStats(analyzed.slice(0, 20)),
    previous: periodStats(analyzed.slice(20, 40)),
    ratings: ratingSeries(sorted),
    byTimeClass: [...tcMap.entries()].map(([timeClass, gs]) => ({
      timeClass,
      games: gs.length,
      score: mean(gs.map((g) => scoreOf(g.outcome))) ?? 0,
      accuracy: periodStats(gs).accuracy,
    })),
  };
}
