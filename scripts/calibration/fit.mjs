#!/usr/bin/env node
/**
 * Fits rating ~ features (per time class) from the per-move records written by
 * analyze.calib.ts, with grouped k-fold cross-validation (a game's two sides never
 * straddle train/test), and compares against the original uncalibrated formula.
 *
 * Usage: node scripts/calibration/fit.mjs <records.jsonl|dir> [--json src/engine/performanceModel.json]
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const arg = process.argv[2];
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const files = fs.statSync(arg).isDirectory() ? fs.readdirSync(arg).filter((f) => /\.jsonl(\.gz)?$/.test(f)).map((f) => path.join(arg, f)) : [arg];
const read = (f) => (f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)).toString("utf8") : fs.readFileSync(f, "utf8"));
const rows = files.flatMap((f) => read(f).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)));

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const cap = (x, c) => Math.min(c, x);

/** Move tuple: [lossCp, moverEvalBefore, gradeCode, winDrop*1000, accuracy] */
function features(r) {
  const mv = r.moves;
  const n = mv.length;
  const loss500 = mean(mv.map((m) => cap(m[0], 500)));
  const loss300 = mean(mv.map((m) => cap(m[0], 300)));
  const loss150 = mean(mv.map((m) => cap(m[0], 150)));
  const open = mv.filter((m) => Math.abs(m[1]) <= 400); // not-yet-decided positions
  const lossOpen = open.length >= 5 ? mean(open.map((m) => cap(m[0], 300))) : loss300;
  const rate = (codes) => mv.filter((m) => codes.includes(m[2])).length / n;
  return {
    n,
    acc: r.acc,
    acpl500: loss500,
    logAcpl500: Math.log(loss500 + 10),
    logAcpl300: Math.log(loss300 + 10),
    logAcpl150: Math.log(loss150 + 10),
    logAcplOpen: Math.log(lossOpen + 10),
    blunder: rate([6, 7]),
    mistake: rate([5]),
    inacc: rate([4]),
    errors: rate([4, 5, 6, 7]),
    meanWinDrop: mean(mv.map((m) => m[3])) / 10, // percentage points
    decided: mv.filter((m) => Math.abs(m[1]) > 500).length / n,
    logN: Math.log(n),
  };
}
const data = rows.filter((r) => r.moves.length >= 10).map((r) => ({ ...r, f: features(r) }));

// ---- tiny OLS (ridge-stabilised) ----
function solve(A, b) {
  const n = b.length; const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { x[i] = (M[i][n] - M[i].slice(i + 1, n).reduce((s, v, j) => s + v * x[i + 1 + j], 0)) / M[i][i]; }
  return x;
}
function ols(X, y, ridge = 1e-6) {
  const k = X[0].length;
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j && i > 0 ? ridge : 0)));
  const b = Array.from({ length: k }, (_, i) => X.reduce((s, r, t) => s + r[i] * y[t], 0));
  return solve(A, b);
}
const predict = (w, x) => w.reduce((s, wi, i) => s + wi * x[i], 0);

const MODELS = {
  "acc": ["acc"],
  "logAcpl500": ["logAcpl500"],
  "logAcpl300": ["logAcpl300"],
  "logAcplOpen": ["logAcplOpen"],
  "acc+errors": ["acc", "errors"],
  "logAcpl300+blunder": ["logAcpl300", "blunder"],
  "logAcpl300+errors+decided": ["logAcpl300", "errors", "decided"],
  "logAcplOpen+blunder+inacc+decided": ["logAcplOpen", "blunder", "inacc", "decided"],
  "logAcpl300+acc+decided+logN": ["logAcpl300", "acc", "decided", "logN"],
};
const design = (rs, names) => rs.map((r) => [1, ...names.map((n) => r.f[n])]);

// The original formula, for comparison.
const oldFormula = (r) => Math.max(400, Math.min(2900, Math.round((3100 * Math.exp(-0.01 * r.f.acpl500)) / 50) * 50));

function folds(rs, k = 8) {
  const ids = [...new Set(rs.map((r) => r.id))];
  const fold = new Map(ids.map((id, i) => [id, i % k]));
  return Array.from({ length: k }, (_, f) => ({ train: rs.filter((r) => fold.get(r.id) !== f), test: rs.filter((r) => fold.get(r.id) === f) }));
}
function cv(rs, names) {
  const err = [];
  for (const { train, test } of folds(rs)) {
    const w = ols(design(train, names), train.map((r) => r.rating));
    for (const r of test) err.push(predict(w, [1, ...names.map((n) => r.f[n])]) - r.rating);
  }
  return { rmse: Math.sqrt(mean(err.map((e) => e * e))), bias: mean(err), sd: sd(err) };
}

