import { describe, it, expect } from "vitest";
import { offsetFromResiduals, MIN_GAMES, MAX_OFFSET } from "../services/ratingOffset";
import { applyRatingOffset, type PerformanceEstimate } from "../engine/performanceModel";

const range: PerformanceEstimate = { kind: "range", mid: 1200, low: 800, high: 1600, basis: "blitz", moves: 40, acpl: 50 };

describe("offsetFromResiduals", () => {
  it("needs enough games", () => {
    expect(offsetFromResiduals(Array(MIN_GAMES - 1).fill(-300))).toBeNull();
  });
  it("uses the median, rounded to 25", () => {
    const r = [...Array(MIN_GAMES).fill(-310), 5000];
    expect(offsetFromResiduals(r)).toEqual({ offset: -300, n: MIN_GAMES + 1 });
  });
  it("clamps extreme offsets", () => {
    expect(offsetFromResiduals(Array(MIN_GAMES).fill(-2000))?.offset).toBe(-MAX_OFFSET);
  });
});

describe("applyRatingOffset", () => {
  it("shifts the whole range", () => {
    expect(applyRatingOffset(range, -300)).toMatchObject({ mid: 900, low: 500, high: 1300 });
  });
  it("floors at 100 and leaves other kinds alone", () => {
    expect(applyRatingOffset(range, -1200)).toMatchObject({ low: 100 });
    const u: PerformanceEstimate = { kind: "uninformative", basis: "bullet", moves: 30, acpl: 60 };
    expect(applyRatingOffset(u, -300)).toBe(u);
    expect(applyRatingOffset(null, -300)).toBeNull();
  });
});
