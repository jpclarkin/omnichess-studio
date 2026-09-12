import { Chess, type Square } from "chess.js";

export interface TablebaseMove {
  uci: string;
  san: string;
  category: "win" | "draw" | "loss" | "unknown";
  dtm: number | null; // Distance to mate (plies)
  dtz: number | null; // Distance to zeroing (50-move rule / pawn move / capture)
  zeroing?: boolean;
  checkmate?: boolean;
  stalemate?: boolean;
}

export interface TablebaseEvaluation {
  fen: string;
  pieceCount: number;
  category: "win" | "draw" | "loss" | "unknown";
  dtm: number | null;
  dtz: number | null;
  checkmate: boolean;
  stalemate: boolean;
  moves: TablebaseMove[];
  bestMoveSan?: string;
  summary: string;
}

const tablebaseCache = new Map<string, TablebaseEvaluation | null>();

/**
 * Counts total pieces remaining on the board (excluding empty squares)
 */
export function countPiecesOnBoard(fen: string): number {
  const boardPart = fen.split(" ")[0];
  let count = 0;
  for (const char of boardPart) {
    if (char !== "/" && isNaN(parseInt(char, 10))) {
      count++;
    }
  }
  return count;
}

/**
 * Queries the Lichess 7-piece Syzygy tablebase API (https://tablebase.lichess.org)
 * Returns provably perfect endgame evaluations when <= 7 pieces remain on the board.
 */
export async function queryTablebase(fen: string): Promise<TablebaseEvaluation | null> {
  const pieceCount = countPiecesOnBoard(fen);
  if (pieceCount > 7) {
    return null;
  }

  // Normalize FEN for caching (first 4 fields: placement, turn, castling, en passant)
  const normFen = fen.split(" ").slice(0, 4).join(" ");
  if (tablebaseCache.has(normFen)) {
    return tablebaseCache.get(normFen) || null;
  }

  try {
    const url = `https://tablebase.lichess.org/standard?fen=${encodeURIComponent(fen)}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Tablebase API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      return null;
    }

    const rawMoves: any[] = Array.isArray(data.moves) ? data.moves : [];
    const moves: TablebaseMove[] = [];

    for (const m of rawMoves) {
      if (!m.uci) continue;
      const from = m.uci.slice(0, 2) as Square;
      const to = m.uci.slice(2, 4) as Square;
      const promotion = m.uci.length > 4 ? m.uci.slice(4) : undefined;

      let san = m.san;
      if (!san) {
        const testChess = new Chess(fen);
        try {
          const moveRes = testChess.move({ from, to, promotion: promotion as any });
          if (moveRes) san = moveRes.san;
        } catch {}
      }

      moves.push({
        uci: m.uci,
        san: san || m.uci,
        category: m.category || "unknown",
        dtm: typeof m.dtm === "number" ? m.dtm : null,
        dtz: typeof m.dtz === "number" ? m.dtz : null,
        zeroing: m.zeroing,
        checkmate: m.checkmate,
        stalemate: m.stalemate,
      });
    }

    // Sort moves: wins first (smallest positive DTM), then draws, then losses
    moves.sort((a, b) => {
      const catOrder = { win: 0, draw: 1, unknown: 2, loss: 3 };
      const diff = catOrder[a.category] - catOrder[b.category];
      if (diff !== 0) return diff;
      if (a.dtm !== null && b.dtm !== null) {
        if (a.category === "win") return Math.abs(a.dtm) - Math.abs(b.dtm);
        if (a.category === "loss") return Math.abs(b.dtm) - Math.abs(a.dtm);
      }
      return 0;
    });

    const category = data.category || "unknown";
    const dtm = typeof data.dtm === "number" ? data.dtm : null;
    const dtz = typeof data.dtz === "number" ? data.dtz : null;
    const isCheckmate = data.checkmate || false;
    const isStalemate = data.stalemate || false;

    let summary = "";
    if (isCheckmate) {
      summary = "Checkmate. Position is decisive.";
    } else if (isStalemate) {
      summary = "Stalemate. Theoretical draw confirmed.";
    } else if (category === "win") {
      summary = dtm ? `Theoretical Win. Mate in ${Math.ceil(Math.abs(dtm) / 2)} moves (DTM ${Math.abs(dtm)}).` : "Theoretical Win.";
    } else if (category === "loss") {
      summary = dtm ? `Theoretical Loss. Opponent forces mate in ${Math.ceil(Math.abs(dtm) / 2)} moves.` : "Theoretical Loss.";
    } else if (category === "draw") {
      summary = "Theoretical Draw. Best play guarantees a split point.";
    } else {
      summary = "Tablebase resolved.";
    }

    const evaluation: TablebaseEvaluation = {
      fen,
      pieceCount,
      category,
      dtm,
      dtz,
      checkmate: isCheckmate,
      stalemate: isStalemate,
      moves,
      bestMoveSan: moves[0]?.san,
      summary,
    };

    tablebaseCache.set(normFen, evaluation);
    return evaluation;
  } catch (err) {
    console.warn("Tablebase lookup failed or network unavailable:", err);
    return null;
  }
}
