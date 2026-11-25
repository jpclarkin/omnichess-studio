import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { TACTICAL_PUZZLES } from "../data/puzzles";
import bank from "../data/puzzleBank.json";
import { THEME_INFO } from "../data/puzzleThemes";

describe("puzzle library", () => {
  it("has unique ids", () => {
    const ids = TACTICAL_PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const p of TACTICAL_PUZZLES) {
    it(`${p.id} (${p.theme}) has a legal solution that starts with the side to move`, () => {
      const g = new Chess(p.fen);
      expect(g.turn()).toBe(p.turn);
      expect(p.moves.length).toBeGreaterThan(0);
      for (const san of p.moves) expect(() => g.move(san)).not.toThrow();
      // Solver moves first and last, so the line has an odd number of plies.
      expect(p.moves.length % 2).toBe(1);
      // A line that claims mate must actually end in checkmate.
      if (p.moves[p.moves.length - 1].endsWith("#")) expect(g.isCheckmate()).toBe(true);
    });
  }
});

describe("offline puzzle bank", () => {
  it("has 2,000 unique puzzles across every theme", () => {
    expect(bank.length).toBe(2000);
    expect(new Set(bank.map((b) => b.i)).size).toBe(bank.length);
    expect(new Set(bank.map((b) => b.t))).toEqual(new Set(Object.keys(THEME_INFO)));
  });

  it("replays every solution legally from its start position", () => {
    for (const b of bank) {
      const g = new Chess(b.f);
      const moves = b.m.split(" ");
      expect(moves.length % 2, b.i).toBe(1);
      for (const u of moves) {
        const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        expect(m, `${b.i} ${u}`).toBeTruthy();
      }
      if (b.t.startsWith("Mate in")) expect(g.isCheckmate(), b.i).toBe(true);
    }
  });
});
