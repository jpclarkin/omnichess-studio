import { describe, expect, it } from "vitest";
import model from "../engine/performanceModel.json";
import { lookupRange, performanceFromTuples, performanceFeatures, moveTuple, type MoveTuple } from "../engine/performanceModel";

// [cp loss, mover eval before, grade code, win-drop in 0.1%, accuracy]
const clean: MoveTuple = [3, 20, 2, 2, 99];
const slip: MoveTuple = [180, 10, 5, 110, 40];
const game = (n: number, errEvery: number): MoveTuple[] => Array.from({ length: n }, (_, i) => (i % errEvery === 0 ? slip : clean));

describe("calibration tables", () => {
  const classes = model.classes as Record<string, { table: { est: number; lo: number; mid: number; hi: number }[]; informative: boolean }>;
  it("are ordered and internally consistent", () => {
    for (const [name, c] of Object.entries(classes)) {
      expect(c.table.length, name).toBeGreaterThanOrEqual(4);
      c.table.forEach((row, i) => {
        expect(row.lo, name).toBeLessThanOrEqual(row.mid);
        expect(row.mid, name).toBeLessThanOrEqual(row.hi);
        if (i) expect(row.est, name).toBeGreaterThan(c.table[i - 1].est);
      });
    }
  });
  it("says bullet is uninformative and blitz/rapid are not", () => {
    expect(classes.Bullet.informative).toBe(false);
    expect(classes.Blitz.informative).toBe(true);
    expect(classes.Rapid.informative).toBe(true);
  });
});

describe("lookupRange", () => {
  const table = [{ est: 1000, lo: 700, mid: 900, hi: 1300 }, { est: 2000, lo: 1500, mid: 2000, hi: 2600 }];
  it("interpolates and clamps", () => {
    expect(lookupRange(table, 1500)).toEqual({ lo: 1100, mid: 1450, hi: 1950 });
    expect(lookupRange(table, 100)).toEqual(table[0]);
    expect(lookupRange(table, 9999)).toEqual(table[1]);
  });
});

describe("performanceFromTuples", () => {
  it("needs a minimum number of moves", () => {
    expect(performanceFromTuples(game(5, 99), 95, "rapid")).toBeNull();
  });
  it("gives a higher range to cleaner play (rapid) and widens nothing weird", () => {
    const good = performanceFromTuples(game(40, 20), 97, "rapid");
    const bad = performanceFromTuples(game(40, 2), 70, "rapid");
    if (good?.kind !== "range" || bad?.kind !== "range") throw new Error("expected ranges");
    expect(good.mid).toBeGreaterThan(bad.mid);
    expect(good.low).toBeLessThanOrEqual(good.mid);
    expect(good.high).toBeGreaterThanOrEqual(good.mid);
  });
  it("gives no estimate for bullet", () => {
    expect(performanceFromTuples(game(40, 3), 80, "bullet")?.kind).toBe("uninformative");
    expect(performanceFromTuples(game(40, 3), 80, "Bullet")?.kind).toBe("uninformative");
  });
  it("falls back to the pooled model for an unknown time control", () => {
    const r = performanceFromTuples(game(40, 5), 90, undefined);
    expect(r?.basis).toBe("all");
    expect(performanceFromTuples(game(40, 5), 90, "correspondence")?.basis).toBe("all");
  });
});

describe("moveTuple", () => {
  it("measures loss from the mover's side, with mates clamped", () => {
    const m = { color: "b", grade: "blunder", evalBefore: -50, evalAfter: 300, winDrop: 0.2, accuracy: 20 } as const;
    expect(moveTuple(m, "b")).toEqual([350, 50, 6, 200, 20]);
    const mate = { color: "w", grade: "blunder", evalBefore: 0, evalAfter: -9990, scoreBefore: { cp: 0, mate: null }, scoreAfter: { cp: 0, mate: -2 } } as const;
    expect(moveTuple(mate as never, "w")[0]).toBe(1000);
  });
  it("feature extraction matches the calibration script on a known case", () => {
    const f = performanceFeatures([[0, 0, 2, 0, 100], [100, 600, 5, 100, 50]], 75);
    expect(f.errors).toBeCloseTo(0.5);
    expect(f.decided).toBeCloseTo(0.5);
    expect(f.logAcpl300).toBeCloseTo(Math.log(50 + 10));
  });
});
