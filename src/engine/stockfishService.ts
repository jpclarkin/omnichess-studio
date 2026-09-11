import { Chess, type Move } from "chess.js";
import type { AnalyzedMove, GameAnalysisReport, MoveGrade } from "../types/chess";
import { evaluateBoard, findBestMove, findTopMoves } from "./chessEngine";
import { generateCoachExplanation } from "./commentaryEngine";

export interface StockfishEvaluation {
  score: number; // Centipawns (+ for White, - for Black)
  bestMoveSan: string;
  bestMoveUci: string;
  depth: number;
  isMate: boolean;
  mateIn?: number;
}

class StockfishEngineService {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private isBusy: boolean = false;
  private engineName: string = "Stockfish 19 (WASM NNUE)";
  private pendingResolve: ((evalResult: StockfishEvaluation) => void) | null = null;
  private currentEval: Partial<StockfishEvaluation> = {};
  private currentFen: string = "";
  private currentTimer: ReturnType<typeof setTimeout> | null = null;

  public async init(): Promise<boolean> {
    if (this.isInitialized && this.worker) return true;
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return false;
    }

    try {
      // Initialize Web Worker using the Stockfish 18/19 build
      this.worker = new Worker("/stockfish/stockfish.js");

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          // If worker takes too long to respond, mark initialized but allow fallback
          this.isInitialized = true;
          resolve(true);
        }, 3000);

        if (!this.worker) {
          clearTimeout(timeout);
          resolve(false);
          return;
        }

        this.worker.onmessage = (e: MessageEvent) => {
          const line: string = typeof e.data === "string" ? e.data : "";
          if (line.includes("Stockfish")) {
            this.engineName = line.trim();
          }

          if (line === "uciok" || line === "readyok") {
            this.isInitialized = true;
            clearTimeout(timeout);
            resolve(true);
          }

          this.handleEngineOutput(line);
        };

        this.worker.onerror = (err) => {
          console.warn("Stockfish worker error, falling back to local engine:", err);
          clearTimeout(timeout);
          resolve(false);
        };

        this.worker.postMessage("uci");
        this.worker.postMessage("isready");
      });
    } catch (e) {
      console.warn("Could not instantiate Stockfish Web Worker:", e);
      return false;
    }
  }

  public getEngineName(): string {
    return this.engineName;
  }

  public isAvailable(): boolean {
    return !!this.worker && this.isInitialized;
  }

  private handleEngineOutput(line: string) {
    if (line.startsWith("info ")) {
      // Parse score: "score cp 45" or "score mate -2"
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      const depthMatch = line.match(/depth (\d+)/);

      if (cpMatch) {
        let cp = parseInt(cpMatch[1], 10);
        // Stockfish score is relative to player whose turn it is in FEN
        // Convert to absolute score (positive = White, negative = Black)
        if (this.currentFen.includes(" b ")) {
          cp = -cp;
        }
        this.currentEval.score = cp;
        this.currentEval.isMate = false;
      } else if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        this.currentEval.isMate = true;
        this.currentEval.mateIn = mateIn;
        this.currentEval.score = mateIn > 0 ? 30000 - mateIn * 100 : -30000 - mateIn * 100;
        if (this.currentFen.includes(" b ")) {
          this.currentEval.score = -this.currentEval.score;
        }
      }

      if (depthMatch) {
        this.currentEval.depth = parseInt(depthMatch[1], 10);
      }
    } else if (line.startsWith("bestmove ")) {
      const parts = line.split(" ");
      const bestMoveUci = parts[1] || "";
      this.currentEval.bestMoveUci = bestMoveUci;

      // Convert UCI to SAN using chess.js
      let bestMoveSan = bestMoveUci;
      try {
        const g = new Chess(this.currentFen);
        const from = bestMoveUci.substring(0, 2);
        const to = bestMoveUci.substring(2, 4);
        const promo = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
        const m = g.move({ from: from as any, to: to as any, promotion: promo as any });
        if (m) bestMoveSan = m.san;
      } catch {}

      this.currentEval.bestMoveSan = bestMoveSan;

      if (this.pendingResolve) {
        if (this.currentTimer) {
          clearTimeout(this.currentTimer);
          this.currentTimer = null;
        }
        const result: StockfishEvaluation = {
          score: this.currentEval.score ?? 0,
          bestMoveSan: this.currentEval.bestMoveSan || "",
          bestMoveUci: this.currentEval.bestMoveUci || "",
          depth: this.currentEval.depth ?? 10,
          isMate: !!this.currentEval.isMate,
          mateIn: this.currentEval.mateIn,
        };
        this.isBusy = false;
        this.pendingResolve(result);
        this.pendingResolve = null;
      }
    }
  }

  public async evaluatePosition(fen: string, depth: number = 12): Promise<StockfishEvaluation> {
    await this.init();

    // If Worker is ready and not stuck, evaluate with Stockfish
    if (this.worker && this.isInitialized && !this.isBusy) {
      this.isBusy = true;
      this.currentFen = fen;
      this.currentEval = { score: 0, depth };

      return new Promise<StockfishEvaluation>((resolve) => {
        this.pendingResolve = resolve;

        // Failsafe timeout in case engine hangs
        this.currentTimer = setTimeout(() => {
          if (this.pendingResolve) {
            this.isBusy = false;
            // Fallback to local minimax
            const g = new Chess(fen);
            const fallbackMove = findBestMove(g, 2);
            resolve({
              score: evaluateBoard(g),
              bestMoveSan: fallbackMove.san,
              bestMoveUci: fallbackMove.move ? `${fallbackMove.move.from}${fallbackMove.move.to}` : "",
              depth: 2,
              isMate: false,
            });
            this.pendingResolve = null;
            this.currentTimer = null;
          }
        }, 1800);

        this.worker!.postMessage(`position fen ${fen}`);
        this.worker!.postMessage(`go depth ${depth}`);
      });
    }

    // Fallback: Synchronous engine calculation
    const fallbackGame = new Chess(fen);
    const best = findBestMove(fallbackGame, 2);
    return {
      score: evaluateBoard(fallbackGame),
      bestMoveSan: best.san,
      bestMoveUci: best.move ? `${best.move.from}${best.move.to}` : "",
      depth: 2,
      isMate: false,
    };
  }

  public async analyzeFullGame(
    pgnOrMoves: string | string[],
    onProgress?: (percent: number, currentPly: number, totalPlies: number) => void
  ): Promise<GameAnalysisReport> {
    const game = new Chess();
    let moves: Move[] = [];

    if (typeof pgnOrMoves === "string") {
      try {
        game.loadPgn(pgnOrMoves);
        moves = game.history({ verbose: true });
      } catch {
        const tokens = pgnOrMoves.split(/\s+/).filter((t) => !t.includes(".") && t.length > 0);
        game.reset();
        for (const t of tokens) {
          try {
            const m = game.move(t);
            if (m) moves.push(m);
          } catch {}
        }
      }
    } else {
      for (const san of pgnOrMoves) {
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
    const totalPlies = moves.length;

    for (let index = 0; index < moves.length; index++) {
      const move = moves[index];
      const ply = index + 1;
      const moveNumber = Math.floor(index / 2) + 1;
      const color = move.color;
      const fenBefore = analysisGame.fen();

      // Evaluate position before move
      const evalBeforeRes = await this.evaluatePosition(fenBefore, 10);
      const rawEvalBefore = evalBeforeRes.score;
      let bestMoveSan = evalBeforeRes.bestMoveSan || move.san;

      // Compute Top N candidate lines for this position
      const topLines = findTopMoves(new Chess(fenBefore), 3, 2);
      if (evalBeforeRes.bestMoveSan && topLines.length > 0) {
        const existingIdx = topLines.findIndex((l) => l.san === evalBeforeRes.bestMoveSan);
        if (existingIdx > 0) {
          const [match] = topLines.splice(existingIdx, 1);
          match.score = rawEvalBefore;
          topLines.unshift(match);
        } else if (existingIdx === -1 && evalBeforeRes.bestMoveSan) {
          topLines.unshift({
            rank: 1,
            san: evalBeforeRes.bestMoveSan,
            score: rawEvalBefore,
            isMate: evalBeforeRes.isMate,
            mateIn: evalBeforeRes.mateIn,
            pv: [evalBeforeRes.bestMoveSan],
          });
          if (topLines.length > 3) topLines.pop();
        }
        topLines.forEach((l, idx) => {
          l.rank = idx + 1;
        });
      }
      if (topLines.length > 0 && topLines[0].san) {
        bestMoveSan = topLines[0].san;
      }

      // Apply move
      analysisGame.move(move);
      const fenAfter = analysisGame.fen();

      // Evaluate position after move
      const evalAfterRes = await this.evaluatePosition(fenAfter, 10);
      const rawEvalAfter = evalAfterRes.score;

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

      // Accuracy formula
      const winProbBefore = 1 / (1 + Math.pow(10, -playerEvalBefore / 400));
      const winProbAfter = 1 / (1 + Math.pow(10, -playerEvalAfter / 400));
      const diff = Math.max(0, winProbBefore - winProbAfter);
      const moveAccuracy = Math.min(100, Math.max(0, Math.round(103.1668 * Math.exp(-4.354 * diff) - 3.1669)));

      if (color === "w") {
        whiteAccSum += moveAccuracy;
        whiteMoveCount++;
        gradeCounts.w[grade]++;
      } else {
        blackAccSum += moveAccuracy;
        blackMoveCount++;
        gradeCounts.b[grade]++;
      }

      // Generate rich, opening-aware, varied coach commentary
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

      const item: AnalyzedMove = {
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

      analyzedMoves.push(item);
      if (grade === "blunder" || grade === "missed_win") {
        blunderPuzzles.push(item);
      }

      if (onProgress) {
        const pct = Math.round(((index + 1) / totalPlies) * 100);
        onProgress(pct, index + 1, totalPlies);
      }
    }

    const whiteAccuracy = whiteMoveCount > 0 ? Math.round(whiteAccSum / whiteMoveCount) : 100;
    const blackAccuracy = blackMoveCount > 0 ? Math.round(blackAccSum / blackMoveCount) : 100;

    let coachOverview = "";
    if (whiteAccuracy >= 90 && blackAccuracy >= 90) {
      coachOverview = "A game of high theoretical precision by both sides, evaluated by Stockfish 19.";
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
}

export const stockfishService = new StockfishEngineService();
