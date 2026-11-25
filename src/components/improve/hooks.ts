import { useEffect, useMemo, useState } from "react";
import { gameStore, onGamesChanged, type GameRecord } from "../../services/gameStore";
import { syncService, type SyncStatus } from "../../services/syncService";
import { computeInsights, type Insights } from "../../services/insights";

/** Above this many changed games, re-reading everything is cheaper than fetching each one. */
const MAX_PATCH = 20;

/**
 * Apply updated records to a newest-first game list. `records[i]` is the current
 * record for `ids[i]` (undefined = deleted). Games that didn't change keep their
 * object identity, so memoized work downstream (insights) isn't redone for them.
 */
export function applyGameChanges(prev: GameRecord[], ids: string[], records: (GameRecord | undefined)[]): GameRecord[] {
  const byId = new Map(prev.map((g) => [g.id, g]));
  ids.forEach((id, i) => {
    const rec = records[i];
    if (rec) byId.set(id, rec);
    else byId.delete(id);
  });
  return [...byId.values()].sort((a, b) => b.endTime - a.endTime);
}

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
    const off = onGamesChanged((change) => {
      if ("all" in change || change.ids.length > MAX_PATCH) return void load();
      // One game was saved (e.g. analysis finished): read just that record, not the whole archive.
      Promise.all(change.ids.map((id) => gameStore.get(id)))
        .then((records) => alive && setGames((prev) => applyGameChanges(prev, change.ids, records)))
        .catch(load);
    });
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
