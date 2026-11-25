import { useState } from "react";
import { RefreshCw, Settings2, Loader2, AlertTriangle, CheckCircle2, Pause, Play } from "lucide-react";
import { syncService } from "../../services/syncService";
import { useSyncStatus } from "./hooks";

function timeAgo(t: number | null): string {
  if (!t) return "never";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export function SyncPanel({
  gameCount,
  analyzedCount,
  pendingCount,
}: {
  gameCount: number;
  /** Stored games that already have a Stockfish analysis. */
  analyzedCount: number;
  /** Stored games still waiting for analysis (excluding ones that failed). */
  pendingCount: number;
}) {
  const status = useSyncStatus();
  const [editing, setEditing] = useState(!syncService.hasAccounts());
  const [form, setForm] = useState(() => syncService.getSettings());

  const busy = status.phase === "fetching" || status.phase === "analyzing";
  const analyzing = status.phase === "analyzing";
  const paused = syncService.getSettings().analysisPaused;
  const smallBtn =
    "px-2.5 py-1 bg-[#212634] hover:bg-[#2b3245] text-slate-200 text-[11px] font-semibold rounded-lg border border-[#30384c] flex items-center gap-1.5 cursor-pointer";

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    // Not `...form`: it holds a stale copy of the pause flag.
    syncService.saveSettings({
      initialGames: form.initialGames,
      analysisDepth: form.analysisDepth,
      autoSync: form.autoSync,
      autoAnalyzeLimit: form.autoAnalyzeLimit,
      chesscomUsername: form.chesscomUsername.trim(),
      lichessUsername: form.lichessUsername.trim(),
      lichessToken: form.lichessToken.trim(),
    });
    setEditing(false);
    void syncService.syncNow();
  };

  const s = syncService.getSettings();
  const input = "w-full bg-[#0f1118] border border-[#2b3142] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500";

  return (
    <div className="bg-[#151822] border border-[#2b3142] rounded-2xl p-4 md:p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base">My Improvement</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {syncService.hasAccounts() ? (
              <>
                Syncing{" "}
                {[s.chesscomUsername && `Chess.com: ${s.chesscomUsername}`, s.lichessUsername && `Lichess: ${s.lichessUsername}`]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                · {gameCount} games stored · last checked {timeAgo(status.lastSyncAt)}
              </>
            ) : (
              "Add your Chess.com and/or Lichess username to pull in your games automatically."
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="px-3 py-1.5 bg-[#212634] hover:bg-[#2b3245] text-slate-200 text-xs font-semibold rounded-lg border border-[#30384c] flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" /> Accounts
          </button>
          <button
            disabled={busy || !syncService.hasAccounts()}
            onClick={() => void syncService.syncNow()}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg border border-emerald-500/50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Sync now
          </button>
        </div>
      </div>

      {(busy || status.message) && (
        <div className="mt-3 text-xs flex items-center gap-2">
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          ) : status.phase === "error" ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className={status.phase === "error" ? "text-amber-300" : "text-slate-300"}>
            {analyzing
              ? `Analyzing game ${Math.min(status.analyzeDone + 1, status.analyzeTotal)} of ${status.analyzeTotal} queued · ${analyzedCount} of ${gameCount} stored games analyzed`
              : status.message}
          </span>
          {analyzing && (
            <button onClick={() => syncService.pauseAnalysis()} className={`${smallBtn} ml-auto`}>
              <Pause className="w-3 h-3" /> Pause
            </button>
          )}
        </div>
      )}
      {analyzing && status.analyzeTotal > 0 && (
        <div className="mt-2 w-full bg-[#202534] h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(status.analyzeDone / status.analyzeTotal) * 100}%` }} />
        </div>
      )}
      {!analyzing && syncService.hasAccounts() && (paused || pendingCount > 0) && (
        <div className="mt-2 text-xs flex flex-wrap items-center gap-2 text-slate-400">
          <span>
            {paused ? "Analysis is paused. " : ""}
            {pendingCount > 0
              ? `${pendingCount} stored game${pendingCount === 1 ? " isn't" : "s aren't"} analyzed yet (${analyzedCount} of ${gameCount} done).`
              : "Nothing waiting."}
          </span>
          {paused && (
            <button onClick={() => syncService.resumeAnalysis()} className={smallBtn}>
              <Play className="w-3 h-3" /> Resume
            </button>
          )}
          {pendingCount > 0 && (
            <button onClick={() => syncService.analyzeRemaining()} className={smallBtn}>
              Analyze remaining {pendingCount}
            </button>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-[#262c3d] pt-4">
          <label className="text-xs text-slate-400">
            Chess.com username
            <input className={input} value={form.chesscomUsername} onChange={(e) => setForm({ ...form, chesscomUsername: e.target.value })} placeholder="e.g. hikaru" />
          </label>
          <label className="text-xs text-slate-400">
            Lichess username
            <input className={input} value={form.lichessUsername} onChange={(e) => setForm({ ...form, lichessUsername: e.target.value })} placeholder="e.g. DrNykterstein" />
          </label>
          <label className="text-xs text-slate-400">
            Games to import on first sync (per site)
            <input type="number" min={10} max={300} className={input} value={form.initialGames} onChange={(e) => setForm({ ...form, initialGames: Number(e.target.value) || 60 })} />
          </label>
          <label className="text-xs text-slate-400">
            Analysis depth (higher = slower, more accurate)
            <select className={input} value={form.analysisDepth} onChange={(e) => setForm({ ...form, analysisDepth: Number(e.target.value) })}>
              <option value={10}>10 — fast</option>
              <option value={12}>12 — recommended</option>
              <option value={14}>14 — thorough</option>
              <option value={16}>16 — slow</option>
            </select>
          </label>
          <label className="text-xs text-slate-400 md:col-span-2">
            Lichess API token (optional — needed for the Lichess opening explorer)
            <input type="password" className={input} value={form.lichessToken} onChange={(e) => setForm({ ...form, lichessToken: e.target.value })} placeholder="lip_…" />
            <span className="block mt-1 text-[11px] text-slate-500">
              Create one with no scopes at lichess.org/account/oauth/token. It's stored only in this browser.
            </span>
          </label>
          <label className="text-xs text-slate-400 md:col-span-2">
            Analyze automatically: newest N games (0 = only when I ask)
            <input type="number" min={0} max={2000} className={input} value={form.autoAnalyzeLimit} onChange={(e) => setForm({ ...form, autoAnalyzeLimit: Math.max(0, Number(e.target.value) || 0) })} />
            <span className="block mt-1 text-[11px] text-slate-500">
              Older games stay unanalyzed until you press “Analyze remaining”. Insights use whatever is analyzed so far.
            </span>
          </label>
          <label className="text-xs text-slate-300 flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.autoSync} onChange={(e) => setForm({ ...form, autoSync: e.target.checked })} />
            Check for new games automatically when I open the app
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-300 cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg cursor-pointer">
              Save &amp; sync
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
