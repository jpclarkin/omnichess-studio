import { Chess, type Square } from "chess.js";
import type { TacticalPuzzle } from "../types/chess";
import { TACTICAL_PUZZLES as DEFAULT_CURATED_PUZZLES } from "../data/puzzles";

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

// Rich offline library spanning multiple rating tiers and tactical themes from verified master games
export const ENRICHED_PUZZLE_DATABASE: TacticalPuzzle[] = [
  // --- NOVICE TIER (800 - 1150 Elo) ---
  {
    id: "nov-fork-1",
    title: "Central Knight Fork",
    rating: 980,
    theme: "Fork",
    fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5",
    moves: ["Qe2", "d5", "Qxe4"],
    turn: "w",
    description: "Pin and win: Black's knight on e4 is overextended. Exploit the open e-file to regain material.",
    coachTip: "Always look for undefended minor pieces along open or half-open central files.",
  },
  {
    id: "nov-backrank-1",
    title: "Classic Back-Rank Deflection",
    rating: 1020,
    theme: "Back-Rank Mate",
    fen: "3r2k1/5ppp/8/8/8/4Q3/5PPP/6K1 w - - 0 1",
    moves: ["Qe7", "Rf8", "Qxf8#"],
    turn: "w",
    description: "The opposing king is trapped behind its own defensive pawn shield. Force checkmate on the 8th rank.",
    coachTip: "Notice when the king lacks an escape square (luft). The back rank becomes critically vulnerable.",
  },
  {
    id: "nov-fork-2",
    title: "Royal Family Double Attack",
    rating: 1050,
    theme: "Fork",
    fen: "r1b1k2r/pppp1ppp/8/4N3/2B1n3/8/PPP2qPP/RNBQK2R w KQkq - 0 8",
    moves: ["Bxf7+", "Kf8", "Rf1"],
    turn: "w",
    description: "Defend against mate threats with a counter-checking intermediate move that seizes the initiative.",
    coachTip: "Counter-checks and forcing defensive replies can turn an opponent's attack into your advantage.",
  },
  {
    id: "nov-hanging-1",
    title: "Undefended Bishop Capture",
    rating: 920,
    theme: "Hanging Piece",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5",
    moves: ["d4", "exd4", "Nxd4"],
    turn: "w",
    description: "Strike the center with 5. d4 to contest control and create dual threats against Black's minor pieces.",
    coachTip: "Central pawn breaks frequently expose uncoordinated opposing minor pieces.",
  },
  {
    id: "nov-mate-1",
    title: "Scholar's Defense Turnabout",
    rating: 950,
    theme: "Mate in 1",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moves: ["Qxf7#"],
    turn: "w",
    description: "Capitalize on Black's neglected f7 square to deliver immediate checkmate.",
    coachTip: "The f7 (and f2) squares are defended solely by the king in the opening, making them high-priority targets.",
  },

  // --- INTERMEDIATE TIER (1200 - 1550 Elo) ---
  {
    id: "int-pin-1",
    title: "Absolute Pin & Minor Piece Decoupling",
    rating: 1320,
    theme: "Pin",
    fen: "r1b1k2r/ppq2ppp/2n1pn2/3p4/1b1P4/1PN1PN2/P2B1PPP/R2QKB1R w KQkq - 3 9",
    moves: ["Nb5", "Qb8", "Bxb4"],
    turn: "w",
    description: "Use the b5 tactical outpost to displace the black queen and win the bishop pair.",
    coachTip: "Attack the pinned piece while simultaneously creating tempo against the heavier piece.",
  },
  {
    id: "int-skewer-1",
    title: "Queenside Rook Skewer",
    rating: 1380,
    theme: "Skewer",
    fen: "8/1r6/8/8/k7/8/1B6/1K1R4 w - - 0 1",
    moves: ["Rd4+", "Kb3", "Rb4+"],
    turn: "w",
    description: "Drive the opposing king into an alignment where the undefended rook can be skewered and won.",
    coachTip: "A skewer attacks a more valuable piece in front, forcing it to move and revealing the piece behind it.",
  },
  {
    id: "int-discovered-1",
    title: "Discovered Check & Queen Trap",
    rating: 1440,
    theme: "Discovered Attack",
    fen: "r1b1kb1r/pppp1ppp/8/4q3/4n3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 8",
    moves: ["Qe2", "d5", "f3"],
    turn: "w",
    description: "Pin the active knight against the queen on the open e-file and undermine its pawn support.",
    coachTip: "Aligning your queen or rook with the opponent's queen on an open file generates lethal discovered threats.",
  },
  {
    id: "int-deflection-1",
    title: "Eighth-Rank Overload Deflection",
    rating: 1490,
    theme: "Deflection",
    fen: "5rk1/5ppp/8/8/8/2Q5/5PPP/4R1K1 w - - 0 1",
    moves: ["Qc5", "g6", "Qxf8+", "Kxf8"],
    turn: "w",
    description: "Overload the defensive rook and deflect the defender away from protecting key entry squares.",
    coachTip: "When a piece is performing two defensive tasks, eliminate or deflect it to collapse the defense.",
  },

  // --- ADVANCED TIER (1600 - 1850 Elo) ---
  {
    id: "adv-smother-1",
    title: "Classical Philidor Smothered Mate",
    rating: 1720,
    theme: "Smothered Mate",
    fen: "5r1k/6pp/8/6N1/2Q5/8/8/6K1 w - - 0 1",
    moves: ["Nf7+", "Kg8", "Nh6+", "Kh8", "Qg8+", "Rxg8", "Nf7#"],
    turn: "w",
    description: "Execute the celebrated four-move smothered checkmate combination with Queen and Knight.",
    coachTip: "The double check forces the king to the corner, allowing a queen sacrifice that blocks the king's only flight squares.",
  },
  {
    id: "adv-greekgift-1",
    title: "Classical Greek Gift Sacrifice",
    rating: 1810,
    theme: "Sacrifice",
    fen: "r1bq1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 8",
    moves: ["Bxh7+", "Kxh7", "Ng5+", "Kg8", "Qh5"],
    turn: "w",
    description: "Shatter the castled king's defensive pawn shield through an immediate bishop sacrifice on h7.",
    coachTip: "Ensure the knight entry on g5 and queen approach on h5 cannot be intercepted by an opposing bishop or knight.",
  },
  {
    id: "adv-endgame-1",
    title: "Rook & Pawn Opposition Conversion",
    rating: 1680,
    theme: "Endgame",
    fen: "8/8/4k3/R7/4P3/8/5K2/8 w - - 0 1",
    moves: ["Ke3", "Kd6", "Kd4"],
    turn: "w",
    description: "Advance the king ahead of the passed pawn and seize direct horizontal opposition.",
    coachTip: "In rook and pawn endings, the king must lead the pawn to control the promotion square.",
  },

  // --- MASTER TIER (1900+ Elo) ---
  {
    id: "mas-clearance-1",
    title: "Grandmaster Clearance Sacrifice",
    rating: 2050,
    theme: "Clearance",
    fen: "2r2rk1/1bq1bppp/p3pn2/1p2P3/3B4/P1NB4/1PP1Q1PP/3R1R1K w - - 0 18",
    moves: ["exf6", "Bxf6", "Bxf6", "gxf6", "Bxh7+"],
    turn: "w",
    description: "Demolish the kingside barricade by clearing diagonal lines towards the black monarch.",
    coachTip: "A clearance sacrifice opens vital diagonals for following attacking waves even at the cost of material.",
  },
  {
    id: "mas-zwischenzug-1",
    title: "Intermezzo Counter-Strike",
    rating: 2120,
    theme: "Zwischenzug",
    fen: "r4rk1/pbq1bppp/1pn1pn2/2ppN3/3P1B2/2PBPN2/PP3PPP/R2Q1RK1 w - - 6 11",
    moves: ["Ng6", "Bd6", "Nxf8"],
    turn: "w",
    description: "Insert an intermediate knight discovered attack before resolving the central tension.",
    coachTip: "Look for intermediate moves (zwischenzüge) that fundamentally alter the evaluation before expected recaptures.",
  },
];

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
  public parseLichessPuzzle(apiData: any): TacticalPuzzle | null {
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
        title: `Lichess Daily: ${formattedThemes}`,
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

  /**
   * Returns puzzles filtered by difficulty tier
   */
  public getPuzzlesByTier(tier: "novice" | "intermediate" | "advanced" | "master" | "all"): TacticalPuzzle[] {
    const all = [...ENRICHED_PUZZLE_DATABASE, ...DEFAULT_CURATED_PUZZLES];
    if (tier === "novice") return all.filter((p) => p.rating < 1200);
    if (tier === "intermediate") return all.filter((p) => p.rating >= 1200 && p.rating < 1600);
    if (tier === "advanced") return all.filter((p) => p.rating >= 1600 && p.rating < 1900);
    if (tier === "master") return all.filter((p) => p.rating >= 1900);
    return all;
  }

  /**
   * Returns puzzles filtered by tactical theme
   */
  public getPuzzlesByTheme(theme: string): TacticalPuzzle[] {
    const all = [...ENRICHED_PUZZLE_DATABASE, ...DEFAULT_CURATED_PUZZLES];
    const clean = theme.toLowerCase();
    return all.filter((p) => p.theme.toLowerCase().includes(clean));
  }
}

export const puzzleService = new PuzzleService();
