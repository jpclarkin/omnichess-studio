#!/usr/bin/env node
/**
 * Copies the Stockfish build we ship from the `stockfish` npm package into
 * public/stockfish/ under fixed names (stockfish.js / stockfish.wasm), so the
 * app's worker URL never changes when the engine is upgraded.
 *
 * Runs on `npm install` (postinstall). To upgrade the engine, bump the
 * `stockfish` dependency (Dependabot does this automatically).
 *
 * Build used: "lite-single" - small (~2 MB) and single-threaded, so it needs no
 * SharedArrayBuffer / cross-origin-isolation headers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = path.join(root, "node_modules", "stockfish");
const outDir = path.join(root, "public", "stockfish");

if (!fs.existsSync(pkgDir)) {
  // e.g. production installs that skip devDependencies; nothing to sync.
  console.log("sync-engine: stockfish package not installed, skipping");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
const major = String(pkg.version).split(".")[0];
const base = `stockfish-${major}-lite-single`;

fs.mkdirSync(outDir, { recursive: true });
for (const ext of ["js", "wasm"]) {
  const src = path.join(pkgDir, "bin", `${base}.${ext}`);
  if (!fs.existsSync(src)) {
    console.error(`sync-engine: ${src} not found. The package layout changed; update scripts/sync-engine.mjs.`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(outDir, `stockfish.${ext}`));
}
fs.writeFileSync(path.join(outDir, "VERSION"), `${pkg.version}\n`);
console.log(`sync-engine: Stockfish ${pkg.version} (${base}) -> public/stockfish/`);
