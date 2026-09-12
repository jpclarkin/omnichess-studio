import { useState, useEffect, useRef, useCallback } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "./components/Chessboard";
import { EvaluationBar } from "./components/EvaluationBar";
import { MoveHistory, type MoveHistoryItem } from "./components/MoveHistory";
import { GameControls } from "./components/GameControls";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { PuzzlesView } from "./components/PuzzlesView";
import { OpeningExplorer } from "./components/OpeningExplorer";
import { TrainingPlanView } from "./components/TrainingPlanView";
import { AiCoachDrawer } from "./components/AiCoachDrawer";
import { Navbar } from "./components/Navbar";
import { NewGameModal } from "./components/NewGameModal";
import { ImportGamesModal } from "./components/ImportGamesModal";
import { PlayerProfileModal } from "./components/PlayerProfileModal";
import { soundManager } from "./audio/soundManager";
import { evaluateBoard, findBestMove } from "./engine/chessEngine";
import { analyzeGame } from "./engine/analysisEngine";
import { stockfishService } from "./engine/stockfishService";
import { diagnosticService } from "./services/diagnosticService";
import type { ImportedGame } from "./services/platformImportService";
import { detectOpening } from "./data/openings";
import { BOT_PROFILES, TIME_CONTROLS } from "./data/bots";
import type { GameMode, BoardTheme, BotProfile, TimeControl, GameAnalysisReport, AnalyzedMove, PerformancePlan } from "./types/chess";
import { BarChart2, BookOpen, Flag, RefreshCw, Loader2, Bot } from "lucide-react";

