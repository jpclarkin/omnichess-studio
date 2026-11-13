/**
 * Stockfish (WASM, Web Worker) wrapper.
 *
 * - One worker, one search at a time, driven by a priority queue.
 * - Searches that time out are stopped with `stop`, so a late `bestmove`
 *   can never be mistaken for the answer to a later request.
 * - Results always say where they came from (`source`), so the UI can tell
 *   the user when the engine was not available.
 */
import { Chess } from "chess.js";
import type { Score } from "./grading";

export interface SearchOptions {
  depth?: number;
  movetime?: number;
  multipv?: number;
  /** Limit strength to this Elo (UCI_Elo, engine-rating scale). */
  elo?: number | null;
  /** Skill Level 0–20 (used for levels below UCI_Elo's minimum). */
  skill?: number | null;
}

export interface EngineLine {
  rank: number;
  score: Score; // White POV
  pvUci: string[];
  pvSan: string[];
  depth: number;
}

export interface SearchResult {
  fen: string;
  bestMoveUci: string;
  bestMoveSan: string;
  lines: EngineLine[];
  depth: number;
  source: "stockfish" | "unavailable";
}

type Priority = "high" | "low";

interface Job {
  fen: string;
  opts: SearchOptions;
  priority: Priority;
  key?: string;
  resolve: (r: SearchResult) => void;
  reject: (e: unknown) => void;
}

export class EngineCancelled extends Error {
  constructor() {
    super("Engine search cancelled");
    this.name = "EngineCancelled";
  }
}

const WORKER_URL = "/stockfish/stockfish.js";
const INIT_TIMEOUT_MS = 15000;

class StockfishService {
  private worker: Worker | null = null;
  private initPromise: Promise<boolean> | null = null;
  private ready = false;
  private engineName = "Stockfish";
  private queue: Job[] = [];
  private running: Job | null = null;
  private runningLines = new Map<number, EngineLine>();
  private runningTimer: ReturnType<typeof setTimeout> | null = null;
  private hardTimer: ReturnType<typeof setTimeout> | null = null;
  private stopRequested = false;
  private currentOptions = new Map<string, string>();
  private lineHandler: ((line: string) => void) | null = null;
  private statusListeners = new Set<() => void>();

  /** Human-readable engine id reported by the worker, e.g. "Stockfish 18 Lite WASM". */
  getEngineName(): string {
    return this.engineName;
  }

  isReady(): boolean {
    return this.ready;
  }

