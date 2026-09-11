import type { BotProfile, TimeControl } from "../types/chess";

export const BOT_PROFILES: BotProfile[] = [
  {
    id: "engine-novice",
    name: "Engine — Novice",
    level: "Level 1",
    rating: 800,
    description: "Evaluates 1 ply. Suitable for introductory play and basic tactical drills.",
    depth: 1,
    randomness: 0.35,
  },
  {
    id: "engine-intermediate",
    name: "Engine — Intermediate",
    level: "Level 2",
    rating: 1400,
    description: "Evaluates 2 plies. Demonstrates basic piece activity and fundamental central control.",
    depth: 2,
    randomness: 0.12,
  },
  {
    id: "engine-advanced",
    name: "Engine — Advanced",
    level: "Level 3",
    rating: 2000,
    description: "Evaluates 3 plies with alpha-beta search. Solid positional coordination and tactical precision.",
    depth: 3,
    randomness: 0.02,
  },
  {
    id: "engine-master",
    name: "Engine — Master",
    level: "Level 4",
    rating: 2600,
    description: "Evaluates 4+ plies with quiescence search. Rigorous tactical calculation and endgame conversion.",
    depth: 4,
    randomness: 0,
  },
];

export const TIME_CONTROLS: TimeControl[] = [
  { id: "bullet-1", name: "1 min | Bullet", minutes: 1, increment: 0, category: "bullet" },
  { id: "blitz-3-2", name: "3 + 2 | Blitz", minutes: 3, increment: 2, category: "blitz" },
  { id: "blitz-5", name: "5 min | Blitz", minutes: 5, increment: 0, category: "blitz" },
  { id: "rapid-10", name: "10 min | Rapid", minutes: 10, increment: 0, category: "rapid" },
  { id: "classical-15-10", name: "15 + 10 | Classical", minutes: 15, increment: 10, category: "classical" },
  { id: "unlimited", name: "Untimed", minutes: 0, increment: 0, category: "unlimited" },
];
