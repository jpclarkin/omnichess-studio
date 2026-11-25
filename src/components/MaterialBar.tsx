import React, { useMemo } from "react";
import type { Chess } from "chess.js";
import { ChessPiece } from "./ChessPiece";

type PieceType = "p" | "n" | "b" | "r" | "q";
const VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const START: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
// Display order: most valuable first
const ORDER: PieceType[] = ["q", "r", "b", "n", "p"];

interface MaterialBarProps {
  game: Chess;
  isFlipped?: boolean;
  className?: string;
}

/** Pieces each side has captured (derived from the current position) and the material difference. */
export const MaterialBar: React.FC<MaterialBarProps> = ({ game, isFlipped = false, className = "" }) => {
  const fen = game.fen();
  const { capturedByWhite, capturedByBlack, diff } = useMemo(() => {
    const onBoard = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    for (const row of game.board()) {
      for (const sq of row) {
        if (sq && sq.type !== "k") onBoard[sq.color][sq.type as PieceType]++;
      }
    }
    // Captured = starting count minus remaining. Promotions can make this negative; clamp at 0.
    const missing = (color: "w" | "b") =>
      ORDER.flatMap((t) => Array<PieceType>(Math.max(0, START[t] - onBoard[color][t])).fill(t));
    const total = (color: "w" | "b") => ORDER.reduce((s, t) => s + VALUES[t] * onBoard[color][t], 0);
    return {
      capturedByWhite: missing("b"), // black pieces white has taken
      capturedByBlack: missing("w"),
      diff: total("w") - total("b"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const side = (label: string, captured: PieceType[], capturedColor: "w" | "b", lead: number) => (
    <div className="flex items-center gap-1.5 min-w-0" title={`${label} has captured ${captured.length} piece${captured.length === 1 ? "" : "s"}`}>
      <span className="text-[11px] text-slate-500 font-medium shrink-0">{label}</span>
      <div className="flex items-center -space-x-1.5 min-w-0 h-5">
        {captured.map((t, i) => (
          <ChessPiece key={i} type={t} color={capturedColor} className="w-5 h-5 shrink-0 select-none pointer-events-none" />
        ))}
      </div>
      {lead > 0 && <span className="text-[11px] font-mono font-semibold text-emerald-400 shrink-0">+{lead}</span>}
    </div>
  );

  const white = side("White", capturedByWhite, "b", Math.max(0, diff));
  const black = side("Black", capturedByBlack, "w", Math.max(0, -diff));

  return (
    <div
      className={`flex items-center justify-between gap-3 bg-[#11131a] px-3 py-1 rounded-lg border border-[#232733] min-h-[30px] ${className}`}
    >
      {isFlipped ? black : white}
      {isFlipped ? white : black}
    </div>
  );
};
