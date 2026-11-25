# Performance-rating calibration

`src/engine/performanceModel.json` holds the weights behind the "Est. performance" number in
Game Review. They are fitted, not guessed. To regenerate (e.g. after an engine upgrade, or to
refit with more games):

1. **Get games.** Download the start of a monthly file from <https://database.lichess.org> (CC0).
   Range requests work, so `curl -r 0-349999999 -o part.pgn.zst <url>` is enough, then `zstd -d part.pgn.zst`.
2. **Sample.** `node scripts/calibration/sample-games.mjs part.pgn sample.jsonl` draws an equal
   number of games per (time control × rating band): Bullet/Blitz/Rapid, ten bands from <800 to 2400+.
3. **Analyze with the app's own pipeline.**
   `SHARD=0 SHARDS=6 CALIB_INPUT=sample.jsonl CALIB_OUTPUT=out/shard0.jsonl npx vitest run --config vitest.calibration.config.ts`
   (one process per shard; it needs the engine from `npm install`). Runs `analyzeGame` at depth 12 / MultiPV 2 and
   records each side's per-move data. About 15-25 s per game per core on real games.
4. **Fit.** `node scripts/calibration/fit.mjs out/ --json src/engine/performanceModel.json`
   prints cross-validated error for every candidate model and for the original formula, then writes the shipped model
   (a composite of three move-quality features, plus a table mapping it to the range of ratings that produce such games).
   `data/records.jsonl.gz` is the dataset behind the committed model, so you can refit without re-analyzing:
   `node scripts/calibration/fit.mjs scripts/calibration/data/records.jsonl.gz`.

Things to know:
- Ratings are on the **Lichess** scale. Chess.com ratings are on a different scale.
- One game is a noisy sample of a player's strength; the model's reported range is the empirical 80% interval.
- If the engine version, depth, or grading thresholds change, regenerate: the features come from that pipeline.

## What the data said (780 Lichess games, 1,560 player-sides, Oct 2026 sample)

- The original uncalibrated formula (`3100*exp(-0.01*ACPL)`) was off by ~500-650 Elo RMSE, no better than guessing the average.
- **Bullet:** play quality barely changes from 400 to 1800 rated (about 84-85% accuracy and 60-70 cp loss throughout; games are
  ~20 moves a side and ~60% end on the clock). Cross-validated error is the same as guessing the mean, so the app shows no estimate.
- **Blitz / rapid:** quality does trend with rating (rapid accuracy 82% at the bottom to 95% at the top), but one game is a weak
  signal: the ranges are 700-1400 wide for weak-looking games.
- **Calibration check:** overall 80% of true ratings fall inside the stated 80% range, but it under-covers the extremes
  (true <1000: ~61%, true 2200+: ~54-65%) because any estimate from one game is pulled toward the middle.
