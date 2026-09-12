import React, { useState } from "react";
import { fetchChessComGames, fetchLichessGames, type ImportedGame } from "../services/platformImportService";
import { analyzeGame } from "../engine/analysisEngine";
import { diagnosticService, type BatchGameItem } from "../services/diagnosticService";
import type { PerformancePlan } from "../types/chess";
import {
  X,
  Search,
  Loader2,
  ExternalLink,
  Play,
  Globe,
  AlertCircle,
  CheckSquare,
  Square,
  GraduationCap,
  CheckCircle2,
  Award,
  ArrowRight,
} from "lucide-react";

interface ImportGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: ImportedGame, targetUsername?: string) => void;
  onBatchImportComplete?: (plan: PerformancePlan, targetUsername: string) => void;
  defaultUsername?: string;
  defaultPlatform?: "chess.com" | "lichess";
}

export const ImportGamesModal: React.FC<ImportGamesModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
  onBatchImportComplete,
  defaultUsername = "",
  defaultPlatform = "chess.com",
}) => {
  const [platform, setPlatform] = useState<"chess.com" | "lichess">(defaultPlatform);
  const [username, setUsername] = useState(defaultUsername);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<ImportedGame[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

  // Batch analysis state
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    gameTitle: string;
    stage: string;
  } | null>(null);
  const [batchResultPlan, setBatchResultPlan] = useState<PerformancePlan | null>(null);

  if (!isOpen) return null;

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setError("Please specify a player username.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGames([]);
    setSelectedGameIds(new Set());
    setBatchResultPlan(null);

    try {
      let fetched: ImportedGame[] = [];
      if (platform === "chess.com") {
        fetched = await fetchChessComGames(cleanUser);
      } else {
        fetched = await fetchLichessGames(cleanUser);
      }
      setGames(fetched);
      // Select all by default for one-click comprehensive profiling
      setSelectedGameIds(new Set(fetched.map((g) => g.id)));
    } catch (err: any) {
      setError(err?.message || "An error occurred while fetching player games.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (name: string, targetPlatform: "chess.com" | "lichess") => {
    setUsername(name);
    setPlatform(targetPlatform);
    setBatchResultPlan(null);
  };

  const toggleSelectGame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGameIds.size === games.length) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(games.map((g) => g.id)));
    }
  };

  // Run multi-game batch analysis to build comprehensive profile and drills
  const handleBatchIntegrate = async () => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || selectedGameIds.size === 0) return;

    const targetGames = games.filter((g) => selectedGameIds.has(g.id));
    setIsBatchAnalyzing(true);
    setError(null);

    const batchItems: BatchGameItem[] = [];

    try {
      for (let i = 0; i < targetGames.length; i++) {
        const game = targetGames[i];
        const isWhite = game.white.username.toLowerCase() === cleanUser;
        const isBlack = game.black.username.toLowerCase() === cleanUser;
        const playerColor: "w" | "b" = isWhite ? "w" : isBlack ? "b" : "w";
        const opponentName = playerColor === "w" ? game.black.username : game.white.username;
        const opponentRating = playerColor === "w" ? game.black.rating : game.white.rating;
        const playerRating = playerColor === "w" ? game.white.rating : game.black.rating;

        // Determine user outcome
        let userResultOutcome: "win" | "loss" | "draw" = "draw";
        if (game.result === "1-0") userResultOutcome = playerColor === "w" ? "win" : "loss";
        else if (game.result === "0-1") userResultOutcome = playerColor === "b" ? "win" : "loss";

        setBatchProgress({
          current: i + 1,
          total: targetGames.length,
          gameTitle: `${game.white.username} vs ${game.black.username}`,
          stage: `Analyzing move accuracy, tactical blunders & opening deviations...`,
        });

        // Yield execution to allow UI animation
        await new Promise((resolve) => setTimeout(resolve, 35));

        const report = analyzeGame(game.pgn, { fast: true });
        batchItems.push({
          report,
          platform: game.platform,
          playerColor,
          title: `${playerColor === "w" ? "White" : "Black"} vs ${opponentName}`,
          opponent: opponentName,
          opponentRating,
          playerRating,
          date: game.date,
          result: game.result,
          userResultOutcome,
          pgn: game.pgn,
          openingName: game.openingName,
        });
      }

      // Ingest all games simultaneously into the diagnostic profile
      const updatedPlan = diagnosticService.addAnalyzedGamesBatch(batchItems, {
        username: username.trim(),
        platform,
        clearPrevious: false,
      });

      setBatchResultPlan(updatedPlan);
    } catch (err: any) {
      console.error("Batch integration failed:", err);
      setError(err?.message || "Failed to analyze game batch.");
    } finally {
      setIsBatchAnalyzing(false);
      setBatchProgress(null);
    }
  };

  const handleFinishAndOpenPlan = () => {
    if (batchResultPlan) {
      onBatchImportComplete?.(batchResultPlan, username.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161821] p-5 md:p-6 rounded-xl border border-[#333a4d] shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262a36] shrink-0 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#222736] border border-[#333a4d] flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm md:text-base">
                Import Playing History & Auto-Build Profile
              </h3>
              <p className="text-xs text-slate-400">
                Ingest multiple games from Chess.com or Lichess to calibrate your 7-day training plan and drills
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#222736] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BATCH COMPLETION SUCCESS SCREEN */}
        {batchResultPlan ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white">
                Player Profile Constructed for {batchResultPlan.playerName}!
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Stockfish 19 analyzed {selectedGameIds.size} games from {platform.toUpperCase()}. Your skill radar, 7-day regimen, and personalized drill lab are ready.
              </p>
            </div>

            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-lg mt-2">
              <div className="bg-[#10121a] border border-[#262c3d] p-3 rounded-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-mono text-slate-400">Games Ingested</span>
                <span className="text-base font-bold font-mono text-white">{selectedGameIds.size}</span>
              </div>
              <div className="bg-[#10121a] border border-[#262c3d] p-3 rounded-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-mono text-slate-400">Est. Elo</span>
                <span className="text-base font-bold font-mono text-emerald-400">{batchResultPlan.overallRating}</span>
              </div>
              <div className="bg-[#10121a] border border-[#262c3d] p-3 rounded-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-mono text-slate-400">Avg Accuracy</span>
                <span className="text-base font-bold font-mono text-slate-200">{batchResultPlan.overallAccuracyAvg}%</span>
              </div>
              <div className="bg-[#10121a] border border-[#262c3d] p-3 rounded-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-mono text-slate-400">Record</span>
                <span className="text-base font-bold font-mono text-teal-300">
                  {batchResultPlan.winLossRecord ? `${batchResultPlan.winLossRecord.wins}W-${batchResultPlan.winLossRecord.losses}L` : "Analyzed"}
                </span>
              </div>
            </div>

            <div className="bg-[#121520] border border-emerald-900/40 p-3 rounded-xl max-w-lg w-full text-left text-xs text-slate-300 flex items-start gap-2">
              <Award className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Generated Custom Curriculum: </span>
                <span>
                  Extracted {batchResultPlan.drills.length} tactical drills directly from your critical positions and blunders.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setBatchResultPlan(null)}
                className="px-4 py-2 bg-[#202534] hover:bg-[#282f42] text-slate-300 text-xs font-semibold rounded-lg border border-[#30384c] transition cursor-pointer"
              >
                Inspect Games List
              </button>
              <button
                onClick={handleFinishAndOpenPlan}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 transition cursor-pointer"
              >
                <span>Open Training Plan & Drill Lab</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : isBatchAnalyzing && batchProgress ? (
          /* BATCH PROCESSING PROGRESS SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1c2233] border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse shadow-lg">
              <GraduationCap className="w-7 h-7" />
            </div>

            <div className="max-w-md w-full">
              <h4 className="text-base font-bold text-white">
                Analyzing Playing History for {username}...
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                Game {batchProgress.current} of {batchProgress.total}: {batchProgress.gameTitle}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-[#12141c] h-3 rounded-full overflow-hidden border border-[#2b3346] mt-4 mb-2">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>{batchProgress.stage}</span>
                <span className="font-bold text-emerald-400">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD SEARCH & LIST VIEW */
          <>
            {/* Platform Selector & Username Search */}
            <form onSubmit={handleFetch} className="shrink-0 mb-3 flex flex-col gap-2.5">
              {/* Platform Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlatform("chess.com");
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    platform === "chess.com"
                      ? "bg-[#222736] text-emerald-300 border-emerald-500 shadow-sm"
                      : "bg-[#11131a] text-slate-400 border-[#232733] hover:bg-[#1a1d28]"
                  }`}
                >
                  <span>Chess.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlatform("lichess");
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    platform === "lichess"
                      ? "bg-[#222736] text-emerald-300 border-emerald-500 shadow-sm"
                      : "bg-[#11131a] text-slate-400 border-[#232733] hover:bg-[#1a1d28]"
                  }`}
                >
                  <span>Lichess.org</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`Enter ${platform === "chess.com" ? "Chess.com" : "Lichess"} username...`}
                    className="w-full bg-[#11131a] text-slate-200 text-xs pl-9 pr-3 py-2 rounded-lg border border-[#2e3444] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>{isLoading ? "Fetching..." : "Fetch Games"}</span>
                </button>
              </div>

              {/* Example Shortcuts */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>GM Benchmarks:</span>
                {platform === "chess.com" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect("Hikaru", "chess.com")}
                      className="text-emerald-400 hover:underline font-mono"
                    >
                      Hikaru
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect("MagnusCarlsen", "chess.com")}
                      className="text-emerald-400 hover:underline font-mono"
                    >
                      MagnusCarlsen
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect("nihalsarin2004", "lichess")}
                      className="text-emerald-400 hover:underline font-mono"
                    >
                      nihalsarin2004
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect("penguingm1", "lichess")}
                      className="text-emerald-400 hover:underline font-mono"
                    >
                      penguingm1
                    </button>
                  </>
                )}
              </div>
            </form>

            {/* Error Notification */}
            {error && (
              <div className="shrink-0 mb-3 bg-red-950/40 border border-red-900/50 p-2.5 rounded-lg flex items-start gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Multi-Select & Batch Ingestion Action Bar */}
            {games.length > 0 && (
              <div className="shrink-0 mb-2 p-2.5 bg-[#12141d] border border-[#2a3040] rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    {selectedGameIds.size === games.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-medium">
                      {selectedGameIds.size === games.length ? "All Selected" : "Select All"} ({selectedGameIds.size}/{games.length})
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleBatchIntegrate}
                  disabled={selectedGameIds.size === 0}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Auto-Build Profile ({selectedGameIds.size} Games)</span>
                </button>
              </div>
            )}

            {/* Games List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
              {games.length === 0 && !isLoading && !error && (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                  Enter a username above to load their latest tournament & rated games archive
                </div>
              )}

              {isLoading && (
                <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Querying {platform} archives...</span>
                </div>
              )}

              {games.map((game) => {
                const isSelected = selectedGameIds.has(game.id);
                const cleanUser = username.trim().toLowerCase();
                const isWhite = game.white.username.toLowerCase() === cleanUser;
                const isBlack = game.black.username.toLowerCase() === cleanUser;
                const playerColor = isWhite ? "w" : isBlack ? "b" : "w";

                let outcomeBadge = "D";
                let outcomeClass = "bg-slate-800 text-slate-300 border-slate-700";
                if (game.result === "1-0") {
                  outcomeBadge = playerColor === "w" ? "WIN" : "LOSS";
                  outcomeClass = playerColor === "w" ? "bg-emerald-950 text-emerald-300 border-emerald-700" : "bg-rose-950 text-rose-300 border-rose-800";
                } else if (game.result === "0-1") {
                  outcomeBadge = playerColor === "b" ? "WIN" : "LOSS";
                  outcomeClass = playerColor === "b" ? "bg-emerald-950 text-emerald-300 border-emerald-700" : "bg-rose-950 text-rose-300 border-rose-800";
                }

                return (
                  <div
                    key={game.id}
                    onClick={(e) => toggleSelectGame(game.id, e)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-[#181d29] border-emerald-500/60 shadow-sm"
                        : "bg-[#11131a] hover:bg-[#151822] border-[#232733]"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectGame(game.id, e)}
                        className="text-slate-400 hover:text-white cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${outcomeClass}`}>
                            {outcomeBadge}
                          </span>
                          <span className="text-[10px] uppercase font-mono text-slate-300 bg-[#222736] px-1.5 py-0.2 rounded border border-[#333a4d]">
                            {game.timeControl}
                          </span>
                          <span className="text-[11px] text-slate-400">{game.date}</span>
                          {game.openingName && (
                            <span className="text-[11px] text-slate-300 font-medium truncate max-w-[200px]">
                              • {game.openingName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <span className="w-2 h-2 rounded-full bg-white ring-1 ring-slate-400" />
                            <span className={`${isWhite ? "text-emerald-300 font-bold" : "text-white"} truncate`}>
                              {game.white.username}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">({game.white.rating})</span>
                          </div>
                          <span className="text-slate-500 font-mono text-[11px]">vs</span>
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <span className="w-2 h-2 rounded-full bg-slate-800 ring-1 ring-slate-600" />
                            <span className={`${isBlack ? "text-emerald-300 font-bold" : "text-white"} truncate`}>
                              {game.black.username}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">({game.black.rating})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-200 bg-[#171a24] px-2 py-1 rounded border border-[#2b3040]">
                        {game.result}
                      </span>
                      {game.url && (
                        <a
                          href={game.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-[#171a24] hover:bg-[#222736] text-slate-400 hover:text-slate-200 rounded-lg border border-[#2b3040] transition"
                          title="View on platform"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectGame(game, username.trim());
                          onClose();
                        }}
                        className="p-1.5 bg-[#222736] group-hover:bg-emerald-700 text-slate-300 group-hover:text-white rounded-lg transition"
                        title="Review this individual game in Stockfish 19"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