  onStatusChange(fn: () => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emitStatus() {
    this.statusListeners.forEach((fn) => fn());
  }

  init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise<boolean>((resolve) => {
      if (typeof Worker === "undefined") {
        resolve(false);
        return;
      }
      let worker: Worker;
      try {
        worker = new Worker(WORKER_URL);
      } catch (e) {
        console.warn("Could not start Stockfish worker:", e);
        resolve(false);
        return;
      }
      this.worker = worker;

      const fail = (why: unknown) => {
        console.warn("Stockfish unavailable:", why);
        this.ready = false;
        this.worker?.terminate();
        this.worker = null;
        this.emitStatus();
        resolve(false);
      };
      const timeout = setTimeout(() => fail("no uciok within timeout"), INIT_TIMEOUT_MS);

      worker.onerror = (err) => {
        clearTimeout(timeout);
        fail(err.message || err);
      };
      worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (line.startsWith("id name ")) this.engineName = line.slice(8).trim();
        if (line === "uciok") {
          worker.postMessage("isready");
        } else if (line === "readyok" && !this.ready) {
          clearTimeout(timeout);
          this.ready = true;
          this.emitStatus();
          resolve(true);
          this.pump();
          return;
        }
        this.lineHandler?.(line);
      };
      worker.postMessage("uci");
    });
    return this.initPromise;
  }

  /**
   * Queue a search. Jobs with the same `key` replace each other: a queued job
   * with that key is cancelled, and a running one is stopped early.
   */
  analyze(
    fen: string,
    opts: SearchOptions = {},
    { priority = "low", key }: { priority?: Priority; key?: string } = {}
  ): Promise<SearchResult> {
    return new Promise<SearchResult>((resolve, reject) => {
      if (key) {
        this.queue = this.queue.filter((j) => {
          if (j.key === key) {
            j.reject(new EngineCancelled());
            return false;
          }
          return true;
        });
        if (this.running?.key === key) this.requestStop();
      }
      const job: Job = { fen, opts, priority, key, resolve, reject };
      if (priority === "high") {
        const firstLow = this.queue.findIndex((j) => j.priority === "low");
        if (firstLow === -1) this.queue.push(job);
        else this.queue.splice(firstLow, 0, job);
      } else {
        this.queue.push(job);
      }
      void this.init().then((ok) => {
        if (!ok) {
          this.queue = this.queue.filter((j) => j !== job);
          resolve(unavailableResult(fen));
          return;
        }
        this.pump();
      });
    });
  }

  /** Cancel every queued (not yet started) low-priority job, e.g. when background sync is paused. */
  cancelBackground() {
    this.queue = this.queue.filter((j) => {
      if (j.priority === "low") {
        j.reject(new EngineCancelled());
        return false;
      }
      return true;
    });
  }

  private requestStop() {
    if (this.running && !this.stopRequested) {
      this.stopRequested = true;
      this.worker?.postMessage("stop");
    }
  }

  private setOption(name: string, value: string) {
    if (this.currentOptions.get(name) === value) return;
    this.worker!.postMessage(`setoption name ${name} value ${value}`);
    this.currentOptions.set(name, value);
  }

  private pump() {
    if (!this.ready || this.running || !this.worker) return;
    const job = this.queue.shift();
    if (!job) return;
    this.running = job;
    this.stopRequested = false;
    this.runningLines = new Map();

    const { opts } = job;
    const multipv = Math.max(1, Math.min(5, opts.multipv ?? 1));
    this.setOption("MultiPV", String(multipv));
    if (opts.elo) {
      this.setOption("UCI_LimitStrength", "true");
      this.setOption("UCI_Elo", String(Math.round(opts.elo)));
      this.setOption("Skill Level", "20");
    } else if (opts.skill !== undefined && opts.skill !== null) {
      this.setOption("UCI_LimitStrength", "false");
      this.setOption("Skill Level", String(Math.max(0, Math.min(20, Math.round(opts.skill)))));
    } else {
      this.setOption("UCI_LimitStrength", "false");
      this.setOption("Skill Level", "20");
    }

    const whiteToMove = job.fen.split(" ")[1] !== "b";
    this.lineHandler = (line) => this.handleLine(job, line, whiteToMove);

    this.worker.postMessage(`position fen ${job.fen}`);
    const go = opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${opts.depth ?? 12}`;
    this.worker.postMessage(go);

    // Soft limit: ask the engine to stop and return what it has.
    const softMs = opts.movetime ? opts.movetime + 3000 : 8000 + (opts.depth ?? 12) * 400;
    this.runningTimer = setTimeout(() => this.requestStop(), softMs);
    // Hard limit: the worker is stuck; restart it.
    this.hardTimer = setTimeout(() => this.restartWorker(), softMs + 5000);
  }

  private handleLine(job: Job, line: string, whiteToMove: boolean) {
    if (line.startsWith("info ") && line.includes(" pv ") && !line.includes("bound")) {
      const depth = Number(line.match(/ depth (\d+)/)?.[1] ?? 0);
      const rank = Number(line.match(/ multipv (\d+)/)?.[1] ?? 1);
      const cp = line.match(/ score cp (-?\d+)/);
      const mate = line.match(/ score mate (-?\d+)/);
      const pv = line.split(" pv ")[1]?.trim().split(/\s+/) ?? [];
      const sign = whiteToMove ? 1 : -1;
      let score: Score;
      if (mate) score = { cp: 0, mate: sign * Number(mate[1]) };
      else if (cp) score = { cp: sign * Number(cp[1]), mate: null };
      else return;
      this.runningLines.set(rank, { rank, score, pvUci: pv, pvSan: [], depth });
      return;
    }
    if (line.startsWith("bestmove")) {
      this.finishJob(job, line.split(/\s+/)[1] ?? "");
    }
  }

  private clearTimers() {
    if (this.runningTimer) clearTimeout(this.runningTimer);
    if (this.hardTimer) clearTimeout(this.hardTimer);
    this.runningTimer = this.hardTimer = null;
  }

  private finishJob(job: Job, bestUci: string) {
    this.clearTimers();
    this.lineHandler = null;
    this.running = null;

    const lines = [...this.runningLines.values()].sort((a, b) => a.rank - b.rank);
    for (const l of lines) l.pvSan = uciLineToSan(job.fen, l.pvUci);
    const best = bestUci && bestUci !== "(none)" ? bestUci : lines[0]?.pvUci[0] ?? "";
    job.resolve({
      fen: job.fen,
      bestMoveUci: best,
      bestMoveSan: best ? uciLineToSan(job.fen, [best])[0] ?? best : "",
      lines,
      depth: lines[0]?.depth ?? 0,
      source: "stockfish",
    });
    this.pump();
  }

  private restartWorker() {
    console.warn("Stockfish did not respond to stop; restarting the worker.");
    const job = this.running;
    this.clearTimers();
    this.running = null;
    this.lineHandler = null;
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.initPromise = null;
    this.currentOptions.clear();
    this.emitStatus();
    if (job) job.resolve(unavailableResult(job.fen));
    void this.init().then(() => this.pump());
  }
}

function unavailableResult(fen: string): SearchResult {
  return { fen, bestMoveUci: "", bestMoveSan: "", lines: [], depth: 0, source: "unavailable" };
}

/** Convert a UCI move list to SAN from a starting FEN; stops at the first illegal move. */
export function uciLineToSan(fen: string, uci: string[]): string[] {
  const out: string[] = [];
  let g: Chess;
  try {
    g = new Chess(fen);
  } catch {
    return out;
  }
  for (const u of uci) {
    try {
      const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      out.push(m.san);
    } catch {
      break;
    }
  }
  return out;
}

/** Apply a UCI move list to a FEN and return the resulting FENs after each move. */
export function uciLineFens(fen: string, uci: string[]): string[] {
  const out: string[] = [];
  const g = new Chess(fen);
  for (const u of uci) {
    try {
      g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      out.push(g.fen());
    } catch {
      break;
    }
  }
  return out;
}

export const stockfishService = new StockfishService();