const classes = ["Bullet", "Blitz", "Rapid", "ALL"];
const result = { generated: new Date().toISOString().slice(0, 10), samples: data.length, classes: {} };
console.log(`${data.length} side-games from ${new Set(data.map((d) => d.id)).size} games\n`);

for (const cls of classes) {
  const rs = cls === "ALL" ? data : data.filter((d) => d.cls === cls);
  if (rs.length < 40) continue;
  const oldErr = rs.map((r) => oldFormula(r) - r.rating);
  console.log(`=== ${cls}  (n=${rs.length}, ratings ${Math.min(...rs.map((r) => r.rating))}-${Math.max(...rs.map((r) => r.rating))}, mean ${Math.round(mean(rs.map((r) => r.rating)))})`);
  console.log(`  ORIGINAL formula:  bias ${Math.round(mean(oldErr)).toString().padStart(5)}   RMSE ${Math.round(Math.sqrt(mean(oldErr.map((e) => e * e)))).toString().padStart(4)}`);
  const scored = Object.entries(MODELS).map(([name, names]) => ({ name, names, ...cv(rs, names) })).sort((a, b) => a.rmse - b.rmse);
  for (const s of scored) console.log(`  ${s.name.padEnd(36)} CV RMSE ${Math.round(s.rmse).toString().padStart(4)}   bias ${Math.round(s.bias).toString().padStart(4)}`);
  const baseline = Math.round(sd(rs.map((r) => r.rating)));
  console.log(`  (predict-the-mean RMSE: ${baseline})`);
  result.classes[cls] = { n: rs.length, baselineSd: baseline, best: scored[0].name, models: Object.fromEntries(scored.map((s) => [s.name, Math.round(s.rmse)])) };
  // keep the full table so the chosen model can be exported below
  result.classes[cls]._rs = rs;
  console.log();
}

// ---- Export ----
// The shipped model is deliberately small and about move quality (no game-length feature):
// a composite score from these three features, then a calibration table that maps the
// score to the range of ratings that players producing such games actually had.
if (jsonOut) {
  const MODEL = "logAcpl300+errors+decided";
  const names = MODELS[MODEL];
  const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };
  const out = {
    model: MODEL,
    features: names,
    generated: result.generated,
    note: "Ratings are on the Lichess scale. table: composite score -> 10th/50th/90th percentile of true ratings (from cross-validated predictions).",
    classes: {},
  };
  for (const cls of ["Bullet", "Blitz", "Rapid", "ALL"]) {
    const rs = result.classes[cls]?._rs;
    if (!rs) continue;
    const weights = ols(design(rs, names), rs.map((r) => r.rating));
    // Out-of-fold composite scores, so the table isn't optimistic about the fit.
    const pairs = [];
    for (const { train, test } of folds(rs)) {
      const w = ols(design(train, names), train.map((r) => r.rating));
      for (const r of test) pairs.push({ est: predict(w, [1, ...names.map((n) => r.f[n])]), rating: r.rating });
    }
    pairs.sort((a, b) => a.est - b.est);
    const priorWidth = quantile(pairs.map((p) => p.rating), 0.9) - quantile(pairs.map((p) => p.rating), 0.1);
    const K = 6, size = Math.ceil(pairs.length / K);
    const table = [];
    for (let b = 0; b < K; b++) {
      const g = pairs.slice(b * size, (b + 1) * size);
      if (!g.length) continue;
      table.push({
        est: Math.round(mean(g.map((p) => p.est))),
        lo: Math.round(quantile(g.map((p) => p.rating), 0.1)),
        mid: Math.round(quantile(g.map((p) => p.rating), 0.5)),
        hi: Math.round(quantile(g.map((p) => p.rating), 0.9)),
      });
    }
    const informativeness = +(1 - mean(table.map((t) => t.hi - t.lo)) / priorWidth).toFixed(2);
    out.classes[cls] = {
      n: rs.length,
      weights: weights.map((x) => +x.toFixed(4)),
      table,
      informativeness,
      // Below this the game's features barely narrow the range, so the app shows no estimate.
      informative: informativeness >= 0.15,
    };
  }
  fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2) + "\n");
  console.log("wrote", jsonOut);
}
