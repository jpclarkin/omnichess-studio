import { describe, expect, it } from "vitest";
import { classifyMistake, computeInsights, isTimeTrouble } from "../services/insights";
import { buildWeeklyPlan, rankFocusAreas } from "../services/coachPlan";
import { __test } from "../services/platforms";
import type { AnalyzedMove, GameAnalysisReport } from "../types/chess";
import type { GameRecord } from "../services/gameStore";

function move(p: Partial<AnalyzedMove>): AnalyzedMove {
  return {
    ply: 1, moveNumber: 30, san: "x", from: "a1", to: "a2", color: "w", fenBefore: "", fenAfter: "",
    evalBefore: 0, evalAfter: 0, grade: "blunder", bestMoveSan: "", explanation: "", phase: "middlegame",
    scoreBefore: { cp: 0, mate: null }, scoreAfter: { cp: -500, mate: null }, winDrop: 0.4, accuracy: 10, ...p,
  };
}

describe("classifyMistake", () => {
  it("detects a hung queen", () => {
    const m = move({
      fenBefore: "3rk3/8/8/8/8/8/8/Q3K3 w - - 0 1",
      fenAfter: "3rk3/8/8/8/3Q4/8/8/4K3 b - - 1 1",
      replyLineUci: ["d8d4", "e1e2"],
    });
    expect(classifyMistake(m)).toBe("hung_material");
  });
  it("detects a missed free rook", () => {
    const m = move({
      fenBefore: "4k3/8/8/8/8/8/3r4/3QK3 w - - 0 1",
      fenAfter: "4k3/8/8/8/8/8/3r4/3Q1K2 b - - 1 1",
      bestLineSan: ["Qxd2"],
      replyLineUci: [],
    });
    expect(classifyMistake(m)).toBe("missed_tactic");
  });
  it("detects allowing mate", () => {
    expect(classifyMistake(move({ scoreAfter: { cp: 0, mate: -2 } }))).toBe("allowed_mate");
  });
  it("time trouble threshold", () => {
    expect(isTimeTrouble(20, 600)).toBe(true);
    expect(isTimeTrouble(50, 600)).toBe(true);
    expect(isTimeTrouble(200, 600)).toBe(false);
    expect(isTimeTrouble(null, 600)).toBe(false);
  });
});

function fakeGame(i: number, moves: AnalyzedMove[]): GameRecord {
  const report: GameAnalysisReport = {
    whiteAccuracy: 70, blackAccuracy: 80, totalMoves: moves.length, moves, coachOverview: "", blunderPuzzles: [],
    gradeCounts: {
      w: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: moves.length, missed_win: 0 },
      b: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
    },
  };
  return {
    id: `lichess:${i}`, platform: "lichess", url: "", endTime: 1_700_000_000_000 + i * 1000, timeClass: "blitz",
    initialSeconds: 300, rated: true, white: { name: "me", rating: 1500 + i }, black: { name: "opp", rating: 1500 },
    playerColor: "w", outcome: "loss", termination: "resign", eco: "C50", openingName: "Italian Game: Giuoco Piano",
    pgn: "", analysis: report,
  };
}

describe("insights + plan", () => {
  const hung = move({
    fenBefore: "3rk3/8/8/8/8/8/8/Q3K3 w - - 0 1",
    fenAfter: "3rk3/8/8/8/3Q4/8/8/4K3 b - - 1 1",
    replyLineUci: ["d8d4", "e1e2"],
  });
  const games = Array.from({ length: 6 }, (_, i) => fakeGame(i, [hung]));
  const ins = computeInsights(games);

  it("counts mistakes and records", () => {
    expect(ins.windowGames).toBe(6);
    expect(ins.mistakeCounts.hung_material).toBe(6);
    expect(ins.record.loss).toBe(6);
    expect(ins.ratings[0]?.latest).toBe(1505);
  });
  it("ranks hanging pieces first and builds tasks", () => {
    expect(rankFocusAreas(ins)[0].id).toBe("hung_material");
    const plan = buildWeeklyPlan(ins);
    expect(plan.tasks.some((t) => t.kind === "drills")).toBe(true);
    expect(plan.tasks.some((t) => t.url?.includes("lichess.org/training/hangingPiece"))).toBe(true);
  });
});

describe("platform mapping", () => {
  it("maps a Chess.com game from the player's side", () => {
    const rec = __test.mapChessCom(
      {
        url: "https://www.chess.com/game/live/1", pgn: '[ECO "B01"]\n1. e4 d5', end_time: 1700000000, rated: true,
        time_class: "blitz", time_control: "180+2", rules: "chess", uuid: "u1",
        white: { username: "Other", rating: 1400, result: "resigned" }, black: { username: "Me", rating: 1450, result: "win" },
      },
      "me"
    );
    expect(rec?.playerColor).toBe("b");
    expect(rec?.outcome).toBe("win");
    expect(rec?.initialSeconds).toBe(180);
    expect(rec?.eco).toBe("B01");
  });
  it("skips non-standard Lichess variants", () => {
    const rec = __test.mapLichess(
      { id: "x", rated: true, variant: "chess960", speed: "blitz", createdAt: 0, lastMoveAt: 0, status: "mate", players: { white: {}, black: {} }, pgn: "1. e4" },
      "me"
    );
    expect(rec).toBeNull();
  });
});
