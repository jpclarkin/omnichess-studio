import { afterEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { puzzleService } from "../services/puzzleService";

afterEach(() => vi.unstubAllGlobals());

describe("puzzleService.getNextPuzzle", () => {
  it("falls back to the offline bank when Lichess is unreachable, honouring tier and theme", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { puzzle, source } = await puzzleService.getNextPuzzle({ tier: "master", theme: "Fork" });
    expect(source).toBe("offline");
    expect(puzzle.rating).toBeGreaterThanOrEqual(1900);
    expect(puzzle.theme.toLowerCase()).toContain("fork");
    const g = new Chess(puzzle.fen);
    for (const san of puzzle.moves) expect(() => g.move(san)).not.toThrow();
  });

  it("uses a live Lichess puzzle when one is returned", async () => {
    const apiPuzzle = {
      game: { id: "abc", players: [] },
      puzzle: { id: "zzTest", rating: 1500, themes: ["fork"], initialPly: 0, solution: ["e2e4"], fen: new Chess().fen() },
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => apiPuzzle });
    vi.stubGlobal("fetch", fetchMock);
    const { puzzle, source } = await puzzleService.getNextPuzzle({ tier: "intermediate", theme: "Fork" });
    expect(source).toBe("live");
    expect(puzzle.id).toBe("lichess-zzTest");
    expect(puzzle.moves).toEqual(["e4"]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("angle=fork");
    expect(String(fetchMock.mock.calls[0][0])).toContain("difficulty=normal");
  });
});
