# AGENTS.md

OmniChess Studio: a browser-only chess-improvement app (React 19, TypeScript, Vite, Stockfish WASM). `README.md` covers features and setup; this file covers what you can't get from reading the code.

## Before you say "done"

Run all four, same as CI (`.github/workflows/ci.yml`):

```bash
npm run lint && npm run build && npm test && npm run smoke:engine
```

`npm run build` runs `tsc -b`, so it is the type check. Lint warnings that already exist (PuzzlesView, SyncPanel, calibration scripts) are known; don't add new ones. After touching puzzles, also run `npm run validate:puzzles`.

## Gotchas

- **`erasableSyntaxOnly` is on.** No constructor parameter properties (`constructor(private x: T)`), no enums, no namespaces. Declare the field, assign it in the constructor.
- **The engine is generated, not tracked.** `public/stockfish/` is git-ignored and filled by `npm install` (`postinstall` runs `scripts/sync-engine.mjs`). If it is missing, for example after `git reset --hard` or a fresh worktree, run `npm install`; don't commit engine files.
- **One Stockfish worker, one search at a time.** Everything goes through the `stockfishService` singleton's priority queue. Interactive work (live eval, bot moves, on-screen review, drill checks) uses high priority so it jumps ahead of background analysis. Never create a second worker for UI work. Background sync analysis uses its own `StockfishService` instances (pool), passed to `analyzeGame` via its `engine` option.
- **Never swap in a fallback engine.** If Stockfish can't start the app must say so. Results carry a `source` field for that reason.
- **Node tests that need the engine** use a Worker shim that spawns a child process (see `scripts/smoke-engine.mjs` and `scripts/calibration/analyze.calib.ts`). Reuse it; don't mock the engine for analysis tests.
- **Storage is per browser origin.** Games are in IndexedDB (`omnichess` / `games`), settings in localStorage (`omnichess_*` keys). `localhost:5173` and a different port are different archives, so "my games vanished" is usually a port change. Changing a stored shape means bumping the versioned key or migrating; real users have 1,000+ games saved.
- **`gameStore` emits `GamesChange` (`{ids}` or `{all:true}`).** UI code patches incrementally (`applyGameChanges`); don't re-read the whole archive on every change, the Improvement tab got slow that way.
- **Privacy rule:** usernames go only to Chess.com and Lichess; API keys (Groq, Lichess) stay in the browser and go only to their own service. Don't add analytics or any third-party call that includes user data.

## Generated data: don't hand-edit

| File | How to change it |
|---|---|
| `src/engine/performanceModel.json` | Refit with `scripts/calibration/` (see its README). |
| `src/data/puzzleBank.json`, `src/data/puzzles.ts` | Real Lichess puzzles only (CC0); never hand-write one. Run `npm run validate:puzzles -- 14` (add `--bank N` to spot-check the offline bank). |

**Refit the performance model whenever** the Stockfish version, analysis depth (12), MultiPV (2), or the move-grading thresholds in `src/engine/grading.ts` change. Its features come from that exact pipeline, so stale weights give wrong ratings silently. Estimates are on the **Lichess** scale; bullet deliberately shows no estimate (play quality doesn't track rating there). `src/services/ratingOffset.ts` shifts ranges toward the user's own platform scale.

## Dependency upgrades

Dependabot bumps `stockfish`; CI's `smoke:engine` and puzzle validation are the gate. Treat a Stockfish major bump as a calibration trigger (above), not just a version change.

## Working in this repo

- Never commit to `main`. Branch, open a PR, and wait for the owner's go-ahead before merging. They approve each merge explicitly. Merges are squash, then delete the branch.
- Keep unrelated changes in separate PRs; they've been split on request before.
- After a merge, sync local main with `git fetch --prune && git reset --hard origin/main`, then confirm `public/stockfish/` still exists.
- UI work isn't verified by tests. Say plainly when you haven't looked at it in a browser (`npm run dev`, port 5173).

## Skills in this repo

`.claude/skills/`: `ship-pr` (open and merge PRs the way this repo does it), `upgrade-engine` (Stockfish bumps), `refit-performance-model` (recalibrate rating estimates; slow, user-triggered).
