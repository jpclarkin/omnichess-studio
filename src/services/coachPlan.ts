/**
 * Builds a weekly improvement plan from your insights: picks the 2–3 issues
 * costing you the most, explains why (with your numbers), and assigns work:
 * drills from your own mistakes, themed puzzles, lessons and game reviews.
 */
import type { Insights, MistakeExample, MistakeType, OpeningStat } from "./insights";
import { MISTAKE_LABELS } from "./insights";
import { LESSONS } from "../data/lessons";

export type FocusId = "hung_material" | "missed_tactic" | "mates" | "opening" | "endgame" | "positional" | "time_trouble" | "conversion";

export interface FocusArea {
  id: FocusId;
  title: string;
  evidence: string;
  /** Rough cost per game, used for ranking. */
  severity: number;
  lessonId: string;
  /** Which of your mistakes count as drills for this area. */
  drillTypes: MistakeType[];
  timeTroubleOnly?: boolean;
  opening?: OpeningStat;
  gameIds?: string[];
}

export type TaskKind = "lesson" | "drills" | "puzzles" | "review" | "play" | "opening";

export interface PlanTask {
  id: string;
  day: number; // 0 = Monday
  kind: TaskKind;
  focusId: FocusId;
  title: string;
  detail: string;
  url?: string;
  gameId?: string;
  target?: number;
}

export interface WeeklyPlan {
  weekKey: string;
  generatedAt: number;
  focus: FocusArea[];
  tasks: PlanTask[];
  done: Record<string, boolean>;
}

