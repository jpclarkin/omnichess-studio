/**
 * Runs the app's real analysis (analyzeGame: Stockfish depth 12, MultiPV 2, same grading)
 * over a sample of rated games and records per-move data for each side.
 *
 * Env: CALIB_INPUT (jsonl from sample-games.mjs), CALIB_OUTPUT (jsonl, appended),
 *      SHARD / SHARDS (this process takes every SHARDS-th game starting at SHARD),
 *      CALIB_LIMIT (optional, for smoke tests).
 * Run: SHARD=0 SHARDS=6 CALIB_INPUT=... CALIB_OUTPUT=... npx vitest run --config vitest.calibration.config.ts
 */
import { describe, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The engine service talks to a Web Worker; stand in for it with a child process.
vi.hoisted(() => {
  const { spawn } = require("node:child_process") as typeof import("node:child_process");
  const fsx = require("node:fs") as typeof import("node:fs");
  const osx = require("node:os") as typeof import("node:os");
  const pathx = require("node:path") as typeof import("node:path");
  const dir = fsx.mkdtempSync(pathx.join(osx.tmpdir(), "omnichess-calib-"));
  const src = pathx.resolve("public/stockfish");
  fsx.copyFileSync(pathx.join(src, "stockfish.js"), pathx.join(dir, "stockfish.cjs"));
  fsx.copyFileSync(pathx.join(src, "stockfish.wasm"), pathx.join(dir, "stockfish.wasm"));
  (globalThis as any).Worker = class {
    onmessage: ((e: { data: string }) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    private p = spawn("node", [pathx.join(dir, "stockfish.cjs")], { cwd: dir });
    private buf = "";
    constructor() {
      this.p.stdout.on("data", (d: Buffer) => {
        this.buf += d;
        let i: number;
        while ((i = this.buf.indexOf("\n")) >= 0) {
          const line = this.buf.slice(0, i).trim();
          this.buf = this.buf.slice(i + 1);
          setImmediate(() => this.onmessage?.({ data: line }));
        }
      });
    }
    postMessage(m: string) {
      this.p.stdin.write(m + "\n");
    }
    terminate() {
      this.p.kill();
    }
  };
});

import { StockfishService } from "../../src/engine/stockfishService";
import { analyzeGame } from "../../src/engine/gameAnalysis";
import { scoreToCp } from "../../src/engine/grading";

interface InGame {
  id: string; cls: string; w: number; b: number; result: string; term: string; sans: string[];
}

const GRADE_CODE: Record<string, number> = {
  brilliant: 0, great: 1, best: 2, good: 3, inaccuracy: 4, mistake: 5, blunder: 6, missed_win: 7,
};

describe("calibration analysis", () => {
  it("analyzes this shard", async () => {
    const input = process.env.CALIB_INPUT!, output = process.env.CALIB_OUTPUT!;
    const shard = Number(process.env.SHARD ?? 0), shards = Number(process.env.SHARDS ?? 1);
    const limit = Number(process.env.CALIB_LIMIT ?? Infinity);
    const games = fs.readFileSync(input, "utf8").trim().split("\n").map((l) => JSON.parse(l) as InGame);
    const mine = games.filter((_, i) => i % shards === shard).slice(0, limit);
    const engine = new StockfishService({ hashMb: 32 });
    fs.mkdirSync(path.dirname(output), { recursive: true });

    for (const g of mine) {
      let report;
      try {
        report = await analyzeGame(g.sans, { depth: 12, priority: "low", engine });
      } catch (e) {
        console.warn("skip", g.id, (e as Error).message);
        continue;
      }
      for (const color of ["w", "b"] as const) {
        const sign = color === "w" ? 1 : -1;
        const moves = report.moves
          .filter((m) => m.color === color)
          .map((m) => {
            const before = m.scoreBefore ? scoreToCp(m.scoreBefore) : m.evalBefore;
            const after = m.scoreAfter ? scoreToCp(m.scoreAfter) : m.evalAfter;
            return [
              Math.max(0, Math.round(sign * (before - after))), // cp loss (uncapped, mates clamp to +-1000)
              Math.round(sign * before), // mover's eval before the move
              GRADE_CODE[m.grade] ?? 3,
              Math.round((m.winDrop ?? 0) * 1000), // win-probability drop, in 0.1%
              m.accuracy ?? 100,
            ];
          });
        const score = g.result === "1/2-1/2" ? 0.5 : (g.result === "1-0") === (color === "w") ? 1 : 0;
        fs.appendFileSync(
          output,
          JSON.stringify({
            id: g.id, cls: g.cls, color, rating: color === "w" ? g.w : g.b, opp: color === "w" ? g.b : g.w,
            score, term: g.term, acc: color === "w" ? report.whiteAccuracy : report.blackAccuracy, moves,
          }) + "\n",
        );
      }
    }
  });
});
