---
name: refit-performance-model
description: Refit the Game Review "plays like ~rating" model (src/engine/performanceModel.json) from fresh rated Lichess games. Use after a Stockfish major upgrade, or a change to analysis depth, MultiPV or move-grading thresholds, or when asked to recalibrate rating estimates.
disable-model-invocation: true
---

# Refit the performance model

The estimate's features come from the exact analysis pipeline (Stockfish version, depth 12, MultiPV 2, thresholds in `src/engine/grading.ts`). If any of those changed, the committed weights are stale. Full reference: `scripts/calibration/README.md`; read it first and follow it over this summary if they differ.

This is slow (hours of CPU). Tell the user the estimate and get a go-ahead before step 3. Work on a branch, never `main`.

## Steps

1. **Baseline.** Run `node scripts/calibration/fit.mjs scripts/calibration/data/records.jsonl.gz` and save the printed cross-validated error table (per time class and the original formula). This is what the new fit is compared against.
2. **Get games.** Pick one recent monthly file from <https://database.lichess.org> (CC0). Range-download the start (~350 MB) and decompress, in a scratch directory outside the repo:
   `curl -r 0-349999999 -o part.pgn.zst <url> && zstd -d part.pgn.zst`
3. **Sample.** `node scripts/calibration/sample-games.mjs part.pgn sample.jsonl` (26 games per time class × 10 rating bands).
4. **Analyze** with the app's own pipeline, one process per shard (use about half the CPU cores; the machine is the user's laptop). Start them in the background and wait for completion notifications rather than polling:
   `SHARD=<i> SHARDS=<n> CALIB_INPUT=sample.jsonl CALIB_OUTPUT=out/shard<i>.jsonl npx vitest run --config vitest.calibration.config.ts`
   Needs the engine from `npm install`. Expect 15-25 s per game per core.
5. **Fit.** `node scripts/calibration/fit.mjs out/ --json src/engine/performanceModel.json`. Compare its cross-validated error to the baseline, per class.
6. **Decide, don't assume.** Report: new vs old CV error, which classes are `informative` (bullet was 0.06, below the 0.15 threshold; blitz ≈0.29, rapid ≈0.34), and the 80%-interval coverage at the extremes (previously ~61% for true <1000 and ~54-65% for 2200+). If the new fit is worse, or bullet became informative, say so and let the user decide; don't ship silently.
7. **Keep the dataset in step.** Replace `scripts/calibration/data/records.jsonl.gz` with the new records (gzip them) so the next refit can start from it, and update the sample size and month in `scripts/calibration/README.md` "What the data said".
8. **Verify.** `npm run lint && npm run build && npm test`. The tests in `src/__tests__/performanceModel.test.ts` check table ordering and the bullet-uninformative rule.
9. **PR.** Hand off to the `ship-pr` skill. The PR body must include the before/after CV table and the coverage numbers.

## Rules

- Estimates stay on the Lichess scale; don't mix in Chess.com data.
- Never hand-edit `performanceModel.json`; only `fit.mjs --json` writes it.
- Don't commit the raw PGN, the sample, or per-shard output; only the compressed records file.
