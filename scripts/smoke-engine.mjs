#!/usr/bin/env node
/**
 * Smoke test for the bundled engine (public/stockfish). Fails if an engine upgrade
 * breaks anything the app relies on: startup, UCI options, a legal best move,
 * MultiPV output, and the version matching the installed npm package.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "stockfish");
const fail = (msg) => { console.error("FAIL:", msg); process.exit(1); };

// The engine build is a CommonJS script; run it from a temp dir under a .cjs name.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "omnichess-smoke-"));
fs.copyFileSync(path.join(dir, "stockfish.js"), path.join(tmp, "stockfish.cjs"));
fs.copyFileSync(path.join(dir, "stockfish.wasm"), path.join(tmp, "stockfish.wasm"));

const sf = spawn("node", [path.join(tmp, "stockfish.cjs")], { cwd: tmp });
let buf = "", waiters = [];
sf.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiters.forEach((w) => w(l)); }
});
const run = (cmd, until, ms = 60000) =>
  new Promise((res, rej) => {
    const lines = [];
    const t = setTimeout(() => rej(new Error(`timeout waiting after "${cmd.split("\n").pop()}"`)), ms);
    const w = (l) => { lines.push(l); if (until(l)) { clearTimeout(t); waiters = waiters.filter((x) => x !== w); res(lines); } };
    waiters.push(w);
    sf.stdin.write(cmd + "\n");
  });

try {
  const uci = await run("uci", (l) => l === "uciok");
  const name = uci.find((l) => l.startsWith("id name "))?.slice(8) ?? "";
  const installed = fs.readFileSync(path.join(dir, "VERSION"), "utf8").trim();
  const major = installed.split(".")[0];
  if (!new RegExp(`stockfish\\s*${major}`, "i").test(name)) fail(`engine reports "${name}" but package version is ${installed}`);

  for (const opt of ["MultiPV", "UCI_LimitStrength", "UCI_Elo", "Skill Level"]) {
    if (!uci.some((l) => l.startsWith("option name " + opt + " "))) fail(`UCI option "${opt}" is missing`);
  }

  // Every bot's Elo must be inside the engine's UCI_Elo range, or it would be silently clamped.
  const eloLine = uci.find((l) => l.startsWith("option name UCI_Elo "));
  const [, min, max] = eloLine.match(/min (\d+) max (\d+)/) ?? [];
  const botElos = [...fs.readFileSync(path.join(root, "src/data/bots.ts"), "utf8").matchAll(/engine:\s*\{\s*elo:\s*(\d+)/g)].map((m) => +m[1]);
  for (const e of botElos) if (e < +min || e > +max) fail(`bot Elo ${e} is outside the engine's UCI_Elo range ${min}-${max}`);

  await run("isready", (l) => l === "readyok");
  const g = new Chess();
  const out = await run(`setoption name MultiPV value 2\nposition fen ${g.fen()}\ngo depth 8`, (l) => l.startsWith("bestmove"));
  const best = out.find((l) => l.startsWith("bestmove")).split(" ")[1];
  const mv = g.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
  if (!mv) fail(`illegal best move ${best}`);
  if (!out.some((l) => / multipv 2 /.test(l))) fail("MultiPV 2 produced no second line");

  // Mate detection: back-rank mate in 1.
  const mate = await run("setoption name MultiPV value 1\nposition fen 6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1\ngo depth 8", (l) => l.startsWith("bestmove"));
  if (!mate.some((l) => /score mate 1/.test(l))) fail("did not find mate in 1 (Ra8#)");

  console.log(`ok: ${name} (package ${installed}); UCI_Elo ${min}-${max}, bots ${botElos.join("/")}`);
} catch (e) {
  fail(e.message);
} finally {
  sf.stdin.write("quit\n");
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(0);
