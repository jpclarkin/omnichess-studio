/**
 * Fetch finished games from the public Chess.com and Lichess APIs.
 * Both are CORS-enabled and need no login for a user's own public games.
 */
import type { GameRecord, Outcome, TimeClass } from "./gameStore";

const DAY_MS = 86_400_000;

function headerValue(pgn: string, tag: string): string | null {
  const m = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`));
  return m ? m[1] : null;
}

function outcomeFor(result: "1-0" | "0-1" | "1/2-1/2", color: "w" | "b"): Outcome {
  if (result === "1/2-1/2") return "draw";
  return (result === "1-0") === (color === "w") ? "win" : "loss";
}

// ---------------------------------------------------------------- Chess.com

interface ChessComPlayer {
  username: string;
  rating?: number;
  result: string;
}
interface ChessComGame {
  url: string;
  pgn?: string;
  end_time: number;
  rated: boolean;
  time_class: string;
  time_control: string;
  rules: string;
  uuid?: string;
  eco?: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
}

function mapChessCom(g: ChessComGame, username: string): GameRecord | null {
  if (g.rules !== "chess" || !g.pgn) return null;
  const me = username.toLowerCase();
  const playerColor = g.white.username.toLowerCase() === me ? "w" : g.black.username.toLowerCase() === me ? "b" : null;
  if (!playerColor) return null;
  const result: "1-0" | "0-1" | "1/2-1/2" =
    g.white.result === "win" ? "1-0" : g.black.result === "win" ? "0-1" : "1/2-1/2";
  const loserResult = g.white.result === "win" ? g.black.result : g.white.result;
  const initial = g.time_control.includes("/") ? null : parseInt(g.time_control.split("+")[0], 10) || null;
  const ecoUrl = g.eco ?? "";
  const openingFromUrl = ecoUrl ? decodeURIComponent(ecoUrl.split("/").pop() ?? "").replace(/-/g, " ") : null;
  return {
    id: `chess.com:${g.uuid ?? g.url}`,
    platform: "chess.com",
    url: g.url,
    endTime: g.end_time * 1000,
    timeClass: (["bullet", "blitz", "rapid", "daily"].includes(g.time_class) ? g.time_class : "unknown") as TimeClass,
    initialSeconds: initial,
    rated: g.rated,
    white: { name: g.white.username, rating: g.white.rating ?? null },
    black: { name: g.black.username, rating: g.black.rating ?? null },
    playerColor,
    outcome: outcomeFor(result, playerColor),
    termination: loserResult,
    eco: headerValue(g.pgn, "ECO"),
    openingName: openingFromUrl,
    pgn: g.pgn,
    analysis: null,
  };
}

/**
 * Games that ended after `sinceMs`. With no `sinceMs`, backfills the most
 * recent `initialMax` games (walking back up to 12 monthly archives).
 */
export async function fetchChessComGames(username: string, sinceMs: number | null, initialMax = 60): Promise<GameRecord[]> {
  const user = username.trim().toLowerCase();
  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user)}/games/archives`);
  if (res.status === 404) throw new Error(`Chess.com user "${username}" not found.`);
  if (!res.ok) throw new Error(`Chess.com archives request failed (HTTP ${res.status}).`);
  const archives: string[] = (await res.json()).archives ?? [];

  const out: GameRecord[] = [];
  const newestFirst = [...archives].reverse().slice(0, 12);
  const cutoff = sinceMs ? sinceMs - DAY_MS : null;

  for (const url of newestFirst) {
    // Archive URLs end in /YYYY/MM; skip months that ended before the cutoff.
    const m = url.match(/(\d{4})\/(\d{2})$/);
    if (cutoff && m) {
      const monthEnd = Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10), 1);
      if (monthEnd < cutoff) break;
    }
    const r = await fetch(url);
    if (!r.ok) continue;
    const games: ChessComGame[] = (await r.json()).games ?? [];
    for (const g of games) {
      const rec = mapChessCom(g, user);
      if (rec && (!cutoff || rec.endTime > cutoff)) out.push(rec);
    }
    if (!cutoff && out.length >= initialMax) break;
  }
  out.sort((a, b) => b.endTime - a.endTime);
  return cutoff ? out : out.slice(0, initialMax);
}

// ---------------------------------------------------------------- Lichess

interface LichessPlayer {
  user?: { name: string };
  rating?: number;
}
interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  winner?: "white" | "black";
  players: { white: LichessPlayer; black: LichessPlayer };
  opening?: { eco: string; name: string };
  clock?: { initial: number; increment: number };
  pgn?: string;
}

function mapLichess(g: LichessGame, username: string): GameRecord | null {
  if (g.variant !== "standard" || !g.pgn || ["aborted", "noStart", "unknownFinish"].includes(g.status)) return null;
  const me = username.toLowerCase();
  const w = g.players.white.user?.name ?? "Anonymous";
  const b = g.players.black.user?.name ?? "Anonymous";
  const playerColor = w.toLowerCase() === me ? "w" : b.toLowerCase() === me ? "b" : null;
  if (!playerColor) return null;
  const result: "1-0" | "0-1" | "1/2-1/2" = g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "1/2-1/2";
  const speedMap: Record<string, TimeClass> = {
    ultraBullet: "bullet", bullet: "bullet", blitz: "blitz", rapid: "rapid", classical: "classical", correspondence: "daily",
  };
  return {
    id: `lichess:${g.id}`,
    platform: "lichess",
    url: `https://lichess.org/${g.id}${playerColor === "b" ? "/black" : ""}`,
    endTime: g.lastMoveAt,
    timeClass: speedMap[g.speed] ?? "unknown",
    initialSeconds: g.clock?.initial ?? null,
    rated: g.rated,
    white: { name: w, rating: g.players.white.rating ?? null },
    black: { name: b, rating: g.players.black.rating ?? null },
    playerColor,
    outcome: outcomeFor(result, playerColor),
    termination: g.status,
    eco: g.opening?.eco ?? null,
    openingName: g.opening?.name ?? null,
    pgn: g.pgn,
    analysis: null,
  };
}

export async function fetchLichessGames(
  username: string,
  sinceMs: number | null,
  initialMax = 60,
  token?: string
): Promise<GameRecord[]> {
  const user = username.trim();
  const params = new URLSearchParams({ pgnInJson: "true", opening: "true", clocks: "true", perfType: "ultraBullet,bullet,blitz,rapid,classical,correspondence" });
  if (sinceMs) params.set("since", String(sinceMs - DAY_MS));
  else params.set("max", String(initialMax));
  const res = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?${params}`, {
    headers: { Accept: "application/x-ndjson", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404) throw new Error(`Lichess user "${username}" not found.`);
  if (res.status === 429) throw new Error("Lichess rate limit hit; try again in a minute.");
  if (!res.ok) throw new Error(`Lichess games request failed (HTTP ${res.status}).`);
  const text = await res.text();
  const out: GameRecord[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const rec = mapLichess(JSON.parse(line) as LichessGame, user);
      if (rec) out.push(rec);
    } catch {
      /* skip malformed line */
    }
  }
  return out.sort((a, b) => b.endTime - a.endTime);
}

export const __test = { mapChessCom, mapLichess };
