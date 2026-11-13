import { useState } from "react";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import type { GameRecord } from "../../services/gameStore";
import { syncService } from "../../services/syncService";
import { fmtDate } from "./hooks";

const PAGE = 25;

export function GamesTab({ games, onOpenGame }: { games: GameRecord[]; onOpenGame: (id: string) => void }) {
  const [shown, setShown] = useState(PAGE);
  if (!games.length) {
    return <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-6 text-sm text-slate-300">No games yet. Add an account above and press Sync now.</div>;
  }
  return (
    <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="text-left font-normal pb-2">Date</th><th className="text-left font-normal">Opponent</th>
            <th className="text-left font-normal">Result</th><th className="text-left font-normal">Type</th>
            <th className="text-left font-normal">Opening</th><th className="text-right font-normal">Accuracy</th>
            <th className="text-right font-normal">Blunders</th><th />
          </tr>
        </thead>
        <tbody className="text-slate-200">
          {games.slice(0, shown).map((g) => {
            const opp = g.playerColor === "w" ? g.black : g.white;
            const a = g.analysis;
            const acc = a ? (g.playerColor === "w" ? a.whiteAccuracy : a.blackAccuracy) : null;
            const bl = a ? a.gradeCounts[g.playerColor].blunder + a.gradeCounts[g.playerColor].missed_win : null;
            return (
              <tr key={g.id} className="border-t border-[#232733]">
                <td className="py-1.5 whitespace-nowrap">{fmtDate(g.endTime)}</td>
                <td className="whitespace-nowrap">
                  {g.playerColor === "w" ? "⚪" : "⚫"} {opp.name} {opp.rating ? <span className="text-slate-500">({opp.rating})</span> : null}
                </td>
                <td className={g.outcome === "win" ? "text-emerald-400" : g.outcome === "loss" ? "text-rose-400" : "text-slate-300"}>
                  {g.outcome} <span className="text-slate-500">({g.termination})</span>
                </td>
                <td className="text-slate-400">{g.platform === "chess.com" ? "Chess.com" : g.platform === "lichess" ? "Lichess" : "Local"} {g.timeClass}</td>
                <td className="max-w-[220px] truncate text-slate-400">{g.openingName ?? g.eco ?? "—"}</td>
                <td className="text-right font-mono">{acc != null ? `${acc}%` : "—"}</td>
                <td className="text-right font-mono">{bl ?? "—"}</td>
                <td className="text-right whitespace-nowrap pl-3">
                  {a ? (
                    <button onClick={() => onOpenGame(g.id)} className="text-emerald-300 hover:text-emerald-200 cursor-pointer">Review</button>
                  ) : g.analysisError ? (
                    <button onClick={() => void syncService.reanalyze(g.id)} title={g.analysisError} className="text-amber-300 cursor-pointer inline-flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  ) : (
                    <span className="text-slate-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> queued</span>
                  )}
                  {g.url && (
                    <a href={g.url} target="_blank" rel="noreferrer" className="ml-2 text-slate-500 hover:text-slate-300 inline-flex" title="Open on site">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {shown < games.length && (
        <button onClick={() => setShown((n) => n + PAGE)} className="mt-3 text-xs text-sky-300 cursor-pointer">Show more ({games.length - shown} more)</button>
      )}
    </div>
  );
}
