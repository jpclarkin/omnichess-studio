import type {
  CompetencyScore,
  DailyTrainingPlanItem,
  DiagnosedGameSummary,
  GameAnalysisReport,
  PerformancePlan,
  PlayerDrill,
} from "../types/chess";

const STORAGE_KEY = "omnichess_performance_plan_v1";

// Baseline curated motif drills mapped to key weaknesses
const CURATED_WEAKNESS_DRILLS: PlayerDrill[] = [
  {
    id: "curated-tactics-1",
    title: "Tactical Vigilance: Defending the Central Knight Fork",
    category: "tactics",
    sourceDescription: "Targeted Curriculum • Tactical Vigilance Deficit",
    fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5",
    turn: "w",
    playerColor: "w",
    solutionMoves: ["Re1"],
    difficulty: "Fundamental",
    objective: "Opponent has captured on e4 hoping for central counterplay. Find the most principled tactical pin to regain control.",
    coachExplanation: "1. Re1 pins the knight against the uncastled black king, forcing Black into a defensive concession and guaranteeing White decisive central activity.",
    hint: "Target the black king's alignment on the open e-file.",
    solved: false,
  },
  {
    id: "curated-tactics-2",
    title: "Back-Rank Deflection Combination",
    category: "tactics",
    sourceDescription: "Targeted Curriculum • Defensive Calculation Deficit",
    fen: "3r2k1/p4ppp/1p6/8/8/1P2Q3/P1q2PPP/4R1K1 w - - 0 24",
    turn: "w",
    playerColor: "w",
    solutionMoves: ["Qe8+", "Rxe8", "Rxe8#"],
    difficulty: "Intermediate",
    objective: "Black's king is restricted to the back rank without luft. Find the forced combination to conclude the game.",
    coachExplanation: "1. Qe8+ deflects the sole defender of Black's 8th rank. After 1... Rxe8 2. Rxe8#, checkmate is delivered immediately.",
    hint: "Identify the overloaded black rook protecting both the rank and the queen.",
    solved: false,
  },
  {
    id: "curated-endgame-1",
    title: "Endgame Technique: Active King in Rook Endgames",
    category: "endgame",
    sourceDescription: "Targeted Curriculum • Endgame Conversion Deficit",
    fen: "8/5pk1/4p3/3pP1p1/3P2P1/1r2PK2/2R5/8 w - - 4 45",
    turn: "w",
    playerColor: "w",
    solutionMoves: ["Rc7"],
    difficulty: "Intermediate",
    objective: "In rook endgames, rook activity on the 7th rank is paramount. Cut off Black's king and tie down defensive resources.",
    coachExplanation: "1. Rc7 seizes the 7th rank, paralyzing Black's f7 pawn and keeping the black king passive. A textbook demonstration of Tarrasch's principle.",
    hint: "Look for the classic seventh-rank infiltration.",
    solved: false,
  },
  {
    id: "curated-opening-1",
    title: "Opening Discipline: Classical Central Pawn Break",
    category: "opening",
    sourceDescription: "Targeted Curriculum • Opening Repertoire Precision",
    fen: "rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 2 5",
    turn: "w",
    playerColor: "w",
    solutionMoves: ["cxd5"],
    difficulty: "Fundamental",
    objective: "Clarify the central tension in the Queen's Gambit Declined without surrendering tempi.",
    coachExplanation: "1. cxd5 exd5 2. Bf4 establishes ideal minority-attack prospects and opens the c-file for White's major pieces.",
    hint: "Resolve the d5 tension before developing the dark-square bishop.",
    solved: false,
  },
  {
    id: "curated-defense-1",
    title: "Piece Harmony: Unpinning and Outpost Establishment",
    category: "defense",
    sourceDescription: "Targeted Curriculum • Positional Coordination Deficit",
    fen: "r1b2rk1/ppqn1ppp/2pbpn2/3p4/2PP4/1PN1PN2/PB2BPPP/R2Q1RK1 w - - 3 10",
    turn: "w",
    playerColor: "w",
    solutionMoves: ["Qc2"],
    difficulty: "Intermediate",
    objective: "Coordinate the queen and rooks while preparing the central e4 break.",
    coachExplanation: "1. Qc2 connects the rooks, defends the c4 pawn, and eyes the critical h7-b1 diagonal, neutralizing Black's counterplay.",
    hint: "Connect the rooks along the back rank.",
    solved: false,
  },
];

