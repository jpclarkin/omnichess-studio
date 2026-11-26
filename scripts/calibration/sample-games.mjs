import fs from "node:fs";
import readline from "node:readline";
const [, , input, output] = process.argv;
const PER_CELL = 26;
const CLASSES = ["Bullet", "Blitz", "Rapid"];
const EDGES = [0, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 9999];
let seed = 20261125; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const cells = new Map();
let tags = {}, inMoves = false, seen = 0, kept = 0;

function consider(t, moveText) {
  seen++;
  const cls = /^Rated (Bullet|Blitz|Rapid) game$/.exec(t.Event ?? "")?.[1];
  if (!cls) return;
  if (!/^\d+$/.test(t.WhiteElo ?? "") || !/^\d+$/.test(t.BlackElo ?? "")) return;
  if (t.WhiteRatingDiff === undefined || t.BlackRatingDiff === undefined) return;
  if (t.Termination !== "Normal" && t.Termination !== "Time forfeit") return;
  const w = +t.WhiteElo, b = +t.BlackElo;
  if (Math.abs(w - b) > 150) return;
  const avg = (w + b) / 2;
  const band = EDGES.findIndex((e, i) => avg >= e && avg < EDGES[i + 1]);
  const sans = moveText.replace(/\{[^}]*\}/g, " ").replace(/\d+\.(\.\.)?/g, " ").replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ").trim().split(/\s+/).filter(Boolean);
  if (sans.length < 20 || sans.length > 200) return;
  kept++;
  const key = cls + ":" + band;
  let c = cells.get(key); if (!c) cells.set(key, (c = { n: 0, items: [] }));
  c.n++;
  const rec = { id: (t.Site ?? "").split("/").pop(), cls, w, b, result: t.Result, term: t.Termination, sans };
  if (c.items.length < PER_CELL) c.items.push(rec);
  else { const j = Math.floor(rnd() * c.n); if (j < PER_CELL) c.items[j] = rec; }
}

const rl = readline.createInterface({ input: fs.createReadStream(input), crlfDelay: Infinity });
for await (const line of rl) {
  if (line.startsWith("[")) {
    if (inMoves) { tags = {}; inMoves = false; }
    const m = /^\[(\w+) "(.*)"\]$/.exec(line); if (m) tags[m[1]] = m[2];
  } else if (line.trim()) {
    if (!inMoves) { inMoves = true; consider(tags, line); }
  }
}
const out = [...cells.values()].flatMap((c) => c.items);
fs.writeFileSync(output, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
const summary = {};
for (const [k, c] of [...cells.entries()].sort()) summary[k] = `${c.items.length}/${c.n}`;
console.log({ seen, eligible: kept, sampled: out.length });
console.log(summary);
