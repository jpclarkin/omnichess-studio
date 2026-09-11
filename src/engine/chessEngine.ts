import { Chess, type Move } from "chess.js";
import type { EngineCandidateLine } from "../types/chess";

// Piece Values in Centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece Square Tables for Positional Strategy (from White perspective, flip for Black)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_TABLE_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

export function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -30000 : 30000;
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return 0;
  }

  let score = 0;
  const board = game.board();

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;

      const pieceVal = PIECE_VALUES[piece.type] || 0;
      let posVal = 0;
      const index = rank * 8 + file;
      const flippedIndex = (7 - rank) * 8 + file;

      switch (piece.type) {
        case "p":
          posVal = piece.color === "w" ? PAWN_TABLE[index] : PAWN_TABLE[flippedIndex];
          break;
        case "n":
          posVal = piece.color === "w" ? KNIGHT_TABLE[index] : KNIGHT_TABLE[flippedIndex];
          break;
        case "b":
          posVal = piece.color === "w" ? BISHOP_TABLE[index] : BISHOP_TABLE[flippedIndex];
          break;
        case "r":
          posVal = piece.color === "w" ? ROOK_TABLE[index] : ROOK_TABLE[flippedIndex];
          break;
        case "q":
          posVal = piece.color === "w" ? QUEEN_TABLE[index] : QUEEN_TABLE[flippedIndex];
          break;
        case "k":
          posVal = piece.color === "w" ? KING_TABLE_MID[index] : KING_TABLE_MID[flippedIndex];
          break;
      }

      if (piece.color === "w") {
        score += pieceVal + posVal;
      } else {
        score -= pieceVal + posVal;
      }
    }
  }

  // Bonus for check
  if (game.inCheck()) {
    score += game.turn() === "w" ? -50 : 50;
  }

  return score;
}

// Quiescence search to avoid the horizon effect on tactical captures
function quiescence(game: Chess, alpha: number, beta: number, maxDepth = 2): number {
  const standPat = evaluateBoard(game);
  const isWhite = game.turn() === "w";

  if (isWhite) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  if (maxDepth <= 0) return standPat;

  // Search only capture moves
  const legalMoves = game.moves({ verbose: true }).filter(m => m.captured);
  // Sort captures by MVV-LVA
  legalMoves.sort((a, b) => {
    const valA = (PIECE_VALUES[a.captured || ""] || 0) - (PIECE_VALUES[a.piece] || 0);
    const valB = (PIECE_VALUES[b.captured || ""] || 0) - (PIECE_VALUES[b.piece] || 0);
    return valB - valA;
  });

  for (const move of legalMoves) {
    game.move(move);
    const score = quiescence(game, alpha, beta, maxDepth - 1);
    game.undo();

    if (isWhite) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }

  return isWhite ? alpha : beta;
}

// Minimax with Alpha-Beta Pruning
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return quiescence(game, alpha, beta, 2);
  }

  const moves = game.moves({ verbose: true });
  // Order moves: captures first
  moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export interface BestMoveResult {
  move: Move | null;
  score: number; // in centipawns (+ score favors White)
  san: string;
}

export function findBestMove(
  game: Chess,
  depth: number = 3,
  randomness: number = 0
): BestMoveResult {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return { move: null, score: 0, san: "" };
  }

  // If high randomness bot and dice rolls, pick a slightly suboptimal move
  if (randomness > 0 && Math.random() < randomness) {
    // Pick from top 3-4 moves randomly
    const randomPick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return { move: randomPick, score: evaluateBoard(game), san: randomPick.san };
  }

  const isWhite = game.turn() === "w";
  let bestScore = isWhite ? -Infinity : Infinity;
  let bestMove: Move = legalMoves[0];

  // Move ordering
  legalMoves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

  for (const move of legalMoves) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();

    if (isWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return {
    move: bestMove,
    score: bestScore,
    san: bestMove.san,
  };
}

/**
 * Calculates the top N engine candidate moves with evaluations and continuation lines.
 */
export function findTopMoves(
  game: Chess,
  count: number = 3,
  depth: number = 2
): EngineCandidateLine[] {
  const gameCopy = new Chess(game.fen());
  const legalMoves = gameCopy.moves({ verbose: true });
  if (legalMoves.length === 0) return [];

  const isWhite = gameCopy.turn() === "w";
  const scoredMoves: Array<{ move: Move; score: number; pv: string[] }> = [];

  // Order moves by captures first
  const sortedLegal = [...legalMoves].sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

  for (const move of sortedLegal) {
    gameCopy.move(move);
    // Score candidate move using minimax at depth-1 or immediate board evaluation
    const continuationScore = depth > 1
      ? minimax(gameCopy, depth - 1, -Infinity, Infinity, !isWhite)
      : evaluateBoard(gameCopy);
    gameCopy.undo();

    scoredMoves.push({
      move,
      score: continuationScore,
      pv: [move.san],
    });
  }

  // Sort best first (descending for white, ascending for black)
  if (isWhite) {
    scoredMoves.sort((a, b) => b.score - a.score);
  } else {
    scoredMoves.sort((a, b) => a.score - b.score);
  }

  const topCandidates = scoredMoves.slice(0, count);

  // Compute 1-2 continuation moves ONLY for the top candidate lines (not all 40 legal moves!)
  if (depth >= 2) {
    for (const item of topCandidates) {
      try {
        gameCopy.move(item.move);
        const oppMoves = gameCopy.moves({ verbose: true });
        if (oppMoves.length > 0) {
          oppMoves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));
          let bestOpp = oppMoves[0];
          let bestOppScore = isWhite ? Infinity : -Infinity;

          for (const om of oppMoves.slice(0, 10)) {
            gameCopy.move(om);
            const s = evaluateBoard(gameCopy);
            gameCopy.undo();
            if (isWhite ? s < bestOppScore : s > bestOppScore) {
              bestOppScore = s;
              bestOpp = om;
            }
          }
          item.pv.push(bestOpp.san);

          // Second continuation move
          gameCopy.move(bestOpp);
          const counterMoves = gameCopy.moves({ verbose: true });
          if (counterMoves.length > 0) {
            counterMoves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));
            let bestCounter = counterMoves[0];
            let bestCounterScore = isWhite ? -Infinity : Infinity;

            for (const cm of counterMoves.slice(0, 10)) {
              gameCopy.move(cm);
              const s = evaluateBoard(gameCopy);
              gameCopy.undo();
              if (isWhite ? s > bestCounterScore : s < bestCounterScore) {
                bestCounterScore = s;
                bestCounter = cm;
              }
            }
            item.pv.push(bestCounter.san);
          }
          gameCopy.undo();
        }
        gameCopy.undo();
      } catch {}
    }
  }

  return topCandidates.map((item, idx) => ({
    rank: idx + 1,
    san: item.move.san,
    uci: `${item.move.from}${item.move.to}${item.move.promotion || ""}`,
    score: item.score,
    isMate: Math.abs(item.score) >= 29000,
    mateIn: Math.abs(item.score) >= 29000 ? Math.max(1, Math.round((30000 - Math.abs(item.score)) / 100)) : undefined,
    pv: item.pv,
  }));
}
