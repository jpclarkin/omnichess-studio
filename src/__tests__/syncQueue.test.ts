import { describe, expect, it } from "vitest";
import { selectAnalysisQueue } from "../services/syncService";
import type { GameRecord } from "../services/gameStore";

// Newest first, like gameStore.all()
const game = (n: number, over: Partial<GameRecord> = {}) =>
  ({ id: `g${n}`, endTime: 1000 - n, analysis: null, analysisError: null, ...over }) as unknown as GameRecord;
const done = { whiteAccuracy: 90 } as unknown as GameRecord["analysis"];

describe("selectAnalysisQueue", () => {
  const games = [game(0), game(1, { analysis: done }), game(2), game(3), game(4, { analysisError: "bad pgn" }), game(5)];

  it("only looks at the newest N games by default, skipping analyzed and failed ones", () => {
    expect(selectAnalysisQueue(games, { all: false, limit: 3 }).map((g) => g.id)).toEqual(["g0", "g2"]);
  });

  it("includes the whole backlog when asked, still skipping analyzed and failed games", () => {
    expect(selectAnalysisQueue(games, { all: true, limit: 3 }).map((g) => g.id)).toEqual(["g0", "g2", "g3", "g5"]);
  });

  it("limit 0 disables automatic analysis; a huge limit covers everything", () => {
    expect(selectAnalysisQueue(games, { all: false, limit: 0 })).toEqual([]);
    expect(selectAnalysisQueue(games, { all: false, limit: 999 })).toHaveLength(4);
  });
});
