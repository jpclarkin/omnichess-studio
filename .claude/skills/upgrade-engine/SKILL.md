---
name: upgrade-engine
description: Handle a Stockfish version bump (usually a Dependabot "chore(engine)" PR) - verify the new engine, check puzzles, and decide whether the performance model needs refitting. Use when a stockfish upgrade PR appears or the user asks to upgrade or check the engine.
---

# Upgrade the Stockfish engine

The engine is the `stockfish` npm package; `npm install` copies it to `public/stockfish/` (git-ignored) via `scripts/sync-engine.mjs`. Dependabot opens `chore(engine)` PRs with the `engine-upgrade` label. CI already runs the smoke test and puzzle validation, but you still need to judge what the bump means.

## Steps

1. **Find the change.** If given a PR number, `gh pr view <n>` and `gh pr checkout <n>`; otherwise check `npm outdated stockfish`. Note old and new versions and whether the major version changed. Read the package's release notes/changelog for NNUE, default-option, or UCI changes.
2. **Install and verify locally.** `npm install` (refreshes `public/stockfish/`; `public/stockfish/VERSION` should show the new version), then:
   - `npm run smoke:engine`: engine starts, UCI options and bot Elo range present, MultiPV and mate detection work.
   - `npm run validate:puzzles -- 14`, plus `-- 14 --bank 100` for a spot check of the offline bank. A puzzle failing on the new engine usually means the engine changed its mind about a line; investigate the position before changing anything.
   - `npm run lint && npm run build && npm test`.
3. **Check the bot levels.** The app depends on `UCI_Elo` limits (1400-2400) and Skill Level for the lowest two bots. Confirm `smoke:engine` still reports those ranges; if the Elo range moved, `src/data/bots.ts` needs updating.
4. **Decide on calibration.** A **major** version bump, or any change to evaluation scale or default search behaviour, makes the performance model stale (its features come from this engine at depth 12 / MultiPV 2). Patch or minor bumps normally don't. If stale, say so in the PR and recommend the `refit-performance-model` skill; don't refit inside this task.
5. **Report** to the user: versions, each check's result (quote real output for failures), and the calibration recommendation. Leave the PR open for their go-ahead; merging goes through `ship-pr`.

## Rules

- Never commit files under `public/stockfish/`.
- Don't pin or downgrade the engine to make a check pass; report the failure.
- If the app can't start the engine, it must say so; never add a fallback engine.
