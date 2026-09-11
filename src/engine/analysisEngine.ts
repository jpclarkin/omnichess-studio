import { Chess, type Move } from "chess.js";
import type { AnalyzedMove, GameAnalysisReport, MoveGrade, EngineCandidateLine } from "../types/chess";
import { evaluateBoard, findTopMoves } from "./chessEngine";
import { generateCoachExplanation } from "./commentaryEngine";

function cpToWinProb(cp: number): number {
  return 1 / (1 + Math.pow(10, -cp / 400));
}

function calculateMoveAccuracy(winProbBefore: number, winProbAfter: number): number {
  const diff = Math.max(0, winProbBefore - winProbAfter);
  const rawAcc = 103.1668 * Math.exp(-4.354 * diff) - 3.1669;
  return Math.min(100, Math.max(0, Math.round(rawAcc)));
}

export function analyzeGame(
  pgnOrHistory: string[] | string,
  options?: { fast?: boolean }
): GameAnalysisReport {
  const game = new Chess();
  let moves: Move[] = [];

  if (typeof pgnOrHistory === "string") {
    try {
      game.loadPgn(pgnOrHistory);
      moves = game.history({ verbose: true });
    } catch {
      const tokens = pgnOrHistory.split(/\s+/).filter(t => !t.includes(".") && t.length > 0);
      game.reset();
      for (const t of tokens) {
        try {
          const m = game.move(t);
          if (m) moves.push(m);
        } catch {}
      }
    }
  } else {
    for (const san of pgnOrHistory) {
      try {
        const m = game.move(san);
        if (m) moves.push(m);
      } catch {}
    }
  }

  const analysisGame = new Chess();
  const analyzedMoves: AnalyzedMove[] = [];

  let whiteAccSum = 0;
  let whiteMoveCount = 0;
  let blackAccSum = 0;
  let blackMoveCount = 0;

  const gradeCounts = {
    w: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 } as Record<MoveGrade, number>,
    b: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 } as Record<MoveGrade, number>,
  };

  const blunderPuzzles: AnalyzedMove[] = [];

  moves.forEach((move, index) => {
    const ply = index + 1;
    const moveNumber = Math.floor(index / 2) + 1;
    const color = move.color;
    const fenBefore = analysisGame.fen();

    const rawEvalBefore = evaluateBoard(analysisGame);
    let topLines: EngineCandidateLine[] | undefined = undefined;
    let bestMoveSan = move.san;

    if (!options?.fast) {
      topLines = findTopMoves(analysisGame, 3, 2);
      bestMoveSan = topLines[0]?.san || move.san;
    }

    analysisGame.move(move);
    const fenAfter = analysisGame.fen();
    const rawEvalAfter = evaluateBoard(analysisGame);

    const playerEvalBefore = color === "w" ? rawEvalBefore : -rawEvalBefore;
    const playerEvalAfter = color === "w" ? rawEvalAfter : -rawEvalAfter;
    const evalDelta = playerEvalAfter - playerEvalBefore;

    let grade: MoveGrade = "good";
    const isPieceSac = (move.captured ? 0 : 1) && (move.piece === "q" || move.piece === "r" || move.piece === "b" || move.piece === "n");

    if (evalDelta <= -400 && playerEvalBefore >= 150) {
      grade = "missed_win";
    } else if (evalDelta <= -250) {
      grade = "blunder";
    } else if (evalDelta <= -120) {
      grade = "mistake";
    } else if (evalDelta <= -50) {
      grade = "inaccuracy";
    } else if (move.san === bestMoveSan || evalDelta >= -15) {
      if (isPieceSac && evalDelta >= 50) {
        grade = "brilliant";
      } else if (evalDelta >= 20) {
        grade = "great";
      } else {
        grade = "best";
      }
    } else {
      grade = "good";
    }

    // In fast mode (batch imports), calculate best line specifically for blunders & mistakes to power drill puzzles
    if (options?.fast && (grade === "blunder" || grade === "missed_win" || grade === "mistake")) {
      analysisGame.undo();
      const blunderLines = findTopMoves(analysisGame, 1, 1);
      bestMoveSan = blunderLines[0]?.san || move.san;
      topLines = blunderLines;
      analysisGame.move(move);
    }

    const winProbBefore = cpToWinProb(playerEvalBefore);
    const winProbAfter = cpToWinProb(playerEvalAfter);
    const moveAccuracy = calculateMoveAccuracy(winProbBefore, winProbAfter);

    if (color === "w") {
      whiteAccSum += moveAccuracy;
      whiteMoveCount++;
      gradeCounts.w[grade]++;
    } else {
      blackAccSum += moveAccuracy;
      blackMoveCount++;
      gradeCounts.b[grade]++;
    }

    const explanation = generateCoachExplanation({
      grade,
      san: move.san,
      piece: move.piece,
      from: move.from,
      to: move.to,
      color,
      captured: move.captured,
      promotion: (move as any).promotion,
      flags: (move as any).flags,
      bestMoveSan,
      evalBefore: rawEvalBefore,
      evalAfter: rawEvalAfter,
      ply,
      moveNumber,
      fenBefore,
      fenAfter,
      allSansSoFar: moves.slice(0, index + 1).map((m) => m.san),
    });

    const analyzedItem: AnalyzedMove = {
      ply,
      moveNumber,
      san: move.san,
      from: move.from,
      to: move.to,
      color,
      fenBefore,
      fenAfter,
      evalBefore: rawEvalBefore,
      evalAfter: rawEvalAfter,
      grade,
      bestMoveSan,
      explanation,
      topLines,
    };

    analyzedMoves.push(analyzedItem);

    if (grade === "blunder" || grade === "missed_win") {
      blunderPuzzles.push(analyzedItem);
    }
  });

  const whiteAccuracy = whiteMoveCount > 0 ? Math.round(whiteAccSum / whiteMoveCount) : 100;
  const blackAccuracy = blackMoveCount > 0 ? Math.round(blackAccSum / blackMoveCount) : 100;

  let coachOverview = "";
  if (whiteAccuracy >= 90 && blackAccuracy >= 90) {
    coachOverview = "A game of high theoretical precision by both sides, featuring disciplined positional maneuvering.";
  } else if (whiteAccuracy > blackAccuracy + 15) {
    coachOverview = `White demonstrated superior strategic clarity and tactical control (${whiteAccuracy}% vs ${blackAccuracy}%).`;
  } else if (blackAccuracy > whiteAccuracy + 15) {
    coachOverview = `Black established control with superior piece coordination and tactical vigilance (${blackAccuracy}% vs ${whiteAccuracy}%).`;
  } else {
    coachOverview = `A closely contested encounter with dynamic opportunities and tactical shifts (${whiteAccuracy}% vs ${blackAccuracy}%).`;
  }

  return {
    whiteAccuracy,
    blackAccuracy,
    totalMoves: analyzedMoves.length,
    moves: analyzedMoves,
    gradeCounts,
    coachOverview,
    blunderPuzzles,
  };
}
