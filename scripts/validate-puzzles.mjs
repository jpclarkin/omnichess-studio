#!/usr/bin/env node
/**
 * Checks every puzzle in src/data/puzzles.ts with the bundled Stockfish:
 *  - the FEN and every move in the line are legal, and the side to move matches
 *  - each solver move is within 100cp of the engine's best
 *  - the line ends with the solver clearly better (or mating)
 * Usage: node scripts/validate-puzzles.mjs [depth] [--bank N]   (--bank also spot-checks N random puzzles from the offline bank)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const depth = Number(process.argv[2] && /^\d+$/.test(process.argv[2]) ? process.argv[2] : 14);
const bankIdx = process.argv.indexOf("--bank");
const bankN = bankIdx >= 0 ? Number(process.argv[bankIdx + 1]) || 100 : 0;

// The engine build is a CommonJS script; copy it next to its wasm under a .cjs name.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "omnichess-sf-"));
fs.copyFileSync(path.join(root, "public/stockfish/stockfish.js"), path.join(tmp, "stockfish.cjs"));
fs.copyFileSync(path.join(root, "public/stockfish/stockfish.wasm"), path.join(tmp, "stockfish.wasm"));

const src = fs.readFileSync(path.join(root, "src/data/puzzles.ts"), "utf8");
const puzzles = JSON.parse(src.slice(src.indexOf("= [") + 2, src.lastIndexOf("];") + 1));
if (bankN > 0) {
  const bank = JSON.parse(fs.readFileSync(path.join(root, "src/data/puzzleBank.json"), "utf8"));
  const step = Math.max(1, Math.floor(bank.length / bankN));
  for (let i = 0, added = 0; i < bank.length && added < bankN; i += step, added++) {
    const b = bank[i];
    const g = new Chess(b.f);
    const sans = b.m.split(" ").map((u) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    puzzles.push({ id: "bank-" + b.i, fen: b.f, moves: sans, turn: new Chess(b.f).turn() });
  }
}

const sf = spawn("node", [path.join(tmp, "stockfish.cjs")], { cwd: tmp });
let buf = "", waiters = [];
sf.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    waiters.forEach((w) => w(line));
  }
});
const run = (cmd, until) =>
  new Promise((res) => {
    const lines = [];
    const w = (l) => { lines.push(l); if (until(l)) { waiters = waiters.filter((x) => x !== w); res(lines); } };
    waiters.push(w);
    sf.stdin.write(cmd + "\n");
  });

async function evalMove(fen, uci) {
  const lines = await run(`position fen ${fen}\ngo depth ${depth}${uci ? " searchmoves " + uci : ""}`, (l) => l.startsWith("bestmove"));
  const infos = lines.filter((l) => l.startsWith("info") && / score /.test(l) && / depth /.test(l));
  const m = infos[infos.length - 1].match(/score (cp|mate) (-?\d+)/);
  const cp = m[1] === "mate" ? (m[2] > 0 ? 10000 - m[2] : -10000 - m[2]) : +m[2];
  return { cp, best: lines.find((l) => l.startsWith("bestmove")).split(" ")[1] };
}

await run("uci", (l) => l === "uciok");
await run("isready", (l) => l === "readyok");

let failures = 0;
for (const p of puzzles) {
  const issues = [];
  const g = new Chess(p.fen);
  const solver = g.turn();
  if (solver !== p.turn) issues.push(`turn mismatch (fen ${solver}, puzzle ${p.turn})`);
  for (let i = 0; i < p.moves.length; i++) {
    const before = g.fen();
    let mv;
    try { mv = g.move(p.moves[i]); } catch { mv = null; }
    if (!mv) { issues.push(`move ${i} "${p.moves[i]}" is illegal`); break; }
    if (mv.color === solver) {
      const best = await evalMove(before, null);
      const played = await evalMove(before, mv.from + mv.to + (mv.promotion ?? ""));
      if (best.cp - played.cp > 100) issues.push(`solver move ${i} ${p.moves[i]} loses ${best.cp - played.cp}cp vs ${best.best}`);
    }
  }
  if (!issues.length) {
    const f = await evalMove(g.fen(), null);
    const forSolver = g.turn() === solver ? f.cp : -f.cp;
    if (forSolver < 150) issues.push(`line ends only ${forSolver}cp for the solver`);
  }
  if (issues.length) failures++;
  console.log(`${issues.length ? "FAIL" : "ok  "} ${p.id} ${issues.join("; ")}`);
}
sf.stdin.write("quit\n");
fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} puzzle(s) failed` : `\nAll ${puzzles.length} puzzles verified at depth ${depth}`);
process.exit(failures ? 1 : 0);
