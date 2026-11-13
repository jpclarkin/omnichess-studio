import type { BotProfile, TimeControl } from "../types/chess";

/**
 * All bots are Stockfish with its built-in strength limiter.
 * - Levels with `elo` use UCI_Elo (min 1320). Stockfish calibrates this against
 *   other engines, not humans, so it is NOT the same scale as Chess.com or
 *   Lichess ratings; treat it as a relative difficulty ladder.
 * - Levels below that use Skill Level, which has no published Elo.
 */
export const BOT_PROFILES: BotProfile[] = [
  {
    id: "sf-skill-0",
    name: "Stockfish — Starter",
    level: "Level 1",
    strengthLabel: "Skill Level 0",
    description: "Weakest Stockfish setting. Makes frequent mistakes; good for practicing basic tactics and checkmates.",
    engine: { skill: 0, movetime: 150 },
  },
  {
    id: "sf-skill-4",
    name: "Stockfish — Casual",
    level: "Level 2",
    strengthLabel: "Skill Level 4",
    description: "Plays reasonable moves but regularly misses tactics.",
    engine: { skill: 4, movetime: 200 },
  },
  {
    id: "sf-elo-1400",
    name: "Stockfish — Club",
    level: "Level 3",
    strengthLabel: "Engine Elo 1400",
    description: "Stockfish limited with UCI_Elo 1400 (engine scale).",
    engine: { elo: 1400, movetime: 400 },
  },
  {
    id: "sf-elo-1700",
    name: "Stockfish — Strong Club",
    level: "Level 4",
    strengthLabel: "Engine Elo 1700",
    description: "Stockfish limited with UCI_Elo 1700 (engine scale).",
    engine: { elo: 1700, movetime: 500 },
  },
  {
    id: "sf-elo-2000",
    name: "Stockfish — Expert",
    level: "Level 5",
    strengthLabel: "Engine Elo 2000",
    description: "Stockfish limited with UCI_Elo 2000 (engine scale).",
    engine: { elo: 2000, movetime: 600 },
  },
  {
    id: "sf-elo-2400",
    name: "Stockfish — Master",
    level: "Level 6",
    strengthLabel: "Engine Elo 2400",
    description: "Stockfish limited with UCI_Elo 2400 (engine scale).",
    engine: { elo: 2400, movetime: 800 },
  },
  {
    id: "sf-full",
    name: "Stockfish — Full Strength",
    level: "Level 7",
    strengthLabel: "Unlimited",
    description: "No strength limit (1 second per move). Far stronger than any human.",
    engine: { movetime: 1000 },
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
