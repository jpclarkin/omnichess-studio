import { describe, expect, it } from "vitest";
import { estimatePerformance, gamePhase, gradeMove, materialBalance, moveAccuracy, parseClock, scoreToCp, winProb } from "../engine/grading";

const cp = (n: number) => ({ cp: n, mate: null });

describe("winProb / accuracy", () => {
  it("is 50% at equality and symmetric", () => {
    expect(winProb(0)).toBeCloseTo(0.5);
    expect(winProb(300) + winProb(-300)).toBeCloseTo(1);
  });
  it("gives ~100 accuracy for no loss and low accuracy for a big loss", () => {
    expect(moveAccuracy(0.6, 0.6)).toBeCloseTo(100, 0);
    expect(moveAccuracy(0.9, 0.2)).toBeLessThan(10);
  });
  it("clamps mates to the cp ceiling", () => {
    expect(scoreToCp({ cp: 0, mate: 3 })).toBe(1000);
    expect(scoreToCp({ cp: 0, mate: -2 })).toBe(-1000);
  });
});

describe("gradeMove", () => {
  const base = { playedBest: false, materialBefore: 0 } as const;
  it("flags a large drop as a blunder", () => {
    expect(gradeMove({ ...base, color: "w", before: cp(50), after: cp(-300) }).grade).toBe("blunder");
  });
  it("evaluates from Black's point of view", () => {
    expect(gradeMove({ ...base, color: "b", before: cp(-50), after: cp(300) }).grade).toBe("blunder");
    expect(gradeMove({ ...base, color: "b", before: cp(-50), after: cp(-60) }).grade).toBe("best");
  });
  it("detects a thrown-away win", () => {
    expect(gradeMove({ ...base, color: "w", before: cp(500), after: cp(20) }).grade).toBe("missed_win");
  });
  it("does not call a quiet good move brilliant", () => {
    const r = gradeMove({ ...base, color: "w", playedBest: true, before: cp(30), after: cp(90), materialAfterLine: 0 });
    expect(r.grade).toBe("best");
  });
  it("calls a sound sacrifice brilliant", () => {
    // White gives up 3 points in the engine line but stays better.
    const r = gradeMove({ ...base, color: "w", playedBest: true, before: cp(60), after: cp(70), materialAfterLine: -3 });
    expect(r.grade).toBe("brilliant");
  });
  it("calls an only-move great", () => {
    const r = gradeMove({ ...base, color: "w", playedBest: true, before: cp(40), after: cp(40), secondBest: cp(-250) });
    expect(r.grade).toBe("great");
  });
});

describe("helpers", () => {
  it("counts material", () => {
    expect(materialBalance("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")).toBe(0);
    expect(materialBalance("4k3/8/8/8/8/8/8/3QK3 w - - 0 1")).toBe(9);
  });
  it("detects endgames by piece count", () => {
    expect(gamePhase("4k3/8/8/8/8/8/8/3QK3 w - - 0 1", 40)).toBe("endgame");
    expect(gamePhase("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 1)).toBe("opening");
  });
  it("parses clock comments", () => {
    expect(parseClock("[%clk 0:01:05.5]")).toBeCloseTo(65.5);
    expect(parseClock("no clock")).toBeNull();
  });
});

describe("estimatePerformance", () => {
  const mv = (color: "w" | "b", before: number, after: number) => ({
    color, evalBefore: before, evalAfter: after,
  });
  it("returns null for very short games", () => {
    expect(estimatePerformance([mv("w", 0, 0), mv("w", 0, 0)], "w")).toBeNull();
  });
  it("rates a flawless side high and a sloppy side lower", () => {
    const clean = Array.from({ length: 20 }, () => mv("w", 20, 20));
    const sloppy = Array.from({ length: 20 }, () => mv("w", 20, -80)); // 100cp lost each move
    const a = estimatePerformance(clean, "w")!;
    const b = estimatePerformance(sloppy, "w")!;
    expect(a.rating).toBeGreaterThan(2800);
    expect(b.rating).toBeLessThan(1300);
    expect(b.acpl).toBe(100);
  });
  it("measures loss from Black's point of view and ignores the other side", () => {
    const moves = [...Array.from({ length: 6 }, () => mv("b", -20, 80)), ...Array.from({ length: 6 }, () => mv("w", 0, 0))];
    expect(estimatePerformance(moves, "b")!.acpl).toBe(100);
    expect(estimatePerformance(moves, "w")!.acpl).toBe(0);
  });
});
