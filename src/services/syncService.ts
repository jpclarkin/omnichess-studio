/**
 * Keeps the local archive in step with Chess.com and Lichess, then analyzes
 * new games with Stockfish in the background (low priority, so playing and
 * reviewing stay responsive).
 */
import { analyzeGame, EngineUnavailableError } from "../engine/gameAnalysis";
import { EngineCancelled, StockfishService } from "../engine/stockfishService";
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
  /**
   * Background analysis only covers the newest N stored games (0 = none). Older
   * unanalyzed games wait until the user chooses "Analyze remaining".
   */
  autoAnalyzeLimit: number;
  /** User paused background analysis. Persisted, so it survives reloads. */
  analysisPaused: boolean;
  /** Engines analyzing games in parallel (each is a separate single-threaded Stockfish). */
  analysisWorkers: number;
}

export interface SyncStatus {
  phase: "idle" | "fetching" | "analyzing" | "error";
  message: string;
  lastSyncAt: number | null;
  newGames: number;
  /** Games finished in the current analysis run. */
  analyzeDone: number;
  analyzeTotal: number;
  /** When the current analysis run started (ms), for speed / time-left estimates. */
  analyzeStartedAt: number | null;
  errors: string[];
}

/** Default parallel engines: half the cores, between 1 and 4 (leaves room for the UI and live play). */
export function defaultAnalysisWorkers(cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 4): number {
  return Math.max(1, Math.min(4, Math.floor((cores || 4) / 2)));
}

/** Estimated seconds left, or null until enough games have finished to say. */
export function estimateSecondsLeft(done: number, total: number, startedAt: number | null, now = Date.now()): number | null {
  if (!startedAt || done < 3 || done >= total) return null;
  const perGame = (now - startedAt) / done;
  return Math.round((perGame * (total - done)) / 1000);
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
  autoAnalyzeLimit: 50,
  analysisPaused: false,
  analysisWorkers: defaultAnalysisWorkers(),
};

const isPending = (g: GameRecord) => !g.analysis && !g.analysisError;

/**
 * Which games to analyze next. `games` must be newest-first. By default only games
 * within the newest `limit` are considered, so a large old backlog doesn't start
 * crunching on its own; `all` includes every unanalyzed game.
 */
export function selectAnalysisQueue(games: GameRecord[], opts: { all: boolean; limit: number }): GameRecord[] {
  if (opts.all) return games.filter(isPending);
  return games.slice(0, Math.max(0, opts.limit)).filter(isPending);
}

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
    analyzeStartedAt: null,
    errors: [],
  };
  private pool: StockfishService[] = [];
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
  private rerunAll = false;

  /** Pause background analysis (finishes the game in progress). Persists across reloads. */
  pauseAnalysis() {
    this.saveSettings({ analysisPaused: true });
    if (this.analyzing) this.set({ message: "Pausing after the games in progress…" });
  }

  /** Resume background analysis of the newest games. */
  resumeAnalysis() {
    this.saveSettings({ analysisPaused: false });
    void this.analyzePending();
  }

  /** Analyze every stored game that still has no analysis, including older ones. */
  analyzeRemaining() {
    this.saveSettings({ analysisPaused: false });
    void this.analyzePending({ all: true });
  }

  /**
   * Analyze stored games that have no analysis yet, newest first. Unless `all` is
   * set, only the newest `autoAnalyzeLimit` games are considered.
   */
  async analyzePending(opts: { all?: boolean } = {}): Promise<void> {
    if (this.analyzing) {
      if (opts.all) this.rerunAll = true; // pick up the full backlog once this run ends
      return;
    }
    this.analyzing = true;
    try {
      await this.runAnalysis(opts.all ?? false);
    } finally {
      this.analyzing = false;
    }
    if (this.rerunAll) {
      this.rerunAll = false;
      await this.analyzePending({ all: true });
    }
  }

  private async runAnalysis(all: boolean): Promise<void> {
    if (this.settings.analysisPaused) {
      this.set({ phase: "idle", message: "Analysis paused." });
      return;
    }
    const queue = selectAnalysisQueue(await gameStore.all(), { all, limit: this.settings.autoAnalyzeLimit });
    if (!queue.length) {
      this.set({ phase: "idle", analyzeDone: 0, analyzeTotal: 0 });
      return;
    }
    const total = queue.length;
    const engines = this.engines(Math.min(this.settings.analysisWorkers, total));
    this.set({ phase: "analyzing", analyzeDone: 0, analyzeTotal: total, analyzeStartedAt: Date.now(), message: `Analyzing 0 of ${total}…` });

    let next = 0;
    let done = 0;
    let stopped = false; // engine unavailable / cancelled: abandon the run
    const work = async (engine: StockfishService) => {
      while (!stopped && !this.settings.analysisPaused) {
        const g = queue[next++];
        if (!g) return;
        try {
          const report = await analyzeGame(g.pgn, { depth: this.settings.analysisDepth, priority: "low", engine });
          await gameStore.put({ ...g, analysis: report, analysisError: null });
        } catch (e) {
          if (e instanceof EngineUnavailableError) {
            stopped = true;
            this.set({ phase: "error", message: e.message });
            return;
          }
          if (e instanceof EngineCancelled) {
            stopped = true;
            return;
          }
          await gameStore.put({ ...g, analysisError: (e as Error).message || "Could not analyze game" });
        }
        done++;
        this.set({ analyzeDone: done, message: `Analyzing ${done} of ${total}…` });
      }
    };
    await Promise.all(engines.map(work));

    if (stopped) return;
    if (this.settings.analysisPaused && done < total) {
      this.set({ phase: "idle", analyzeDone: done, message: "Analysis paused." });
      return;
    }
    this.set({ phase: "idle", analyzeDone: done, message: "Analysis complete." });
  }

  /** `n` engines for background analysis, created on first use and reused between runs. */
  private engines(n: number): StockfishService[] {
    while (this.pool.length < n) this.pool.push(new StockfishService({ hashMb: 32 }));
    return this.pool.slice(0, Math.max(1, n));
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
