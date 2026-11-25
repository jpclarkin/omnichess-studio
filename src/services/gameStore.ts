/**
 * Local game archive (IndexedDB). Holds every synced game plus its Stockfish
 * analysis, so insights can be recomputed at any time without re-fetching.
 * IndexedDB is used instead of localStorage because hundreds of analyzed
 * games easily exceed localStorage's ~5 MB limit.
 */
import type { GameAnalysisReport } from "../types/chess";

export type Platform = "chess.com" | "lichess" | "local";
export type Outcome = "win" | "loss" | "draw";
export type TimeClass = "bullet" | "blitz" | "rapid" | "classical" | "daily" | "unknown";

export interface GameRecord {
  /** `${platform}:${platformId}` */
  id: string;
  platform: Platform;
  url: string;
  /** Unix ms when the game ended. */
  endTime: number;
  timeClass: TimeClass;
  /** Initial clock in seconds (if known), e.g. 600 for 10+0. */
  initialSeconds: number | null;
  rated: boolean;
  white: { name: string; rating: number | null };
  black: { name: string; rating: number | null };
  playerColor: "w" | "b";
  outcome: Outcome;
  /** How the game ended, e.g. "resigned", "timeout", "checkmated". */
  termination: string;
  eco: string | null;
  openingName: string | null;
  pgn: string;
  analysis: GameAnalysisReport | null;
  analysisError?: string | null;
}

const DB_NAME = "omnichess";
const DB_VERSION = 1;
const STORE = "games";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("endTime", "endTime");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/** What changed: specific games (re-read just those), or everything. */
export type GamesChange = { ids: string[] } | { all: true };

const listeners = new Set<(change: GamesChange) => void>();
export function onGamesChanged(fn: (change: GamesChange) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(change: GamesChange) {
  listeners.forEach((fn) => fn(change));
}

export const gameStore = {
  async all(): Promise<GameRecord[]> {
    const rows = (await tx<GameRecord[]>("readonly", (s) => s.getAll())) ?? [];
    return rows.sort((a, b) => b.endTime - a.endTime);
  },
  async get(id: string): Promise<GameRecord | undefined> {
    return tx<GameRecord>("readonly", (s) => s.get(id));
  },
  async has(id: string): Promise<boolean> {
    const key = await tx<IDBValidKey | undefined>("readonly", (s) => s.getKey(id));
    return key !== undefined;
  },
  async put(game: GameRecord): Promise<void> {
    await tx("readwrite", (s) => s.put(game));
    emit({ ids: [game.id] });
  },
  async putMany(games: GameRecord[]): Promise<void> {
    if (!games.length) return;
    await tx("readwrite", (s) => {
      games.forEach((g) => s.put(g));
    });
    emit({ ids: games.map((g) => g.id) });
  },
  async remove(id: string): Promise<void> {
    await tx("readwrite", (s) => s.delete(id));
    emit({ ids: [id] });
  },
  async clear(): Promise<void> {
    await tx("readwrite", (s) => s.clear());
    emit({ all: true });
  },
};