export function App() {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [mode, setMode] = useState<GameMode>("vs-computer");
  const [theme, setTheme] = useState<BoardTheme>("emerald");
  const [isMuted, setIsMuted] = useState(false);

  // Bot & Player State
  const [bot, setBot] = useState<BotProfile>(BOT_PROFILES[1]); // Default Intermediate (1400)
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [isFlipped, setIsFlipped] = useState(false);

  // Move tracking & Evaluation
  const [moves, setMoves] = useState<MoveHistoryItem[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [detectedOpeningName, setDetectedOpeningName] = useState<string | null>(null);

  // Time & Clocks
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[3]); // 10 min
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isClockActive, setIsClockActive] = useState<boolean>(false);

  // Modals & Analysis
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<PerformancePlan>(() => diagnosticService.getPerformancePlan());
  const [analysisReport, setAnalysisReport] = useState<GameAnalysisReport | null>(null);
  const [analysisPly, setAnalysisPly] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<{
    active: boolean;
    percent: number;
    currentPly: number;
    totalPlies: number;
  } | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  const isBotThinkingRef = useRef(false);

  // Keep player profile in sync with diagnosticService (auto-migrations and calibrations)
  useEffect(() => {
    const current = diagnosticService.getPerformancePlan();
    setPlayerProfile(current);
    return diagnosticService.subscribe((updated) => {
      setPlayerProfile(updated);
    });
  }, []);

  // Timer Tick
  useEffect(() => {
    if (!isClockActive || gameOverReason || timeControl.category === "unlimited") return;

    const timer = setInterval(() => {
      const turn = game.turn();
      if (turn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameOverReason("White flagged on time. Black wins on time.");
            soundManager.playBlunder();
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameOverReason("Black flagged on time. White wins on time.");
            soundManager.playBlunder();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isClockActive, gameOverReason, game, timeControl.category]);

  // Check Game Over status
  const checkGameOver = useCallback((currGame: Chess) => {
    if (currGame.isCheckmate()) {
      const winner = currGame.turn() === "w" ? "Black" : "White";
      setGameOverReason(`Checkmate. ${winner} wins.`);
      soundManager.playSuccess();
      return true;
    }
    if (currGame.isDraw()) {
      let reason = "Game drawn.";
      if (currGame.isStalemate()) reason = "Draw by Stalemate.";
      else if (currGame.isThreefoldRepetition()) reason = "Draw by Threefold Repetition.";
      else if (currGame.isInsufficientMaterial()) reason = "Draw by Insufficient Material.";
      setGameOverReason(reason);
      return true;
    }
    return false;
  }, []);

  // Make Move Handler
  const makeMove = useCallback(
    (moveObj: { from: string; to: string; promotion?: string }) => {
      if (gameOverReason) return;

      const gameCopy = new Chess(game.fen());
      let executedMove = null;

      try {
        executedMove = gameCopy.move({
          from: moveObj.from as Square,
          to: moveObj.to as Square,
          promotion: (moveObj.promotion || "q") as "q" | "r" | "b" | "n",
        });
      } catch {
        return;
      }

      if (!executedMove) return;

      if (executedMove.flags.includes("k") || executedMove.flags.includes("q")) {
        soundManager.playCastle();
      } else if (executedMove.captured) {
        soundManager.playCapture();
      } else {
        soundManager.playMove();
      }

      if (gameCopy.inCheck() && !gameCopy.isCheckmate()) {
        soundManager.playCheck();
      }

      if (timeControl.increment > 0) {
        if (executedMove.color === "w") setWhiteTime((t) => t + timeControl.increment);
        else setBlackTime((t) => t + timeControl.increment);
      }

      if (!isClockActive) {
        setIsClockActive(true);
      }

      setGame(gameCopy);
      setLastMove({ from: executedMove.from, to: executedMove.to });

      const score = evaluateBoard(gameCopy);
      setEvalScore(score);

      const ply = moves.length + 1;
      const moveNumber = Math.floor(moves.length / 2) + 1;
      const historyItem: MoveHistoryItem = {
        ply,
        moveNumber,
        san: executedMove.san,
        color: executedMove.color,
      };
      setMoves((prev) => [...prev, historyItem]);
      setCurrentPly(ply);

      const allSans = [...moves.map((m) => m.san), executedMove.san];
      const matchedOpening = detectOpening(allSans);
      if (matchedOpening) {
        setDetectedOpeningName(`${matchedOpening.eco} ${matchedOpening.name}`);
      }

      checkGameOver(gameCopy);
    },
    [game, gameOverReason, isClockActive, moves, timeControl.increment, checkGameOver]
  );

  // Trigger Engine Move
  useEffect(() => {
    if (
      mode !== "vs-computer" ||
      gameOverReason ||
      game.turn() === playerColor ||
      isBotThinkingRef.current
    ) {
      return;
    }

    isBotThinkingRef.current = true;
    let isCancelled = false;

    const executeMove = async () => {
      // If Level 4 Master bot, attempt Stockfish 19 calculation
      if (bot.id === "engine-master") {
        try {
          const sfEval = await stockfishService.evaluatePosition(game.fen(), 12);
          if (isCancelled) return;
          if (sfEval.bestMoveUci && sfEval.bestMoveUci.length >= 4) {
            const from = sfEval.bestMoveUci.substring(0, 2);
            const to = sfEval.bestMoveUci.substring(2, 4);
            const promo = sfEval.bestMoveUci.length > 4 ? (sfEval.bestMoveUci[4] as "q" | "r" | "b" | "n") : undefined;
            isBotThinkingRef.current = false;
            makeMove({ from, to, promotion: promo });
            return;
          }
        } catch (e) {
          console.warn("Stockfish evaluation fallback to local search:", e);
        }
      }

      const delay = Math.max(250, bot.depth * 130);
      setTimeout(() => {
        if (isCancelled) return;
        const best = findBestMove(game, bot.depth, bot.randomness);
        isBotThinkingRef.current = false;
        if (best && best.move) {
          makeMove({
            from: best.move.from,
            to: best.move.to,
            promotion: best.move.promotion,
          });
        }
      }, delay);
    };

    executeMove();

    return () => {
      isCancelled = true;
      isBotThinkingRef.current = false;
    };
  }, [game, mode, gameOverReason, playerColor, bot, makeMove]);

  // Jump to Ply in Move History
  const handleSelectPly = (ply: number) => {
    const replayGame = new Chess();
    const targetMoves = moves.slice(0, ply);
    for (const m of targetMoves) {
      try {
        replayGame.move(m.san);
      } catch {}
    }
    setGame(replayGame);
    setCurrentPly(ply);
    const score = evaluateBoard(replayGame);
    setEvalScore(score);

    if (targetMoves.length > 0) {
      const verbose = replayGame.history({ verbose: true });
      const lastV = verbose[verbose.length - 1];
      if (lastV) setLastMove({ from: lastV.from, to: lastV.to });
    } else {
      setLastMove(null);
    }
  };

  // Run Game Review with Stockfish 19
  const handleRunAnalysis = async () => {
    const pgn = game.pgn() || moves.map((m) => m.san).join(" ");
    if (!pgn || moves.length === 0) {
      setMode("analysis");
      return;
    }

    setMode("analysis");
    setAnalysisProgress({ active: true, percent: 0, currentPly: 0, totalPlies: moves.length });

    try {
      const report = await stockfishService.analyzeFullGame(pgn, (percent, curr, total) => {
        setAnalysisProgress({ active: true, percent, currentPly: curr, totalPlies: total });
      });
      setAnalysisReport(report);
      setAnalysisPly(report.moves.length);
      setMoves((prev) =>
        prev.map((m, idx) => ({
          ...m,
          grade: report.moves[idx]?.grade,
        }))
      );
    } catch (err) {
      console.warn("Stockfish 19 analysis fallback:", err);
      const fallbackReport = analyzeGame(pgn);
      setAnalysisReport(fallbackReport);
      setAnalysisPly(fallbackReport.moves.length);
      setMoves((prev) =>
        prev.map((m, idx) => ({
          ...m,
          grade: fallbackReport.moves[idx]?.grade,
        }))
      );
    } finally {
      setAnalysisProgress(null);
    }
  };

  // Load PGN
  const handleLoadPgn = async (pgnString: string) => {
    const newG = new Chess();
    try {
      newG.loadPgn(pgnString);
    } catch {}

    const history = newG.history({ verbose: true });
    const moveItems: MoveHistoryItem[] = history.map((m, idx) => ({
      ply: idx + 1,
      moveNumber: Math.floor(idx / 2) + 1,
      san: m.san,
      color: m.color,
    }));

    setGame(newG);
    setMoves(moveItems);
    setCurrentPly(moveItems.length);
    setMode("analysis");
    setGameOverReason("Loaded Game Analysis Complete");

    setAnalysisProgress({ active: true, percent: 0, currentPly: 0, totalPlies: moveItems.length });
    try {
      const report = await stockfishService.analyzeFullGame(pgnString, (percent, curr, total) => {
        setAnalysisProgress({ active: true, percent, currentPly: curr, totalPlies: total });
      });
      setAnalysisReport(report);
      setAnalysisPly(report.moves.length);
      setMoves((prev) =>
        prev.map((m, idx) => ({
          ...m,
          grade: report.moves[idx]?.grade,
        }))
      );
    } catch (err) {
      console.warn("Stockfish 19 analysis fallback:", err);
      const fallbackReport = analyzeGame(pgnString);
      setAnalysisReport(fallbackReport);
      setAnalysisPly(fallbackReport.moves.length);
      setMoves((prev) =>
        prev.map((m, idx) => ({
          ...m,
          grade: fallbackReport.moves[idx]?.grade,
        }))
      );
    } finally {
      setAnalysisProgress(null);
    }
  };

  // Select Imported Game from Chess.com or Lichess
  const handleSelectImportedGame = async (imported: ImportedGame, targetUsername?: string) => {
    const newG = new Chess();
    try {
      newG.loadPgn(imported.pgn);
    } catch {
      console.warn("Could not parse imported PGN directly with chess.js");
    }

    const history = newG.history({ verbose: true });
    const moveItems: MoveHistoryItem[] = history.map((m, idx) => ({
      ply: idx + 1,
      moveNumber: Math.floor(idx / 2) + 1,
      san: m.san,
      color: m.color,
    }));

    let effectivePlayerColor: "w" | "b" = "w";
    if (targetUsername) {
      if (imported.black.username.toLowerCase() === targetUsername.trim().toLowerCase()) {
        effectivePlayerColor = "b";
      }
    }

    const opponentName = effectivePlayerColor === "w" ? imported.black.username : imported.white.username;
    const opponentRating = effectivePlayerColor === "w" ? imported.black.rating : imported.white.rating;

    let userResultOutcome: "win" | "loss" | "draw" = "draw";
    if (imported.result === "1-0") userResultOutcome = effectivePlayerColor === "w" ? "win" : "loss";
    else if (imported.result === "0-1") userResultOutcome = effectivePlayerColor === "b" ? "win" : "loss";

    setGame(newG);
    setMoves(moveItems);
    setCurrentPly(moveItems.length);
    setPlayerColor(effectivePlayerColor);
    setGameOverReason(
      `${imported.white.username} (${imported.white.rating}) vs ${imported.black.username} (${imported.black.rating}) • Result: ${imported.result}`
    );
    setMode("analysis");

    setAnalysisProgress({ active: true, percent: 0, currentPly: 0, totalPlies: moveItems.length });
    try {
      const report = await stockfishService.analyzeFullGame(imported.pgn, (percent, curr, total) => {
        setAnalysisProgress({ active: true, percent, currentPly: curr, totalPlies: total });
      });
      setAnalysisReport(report);
      setAnalysisPly(report.moves.length);
      setMoves((prev) =>
        prev.map((m, idx) => ({
          ...m,
          grade: report.moves[idx]?.grade,
        }))
      );

      // Automatically update player's diagnostic profile and generate personalized drills from this game
      diagnosticService.addAnalyzedGame(report, {
        platform: imported.platform,
        playerColor: effectivePlayerColor,
        opponent: opponentName,
        opponentRating: opponentRating,
        date: imported.date,
        result: imported.result,
        userResultOutcome,
        pgn: imported.pgn,
        openingName: imported.openingName,
        targetPlayerUsername: targetUsername,
      });
    } catch (err) {
      console.warn("Falling back to local analysis:", err);
      const fallbackReport = analyzeGame(imported.pgn);
      setAnalysisReport(fallbackReport);
      setAnalysisPly(fallbackReport.moves.length);
      setMoves((prev) =>
        prev.map((m, idx) => ({
          ...m,
          grade: fallbackReport.moves[idx]?.grade,
        }))
      );

      diagnosticService.addAnalyzedGame(fallbackReport, {
        platform: imported.platform,
        playerColor: effectivePlayerColor,
        opponent: opponentName,
        opponentRating: opponentRating,
        date: imported.date,
        result: imported.result,
        userResultOutcome,
        pgn: imported.pgn,
        openingName: imported.openingName,
        targetPlayerUsername: targetUsername,
      });
    } finally {
      setAnalysisProgress(null);
    }
  };

  const handleBatchImportComplete = () => {
    setPlayerProfile(diagnosticService.getPerformancePlan());
    setMode("training");
  };

  // Add Current Game to Personal Training Plan & Generate Custom Drills
  const handleAddToTrainingPlan = (rep: GameAnalysisReport) => {
    diagnosticService.addAnalyzedGame(rep, {
      platform: "local",
      playerColor: playerColor,
      opponent: bot.name,
      opponentRating: bot.rating,
      date: new Date().toISOString().split("T")[0],
      result: gameOverReason || "Completed Game",
      pgn: game.pgn() || moves.map((m) => m.san).join(" "),
    });
    setPlayerProfile(diagnosticService.getPerformancePlan());
    setMode("training");
    soundManager.playSuccess();
  };

  // Retry Position
  const handleRetryBlunder = (blunder: AnalyzedMove) => {
    const retryGame = new Chess();
    retryGame.load(blunder.fenBefore);
    setGame(retryGame);
    setMode("vs-computer");
    setGameOverReason(null);
    setLastMove(null);
    setPlayerColor(blunder.color);
    setIsFlipped(blunder.color === "b");
  };

  // Preview Engine Continuation on Board (single move or line)
  const handlePreviewEngineMove = (moveOrMoves: string | string[], fenBefore: string) => {
    const previewG = new Chess(fenBefore);
    try {
      const movesList = Array.isArray(moveOrMoves) ? moveOrMoves : [moveOrMoves];
      let lastM: any = null;
      for (const san of movesList) {
        const m = previewG.move(san);
        if (m) lastM = m;
      }
      setGame(previewG);
      if (lastM) {
        setLastMove({ from: lastM.from, to: lastM.to });
      }
      setEvalScore(evaluateBoard(previewG));
    } catch (e) {
      console.warn("Could not preview engine move:", e);
    }
  };

  // Initialize Game
  const handleStartGame = (config: {
    mode: GameMode;
    bot: BotProfile | null;
    playerColor: "w" | "b" | "random";
    timeControl: TimeControl;
  }) => {
    const newG = new Chess();
    setGame(newG);
    setMoves([]);
    setCurrentPly(0);
    setLastMove(null);
    setEvalScore(0);
    setGameOverReason(null);
    setDetectedOpeningName(null);
    setAnalysisReport(null);

    setMode(config.mode);
    if (config.bot) setBot(config.bot);

    let color: "w" | "b" = "w";
    if (config.playerColor === "random") {
      color = Math.random() < 0.5 ? "w" : "b";
    } else {
      color = config.playerColor;
    }
    setPlayerColor(color);
    setIsFlipped(color === "b");

    setTimeControl(config.timeControl);
    const secs = config.timeControl.minutes * 60;
    setWhiteTime(secs);
    setBlackTime(secs);
    setIsClockActive(false);
  };

  // Takeback
  const handleTakeback = () => {
    if (moves.length === 0 || gameOverReason) return;
    const gameCopy = new Chess(game.fen());
    if (mode === "vs-computer" && moves.length >= 2) {
      gameCopy.undo();
      gameCopy.undo();
      const updatedMoves = moves.slice(0, -2);
      setGame(gameCopy);
      setMoves(updatedMoves);
      setCurrentPly(updatedMoves.length);
    } else {
      gameCopy.undo();
      const updatedMoves = moves.slice(0, -1);
      setGame(gameCopy);
      setMoves(updatedMoves);
      setCurrentPly(updatedMoves.length);
    }
    setEvalScore(evaluateBoard(gameCopy));
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col selection:bg-emerald-700 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentMode={mode}
        onSelectMode={(m) => {
          setMode(m);
          if (m === "analysis" && !analysisReport && moves.length > 0) {
            handleRunAnalysis();
          }
        }}
        theme={theme}
        onChangeTheme={setTheme}
        isMuted={isMuted}
        onToggleMute={() => {
          const muted = soundManager.toggleMute();
          setIsMuted(muted);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenCoach={() => setIsAiCoachOpen(true)}
        playerProfile={playerProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
        {/* Stockfish 19 Game Review Progress Banner */}
        {analysisProgress?.active && (
          <div className="mb-4 bg-[#141824] border border-emerald-500/40 p-3.5 rounded-xl shadow-lg flex flex-col gap-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Stockfish 19 Deep Analysis in progress...</span>
              </div>
              <span className="font-mono text-xs text-slate-300">
                Ply {analysisProgress.currentPly} / {analysisProgress.totalPlies} ({analysisProgress.percent}%)
              </span>
            </div>
            <div className="w-full bg-[#202534] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full transition-all duration-150 rounded-full"
                style={{ width: `${analysisProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Game Terminated Notice */}
        {gameOverReason && (
          <div className="mb-4 bg-[#151822] border border-[#2b3142] p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#212634] border border-[#30384c] flex items-center justify-center">
                <Flag className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm tracking-wide">GAME CONCLUDED</h4>
                <p className="text-xs text-slate-300">{gameOverReason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsNewGameModalOpen(true)}
                className="px-3 py-1.5 bg-[#212634] hover:bg-[#2b3245] text-slate-200 text-xs font-semibold rounded-lg border border-[#30384c] transition shadow cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                New Game
              </button>
              <button
                onClick={handleRunAnalysis}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow border border-emerald-500/50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Run Game Review
              </button>
            </div>
          </div>
        )}

        {/* View Router */}
        {mode === "training" ? (
          <TrainingPlanView
            theme={theme}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onLoadGamePgn={handleLoadPgn}
          />
        ) : mode === "puzzles" ? (
          <PuzzlesView theme={theme} customBlunders={analysisReport?.blunderPuzzles} />
        ) : mode === "openings" ? (
          <OpeningExplorer theme={theme} />
        ) : (
          /* Play / Analysis View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Board & Evaluation Bar */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Active Opening Banner */}
              {detectedOpeningName && (
                <div className="w-full max-w-[620px] mb-2 flex items-center gap-2 bg-[#141620] px-3 py-1.5 rounded-lg border border-[#242836] text-xs font-medium text-slate-300 shadow-sm">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{detectedOpeningName}</span>
                </div>
              )}

              <div className="flex gap-2.5 md:gap-3 w-full justify-center">
                {/* Real-time Vertical Evaluation Bar */}
                <EvaluationBar
                  score={evalScore}
                  isFlipped={isFlipped}
                  isCheckmate={game.isCheckmate()}
                  turn={game.turn()}
                />

                {/* Primary Interactive Board */}
                <Chessboard
                  game={game}
                  onMove={makeMove}
                  isFlipped={isFlipped}
                  theme={theme}
                  lastMove={lastMove}
                  interactive={!gameOverReason && (mode === "pass-play" || game.turn() === playerColor)}
                />
              </div>

              {/* Status Bar */}
              <div className="mt-3 w-full max-w-[620px] flex items-center justify-between text-xs text-slate-400 bg-[#11131a] px-4 py-2 rounded-lg border border-[#232733]">
                <div className="flex items-center gap-2 font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      game.turn() === "w" ? "bg-white ring-1 ring-slate-400" : "bg-slate-700 ring-1 ring-slate-600"
                    }`}
                  />
                  <span>
                    {game.turn() === "w" ? "White to move" : "Black to move"}
                    {game.inCheck() && " — In Check"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">
                    Move {Math.floor(moves.length / 2) + 1}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Controls, Move History, or Analysis Report */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {mode === "analysis" && analysisReport ? (
                <AnalysisPanel
                  report={analysisReport}
                  selectedPly={analysisPly}
                  onSelectPly={(ply) => {
                    setAnalysisPly(ply);
                    handleSelectPly(ply);
                  }}
                  onRetryBlunder={handleRetryBlunder}
                  currentFen={game.fen()}
                  pgn={game.pgn() || moves.map((m) => m.san).join(" ")}
                  onLoadPgn={handleLoadPgn}
                  onAddToTrainingPlan={handleAddToTrainingPlan}
                  onOpenCoach={() => setIsAiCoachOpen(true)}
                  onPreviewEngineMove={handlePreviewEngineMove}
                />
              ) : (
                <>
                  <GameControls
                    whiteTime={whiteTime}
                    blackTime={blackTime}
                    turn={game.turn()}
                    isClockActive={isClockActive}
                    bot={mode === "vs-computer" ? bot : null}
                    playerColor={playerColor}
                    isMuted={isMuted}
                    onToggleMute={() => {
                      const muted = soundManager.toggleMute();
                      setIsMuted(muted);
                    }}
                    onFlipBoard={() => setIsFlipped((f) => !f)}
                    onResign={() => {
                      const winner = playerColor === "w" ? "Black" : "White";
                      setGameOverReason(`Player resigned. ${winner} wins.`);
                      soundManager.playBlunder();
                    }}
                    onDraw={() => {
                      setGameOverReason("Game concluded by mutual draw.");
                    }}
                    onTakeback={handleTakeback}
                    onNewGame={() => setIsNewGameModalOpen(true)}
                    onAnalyzeGame={handleRunAnalysis}
                    canTakeback={moves.length > 0}
                    isGameOver={!!gameOverReason}
                  />

                  {/* Move History */}
                  <div className="bg-[#161821] p-3 rounded-xl border border-[#2d3342] shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Score Sheet Notation
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {moves.length} plies
                      </span>
                    </div>
                    <MoveHistory
                      moves={moves}
                      currentPly={currentPly}
                      onSelectPly={handleSelectPly}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Game Setup Modal */}
      <NewGameModal
        isOpen={isNewGameModalOpen}
        onClose={() => setIsNewGameModalOpen(false)}
        onStartGame={handleStartGame}
        initialMode={mode === "pass-play" ? "pass-play" : "vs-computer"}
      />

      {/* Online Platform Game Importer Modal */}
      <ImportGamesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSelectGame={handleSelectImportedGame}
        onBatchImportComplete={handleBatchImportComplete}
      />

      {/* Grandmaster AI Coach Drawer */}
      <AiCoachDrawer
        isOpen={isAiCoachOpen}
        onClose={() => setIsAiCoachOpen(false)}
        context={{
          fen: game.fen(),
          turn: game.turn(),
          currentPly,
          moveNumber: Math.floor(currentPly / 2) + 1,
          playedMove:
            mode === "analysis" && analysisReport && analysisReport.moves[analysisPly - 1]
              ? {
                  san: analysisReport.moves[analysisPly - 1].san,
                  grade: analysisReport.moves[analysisPly - 1].grade,
                  eval: analysisReport.moves[analysisPly - 1].evalAfter,
                  explanation: analysisReport.moves[analysisPly - 1].explanation,
                }
              : undefined,
          engineMove:
            mode === "analysis" && analysisReport && analysisReport.moves[analysisPly - 1]
              ? {
                  san: analysisReport.moves[analysisPly - 1].bestMoveSan,
                  eval: analysisReport.moves[analysisPly - 1].evalBefore,
                }
              : undefined,
          openingName: detectedOpeningName || undefined,
          playerRating: diagnosticService.getPerformancePlan().overallRating,
          weaknesses: diagnosticService.getPerformancePlan().weaknesses,
          strengths: diagnosticService.getPerformancePlan().strengths,
          competenciesSummary: `Opening: ${diagnosticService.getPerformancePlan().competencies.opening.score}/100, Tactics: ${diagnosticService.getPerformancePlan().competencies.tactics.score}/100, Endgame: ${diagnosticService.getPerformancePlan().competencies.endgame.score}/100`,
        }}
      />

      {/* Player Profile & Diagnostics Modal */}
      <PlayerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        plan={playerProfile}
        onPlanUpdated={(updated) => setPlayerProfile(updated)}
        onNavigateToTraining={() => setMode("training")}
        onOpenImportGames={() => setIsImportModalOpen(true)}
      />

      {/* Quick-Access Floating AI Coach Trigger */}
      <button
        onClick={() => setIsAiCoachOpen(true)}
        title="Consult Grandmaster AI Coach"
        className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white px-3.5 py-2.5 rounded-full shadow-2xl border border-emerald-400/40 flex items-center gap-2 cursor-pointer transition hover:scale-105 active:scale-95 group"
      >
        <Bot className="w-4 h-4 text-emerald-300" />
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">Ask AI Coach</span>
      </button>
    </div>
  );
}

export default App;
