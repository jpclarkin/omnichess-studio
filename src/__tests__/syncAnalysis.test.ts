import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  return { store: [] as any[], analyzed: [] as string[], onAnalyze: null as null | ((id: string) => void) };
});

vi.mock("../services/gameStore", () => ({
  gameStore: {
    all: async () => [...h.store].sort((a, b) => b.endTime - a.endTime),
    put: async (g: any) => void (h.store[h.store.findIndex((x) => x.id === g.id)] = g),
    putMany: async () => {},
    get: async (id: string) => h.store.find((g) => g.id === id),
  },
  onGamesChanged: () => () => {},
}));
vi.mock("../engine/gameAnalysis", () => ({
  EngineUnavailableError: class extends Error {},
  analyzeGame: async (pgn: string) => {
    h.analyzed.push(pgn);
    h.onAnalyze?.(pgn);
    return { whiteAccuracy: 90 };
  },
}));
vi.mock("../engine/stockfishService", () => ({ EngineCancelled: class extends Error {} }));

import { syncService } from "../services/syncService";

// 80 games, newest first by endTime; game "pgn" doubles as its id for easy assertions.
const reset = () => {
  h.store = Array.from({ length: 80 }, (_, i) => ({ id: `g${i}`, pgn: `g${i}`, endTime: 1000 - i, analysis: null, analysisError: null }));
  h.analyzed = [];
  h.onAnalyze = null;
  syncService.saveSettings({ autoAnalyzeLimit: 50, analysisPaused: false });
};
beforeEach(reset);

describe("background analysis controls", () => {
  it("automatically analyzes only the newest N games", async () => {
    await syncService.analyzePending();
    expect(h.analyzed).toHaveLength(50);
    expect(h.analyzed[0]).toBe("g0");
    expect(h.store.filter((g) => g.analysis)).toHaveLength(50);
    // Already done: a second automatic pass doesn't creep into the older backlog.
    await syncService.analyzePending();
    expect(h.analyzed).toHaveLength(50);
  });

  it("does nothing while paused, and resumes where it left off", async () => {
    syncService.saveSettings({ analysisPaused: true });
    await syncService.analyzePending();
    expect(h.analyzed).toHaveLength(0);
    syncService.saveSettings({ analysisPaused: false });
    await syncService.analyzePending();
    expect(h.analyzed).toHaveLength(50);
  });

  it("pausing mid-run stops after the current game", async () => {
    h.onAnalyze = (id) => id === "g9" && syncService.pauseAnalysis();
    await syncService.analyzePending();
    expect(h.analyzed).toHaveLength(10); // g0..g9, then it stops
    expect(syncService.getSettings().analysisPaused).toBe(true);
  });

  it("'Analyze remaining' also covers games outside the newest N", async () => {
    await syncService.analyzePending();
    syncService.analyzeRemaining();
    await vi.waitFor(() => expect(h.store.filter((g) => g.analysis)).toHaveLength(80));
  });

  it("a limit of 0 means nothing runs automatically", async () => {
    syncService.saveSettings({ autoAnalyzeLimit: 0 });
    await syncService.analyzePending();
    expect(h.analyzed).toHaveLength(0);
  });
});