/** ISO-ish week key based on the local Monday. */
export function weekKey(d = new Date()): string {
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${monday.getFullYear()}-${mm}-${dd}`;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const per = (n: number, games: number) => (games ? (n / games).toFixed(1) : "0");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function rankFocusAreas(ins: Insights): FocusArea[] {
  const g = ins.windowGames;
  if (!g) return [];
  const c = ins.mistakeCounts;
  const areas: FocusArea[] = [];

  // With few games, a single occurrence is still worth working on; with more games, require a pattern.
  const add = (a: FocusArea, minCount: number, count: number) => {
    if (count >= (g < 10 ? 1 : minCount)) areas.push(a);
  };

  add(
    {
      id: "hung_material", title: LESSONS.hung_material.title, lessonId: "hung_material", drillTypes: ["hung_material"],
      evidence: `You left material en prise ${plural(c.hung_material, "time")} in your last ${plural(g, "game")} (${per(c.hung_material, g)} per game).`,
      severity: (c.hung_material / g) * 1.0,
    },
    3, c.hung_material
  );
  add(
    {
      id: "missed_tactic", title: LESSONS.missed_tactic.title, lessonId: "missed_tactic", drillTypes: ["missed_tactic"],
      evidence: `A forcing move would have won material ${plural(c.missed_tactic, "time")} and you played something else (${per(c.missed_tactic, g)} per game).`,
      severity: (c.missed_tactic / g) * 0.9,
    },
    3, c.missed_tactic
  );
  const mates = c.missed_mate + c.allowed_mate;
  add(
    {
      id: "mates", title: LESSONS.mates.title, lessonId: "mates", drillTypes: ["missed_mate", "allowed_mate"],
      evidence:
        [c.missed_mate && `You missed ${plural(c.missed_mate, "checkmate")}`, c.allowed_mate && `${c.missed_mate ? "and allowed" : "You allowed"} ${plural(c.allowed_mate, "checkmate")}`]
          .filter(Boolean)
          .join(" ") + ` in your last ${plural(g, "game")}.`,
      severity: (mates / g) * 1.1,
    },
    2, mates
  );

  // Opening: the worst line you play often.
  const weakOpening = ins.openings
    .filter((o) => o.games >= 3 && ((o.avgEvalAt12 ?? 0) <= -60 || o.score < 0.4))
    .sort((a, b) => (a.avgEvalAt12 ?? 0) - (b.avgEvalAt12 ?? 0))[0];
  if (weakOpening) {
    const side = weakOpening.color === "w" ? "White" : "Black";
    areas.push({
      id: "opening", title: `${LESSONS.opening.title}: ${weakOpening.name} (${side})`, lessonId: "opening",
      drillTypes: ["opening"], opening: weakOpening, gameIds: weakOpening.sampleGameIds,
      evidence: `In ${plural(weakOpening.games, "game")} as ${side} in the ${weakOpening.name} you scored ${pct(weakOpening.score)}` +
        (weakOpening.avgEvalAt12 !== null ? ` and averaged ${(weakOpening.avgEvalAt12 / 100).toFixed(1)} pawns after move 12.` : "."),
      severity: (weakOpening.games / g) * (0.5 + Math.max(0, -(weakOpening.avgEvalAt12 ?? 0)) / 200),
    });
  }

  const eg = ins.phase.endgame;
  const mg = ins.phase.middlegame;
  if (eg.moves >= 40 && eg.errorsPer100 !== null && mg.errorsPer100 !== null && eg.errorsPer100 > mg.errorsPer100 * 1.2) {
    areas.push({
      id: "endgame", title: LESSONS.endgame.title, lessonId: "endgame", drillTypes: ["endgame"],
      evidence: `You make ${eg.errorsPer100.toFixed(1)} mistakes per 100 endgame moves vs ${mg.errorsPer100.toFixed(1)} in the middlegame.`,
      severity: (eg.errorsPer100 / 100) * (eg.moves / g) * 0.8,
    });
  }

  if (ins.totalMistakes >= 6 && ins.timeTroubleMistakes / ins.totalMistakes >= 0.25) {
    areas.push({
      id: "time_trouble", title: LESSONS.time_trouble.title, lessonId: "time_trouble",
      drillTypes: Object.keys(MISTAKE_LABELS) as MistakeType[], timeTroubleOnly: true,
      evidence: `${pct(ins.timeTroubleMistakes / ins.totalMistakes)} of your mistakes came with under 30 seconds (or under 10% of your time) left.`,
      severity: (ins.timeTroubleMistakes / g) * 0.9,
    });
  }

  const { winningGames, converted, thrown } = ins.conversion;
  if (thrown.length >= 2 && winningGames > 0 && converted / winningGames < 0.8) {
    areas.push({
      id: "conversion", title: LESSONS.conversion.title, lessonId: "conversion", drillTypes: [], gameIds: thrown.slice(0, 5),
      evidence: `You reached a winning position (+3 or better) in ${plural(winningGames, "game")} but won only ${converted} of them.`,
      severity: (thrown.length / g) * 1.2,
    });
  }

  add(
    {
      id: "positional", title: LESSONS.positional.title, lessonId: "positional", drillTypes: ["positional"],
      evidence: `${c.positional} of your mistakes were non-tactical (${per(c.positional, g)} per game).`,
      severity: (c.positional / g) * 0.5,
    },
    3, c.positional
  );

  return areas.sort((a, b) => b.severity - a.severity);
}

export function drillsFor(area: FocusArea, mistakes: MistakeExample[]): MistakeExample[] {
  return mistakes.filter((m) => area.drillTypes.includes(m.type) && (!area.timeTroubleOnly || m.timeTrouble));
}

/** Create this week's tasks for the top focus areas. Keeps `done` for tasks that still exist. */
export function buildWeeklyPlan(ins: Insights, previous?: WeeklyPlan | null): WeeklyPlan {
  const key = weekKey();
  const focus = rankFocusAreas(ins).slice(0, 3);
  const tasks: PlanTask[] = [];
  let day = 0;
  const next = () => day++ % 7;

  focus.forEach((f, idx) => {
    const lesson = LESSONS[f.lessonId];
    const drills = drillsFor(f, ins.mistakes);
    const tid = (s: string) => `${key}:${f.id}:${s}`;

    tasks.push({ id: tid("lesson"), day: next(), kind: "lesson", focusId: f.id, title: `Read: ${lesson.title}`, detail: lesson.summary });

    if (drills.length) {
      const target = Math.min(drills.length, idx === 0 ? 10 : 6);
      tasks.push({
        id: tid("drills"), day: next(), kind: "drills", focusId: f.id, target,
        title: `Solve ${plural(target, "position")} from your own games`,
        detail: `Find the move you missed in positions where you made this mistake (${drills.length} available).`,
      });
    }

    const theme = lesson.puzzleThemes[0];
    if (theme) {
      const n = idx === 0 ? 20 : 15;
      tasks.push({ id: tid("puzzles"), day: next(), kind: "puzzles", focusId: f.id, target: n, title: `${n} puzzles — ${theme.label.replace("Lichess puzzles: ", "")}`, detail: "Themed puzzles on Lichess (free, no account needed).", url: theme.url });
    }

    if (f.id === "opening" && f.opening) {
      const g0 = f.opening.sampleGameIds[0];
      tasks.push({
        id: tid("opening"), day: next(), kind: "opening", focusId: f.id, gameId: g0,
        title: `Study your ${f.opening.name} games`,
        detail: "Open a recent game in this line, find where the evaluation first turned against you, and check that position in the opening explorer.",
      });
    }

    const reviewGame = f.gameIds?.[0] ?? drills[0]?.gameId;
    if (reviewGame) {
      tasks.push({
        id: tid("review"), day: next(), kind: "review", focusId: f.id, gameId: reviewGame,
        title: f.id === "conversion" ? "Replay a winning position you didn't convert" : "Review one game where this happened",
        detail: "Go through it move by move before looking at the engine, and write down what you would play differently.",
      });
    }
  });

  if (focus.length) {
    tasks.push({
      id: `${key}:play`, day: 5, kind: "play", focusId: focus[0].id, target: 3,
      title: "Play 3 games at 15+10 or slower",
      detail: `Use the checklist from "${LESSONS[focus[0].lessonId].title}" on every move. They'll sync and count toward next week's stats.`,
    });
  }

  const done: Record<string, boolean> = {};
  if (previous && previous.weekKey === key) {
    for (const t of tasks) if (previous.done[t.id]) done[t.id] = true;
  }
  return { weekKey: key, generatedAt: Date.now(), focus, tasks: tasks.sort((a, b) => a.day - b.day), done };
}

// ------------------------------------------------------------ persistence

const PLAN_KEY = "omnichess_weekly_plan_v1";
const DRILL_KEY = "omnichess_drill_progress_v1";

export function loadPlan(): WeeklyPlan | null {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function savePlan(p: WeeklyPlan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(p));
}

export interface DrillProgress {
  attempts: number;
  solved: number;
  lastAt: number;
  lastCorrect: boolean;
  /** Leitner box 0..4; next review after 1, 2, 4, 8, 16 days. */
  box: number;
  dueAt: number;
}

export function loadDrillProgress(): Record<string, DrillProgress> {
  try {
    return JSON.parse(localStorage.getItem(DRILL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function recordDrillAttempt(id: string, correct: boolean): Record<string, DrillProgress> {
  const all = loadDrillProgress();
  const p = all[id] ?? { attempts: 0, solved: 0, lastAt: 0, lastCorrect: false, box: 0, dueAt: 0 };
  const box = correct ? Math.min(4, p.box + 1) : 0;
  const now = Date.now();
  all[id] = {
    attempts: p.attempts + 1,
    solved: p.solved + (correct ? 1 : 0),
    lastAt: now,
    lastCorrect: correct,
    box,
    dueAt: now + 2 ** box * 86_400_000,
  };
  localStorage.setItem(DRILL_KEY, JSON.stringify(all));
  return all;
}

/** Drills solved correctly since the start of the given week. */
export function solvedThisWeek(progress: Record<string, DrillProgress>, ids: Set<string>, weekStartKey: string): number {
  const start = new Date(weekStartKey + "T00:00:00").getTime();
  return Object.entries(progress).filter(([id, p]) => ids.has(id) && p.lastCorrect && p.lastAt >= start).length;
}

/** Order drills: due/new ones first, then by how costly the mistake was. */
export function orderDrills(drills: MistakeExample[], progress: Record<string, DrillProgress>): MistakeExample[] {
  const now = Date.now();
  return [...drills].sort((a, b) => {
    const pa = progress[a.id];
    const pb = progress[b.id];
    const dueA = !pa || pa.dueAt <= now ? 0 : 1;
    const dueB = !pb || pb.dueAt <= now ? 0 : 1;
    if (dueA !== dueB) return dueA - dueB;
    return b.winDrop - a.winDrop;
  });
}
