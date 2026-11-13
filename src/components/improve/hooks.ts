import { useEffect, useMemo, useState } from "react";
import { gameStore, onGamesChanged, type GameRecord } from "../../services/gameStore";
import { syncService, type SyncStatus } from "../../services/syncService";
import { computeInsights, type Insights } from "../../services/insights";

export function useGames(): { games: GameRecord[]; loading: boolean } {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = () =>
      gameStore
        .all()
        .then((g) => alive && setGames(g))
        .catch((e) => console.warn("Could not read local games:", e))
        .finally(() => alive && setLoading(false));
    load();
    const off = onGamesChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return { games, loading };
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => syncService.getStatus());
  useEffect(() => syncService.subscribe(setStatus), []);
  return status;
}

export function useInsights(games: GameRecord[]): Insights {
  return useMemo(() => computeInsights(games), [games]);
}

export const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtPct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x)}%`);
export const fmtPawns = (cp: number | null | undefined) => (cp == null ? "—" : `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`);
