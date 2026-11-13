import { useEffect, useMemo, useState } from "react";
import { ListChecks, Target, BarChart3, History } from "lucide-react";
import type { BoardTheme } from "../../types/chess";
import { SyncPanel } from "./SyncPanel";
import { PlanTab } from "./PlanTab";
import { InsightsTab } from "./InsightsTab";
import { GamesTab } from "./GamesTab";
import { DrillTrainer } from "./DrillTrainer";
import { useGames, useInsights } from "./hooks";
import { MISTAKE_LABELS, type MistakeType } from "../../services/insights";
import {
  buildWeeklyPlan, drillsFor, loadDrillProgress, loadPlan, orderDrills, savePlan, solvedThisWeek, weekKey,
  type DrillProgress, type FocusId, type WeeklyPlan,
} from "../../services/coachPlan";

type Tab = "plan" | "drills" | "insights" | "games";
type DrillFilter = { kind: "focus"; id: FocusId } | { kind: "type"; id: MistakeType } | { kind: "all" };

interface Props {
  theme: BoardTheme;
  onOpenGame: (gameId: string, ply?: number) => void;
}

export function ImproveView({ theme, onOpenGame }: Props) {
  const { games, loading } = useGames();
  const ins = useInsights(games);
  const [tab, setTab] = useState<Tab>("plan");
  const [savedPlan, setSavedPlan] = useState<WeeklyPlan | null>(() => loadPlan());
  const [progress, setProgress] = useState<Record<string, DrillProgress>>(() => loadDrillProgress());
  const [filter, setFilter] = useState<DrillFilter>({ kind: "all" });
  const [drillIdx, setDrillIdx] = useState(0);

  // Use the saved plan for this week; otherwise derive one from current insights.
  // Deriving (rather than setting state in an effect) keeps renders single-pass.
  const plan = useMemo<WeeklyPlan>(() => {
    const stale = !savedPlan || savedPlan.weekKey !== weekKey() || (!savedPlan.focus.length && ins.windowGames > 0);
    return stale ? buildWeeklyPlan(ins, savedPlan) : savedPlan;
  }, [savedPlan, ins]);

  // Persist a freshly derived plan (external storage only — no React state update).
  useEffect(() => {
    if (plan !== savedPlan && plan.focus.length) savePlan(plan);
  }, [plan, savedPlan]);

  const updatePlan = (p: WeeklyPlan) => {
    savePlan(p);
    setSavedPlan(p);
  };

  const drills = useMemo(() => {
    let list = ins.mistakes;
    if (filter.kind === "type") list = list.filter((m) => m.type === filter.id);
    if (filter.kind === "focus") {
      const area = plan.focus.find((f) => f.id === filter.id);
      list = area ? drillsFor(area, list) : list;
    }
    return orderDrills(list, progress);
    // progress intentionally excluded: re-ordering mid-session would skip drills.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ins.mistakes, filter, plan.focus]);

  const current = drills.length ? drills[drillIdx % drills.length] : null;

  const drillProgressFor = (focusId: FocusId) => {
    const area = plan.focus.find((f) => f.id === focusId);
    if (!area) return 0;
    return solvedThisWeek(progress, new Set(drillsFor(area, ins.mistakes).map((m) => m.id)), plan.weekKey);
  };

  const tabs: { id: Tab; label: string; icon: typeof ListChecks; badge?: string }[] = [
    { id: "plan", label: "Plan", icon: ListChecks },
    { id: "drills", label: "My mistakes", icon: Target, badge: ins.mistakes.length ? String(ins.mistakes.length) : undefined },
    { id: "insights", label: "Insights", icon: BarChart3 },
    { id: "games", label: "Games", icon: History, badge: games.length ? String(games.length) : undefined },
  ];

  return (
    <div className="flex flex-col gap-5">
      <SyncPanel gameCount={games.length} />

      <div className="flex gap-1 bg-[#11131a] border border-[#232733] rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${tab === t.id ? "bg-[#222736] text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {t.badge && <span className="text-[10px] bg-[#2b3245] px-1.5 rounded">{t.badge}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading your games…</div>
      ) : tab === "plan" ? (
        <PlanTab
          plan={plan}
          drillProgressFor={drillProgressFor}
          onToggle={(id) => updatePlan({ ...plan, done: { ...plan.done, [id]: !plan.done[id] } })}
          onRebuild={() => updatePlan(buildWeeklyPlan(ins, plan))}
          onStartDrills={(id) => {
            setFilter({ kind: "focus", id });
            setDrillIdx(0);
            setTab("drills");
          }}
          onOpenGame={(id) => onOpenGame(id)}
        />
      ) : tab === "drills" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Show:</span>
            <select
              className="bg-[#0f1118] border border-[#2b3142] rounded-lg px-2 py-1.5 text-slate-200"
              value={filter.kind === "all" ? "all" : `${filter.kind}:${filter.id}`}
              onChange={(e) => {
                const v = e.target.value;
                setDrillIdx(0);
                if (v === "all") setFilter({ kind: "all" });
                else {
                  const [kind, id] = v.split(":");
                  setFilter(kind === "focus" ? { kind: "focus", id: id as FocusId } : { kind: "type", id: id as MistakeType });
                }
              }}
            >
              <option value="all">All my mistakes ({ins.mistakes.length})</option>
              {plan.focus.map((f) => (
                <option key={f.id} value={`focus:${f.id}`}>Focus: {f.title}</option>
              ))}
              {(Object.keys(MISTAKE_LABELS) as MistakeType[]).filter((t) => ins.mistakeCounts[t]).map((t) => (
                <option key={t} value={`type:${t}`}>{MISTAKE_LABELS[t]} ({ins.mistakeCounts[t]})</option>
              ))}
            </select>
            <span className="text-slate-500">{drills.length} positions · due and costliest first</span>
          </div>
          {current ? (
            <DrillTrainer
              key={current.id}
              drill={current}
              progress={progress[current.id]}
              theme={theme}
              onNext={() => setDrillIdx((i) => i + 1)}
              onProgress={setProgress}
              onOpenGame={onOpenGame}
            />
          ) : (
            <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-6 text-sm text-slate-300">No positions here yet.</div>
          )}
        </div>
      ) : tab === "insights" ? (
        <InsightsTab ins={ins} onOpenGame={(id) => onOpenGame(id)} />
      ) : (
        <GamesTab games={games} onOpenGame={(id) => onOpenGame(id)} />
      )}
    </div>
  );
}
