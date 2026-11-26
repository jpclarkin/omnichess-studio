import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "./components/Chessboard";
import { EvaluationBar } from "./components/EvaluationBar";
import { MaterialBar } from "./components/MaterialBar";
import { MoveHistory, type MoveHistoryItem } from "./components/MoveHistory";
import { GameControls } from "./components/GameControls";
import { AnalysisPanel } from "./components/AnalysisPanel";
// Secondary views load on demand to keep the initial bundle small.
const PuzzlesView = lazy(() => import("./components/PuzzlesView").then((m) => ({ default: m.PuzzlesView })));
const OpeningExplorer = lazy(() => import("./components/OpeningExplorer").then((m) => ({ default: m.OpeningExplorer })));
const ImproveView = lazy(() => import("./components/improve/ImproveView").then((m) => ({ default: m.ImproveView })));
import { AiCoachDrawer } from "./components/AiCoachDrawer";
import { Navbar } from "./components/Navbar";
import { NewGameModal } from "./components/NewGameModal";
import { soundManager } from "./audio/soundManager";
import { analyzeGame, scoreToDisplayCp } from "./engine/gameAnalysis";
import { EngineCancelled, stockfishService } from "./engine/stockfishService";
import { gameStore } from "./services/gameStore";
import { syncService } from "./services/syncService";
import { loadPlan } from "./services/coachPlan";
import { detectOpening } from "./data/openings";
import { BOT_PROFILES, TIME_CONTROLS } from "./data/bots";
import type { GameMode, BoardTheme, BotProfile, TimeControl, GameAnalysisReport, AnalyzedMove } from "./types/chess";
import { BarChart2, BookOpen, Flag, RefreshCw, Loader2, Bot, AlertTriangle, Eye, EyeOff } from "lucide-react";

