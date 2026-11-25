import { Chess, type Square } from "chess.js";
import type { TacticalPuzzle } from "../types/chess";
import { TACTICAL_PUZZLES as DEFAULT_CURATED_PUZZLES } from "../data/puzzles";
import { THEME_INFO } from "../data/puzzleThemes";

export interface PuzzleStats {
  rating: number;
  solvedCount: number;
  failedCount: number;
  currentStreak: number;
  bestStreak: number;
  history: Array<{ id: string; solved: boolean; date: string }>;
}

const PUZZLE_STATS_KEY = "omnichess_puzzle_stats_v1";
const DAILY_PUZZLE_CACHE_KEY = "omnichess_daily_puzzle_cache_v1";
const SEEN_PUZZLES_KEY = "omnichess_puzzle_seen_v1";
const MAX_SEEN = 1500;

export type PuzzleTier = "novice" | "intermediate" | "advanced" | "master" | "all";
export interface PuzzleFilter {
  tier: PuzzleTier;
  /** A theme label from THEME_INFO, or "All Themes". */
  theme: string;
}
export type PuzzleSource = "live" | "offline";

const TIER_RANGE: Record<PuzzleTier, [number, number]> = {
  novice: [0, 1200],
  intermediate: [1200, 1600],
  advanced: [1600, 1900],
  master: [1900, 4000],
  all: [0, 4000],
};
/** Lichess "difficulty" is relative to the (anonymous) baseline of ~1500. */
const TIER_DIFFICULTY: Record<PuzzleTier, string | null> = {
  novice: "easiest",
  intermediate: "normal",
  advanced: "harder",
  master: "hardest",
  all: null,
};

/** Compact record in src/data/puzzleBank.json: solution is UCI, solver moves first. */
interface BankPuzzle {
  i: string;
  f: string;
  m: string;
  r: number;
  t: string;
}

/** Offline puzzle library (verified Lichess puzzles). Also the fallback when the daily puzzle can't be fetched. */
export const ENRICHED_PUZZLE_DATABASE: TacticalPuzzle[] = DEFAULT_CURATED_PUZZLES;

class PuzzleService {
  private stats: PuzzleStats;

  constructor() {
    this.stats = this.loadStats();
  }

