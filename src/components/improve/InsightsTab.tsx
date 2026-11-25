import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MISTAKE_LABELS, type Insights, type MistakeType, type RatingSeries } from "../../services/insights";
import { fmtPawns, fmtPct } from "./hooks";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#11131a] border border-[#232733] rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-bold text-white mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Delta({ now, before, better }: { now: number | null; before: number | null; better: "up" | "down" }) {
  if (now == null || before == null) return <Minus className="w-3.5 h-3.5 text-slate-500 inline" />;
  const d = now - before;
  if (Math.abs(d) < 0.05) return <Minus className="w-3.5 h-3.5 text-slate-500 inline" />;
  const good = better === "up" ? d > 0 : d < 0;
  const Icon = d > 0 ? TrendingUp : TrendingDown;
  return <Icon className={`w-3.5 h-3.5 inline ${good ? "text-emerald-400" : "text-rose-400"}`} />;
}

function Sparkline({ s }: { s: RatingSeries }) {
  const pts = s.points.slice(-60);
  const min = Math.min(...pts.map((p) => p.rating));
  const max = Math.max(...pts.map((p) => p.rating));
  const span = Math.max(1, max - min);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${(i / Math.max(1, pts.length - 1)) * 160},${36 - ((p.rating - min) / span) * 32}`).join(" ");
  return (
    <svg viewBox="0 0 160 40" className="w-40 h-10" aria-label={`Rating history from ${min} to ${max}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
    </svg>
  );
}

export function InsightsTab({ ins, onOpenGame }: { ins: Insights; onOpenGame: (id: string) => void }) {
  if (!ins.windowGames) {
    return <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-6 text-sm text-slate-300">No analyzed games yet.</div>;
  }
  const maxMistakes = Math.max(1, ...Object.values(ins.mistakeCounts));
  const types = (Object.keys(MISTAKE_LABELS) as MistakeType[]).filter((t) => ins.mistakeCounts[t] > 0).sort((a, b) => ins.mistakeCounts[b] - ins.mistakeCounts[a]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-slate-500">Based on your last {ins.windowGames} analyzed games ({ins.analyzedGames} analyzed of {ins.gamesTotal} stored).</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Record" value={`${ins.record.win}–${ins.record.loss}–${ins.record.draw}`} sub="W–L–D" />
        <Stat label="Avg accuracy" value={fmtPct(ins.avgAccuracy)} sub="Lichess formula" />
        <Stat label="Mistakes / game" value={(ins.totalMistakes / ins.windowGames).toFixed(1)} sub="mistakes + blunders" />
        <Stat
          label="Converted wins"
          value={ins.conversion.winningGames ? `${ins.conversion.converted}/${ins.conversion.winningGames}` : "—"}
          sub="games where you reached +3"
        />
      </div>

      {ins.ratings.length > 0 && (
        <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-3">Ratings (from Chess.com / Lichess)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ins.ratings.map((r) => (
              <div key={r.platform + r.timeClass} className="flex items-center justify-between bg-[#11131a] border border-[#232733] rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs text-slate-400">{r.platform === "chess.com" ? "Chess.com" : "Lichess"} · {r.timeClass}</div>
                  <div className="text-lg font-bold text-white">
                    {r.latest}{" "}
                    {r.change30d !== null && (
                      <span className={`text-xs ${r.change30d >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {r.change30d >= 0 ? "+" : ""}{r.change30d} (30d)
                      </span>
                    )}
                  </div>
                </div>
                <Sparkline s={r} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-1">Where your mistakes come from</h3>
          <p className="text-xs text-slate-500 mb-3">
            {ins.timeTroubleMistakes} of {ins.totalMistakes} happened in time trouble.
          </p>
          <div className="space-y-2">
            {types.map((t) => (
              <div key={t}>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{MISTAKE_LABELS[t]}</span>
                  <span className="font-mono">{ins.mistakeCounts[t]}</span>
                </div>
                <div className="h-1.5 bg-[#202534] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-500" style={{ width: `${(ins.mistakeCounts[t] / maxMistakes) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-3">By phase of the game</h3>
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr><th className="text-left font-normal pb-1">Phase</th><th className="text-right font-normal">Accuracy</th><th className="text-right font-normal">Mistakes / 100 moves</th></tr>
            </thead>
            <tbody className="text-slate-200">
              {(["opening", "middlegame", "endgame"] as const).map((p) => (
                <tr key={p} className="border-t border-[#232733]">
                  <td className="py-1.5 capitalize">{p}</td>
                  <td className="text-right font-mono">{fmtPct(ins.phase[p].accuracy)}</td>
                  <td className="text-right font-mono">{ins.phase[p].errorsPer100 == null ? "—" : ins.phase[p].errorsPer100!.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="text-white font-bold text-sm mt-5 mb-2">Last 20 games vs the 20 before</h3>
          <div className="text-xs text-slate-300 space-y-1">
            <div>Accuracy: {fmtPct(ins.recent.accuracy)} vs {fmtPct(ins.previous.accuracy)} <Delta now={ins.recent.accuracy} before={ins.previous.accuracy} better="up" /></div>
            <div>
              Blunders per game: {ins.recent.blundersPerGame?.toFixed(1) ?? "—"} vs {ins.previous.blundersPerGame?.toFixed(1) ?? "—"}{" "}
              <Delta now={ins.recent.blundersPerGame} before={ins.previous.blundersPerGame} better="down" />
            </div>
            <div>Score: {fmtPct(ins.recent.score != null ? ins.recent.score * 100 : null)} vs {fmtPct(ins.previous.score != null ? ins.previous.score * 100 : null)} <Delta now={ins.recent.score} before={ins.previous.score} better="up" /></div>
          </div>
        </div>
      </div>

      <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4 overflow-x-auto">
        <h3 className="text-white font-bold text-sm mb-1">Your openings</h3>
        <p className="text-xs text-slate-500 mb-3">"After move 12" is the engine evaluation from your side; negative means you came out of the opening worse.</p>
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left font-normal pb-1">Opening</th><th className="text-left font-normal">As</th>
              <th className="text-right font-normal">Games</th><th className="text-right font-normal">Score</th>
              <th className="text-right font-normal">After move 12</th><th className="text-right font-normal">Accuracy (moves 1–12)</th><th />
            </tr>
          </thead>
          <tbody className="text-slate-200">
            {ins.openings.slice(0, 15).map((o) => (
              <tr key={o.key} className="border-t border-[#232733]">
                <td className="py-1.5">{o.name}</td>
                <td>{o.color === "w" ? "White" : "Black"}</td>
                <td className="text-right font-mono">{o.games}</td>
                <td className="text-right font-mono">{fmtPct(o.score * 100)}</td>
                <td className={`text-right font-mono ${(o.avgEvalAt12 ?? 0) <= -60 ? "text-rose-400" : (o.avgEvalAt12 ?? 0) >= 60 ? "text-emerald-400" : ""}`}>{fmtPawns(o.avgEvalAt12)}</td>
                <td className="text-right font-mono">{fmtPct(o.openingAccuracy)}</td>
                <td className="text-right">
                  <button onClick={() => onOpenGame(o.sampleGameIds[0])} className="text-sky-300 hover:text-sky-200 cursor-pointer">latest game</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
