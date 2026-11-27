import { useState } from "react";
import { BookOpen, Target, Puzzle, Search, Swords, ExternalLink, CheckSquare, Square, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { LESSONS } from "../../data/lessons";
import type { FocusArea, PlanTask, WeeklyPlan, FocusId } from "../../services/coachPlan";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ICONS: Record<PlanTask["kind"], typeof BookOpen> = {
  lesson: BookOpen, drills: Target, puzzles: Puzzle, review: Search, opening: Search, play: Swords,
};

interface Props {
  plan: WeeklyPlan;
  drillProgressFor: (focusId: FocusId) => number;
  onToggle: (taskId: string) => void;
  onRebuild: () => void;
  onStartDrills: (focusId: FocusId) => void;
  onOpenGame: (gameId: string) => void;
}

export function LessonCard({ lessonId, defaultOpen = false }: { lessonId: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const l = LESSONS[lessonId];
  if (!l) return null;
  return (
    <div className="bg-[#11131a] border border-[#232733] rounded-xl">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" /> Lesson: {l.title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-300 space-y-3">
          <p className="text-slate-400">{l.summary}</p>
          {l.sections.map((s) => (
            <div key={s.heading}>
              <h4 className="text-white font-semibold text-xs uppercase tracking-wide mb-1">{s.heading}</h4>
              {s.body.map((p, i) => (
                <p key={i} className="mb-1.5 leading-relaxed">{p}</p>
              ))}
            </div>
          ))}
          <div className="bg-[#161a24] rounded-lg p-3">
            <h4 className="text-emerald-300 font-semibold text-xs uppercase tracking-wide mb-1">Before every move</h4>
            <ul className="list-disc pl-5 space-y-0.5">
              {l.checklist.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...l.puzzleThemes, ...l.further].map((r) => (
              <a key={r.url + r.label} href={r.url} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-md bg-[#212634] border border-[#30384c] text-sky-300 hover:text-sky-200 flex items-center gap-1">
                {r.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FocusCard({ f, rank }: { f: FocusArea; rank: number }) {
  return (
    <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4 flex flex-col gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">Priority {rank}</div>
        <h3 className="text-white font-bold mt-0.5">{f.title}</h3>
        <p className="text-xs text-slate-400 mt-1">{f.evidence}</p>
      </div>
      <LessonCard lessonId={f.lessonId} defaultOpen />
    </div>
  );
}

export function PlanTab({ plan, drillProgressFor, onToggle, onRebuild, onStartDrills, onOpenGame }: Props) {
  const doneCount = plan.tasks.filter((t) => plan.done[t.id]).length;

  if (!plan.focus.length) {
    return (
      <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-6 text-sm text-slate-300">
        Not enough analyzed games yet to build a plan. Once a few games are synced and analyzed, this page will show the
        two or three things costing you the most games, a lesson for each, and a week of exercises.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {plan.focus.map((f, i) => (
          <FocusCard key={f.id} f={f} rank={i + 1} />
        ))}
      </div>

      <div className="bg-[#151822] border border-[#2b3142] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-bold">This week ({plan.weekKey})</h3>
            <p className="text-xs text-slate-400">
              {doneCount} of {plan.tasks.length} done. The plan rebuilds each Monday from your latest games.
            </p>
          </div>
          <button onClick={onRebuild} className="px-3 py-1.5 bg-[#212634] text-slate-200 text-xs rounded-lg border border-[#30384c] flex items-center gap-1.5 cursor-pointer" title="Rebuild from the latest games (keeps finished tasks)">
            <RotateCcw className="w-3.5 h-3.5" /> Rebuild
          </button>
        </div>
        <ul className="divide-y divide-[#232733]">
          {plan.tasks.map((t) => {
            const Icon = ICONS[t.kind];
            const done = !!plan.done[t.id];
            const drillCount = t.kind === "drills" ? drillProgressFor(t.focusId) : null;
            return (
              <li key={t.id} className="py-2.5 flex items-start gap-3">
                <button onClick={() => onToggle(t.id)} className="mt-0.5 cursor-pointer" aria-label={done ? "Mark not done" : "Mark done"}>
                  {done ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                </button>
                <span className="text-[11px] font-mono text-slate-500 w-8 mt-0.5">{DAYS[t.day]}</span>
                <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${done ? "text-slate-500 line-through" : "text-white"}`}>{t.title}</div>
                  <div className="text-xs text-slate-400">{t.detail}</div>
                  {drillCount !== null && t.target && (
                    <div className="text-[11px] text-emerald-300 mt-0.5">
                      {Math.min(drillCount, t.target)} / {t.target} solved this week
                    </div>
                  )}
                </div>
                {t.kind === "drills" && (
                  <button onClick={() => onStartDrills(t.focusId)} className="text-xs px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer">Start</button>
                )}
                {t.url && (
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-md bg-[#212634] border border-[#30384c] text-sky-300 flex items-center gap-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {t.gameId && (
                  <button onClick={() => onOpenGame(t.gameId!)} className="text-xs px-2.5 py-1 rounded-md bg-[#212634] border border-[#30384c] text-slate-200 cursor-pointer">Open game</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