export function App() {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [mode, setMode] = useState<GameMode>("vs-computer");
  const [theme, setTheme] = useState<BoardTheme>("emerald");
  const [isMuted, setIsMuted] = useState(false);

  // Bot & Player State
  const [bot, setBot] = useState<BotProfile>(BOT_PROFILES[2]);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [isFlipped, setIsFlipped] = useState(false);

  // Move tracking & Evaluation
  const [moves, setMoves] = useState<MoveHistoryItem[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [showEvalBar, setShowEvalBar] = useState<boolean>(() => localStorage.getItem("omnichess.showEvalBar") !== "false");
  const toggleEvalBar = () =>
    setShowEvalBar((v) => {
      localStorage.setItem("omnichess.showEvalBar", String(!v));
      return !v;
    });
  const [detectedOpeningName, setDetectedOpeningName] = useState<string | null>(null);

  // Time & Clocks
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[3]); // 10 min
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isClockActive, setIsClockActive] = useState<boolean>(false);

  // Modals & Analysis
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [engineReady, setEngineReady] = useState(stockfishService.isReady());
  const [engineFailed, setEngineFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set when Game Review shows a game from "My games" (so it isn't saved twice). */
  const [storedGameId, setStoredGameId] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<GameAnalysisReport | null>(null);
  /** Time control of the game under review (known for synced games), for the performance estimate. */
  const [reviewTimeClass, setReviewTimeClass] = useState<string | null>(null);
  const [analysisPly, setAnalysisPly] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<{
    active: boolean;
    percent: number;
    currentPly: number;
    totalPlies: number;
  } | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  const isBotThinkingRef = useRef(false);

  // Start Stockfish, then check for new games from Chess.com / Lichess.
  useEffect(() => {
    const off = stockfishService.onStatusChange(() => setEngineReady(stockfishService.isReady()));
    void stockfishService.init().then((ok) => {
      setEngineReady(ok);
      setEngineFailed(!ok);
      if (ok) syncService.maybeAutoSync();
    });
    return () => {
      off();
    };
  }, []);

  // Live evaluation bar: Stockfish on the position currently shown.
  const fen = game.fen();
  useEffect(() => {
    if (!engineReady) return;
    let alive = true;
    stockfishService
      .analyze(fen, { depth: 14 }, { priority: "high", key: "live-eval" })
      .then((r) => {
        if (alive && r.source === "stockfish" && r.lines[0]) setEvalScore(scoreToDisplayCp(r.lines[0].score));
      })
      .catch((e) => {
        if (!(e instanceof EngineCancelled)) console.warn(e);
      });
    return () => {
      alive = false;
    };
  }, [fen, engineReady]);

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
      const res = await stockfishService
        .analyze(
          game.fen(),
          { movetime: bot.engine.movetime, elo: bot.engine.elo ?? null, skill: bot.engine.skill ?? null },
          { priority: "high", key: "bot-move" }
        )
        .catch(() => null);
      if (isCancelled || !res) return;
      isBotThinkingRef.current = false;
      if (res.source !== "stockfish" || !res.bestMoveUci) {
        setNotice("Stockfish isn't available in this browser, so the computer can't move. Try reloading the page.");
        return;
      }
      const u = res.bestMoveUci;
      makeMove({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    };

    executeMove();

    return () => {
      isCancelled = true;
      isBotThinkingRef.current = false;
    };
  }, [game, mode, gameOverReason, playerColor, bot, makeMove]);

  // Jump to Ply in Move History
  const handleSelectPly = (ply: number, sans: string[] = moves.map((m) => m.san)) => {
    const replayGame = new Chess();
    const targetMoves = sans.slice(0, ply);
    for (const san of targetMoves) {
      try {
        replayGame.move(san);
      } catch {}
    }
    setGame(replayGame);
    setCurrentPly(ply);

    if (targetMoves.length > 0) {
      const verbose = replayGame.history({ verbose: true });
      const lastV = verbose[verbose.length - 1];
      if (lastV) setLastMove({ from: lastV.from, to: lastV.to });
    } else {
      setLastMove(null);
    }
  };

  const applyReport = (report: GameAnalysisReport, ply?: number) => {
    setAnalysisReport(report);
    setAnalysisPly(ply ?? report.moves.length);
    setMoves((prev) => prev.map((m, idx) => ({ ...m, grade: report.moves[idx]?.grade })));
  };

  const runReview = async (pgnOrSans: string | string[], totalPlies: number) => {
    setAnalysisProgress({ active: true, percent: 0, currentPly: 0, totalPlies });
    try {
      const report = await analyzeGame(pgnOrSans, {
        depth: 14,
        priority: "high",
        onProgress: (percent, curr, total) => setAnalysisProgress({ active: true, percent, currentPly: curr, totalPlies: total }),
      });
      applyReport(report);
    } catch (err) {
      console.warn("Game review failed:", err);
      setNotice((err as Error).message || "Game review failed.");
    } finally {
      setAnalysisProgress(null);
    }
  };

  // Run Game Review with Stockfish on the game on the board
  const handleRunAnalysis = async () => {
    setMode("analysis");
    if (storedGameId && analysisReport) return; // already analyzed in the background
    if (moves.length === 0) return;
    await runReview(moves.map((m) => m.san), moves.length);
  };

  const loadMovesFromPgn = (pgnString: string): Chess | null => {
    const newG = new Chess();
    try {
      newG.loadPgn(pgnString);
    } catch {
      setNotice("That PGN couldn't be read.");
      return null;
    }
    const history = newG.history({ verbose: true });
    setGame(newG);
    setMoves(history.map((m, idx) => ({ ply: idx + 1, moveNumber: Math.floor(idx / 2) + 1, san: m.san, color: m.color })));
    setCurrentPly(history.length);
    const last = history[history.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
    return newG;
  };

  // Load a pasted PGN and review it
  const handleLoadPgn = async (pgnString: string) => {
    setStoredGameId(null);
    const g = loadMovesFromPgn(pgnString);
    if (!g) return;
    setMode("analysis");
    setGameOverReason("Loaded game");
    await runReview(pgnString, g.history().length);
  };

  // Open a synced game (already analyzed in the background) in Game Review
  const handleOpenStoredGame = async (gameId: string, ply?: number) => {
    const rec = await gameStore.get(gameId);
    if (!rec) return;
    const g = loadMovesFromPgn(rec.pgn);
    if (!g) return;
    setStoredGameId(rec.id);
    setReviewTimeClass(rec.timeClass);
    setPlayerColor(rec.playerColor);
    setIsFlipped(rec.playerColor === "b");
    setDetectedOpeningName(rec.openingName ? `${rec.eco ?? ""} ${rec.openingName}`.trim() : null);
    setGameOverReason(
      `${rec.white.name}${rec.white.rating ? ` (${rec.white.rating})` : ""} vs ${rec.black.name}${rec.black.rating ? ` (${rec.black.rating})` : ""} • You ${rec.outcome === "draw" ? "drew" : rec.outcome === "win" ? "won" : "lost"} (${rec.termination})`
    );
    setMode("analysis");
    if (rec.analysis) {
      applyReport(rec.analysis, ply);
      if (ply !== undefined) handleSelectPly(ply, g.history());
    } else {
      await runReview(rec.pgn, g.history().length);
    }
  };

  // Save the reviewed game into "My games" so it feeds your improvement plan
  const handleAddToTrainingPlan = async (rep: GameAnalysisReport) => {
    const resultText = gameOverReason ?? "";
    const outcome = /white wins/i.test(resultText)
      ? playerColor === "w" ? "win" : "loss"
      : /black wins/i.test(resultText)
        ? playerColor === "b" ? "win" : "loss"
        : "draw";
    await gameStore.put({
      id: `local:${Date.now()}`,
      platform: "local",
      url: "",
      endTime: Date.now(),
      timeClass: "unknown",
      initialSeconds: timeControl.minutes ? timeControl.minutes * 60 : null,
      rated: false,
      white: { name: playerColor === "w" ? "You" : bot.name, rating: null },
      black: { name: playerColor === "b" ? "You" : bot.name, rating: null },
      playerColor,
      outcome,
      termination: resultText || "unfinished",
      eco: null,
      openingName: detectedOpeningName,
      pgn: game.pgn(),
      analysis: rep,
    });
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
    setStoredGameId(null);
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
        onOpenCoach={() => setIsAiCoachOpen(true)}
        engineLabel={engineReady ? stockfishService.getEngineName() : null}
        engineError={engineFailed}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-4 flex flex-col justify-start">
        {notice && (
          <div className="mb-4 bg-amber-950/40 border border-amber-700/50 p-3 rounded-xl text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice(null)} className="text-amber-300 cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Game Review Progress Banner */}
        {analysisProgress?.active && (
          <div className="mb-4 bg-[#141824] border border-emerald-500/40 p-3.5 rounded-xl shadow-lg flex flex-col gap-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Analyzing with {stockfishService.getEngineName()}…</span>
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

        {/* Game Terminated Notice: only where the finished game's board is on screen */}
        {gameOverReason && (mode === "vs-computer" || mode === "pass-play" || mode === "analysis") && (
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
        {mode === "training" || mode === "puzzles" || mode === "openings" ? (
          <Suspense fallback={<div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}>
            {mode === "training" ? (
              <ImproveView theme={theme} onOpenGame={(id, ply) => void handleOpenStoredGame(id, ply)} />
            ) : mode === "puzzles" ? (
              <PuzzlesView theme={theme} />
            ) : (
              <OpeningExplorer theme={theme} />
            )}
          </Suspense>
        ) : (
          /* Play / Analysis View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Board & Evaluation Bar */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Active Opening Banner */}
              {detectedOpeningName && (
                <div className="w-full max-w-[var(--board-size)] mb-2 flex items-center gap-2 bg-[#141620] px-3 py-1.5 rounded-lg border border-[#242836] text-xs font-medium text-slate-300 shadow-sm">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{detectedOpeningName}</span>
                </div>
              )}

              <div className="flex gap-2.5 md:gap-3 w-full justify-center">
                {/* Real-time Vertical Evaluation Bar */}
                {showEvalBar && (
                  <EvaluationBar
                    score={evalScore}
                    isFlipped={isFlipped}
                    isCheckmate={game.isCheckmate()}
                    turn={game.turn()}
                  />
                )}

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

              {/* Material / captured pieces */}
              <MaterialBar game={game} isFlipped={isFlipped} className="mt-2 w-full max-w-[var(--board-size)]" />

              {/* Status Bar */}
              <div className="mt-2 w-full max-w-[var(--board-size)] flex items-center justify-between text-xs text-slate-400 bg-[#11131a] px-4 py-2 rounded-lg border border-[#232733]">
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

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleEvalBar}
                    title={showEvalBar ? "Hide evaluation bar" : "Show evaluation bar"}
                    aria-pressed={showEvalBar}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer transition"
                  >
                    {showEvalBar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Eval bar</span>
                  </button>
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
                  timeClass={storedGameId ? reviewTimeClass : null}
                  selectedPly={analysisPly}
                  onSelectPly={(ply) => {
                    setAnalysisPly(ply);
                    handleSelectPly(ply);
                  }}
                  onRetryBlunder={handleRetryBlunder}
                  currentFen={game.fen()}
                  pgn={game.pgn() || moves.map((m) => m.san).join(" ")}
                  onLoadPgn={handleLoadPgn}
                  onAddToTrainingPlan={storedGameId ? undefined : handleAddToTrainingPlan}
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

      {/* AI Coach Drawer */}
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
          weaknesses: loadPlan()?.focus.map((f) => `${f.title} — ${f.evidence}`) ?? [],
        }}
      />

      {/* Quick-Access Floating AI Coach Trigger */}
      <button
        onClick={() => setIsAiCoachOpen(true)}
        title="Ask the AI coach"
        className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white px-3.5 py-2.5 rounded-full shadow-2xl border border-emerald-400/40 flex items-center gap-2 cursor-pointer transition hover:scale-105 active:scale-95 group"
      >
        <Bot className="w-4 h-4 text-emerald-300" />
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">Ask AI Coach</span>
      </button>
    </div>
  );
}

export default App;
