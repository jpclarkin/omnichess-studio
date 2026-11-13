/**
 * Keeps the local archive in step with Chess.com and Lichess, then analyzes
 * new games with Stockfish in the background (low priority, so playing and
 * reviewing stay responsive).
 */
import { analyzeGame, EngineUnavailableError } from "../engine/gameAnalysis";
import { EngineCancelled } from "../engine/stockfishService";
import { gameStore, type GameRecord } from "./gameStore";
import { fetchChessComGames, fetchLichessGames } from "./platforms";

export interface SyncSettings {
  chesscomUsername: string;
  lichessUsername: string;
  /** Optional Lichess personal API token (no scopes needed); used for the opening explorer. */
  lichessToken: string;
  /** How many recent games to pull per site on the first sync. */
  initialGames: number;
  /** Stockfish depth for background analysis. */
  analysisDepth: number;
  autoSync: boolean;
}

export interface SyncStatus {
  phase: "idle" | "fetching" | "analyzing" | "error";
  message: string;
  lastSyncAt: number | null;
  newGames: number;
  analyzeDone: number;
  analyzeTotal: number;
  errors: string[];
}

const SETTINGS_KEY = "omnichess_sync_settings_v1";
const LAST_SYNC_KEY = "omnichess_last_sync_v1";
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000;

const DEFAULT_SETTINGS: SyncSettings = {
  chesscomUsername: "",
  lichessUsername: "",
  lichessToken: "",
  initialGames: 60,
  analysisDepth: 12,
  autoSync: true,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

class SyncService {
  private settings: SyncSettings = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
  private status: SyncStatus = {
    phase: "idle",
    message: "",
    lastSyncAt: readJson<{ at: number | null }>(LAST_SYNC_KEY, { at: null }).at,
    newGames: 0,
    analyzeDone: 0,
    analyzeTotal: 0,
    errors: [],
  };
  private listeners = new Set<(s: SyncStatus) => void>();
  private running = false;

  getSettings(): SyncSettings {
    return { ...this.settings };
  }

  saveSettings(next: Partial<SyncSettings>) {
    this.settings = { ...this.settings, ...next };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.emit();
  }

  hasAccounts(): boolean {
    return !!(this.settings.chesscomUsername.trim() || this.settings.lichessUsername.trim());
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  subscribe(fn: (s: SyncStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.getStatus());
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    this.emit();
  }

  private emit() {
    const s = this.getStatus();
    this.listeners.forEach((fn) => fn(s));
  }

  /** Sync if accounts are set, auto-sync is on, and the last sync is older than 10 minutes. */
  maybeAutoSync() {
    if (!this.settings.autoSync || !this.hasAccounts()) return;
    const last = this.status.lastSyncAt ?? 0;
    if (Date.now() - last > AUTO_SYNC_INTERVAL_MS) void this.syncNow();
    else void this.analyzePending();
  }

  async syncNow(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const errors: string[] = [];
    let added = 0;
    try {
      this.set({ phase: "fetching", message: "Checking for new games…", errors: [] });
      const existing = await gameStore.all();
      const newestFor = (platform: string) =>
        existing.filter((g) => g.platform === platform).reduce<number | null>((max, g) => (max === null || g.endTime > max ? g.endTime : max), null);

      const fetched: GameRecord[] = [];
      const { chesscomUsername, lichessUsername, lichessToken, initialGames } = this.settings;
      if (chesscomUsername.trim()) {
        try {
          fetched.push(...(await fetchChessComGames(chesscomUsername, newestFor("chess.com"), initialGames)));
        } catch (e) {
          errors.push(`Chess.com: ${(e as Error).message}`);
        }
      }
      if (lichessUsername.trim()) {
        try {
          fetched.push(...(await fetchLichessGames(lichessUsername, newestFor("lichess"), initialGames, lichessToken || undefined)));
        } catch (e) {
          errors.push(`Lichess: ${(e as Error).message}`);
        }
      }

      const known = new Set(existing.map((g) => g.id));
      const fresh = fetched.filter((g) => !known.has(g.id));
      added = fresh.length;
      await gameStore.putMany(fresh);

      const now = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ at: now }));
      this.set({
        lastSyncAt: now,
        newGames: added,
        errors,
        message: added ? `Found ${added} new game${added === 1 ? "" : "s"}.` : "No new games.",
      });
    } finally {
      this.running = false;
    }
    await this.analyzePending();
    if (errors.length) this.set({ phase: "error", errors, message: errors.join(" ") });
  }

  private analyzing = false;

  /** Analyze every stored game that has no analysis yet, newest first. */
  async analyzePending(): Promise<void> {
    if (this.analyzing) return;
    this.analyzing = true;
    try {
      const pending = (await gameStore.all()).filter((g) => !g.analysis && !g.analysisError);
      if (!pending.length) {
        this.set({ phase: "idle", analyzeDone: 0, analyzeTotal: 0 });
        return;
      }
      this.set({ phase: "analyzing", analyzeDone: 0, analyzeTotal: pending.length });
      for (let i = 0; i < pending.length; i++) {
        const g = pending[i];
        this.set({
          message: `Analyzing game ${i + 1} of ${pending.length} with Stockfish…`,
          analyzeDone: i,
        });
        try {
          const report = await analyzeGame(g.pgn, { depth: this.settings.analysisDepth, priority: "low" });
          await gameStore.put({ ...g, analysis: report, analysisError: null });
        } catch (e) {
          if (e instanceof EngineUnavailableError) {
            this.set({ phase: "error", message: e.message });
            return;
          }
          if (e instanceof EngineCancelled) return;
          await gameStore.put({ ...g, analysisError: (e as Error).message || "Could not analyze game" });
        }
      }
      this.set({ phase: "idle", analyzeDone: pending.length, message: `Analysis complete.` });
    } finally {
      this.analyzing = false;
    }
  }

  /** Re-queue analysis for a game (e.g. after an error). */
  async reanalyze(id: string) {
    const g = await gameStore.get(id);
    if (!g) return;
    await gameStore.put({ ...g, analysis: null, analysisError: null });
    await this.analyzePending();
  }
}

export const syncService = new SyncService();
