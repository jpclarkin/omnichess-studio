import { syncService } from "./syncService";
import { Chess, type Square } from "chess.js";

export interface CloudOpeningMove {
  uci: string;
  san: string;
  score: number; // centipawns
  evalDisplay: string; // e.g. "+0.15" or "-0.20"
  winrate?: number; // e.g. 52.4
  rank?: number;
  note?: string; // e.g. "!" or "main line"
  gamesCount?: number;
  whiteWinPct?: number;
  drawPct?: number;
  blackWinPct?: number;
}

export interface CloudOpeningResponse {
  fen: string;
  source: "chessdb" | "lichess" | "local";
  moves: CloudOpeningMove[];
  bestMoveSan?: string;
  openingName?: string;
  eco?: string;
}

const cloudOpeningCache = new Map<string, CloudOpeningResponse>();

/**
 * Queries live cloud opening book (ChessDB / Lichess Masters) for any arbitrary board position
 */
export async function queryLiveOpening(
  fen: string,
  options?: { lichessToken?: string }
): Promise<CloudOpeningResponse | null> {
  const token = options?.lichessToken ?? syncService.getSettings().lichessToken;
  const normFen = fen.split(" ").slice(0, 4).join(" ");
  if (cloudOpeningCache.has(normFen)) {
    return cloudOpeningCache.get(normFen) || null;
  }

  // 1. Try Lichess Masters Explorer if personal access token is provided
  if (token) {
    try {
      const lUrl = `https://explorer.lichess.org/masters?fen=${encodeURIComponent(fen)}`;
      const lRes = await fetch(lUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (lRes.ok) {
        const lData = await lRes.json();
        const moves: CloudOpeningMove[] = [];
        if (Array.isArray(lData.moves)) {
          for (const m of lData.moves) {
            const total = (m.white || 0) + (m.draws || 0) + (m.black || 0);
            const whitePct = total > 0 ? Math.round(((m.white || 0) / total) * 100) : 33;
            const drawPct = total > 0 ? Math.round(((m.draws || 0) / total) * 100) : 34;
            const blackPct = total > 0 ? 100 - whitePct - drawPct : 33;

            moves.push({
              uci: m.uci,
              san: m.san,
              score: 0,
              evalDisplay: `${whitePct}% W`,
              gamesCount: total,
              whiteWinPct: whitePct,
              drawPct,
              blackWinPct: blackPct,
            });
          }
        }

        const resp: CloudOpeningResponse = {
          fen,
          source: "lichess",
          moves,
          bestMoveSan: moves[0]?.san,
          openingName: lData.opening?.name,
          eco: lData.opening?.eco,
        };
        cloudOpeningCache.set(normFen, resp);
        return resp;
      }
    } catch {}
  }

  // 2. Query open public cloud database (ChessDB - world's largest open chess book)
  try {
    const cdbUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodeURIComponent(fen)}`;
    const res = await fetch(cdbUrl);
    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.startsWith("unknown") || text.startsWith("nobestmove")) {
      return null;
    }

    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      return null;
    }

    const tokens = text.split("|").filter(Boolean);
    const moves: CloudOpeningMove[] = [];

    for (const token of tokens) {
      const parts = token.split(",");
      const data: Record<string, string> = {};
      for (const p of parts) {
        const [k, v] = p.split(":");
        if (k && v) data[k.trim()] = v.trim();
      }

      const uci = data.move;
      if (!uci || uci.length < 4) continue;

      const from = uci.slice(0, 2) as Square;
      const to = uci.slice(2, 4) as Square;
      const promotion = uci.length > 4 ? uci.slice(4) : undefined;

      let san = uci;
      try {
        const testChess = new Chess(fen);
        const m = testChess.move({ from, to, promotion: promotion as any });
        if (m) san = m.san;
      } catch {}

      const score = parseInt(data.score || "0", 10);
      const winrate = parseFloat(data.winrate || "50.0");
      const rank = parseInt(data.rank || "0", 10);
      const note = data.note;

      const evalNum = score / 100;
      const evalDisplay = evalNum >= 0 ? `+${evalNum.toFixed(2)}` : evalNum.toFixed(2);

      moves.push({
        uci,
        san,
        score,
        evalDisplay,
        winrate,
        rank,
        note,
      });
    }

    if (moves.length === 0) return null;

    // Rank moves by score & win rate
    moves.sort((a, b) => (b.winrate || 50) - (a.winrate || 50));

    const result: CloudOpeningResponse = {
      fen,
      source: "chessdb",
      moves,
      bestMoveSan: moves[0]?.san,
    };

    cloudOpeningCache.set(normFen, result);
    return result;
  } catch (err) {
    console.warn("Cloud opening query failed:", err);
    return null;
  }
}