// Generate default training plan
function createDefaultPlan(): PerformancePlan {
  const weeklyPlan: DailyTrainingPlanItem[] = [
    {
      dayNumber: 1,
      dayName: "Monday",
      focusTitle: "Tactical Oversight & Fork Defenses",
      description: "Focus on double-attack identification and unpinning tactics before committing pieces forward.",
      targetDrillCount: 3,
      drillsCompleted: 0,
      recommendedStudy: "FIDE Master study: Defending vulnerable squares along half-open diagonals.",
      completed: false,
    },
    {
      dayNumber: 2,
      dayName: "Tuesday",
      focusTitle: "Opening Repertoire Discipline",
      description: "Review first 10 moves of your main opening systems. Eliminate premature pawn deviations.",
      targetDrillCount: 3,
      drillsCompleted: 0,
      recommendedStudy: "ECO Master Database review: Mainline Sicilian and Queen's Gambit structures.",
      completed: false,
    },
    {
      dayNumber: 3,
      dayName: "Wednesday",
      focusTitle: "Piece Activity & Outposts",
      description: "Identify weak central squares (e4/d5/e5/d4) and prevent passive knight placement.",
      targetDrillCount: 2,
      drillsCompleted: 0,
      recommendedStudy: "Nimzowitsch: Central outpost occupation and piece overprotection.",
      completed: false,
    },
    {
      dayNumber: 4,
      dayName: "Thursday",
      focusTitle: "Defensive Vigilance & Luft",
      description: "Always calculate opponent forcing checks. Ensure back-rank escape squares before launching wing assaults.",
      targetDrillCount: 3,
      drillsCompleted: 0,
      recommendedStudy: "Defensive calculation: King safety and prophylactic pawn advances (h3/h6).",
      completed: false,
    },
    {
      dayNumber: 5,
      dayName: "Friday",
      focusTitle: "Endgame Technique & Passed Pawns",
      description: "Convert 2-pawn advantages in simplified rook endings without allowing opposing counterplay.",
      targetDrillCount: 3,
      drillsCompleted: 0,
      recommendedStudy: "Tarrasch Principle: Rooks placed behind passed pawns, both friendly and hostile.",
      completed: false,
    },
    {
      dayNumber: 6,
      dayName: "Saturday",
      focusTitle: "Full Game Review & Blunder Retro",
      description: "Replay all tactical oversights from your recent games using the Stockfish 19 sandbox.",
      targetDrillCount: 4,
      drillsCompleted: 0,
      recommendedStudy: "Annotate your own losses: locate the critical turning-point ply in every game.",
      completed: false,
    },
    {
      dayNumber: 7,
      dayName: "Sunday",
      focusTitle: "Rated Tournament Benchmark",
      description: "Play 2 rated games vs Engine Level 3 (2000 Elo) or online on Chess.com / Lichess and import them for evaluation.",
      targetDrillCount: 2,
      drillsCompleted: 0,
      recommendedStudy: "Rest and consolidation. Review your weekly accuracy trends.",
      completed: false,
    },
  ];

  return {
    id: "plan-default",
    playerId: "player-local",
    playerName: "Player",
    evaluatedAt: new Date().toISOString(),
    totalGamesAnalyzed: 0,
    overallRating: 1540,
    overallAccuracyAvg: 78,
    competencies: {
      opening: {
        name: "Opening Repertoire Discipline",
        score: 79,
        rating: 1580,
        level: "Class B",
        summary: "Sound grasp of fundamental principles. Occasional premature deviation from mainline theory.",
        tendency: "Relinquishes central tension too early on move 6-8.",
      },
      tactics: {
        name: "Tactical Vigilance & Calculation",
        score: 72,
        rating: 1480,
        level: "Class C",
        summary: "Competent at short 1-ply attacks, but vulnerable to multi-ply deflections and back-rank tactical motifs.",
        tendency: "Overlooks intermediate counter-checks and undefended minor pieces.",
      },
      pieceActivity: {
        name: "Piece Coordination & Active Harmony",
        score: 76,
        rating: 1520,
        level: "Class B",
        summary: "Maintains adequate development, but knights occasionally get isolated on board edges without active outposts.",
        tendency: "Tends to crowd major pieces when defending against central advances.",
      },
      pawnStructure: {
        name: "Pawn Structure & Strategic Integrity",
        score: 82,
        rating: 1640,
        level: "Class A",
        summary: "Reliable pawn chain maintenance and good awareness of isolated queen pawn weaknesses.",
        tendency: "Occasionally creates weak light-square complexes around the castled king.",
      },
      endgame: {
        name: "Endgame Technique & Conversion",
        score: 74,
        rating: 1500,
        level: "Class B",
        summary: "Demonstrates basic King and Pawn opposition, but passive rook placement leads to forfeited conversion opportunities.",
        tendency: "Hesitates to activate the king in equal or slightly advantageous rook endings.",
      },
    },
    strengths: [
      "Consistent pawn chain integrity and avoidance of doubled pawns in quiet positions.",
      "High accuracy during early opening development (first 5 plies).",
      "Disciplined king safety in standard closed center games.",
    ],
    weaknesses: [
      "Tactical oversight of knight forks and deflection tactics under time pressure.",
      "Passive rook placement in simplified 6-piece endgames.",
      "Premature resolution of central pawn tension allowing opponent to seize the initiative.",
    ],
    coachPrescription:
      "Stockfish 19 Diagnostic recommends focusing primarily on Tactical Vigilance and Endgame King Activation. Dedicate 20 minutes daily to the personalized blunder drills below before playing rated tournament matches.",
    weeklyPlan,
    drills: [...CURATED_WEAKNESS_DRILLS],
    gamesHistory: [],
  };
}