  private loadStats(): PuzzleStats {
    if (typeof window === "undefined") {
      return { rating: 1000, solvedCount: 0, failedCount: 0, currentStreak: 0, bestStreak: 0, history: [] };
    }
    try {
      const saved = localStorage.getItem(PUZZLE_STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { rating: 1000, solvedCount: 0, failedCount: 0, currentStreak: 0, bestStreak: 0, history: [] };
  }

  private saveStats(stats: PuzzleStats): void {
    this.stats = stats;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PUZZLE_STATS_KEY, JSON.stringify(stats));
      } catch {}
    }
  }

  public getStats(): PuzzleStats {
    return this.stats;
  }

  public recordResult(puzzleId: string, isSolved: boolean): PuzzleStats {
    const ratingDelta = isSolved ? 12 : -8;
    const newRating = Math.max(500, Math.min(2800, this.stats.rating + ratingDelta));
    const newStreak = isSolved ? this.stats.currentStreak + 1 : 0;
    const bestStreak = Math.max(this.stats.bestStreak, newStreak);

    const updated: PuzzleStats = {
      rating: newRating,
      solvedCount: isSolved ? this.stats.solvedCount + 1 : this.stats.solvedCount,
      failedCount: !isSolved ? this.stats.failedCount + 1 : this.stats.failedCount,
      currentStreak: newStreak,
      bestStreak,
      history: [{ id: puzzleId, solved: isSolved, date: new Date().toISOString() }, ...this.stats.history.slice(0, 49)],
    };

    this.saveStats(updated);
    return updated;
  }

  /**
   * Converts a Lichess API puzzle response (UCI format) into a TacticalPuzzle (SAN format)
   */
  public parseLichessPuzzle(apiData: any, kind: "daily" | "live" = "daily"): TacticalPuzzle | null {
    try {
      const p = apiData.puzzle;
      const g = apiData.game;
      if (!p || !p.fen || !Array.isArray(p.solution)) return null;

      const chess = new Chess();
      chess.load(p.fen);

      // Convert UCI solution moves (e.g. "d2g2", "g1f1") to SAN format ("Rg2+", "Kf1")
      const sanMoves: string[] = [];
      for (const uci of p.solution) {
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = uci.length > 4 ? uci.slice(4) : undefined;

        const res = chess.move({ from, to, promotion: promotion as any });
        if (!res) {
          console.warn("Could not play UCI move on puzzle board:", uci, chess.fen());
          break;
        }
        sanMoves.push(res.san);
      }

      if (sanMoves.length === 0) return null;

      const initialChess = new Chess();
      initialChess.load(p.fen);
      const turn = initialChess.turn();

      const rawThemes = Array.isArray(p.themes) ? p.themes : [];
      const formattedThemes = rawThemes
        .slice(0, 3)
        .map((t: string) => t.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()))
        .join(" • ") || "Tactical Combination";

      const whitePlayer = g?.players?.find((pl: any) => pl.color === "white");
      const blackPlayer = g?.players?.find((pl: any) => pl.color === "black");

      const gameDescription =
        whitePlayer && blackPlayer
          ? `From Lichess match: ${whitePlayer.name} (${whitePlayer.rating}) vs ${blackPlayer.name} (${blackPlayer.rating}). Find the master continuation.`
          : `From Lichess rated tournament play. Solve the tactical combination.`;

      return {
        id: `lichess-${p.id}`,
        title: kind === "daily" ? `Lichess Daily: ${formattedThemes}` : formattedThemes,
        rating: p.rating || 1500,
        theme: formattedThemes,
        fen: p.fen,
        moves: sanMoves,
        turn,
        description: gameDescription,
        coachTip: `Focus on forcing moves (checks, captures, threats). The theme is ${formattedThemes}.`,
        sourceUrl: g?.id ? `https://lichess.org/${g.id}#${p.initialPly || 0}` : undefined,
        gameDetails:
          whitePlayer && blackPlayer
            ? {
                white: { name: whitePlayer.name, rating: whitePlayer.rating },
                black: { name: blackPlayer.name, rating: blackPlayer.rating },
                opening: g?.perf?.name,
              }
            : undefined,
      };
    } catch (err) {
      console.error("Failed to parse Lichess puzzle:", err);
      return null;
    }
  }

  /**
   * Fetches the official Lichess Daily Puzzle
   */
  public async fetchDailyPuzzle(): Promise<TacticalPuzzle | null> {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window !== "undefined") {
      try {
        const cachedStr = localStorage.getItem(DAILY_PUZZLE_CACHE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.date === today && cached.puzzle) {
            return cached.puzzle;
          }
        }
      } catch {}
    }

    try {
      const res = await fetch("https://lichess.org/api/puzzle/daily");
      if (!res.ok) throw new Error(`Lichess API returned HTTP ${res.status}`);
      const data = await res.json();
      const puzzle = this.parseLichessPuzzle(data);
      if (puzzle) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(DAILY_PUZZLE_CACHE_KEY, JSON.stringify({ date: today, puzzle }));
          } catch {}
        }
        return puzzle;
      }
    } catch (err) {
      console.warn("Could not fetch daily puzzle from Lichess. Falling back to curated library:", err);
    }

    // Fallback if network is unavailable
    return ENRICHED_PUZZLE_DATABASE[0];
  }

  private bank: Promise<TacticalPuzzle[]> | null = null;

  /** The bundled offline bank (~2,000 Lichess puzzles) plus the curated set, loaded on first use. */
  private loadOffline(): Promise<TacticalPuzzle[]> {
    this.bank ??= import("../data/puzzleBank.json").then((mod) => {
      const out = new Map<string, TacticalPuzzle>(DEFAULT_CURATED_PUZZLES.map((p) => [p.id, p]));
      for (const b of mod.default as BankPuzzle[]) {
        const id = `lichess-${b.i}`;
        if (out.has(id)) continue;
        const puzzle = bankToPuzzle(b);
        if (puzzle) out.set(id, puzzle);
      }
      return [...out.values()];
    });
    return this.bank;
  }

  private getSeen(): string[] {
    try {
      const raw = localStorage.getItem(SEEN_PUZZLES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public markSeen(id: string): void {
    try {
      const seen = this.getSeen().filter((x) => x !== id);
      seen.push(id);
      localStorage.setItem(SEEN_PUZZLES_KEY, JSON.stringify(seen.slice(-MAX_SEEN)));
    } catch {}
  }

  private async fetchLive(filter: PuzzleFilter, seen: Set<string>): Promise<TacticalPuzzle | null> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
    const params = new URLSearchParams({ angle: THEME_INFO[filter.theme]?.angle ?? "mix" });
    const difficulty = TIER_DIFFICULTY[filter.tier];
    if (difficulty) params.set("difficulty", difficulty);

    for (let attempt = 0; attempt < 3; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(`https://lichess.org/api/puzzle/next?${params}`, { signal: ctrl.signal });
        if (!res.ok) return null;
        const puzzle = this.parseLichessPuzzle(await res.json(), "live");
        if (puzzle && !seen.has(puzzle.id)) return puzzle;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }

  /**
   * Next puzzle for the given filters: fetched live from Lichess when reachable,
   * otherwise drawn (preferring unseen ones) from the bundled offline bank.
   */
  public async getNextPuzzle(filter: PuzzleFilter): Promise<{ puzzle: TacticalPuzzle; source: PuzzleSource }> {
    const seen = new Set(this.getSeen());
    const live = await this.fetchLive(filter, seen);
    if (live) {
      this.markSeen(live.id);
      return { puzzle: live, source: "live" };
    }

    const all = await this.loadOffline();
    const [lo, hi] = TIER_RANGE[filter.tier];
    const theme = filter.theme.toLowerCase();
    const matching = all.filter(
      (p) => p.rating >= lo && p.rating < hi && (filter.theme === "All Themes" || p.theme.toLowerCase().includes(theme)),
    );
    const pool = matching.length ? matching : all;
    const unseen = pool.filter((p) => !seen.has(p.id));
    const choices = unseen.length ? unseen : pool;
    const puzzle = choices[Math.floor(Math.random() * choices.length)];
    this.markSeen(puzzle.id);
    return { puzzle, source: "offline" };
  }
}

/** Turns a compact bank record into a playable puzzle (UCI -> SAN), or null if it doesn't replay. */
function bankToPuzzle(b: BankPuzzle): TacticalPuzzle | null {
  try {
    const chess = new Chess(b.f);
    const moves: string[] = [];
    for (const uci of b.m.split(" ")) {
      const m = chess.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] as any });
      moves.push(m.san);
    }
    const turn = new Chess(b.f).turn();
    const info = THEME_INFO[b.t];
    return {
      id: `lichess-${b.i}`,
      title: b.t,
      rating: b.r,
      theme: b.t,
      fen: b.f,
      moves,
      turn,
      description: `${turn === "w" ? "White" : "Black"} to move. ${info?.description ?? "Find the best continuation."}`,
      coachTip: info?.tip ?? "Look for forcing moves: checks, captures and threats.",
      sourceUrl: `https://lichess.org/training/${b.i}`,
    };
  } catch {
    return null;
  }
}

export const puzzleService = new PuzzleService();
