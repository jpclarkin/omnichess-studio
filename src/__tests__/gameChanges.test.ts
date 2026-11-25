import { describe, expect, it } from "vitest";
import { applyGameChanges } from "../components/improve/hooks";
import type { GameRecord } from "../services/gameStore";

const game = (id: string, endTime: number, extra: Partial<GameRecord> = {}) => ({ id, endTime, analysis: null, ...extra }) as unknown as GameRecord;

describe("applyGameChanges", () => {
  const a = game("a", 300), b = game("b", 200), c = game("c", 100);

  it("replaces only the changed game and keeps the others as the same objects", () => {
    const b2 = game("b", 200, { analysisError: "x" });
    const next = applyGameChanges([a, b, c], ["b"], [b2]);
    expect(next).toEqual([a, b2, c]);
    expect(next[0]).toBe(a);
    expect(next[2]).toBe(c);
  });

  it("adds new games in newest-first order and removes deleted ones", () => {
    const d = game("d", 250);
    expect(applyGameChanges([a, b, c], ["d"], [d]).map((g) => g.id)).toEqual(["a", "d", "b", "c"]);
    expect(applyGameChanges([a, b, c], ["b"], [undefined]).map((g) => g.id)).toEqual(["a", "c"]);
  });
});