export interface BatchGameItem {
  report: GameAnalysisReport;
  platform: "local" | "chess.com" | "lichess";
  playerColor: "w" | "b";
  title?: string;
  opponent: string;
  opponentRating?: number;
  date?: string;
  result?: string;
  userResultOutcome?: "win" | "loss" | "draw";
  pgn: string;
  openingEco?: string;
  openingName?: string;
}

export interface BatchProfileOptions {
  username?: string;
  platform?: "local" | "chess.com" | "lichess";
  clearPrevious?: boolean;
}

class DiagnosticService {
  private plan: PerformancePlan;

  constructor() {
    this.plan = this.loadPlan();
  }

  private loadPlan(): PerformancePlan {
    if (typeof window === "undefined") return createDefaultPlan();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load performance plan from localStorage:", e);
    }
    return createDefaultPlan();
  }

  public savePlan(plan: PerformancePlan): void {
    this.plan = plan;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      } catch (e) {
        console.warn("Could not save performance plan:", e);
      }
    }
  }

  public getPerformancePlan(): PerformancePlan {
    return this.plan;
  }

  public setProfileName(name: string, platform: "local" | "chess.com" | "lichess" = "local"): PerformancePlan {
    const updated: PerformancePlan = {
      ...this.plan,
      playerName: name,
      profileUsername: name,
      profilePlatform: platform,
    };
    this.savePlan(updated);
    return updated;
  }

  public markDrillSolved(drillId: string): PerformancePlan {
    const updatedDrills = this.plan.drills.map((d) =>
      d.id === drillId ? { ...d, solved: true } : d
    );

    const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
    const updatedWeekly = this.plan.weeklyPlan.map((item, idx) => {
      if (idx === todayIndex) {
        const completed = Math.min(item.targetDrillCount, item.drillsCompleted + 1);
        return {
          ...item,
          drillsCompleted: completed,
          completed: completed >= item.targetDrillCount,
        };
      }
      return item;
    });

    const updatedPlan: PerformancePlan = {
      ...this.plan,
      drills: updatedDrills,
      weeklyPlan: updatedWeekly,
    };

    this.savePlan(updatedPlan);
    return updatedPlan;
  }

  /**
   * Automatically ingest and analyze multiple games (e.g. from Chess.com or Lichess archives)
   * into an individual's comprehensive performance profile and personalized drill lab.
   */
  public addAnalyzedGamesBatch(
    items: BatchGameItem[],
    options?: BatchProfileOptions
  ): PerformancePlan {
    if (items.length === 0) return this.plan;

    const isFresh = options?.clearPrevious ?? false;
    const initialWins = isFresh ? 0 : this.plan.winLossRecord?.wins || 0;
    const initialLosses = isFresh ? 0 : this.plan.winLossRecord?.losses || 0;
    const initialDraws = isFresh ? 0 : this.plan.winLossRecord?.draws || 0;

    let totalNewWins = 0;
    let totalNewLosses = 0;
    let totalNewDraws = 0;

    let totalPlayerMoves = 0;
    let weightedAccuracySum = 0;
    let totalBlunders = 0;
    let totalMissedWins = 0;
    let totalMistakes = 0;

    let openingAccuracySum = 0;
    let openingCount = 0;
    let endgameAccuracySum = 0;
    let endgameCount = 0;

    const drillCandidates: Array<{ evalDrop: number; drill: PlayerDrill }> = [];
    const newSummaries: DiagnosedGameSummary[] = [];

    items.forEach((item, gameIdx) => {
      const playerColor = item.playerColor;
      const playerAccuracy = playerColor === "w" ? item.report.whiteAccuracy : item.report.blackAccuracy;
      const playerMoves = item.report.moves.filter((m) => m.color === playerColor);

      // Track outcomes
      if (item.userResultOutcome === "win") totalNewWins++;
      else if (item.userResultOutcome === "loss") totalNewLosses++;
      else if (item.userResultOutcome === "draw") totalNewDraws++;
      else {
        // Infer from result string if outcome not explicitly tagged
        if (item.result === "1-0") {
          if (playerColor === "w") totalNewWins++;
          else totalNewLosses++;
        } else if (item.result === "0-1") {
          if (playerColor === "b") totalNewWins++;
          else totalNewLosses++;
        } else if (item.result === "1/2-1/2") {
          totalNewDraws++;
        }
      }

      let gameBlunders = 0;
      let gameMissedWins = 0;

      playerMoves.forEach((m) => {
        totalPlayerMoves++;
        weightedAccuracySum += playerAccuracy;

        if (m.moveNumber <= 8) {
          openingAccuracySum += m.grade === "best" || m.grade === "great" ? 100 : m.grade === "good" ? 85 : 40;
          openingCount++;
        }

        if (m.moveNumber >= 25) {
          endgameAccuracySum += m.grade === "best" || m.grade === "great" ? 100 : m.grade === "good" ? 85 : 40;
          endgameCount++;
        }

        if (m.grade === "blunder") {
          totalBlunders++;
          gameBlunders++;
        } else if (m.grade === "missed_win") {
          totalMissedWins++;
          gameMissedWins++;
        } else if (m.grade === "mistake") {
          totalMistakes++;
        }

        // Potential drill from player blunder or missed win
        if (
          (m.grade === "blunder" || m.grade === "missed_win" || m.grade === "mistake") &&
          m.bestMoveSan &&
          m.fenBefore
        ) {
          const evalDiff = Math.abs(m.evalBefore - m.evalAfter) || 200;
          drillCandidates.push({
            evalDrop: evalDiff,
            drill: {
              id: `drill-batch-${Date.now()}-${gameIdx}-${m.ply}`,
              title: `Game Review: ${m.bestMoveSan} (Move ${m.moveNumber})`,
              category: "personal-blunder",
              sourceDescription: `From ${item.platform.toUpperCase()} game vs ${item.opponent} • Move ${m.moveNumber} (${item.date || "Recent"})`,
              fen: m.fenBefore,
              turn: m.color,
              playerColor: m.color,
              solutionMoves: [m.bestMoveSan],
              badMovePlayed: `${m.san} (${m.grade === "blunder" ? "??" : m.grade === "missed_win" ? "+-" : "?"})`,
              difficulty: m.grade === "blunder" ? "Intermediate" : "Advanced",
              objective: `In your game vs ${item.opponent}, you played ${m.san}. Find the master Stockfish 19 continuation that preserves the advantage.`,
              coachExplanation:
                m.explanation ||
                `Stockfish 19 evaluates ${m.bestMoveSan} as the only sound continuation, resolving tactical tension on ${m.to}.`,
              hint: `Scan the board for checks, captures, and undefended minor pieces before selecting a move.`,
              solved: false,
            },
          });
        }
      });

      newSummaries.push({
        id: `game-batch-${Date.now()}-${gameIdx}`,
        title: item.title || `${item.playerColor === "w" ? "White" : "Black"} vs ${item.opponent}`,
        platform: item.platform,
        date: item.date || new Date().toISOString().split("T")[0],
        result: item.result || "Analyzed",
        userResultOutcome: item.userResultOutcome,
        accuracy: playerAccuracy,
        opponent: item.opponent,
        opponentRating: item.opponentRating,
        playerColor,
        blundersCount: gameBlunders,
        missedWinsCount: gameMissedWins,
        openingEco: item.openingEco,
        openingName: item.openingName,
        pgn: item.pgn,
      });
    });

    // Deduplicate drills by FEN and take the highest impact blunders
    const uniqueFens = new Set<string>();
    const sortedDrills = drillCandidates
      .sort((a, b) => b.evalDrop - a.evalDrop)
      .map((c) => c.drill)
      .filter((d) => {
        if (uniqueFens.has(d.fen)) return false;
        uniqueFens.add(d.fen);
        return true;
      })
      .slice(0, 15);

    // Combine with curated if few blunders found
    const finalDrills =
      sortedDrills.length >= 8
        ? sortedDrills
        : [...sortedDrills, ...CURATED_WEAKNESS_DRILLS.slice(0, 8 - sortedDrills.length)];

    // Aggregated Metrics
    const batchAvgAccuracy =
      totalPlayerMoves > 0 ? Math.round(weightedAccuracySum / totalPlayerMoves) : 75;
    const openingAccuracy = openingCount > 0 ? Math.round(openingAccuracySum / openingCount) : 80;
    const endgameAccuracy = endgameCount > 0 ? Math.round(endgameAccuracySum / endgameCount) : 75;

    const blundersPerGame = items.length > 0 ? totalBlunders / items.length : 0;
    const missedWinsPerGame = items.length > 0 ? totalMissedWins / items.length : 0;
    const mistakesPerGame = items.length > 0 ? totalMistakes / items.length : 0;

    const tacticsScore = Math.max(
      35,
      Math.min(98, Math.round(95 - blundersPerGame * 12 - missedWinsPerGame * 6 - mistakesPerGame * 3))
    );
    const pieceActivityScore = Math.max(45, Math.min(96, Math.round(batchAvgAccuracy * 0.96)));
    const pawnStructureScore = Math.max(
      50,
      Math.min(96, Math.round((openingAccuracy + batchAvgAccuracy) / 2))
    );

    const updatedCompetencies = {
      opening: this.calculateCompetency(
        "Opening Repertoire Discipline",
        openingAccuracy,
        "Adherence to opening theory and central tension maintenance."
      ),
      tactics: this.calculateCompetency(
        "Tactical Vigilance & Calculation",
        tacticsScore,
        `Averaging ${blundersPerGame.toFixed(1)} blunders and ${missedWinsPerGame.toFixed(1)} missed wins per game.`
      ),
      pieceActivity: this.calculateCompetency(
        "Piece Coordination & Active Harmony",
        pieceActivityScore,
        "Piece mobility and control of key central squares."
      ),
      pawnStructure: this.calculateCompetency(
        "Pawn Structure & Strategic Integrity",
        pawnStructureScore,
        "Soundness of pawn chains and prophylactic king safety."
      ),
      endgame: this.calculateCompetency(
        "Endgame Technique & Conversion",
        endgameAccuracy,
        "King activity and passed pawn conversion in late game phases."
      ),
    };

    const avgScore = Math.round(
      (updatedCompetencies.opening.score +
        updatedCompetencies.tactics.score +
        updatedCompetencies.pieceActivity.score +
        updatedCompetencies.pawnStructure.score +
        updatedCompetencies.endgame.score) /
        5
    );

    const overallRating = Math.round(800 + (avgScore / 100) * 1600);
    const prevGames = isFresh ? 0 : this.plan.totalGamesAnalyzed;
    const totalGames = prevGames + items.length;
    const overallAccuracyAvg =
      prevGames > 0
        ? Math.round((this.plan.overallAccuracyAvg * prevGames + batchAvgAccuracy * items.length) / totalGames)
        : batchAvgAccuracy;

    const totalWins = initialWins + totalNewWins;
    const totalLosses = initialLosses + totalNewLosses;
    const totalDraws = initialDraws + totalNewDraws;

    // Build Data-Driven Strengths and Weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (openingAccuracy >= 82) {
      strengths.push(`Strong opening repertoire discipline (${openingAccuracy}% accuracy across ${openingCount} opening plies).`);
    } else {
      weaknesses.push(`Early opening deviations (averaging ${openingAccuracy}% accuracy in the first 8 moves).`);
    }

    if (blundersPerGame <= 0.8) {
      strengths.push(`High tactical vigilance (${blundersPerGame.toFixed(1)} blunders/game across ${items.length} matches).`);
    } else {
      weaknesses.push(`Vulnerable to tactical oversights (${totalBlunders} blunders recorded across ${items.length} games).`);
    }

    if (endgameAccuracy >= 80) {
      strengths.push(`Reliable endgame technique and active piece coordination in simplified endings.`);
    } else {
      weaknesses.push(`Endgame conversion inconsistency (accuracy drops to ${endgameAccuracy}% in moves 25+).`);
    }

    if (strengths.length === 0) {
      strengths.push(`Consistent resilience and match discipline across ${items.length} rated games.`);
    }
    if (weaknesses.length === 0) {
      weaknesses.push(`Subtle positional nuances in complex closed pawn structures.`);
    }

    const lowestCompetency = Object.values(updatedCompetencies).sort((a, b) => a.score - b.score)[0];
    const usernameDisplay = options?.username || this.plan.profileUsername || this.plan.playerName;
    const platformDisplay = (options?.platform || this.plan.profilePlatform || "Online").toUpperCase();

    const coachPrescription = `Stockfish 19 Diagnostic constructed this performance profile from ${totalGames} games for ${usernameDisplay} on ${platformDisplay} (${overallAccuracyAvg}% avg accuracy, ${totalWins}W - ${totalLosses}L - ${totalDraws}D). Your top priority for improvement is ${lowestCompetency.name} (${lowestCompetency.score}/100, Est. ${lowestCompetency.rating} Elo). We have populated your Drill Lab with ${sortedDrills.length} personalized drills extracted from your critical game moments.`;

    const existingHistory = isFresh ? [] : this.plan.gamesHistory;
    const combinedHistory = [...newSummaries, ...existingHistory].slice(0, 50);

    const updatedPlan: PerformancePlan = {
      ...this.plan,
      playerName: usernameDisplay,
      profileUsername: options?.username || this.plan.profileUsername,
      profilePlatform: options?.platform || this.plan.profilePlatform,
      evaluatedAt: new Date().toISOString(),
      totalGamesAnalyzed: totalGames,
      overallRating,
      overallAccuracyAvg,
      winLossRecord: {
        wins: totalWins,
        losses: totalLosses,
        draws: totalDraws,
      },
      competencies: updatedCompetencies,
      strengths,
      weaknesses,
      coachPrescription,
      drills: finalDrills,
      gamesHistory: combinedHistory,
    };

    this.savePlan(updatedPlan);
    return updatedPlan;
  }

  public addAnalyzedGame(
    report: GameAnalysisReport,
    meta: {
      title?: string;
      opponent?: string;
      opponentRating?: number;
      platform: "local" | "chess.com" | "lichess";
      playerColor: "w" | "b";
      date?: string;
      result?: string;
      userResultOutcome?: "win" | "loss" | "draw";
      pgn?: string;
      openingEco?: string;
      openingName?: string;
      targetPlayerUsername?: string;
    }
  ): PerformancePlan {
    return this.addAnalyzedGamesBatch(
      [
        {
          report,
          platform: meta.platform,
          playerColor: meta.playerColor,
          title: meta.title,
          opponent: meta.opponent || "Opponent",
          opponentRating: meta.opponentRating,
          date: meta.date,
          result: meta.result,
          userResultOutcome: meta.userResultOutcome,
          pgn: meta.pgn || "",
          openingEco: meta.openingEco,
          openingName: meta.openingName,
        },
      ],
      {
        username: meta.targetPlayerUsername || this.plan.profileUsername,
        platform: meta.platform,
        clearPrevious: false,
      }
    );
  }

  private calculateCompetency(name: string, score: number, tendency: string): CompetencyScore {
    const clamped = Math.max(30, Math.min(99, score));
    const rating = Math.round(800 + (clamped / 100) * 1600);

    let level: CompetencyScore["level"] = "Novice";
    if (rating >= 2400) level = "Grandmaster";
    else if (rating >= 2200) level = "Master";
    else if (rating >= 2000) level = "Expert";
    else if (rating >= 1800) level = "Class A";
    else if (rating >= 1600) level = "Class B";
    else if (rating >= 1400) level = "Class C";

    let summary = "";
    if (clamped >= 85) summary = "Grandmaster/Master caliber proficiency with disciplined foresight.";
    else if (clamped >= 75) summary = "Solid tournament competence with occasional tactical blind spots.";
    else if (clamped >= 65) summary = "Adequate foundation requiring consistent calculation drills.";
    else summary = "High-priority area for technical improvement; vulnerable to straightforward combinations.";

    return {
      name,
      score: clamped,
      rating,
      level,
      summary,
      tendency,
    };
  }

  public resetPlan(): PerformancePlan {
    const defaultPlan = createDefaultPlan();
    this.savePlan(defaultPlan);
    return defaultPlan;
  }

  public exportProfileJson(): string {
    return JSON.stringify(this.plan, null, 2);
  }

  public importProfileJson(jsonString: string): PerformancePlan {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.competencies) {
        throw new Error("Invalid OmniChess profile backup format.");
      }
      this.savePlan(parsed);
      return parsed;
    } catch (e: any) {
      throw new Error(e?.message || "Failed to parse profile JSON.");
    }
  }
}

export const diagnosticService = new DiagnosticService();
