export type GameMode = "vs-computer" | "pass-play" | "analysis" | "training" | "puzzles" | "openings";

export type BoardTheme = "emerald" | "wood" | "slate" | "cyberpunk";

export type PieceTheme = "neo" | "classic" | "alpha";

export type MoveGrade = 
  | "brilliant"   // Exceptional tactical sacrifice
  | "great"       // High-impact positional or initiative move
  | "best"        // Engine primary recommendation
  | "good"        // Principled, balanced move
  | "inaccuracy"  // Minor positional concession
  | "mistake"     // Measurable tactical or structural error
  | "blunder"     // Critical evaluation loss
  | "missed_win"; // Overlooked decisive continuation

export interface TimeControl {
  id: string;
  name: string;
  minutes: number;
  increment: number;
  category: "bullet" | "blitz" | "rapid" | "classical" | "unlimited";
}

export interface BotProfile {
  id: string;
  name: string;
  level: string;
  rating: number;
  description: string;
  depth: number;
  randomness: number;
}

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: "w" | "b";
  fen: string;
  captured?: string;
  eval?: number;
  grade?: MoveGrade;
  clockRemaining?: number;
}

export interface EngineCandidateLine {
  rank: number; // 1, 2, 3
  san: string;
  uci?: string;
  score: number; // Centipawns (+ for White, - for Black)
  isMate?: boolean;
  mateIn?: number;
  pv: string[]; // Continuation moves (e.g. ["d5", "exd5", "exd5"])
}

export interface AnalyzedMove {
  ply: number;
  moveNumber: number;
  san: string;
  from: string;
  to: string;
  color: "w" | "b";
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  grade: MoveGrade;
  bestMoveSan: string;
  explanation: string;
  topLines?: EngineCandidateLine[];
}

export interface GameAnalysisReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  totalMoves: number;
  moves: AnalyzedMove[];
  gradeCounts: {
    w: Record<MoveGrade, number>;
    b: Record<MoveGrade, number>;
  };
  coachOverview: string;
  blunderPuzzles: AnalyzedMove[];
}

export interface TacticalPuzzle {
  id: string;
  title: string;
  rating: number;
  theme: string;
  fen: string;
  moves: string[];
  turn: "w" | "b";
  description: string;
  coachTip: string;
}

export interface OpeningMoveStats {
  san: string;
  games: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
}

export interface OpeningData {
  eco: string;
  name: string;
  moves: string;
  description: string;
  stats?: {
    games: number;
    whiteWinPct: number;
    drawPct: number;
    blackWinPct: number;
  };
  continuations: OpeningMoveStats[];
}

export interface CompetencyScore {
  name: string;
  score: number; // 0 to 100
  rating: number; // Estimated Elo for this competency
  level: "Grandmaster" | "Master" | "Expert" | "Class A" | "Class B" | "Class C" | "Novice";
  summary: string;
  tendency: string; // Specific identified tendency
}

export interface PlayerDrill {
  id: string;
  title: string;
  category: "personal-blunder" | "tactics" | "opening" | "endgame" | "defense";
  sourceDescription: string;
  fen: string;
  turn: "w" | "b";
  solutionMoves: string[]; // Winning move or sequence in SAN (e.g. ["Nxf7+", "Kg8", "Qe8#"])
  badMovePlayed?: string; // e.g. "Qe4??"
  playerColor: "w" | "b";
  difficulty: "Fundamental" | "Intermediate" | "Advanced" | "Master";
  objective: string;
  coachExplanation: string;
  hint: string;
  solved: boolean;
}

export interface DailyTrainingPlanItem {
  dayNumber: number;
  dayName: string;
  focusTitle: string;
  description: string;
  targetDrillCount: number;
  drillsCompleted: number;
  recommendedStudy: string;
  completed: boolean;
}

export interface DiagnosedGameSummary {
  id: string;
  title: string;
  platform: "local" | "chess.com" | "lichess";
  date: string;
  result: string;
  userResultOutcome?: "win" | "loss" | "draw";
  accuracy: number;
  opponent: string;
  opponentRating?: number;
  playerColor: "w" | "b";
  blundersCount: number;
  missedWinsCount: number;
  openingEco?: string;
  openingName?: string;
  pgn: string;
}

export interface PerformancePlan {
  id: string;
  playerId: string;
  playerName: string;
  profileUsername?: string;
  profilePlatform?: "local" | "chess.com" | "lichess";
  evaluatedAt: string;
  totalGamesAnalyzed: number;
  overallRating: number;
  overallAccuracyAvg: number;
  winLossRecord?: {
    wins: number;
    losses: number;
    draws: number;
  };
  competencies: {
    opening: CompetencyScore;
    tactics: CompetencyScore;
    pieceActivity: CompetencyScore;
    pawnStructure: CompetencyScore;
    endgame: CompetencyScore;
  };
  strengths: string[];
  weaknesses: string[];
  coachPrescription: string;
  weeklyPlan: DailyTrainingPlanItem[];
  drills: PlayerDrill[];
  gamesHistory: DiagnosedGameSummary[];
}

