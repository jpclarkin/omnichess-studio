import React from "react";

interface EvaluationBarProps {
  score: number; // Centipawns (+ for White, - for Black)
  isFlipped?: boolean;
  isCheckmate?: boolean;
  turn?: "w" | "b";
  className?: string;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  score,
  isFlipped = false,
  isCheckmate = false,
  turn = "w",
  className = "",
}) => {
  // Sigmoid formula to map centipawns to percentage between 5% and 95%
  // 0 -> 50%
  // +500 (5 pawns) -> ~85%
  // -500 -> ~15%
  let whitePercent = 50;
  let label = "0.0";

  if (isCheckmate) {
    if (turn === "b") {
      // White delivered mate
      whitePercent = 100;
      label = "1-0";
    } else {
      whitePercent = 0;
      label = "0-1";
    }
  } else if (Math.abs(score) >= 20000) {
    const isWhiteWinning = score > 0;
    whitePercent = isWhiteWinning ? 98 : 2;
    label = isWhiteWinning ? "+M" : "-M";
  } else {
    // Normal centipawns
    const cappedScore = Math.max(-1500, Math.min(1500, score));
    whitePercent = 50 + (2 / (1 + Math.exp(-0.0035 * cappedScore)) - 1) * 45;
    whitePercent = Math.max(5, Math.min(95, whitePercent));
    const pawnVal = (score / 100).toFixed(1);
    label = score > 0 ? `+${pawnVal}` : pawnVal;
    if (label === "+0.0" || label === "-0.0") label = "0.0";
  }

  // If flipped, invert white display position
  const topPercent = isFlipped ? whitePercent : 100 - whitePercent;

  return (
    <div
      className={`relative w-8 md:w-9 bg-[#1e222d] rounded-lg overflow-hidden border border-[#2d3342] shadow-inner flex flex-col justify-between select-none ${className}`}
      title={`Engine Evaluation: ${label}`}
    >
      {/* Black portion */}
      <div
        className="w-full bg-[#1b1e28] transition-all duration-300 ease-out"
        style={{ height: `${topPercent}%` }}
      />
      {/* White portion */}
      <div
        className="w-full bg-[#f1f5f9] transition-all duration-300 ease-out"
        style={{ height: `${100 - topPercent}%` }}
      />

      {/* Floating Eval Pill */}
      <div
        className="absolute inset-x-0 mx-auto text-center pointer-events-none transition-all duration-300"
        style={{
          top: `${Math.max(12, Math.min(88, topPercent))}%`,
          transform: "translateY(-50%)",
        }}
      >
        <span
          className={`text-[10px] md:text-xs font-bold px-1 py-0.5 rounded shadow ${
            whitePercent >= 50
              ? "bg-[#0f172a] text-white border border-[#334155]"
              : "bg-white text-slate-900 border border-slate-300"
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
