/**
 * Per-platform rating-scale offset, learned from the user's own stored games.
 *
 * The performance model is calibrated on Lichess ratings. Chess.com ratings sit on a
 * different scale, so for each platform × time control we compare what the model says
 * about the user's analysed games with the rating they actually had, and use the median
 * difference as a shift. It needs MIN_GAMES games to be trusted, and it also absorbs any
 * personal bias (the model pulls estimates toward 1500), so it is a re-centring on the
 * user's own level, not a precise conversion between sites.
 */
import { estimatePerformance } from "../engine/performanceModel";
import { gameStore, onGamesChanged, type GameRecord } from "./gameStore";

export const MIN_GAMES = 30;
export const MAX_OFFSET = 500;

export interface RatingOffset {
  /** Add this to the Lichess-scale estimate. */
  offset: number;
  /** Games the offset was learned from. */
  n: number;
}

/** Median residual (actual − estimated), or null with too few games. Clamped to ±MAX_OFFSET, rounded to 25. */
export function offsetFromResiduals(residuals: number[]): RatingOffset | null {
  const n = residuals.length;
  if (n < MIN_GAMES) return null;
  const s = [...residuals].sort((a, b) => a - b);
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, median));
  return { offset: Math.round(clamped / 25) * 25, n };
}

export const offsetKey = (platform: string, timeClass: string) => `${platform}|${timeClass}`;

export function computeRatingOffsets(games: GameRecord[]): Map<string, RatingOffset> {
  const residuals = new Map<string, number[]>();
  for (const g of games) {
    if (!g.rated || !g.analysis || g.platform === "local") continue;
    if (g.timeClass !== "blitz" && g.timeClass !== "rapid") continue;
    const actual = g.playerColor === "w" ? g.white.rating : g.black.rating;
    if (!actual) continue;
    const est = estimatePerformance(g.analysis.moves, g.playerColor, {
      accuracy: g.playerColor === "w" ? g.analysis.whiteAccuracy : g.analysis.blackAccuracy,
      timeClass: g.timeClass,
    });
    if (!est || est.kind !== "range") continue;
    const k = offsetKey(g.platform, g.timeClass);
    (residuals.get(k) ?? residuals.set(k, []).get(k)!).push(actual - est.mid);
  }
  const out = new Map<string, RatingOffset>();
  residuals.forEach((r, k) => {
    const o = offsetFromResiduals(r);
    if (o) out.set(k, o);
  });
  return out;
}

let cache: Promise<Map<string, RatingOffset>> | null = null;
onGamesChanged(() => {
  cache = null;
});

/** Offsets for the user's archive, cached until the archive changes. */
export function getRatingOffsets(): Promise<Map<string, RatingOffset>> {
  cache ??= gameStore.all().then(computeRatingOffsets);
  return cache;
}
