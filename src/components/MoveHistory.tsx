import React, { useEffect, useRef } from "react";
import type { MoveGrade } from "../types/chess";

export interface MoveHistoryItem {
  ply: number;
  moveNumber: number;
  san: string;
  color: "w" | "b";
  grade?: MoveGrade;
}

interface MoveHistoryProps {
  moves: MoveHistoryItem[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentPly,
  onSelectPly,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length]);

  const rows: { number: number; white?: MoveHistoryItem; black?: MoveHistoryItem }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const renderBadge = (grade?: MoveGrade) => {
    if (!grade) return null;
    const badgeMap: Record<MoveGrade, { glyph: string; bg: string; title: string }> = {
      brilliant: { glyph: "!!", bg: "bg-cyan-950/80 text-cyan-300 border-cyan-500/60", title: "Brilliant Move (!!)" },
      great: { glyph: "!", bg: "bg-sky-950/80 text-sky-300 border-sky-500/60", title: "Great Move (!)" },
      best: { glyph: "★", bg: "bg-emerald-950/80 text-emerald-300 border-emerald-500/60", title: "Best Engine Choice" },
      good: { glyph: "✓", bg: "bg-slate-800 text-slate-300 border-slate-600", title: "Principled Move" },
      inaccuracy: { glyph: "?!", bg: "bg-amber-950/80 text-amber-300 border-amber-500/60", title: "Inaccuracy (?!)" },
      mistake: { glyph: "?", bg: "bg-orange-950/80 text-orange-300 border-orange-500/60", title: "Mistake (?)" },
      blunder: { glyph: "??", bg: "bg-red-950/80 text-red-300 border-red-500/60", title: "Blunder (??)" },
      missed_win: { glyph: "✗", bg: "bg-rose-950/80 text-rose-300 border-rose-500/60", title: "Missed win" },
    };

    const b = badgeMap[grade];
    if (!b) return null;

    return (
      <span
        title={b.title}
        className={`inline-flex items-center justify-center font-mono text-[10px] px-1.5 py-0.2 rounded border shadow-sm font-bold leading-tight ${b.bg}`}
      >
        {b.glyph}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-64 overflow-y-auto bg-[#11131a] rounded-lg border border-[#232733] p-2 text-sm font-mono"
    >
      {rows.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-500 text-xs italic font-sans">
          Game notation will appear here as moves are played
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {rows.map((row) => (
            <div
              key={row.number}
              className={`flex items-center py-1 px-2 rounded ${
                row.number % 2 === 0 ? "bg-[#161822]" : "bg-[#11131a]"
              }`}
            >
              <span className="w-8 text-slate-500 text-xs font-sans font-medium">
                {row.number}.
              </span>

              <div
                onClick={() => row.white && onSelectPly(row.white.ply)}
                className={`flex-1 flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition ${
                  row.white && currentPly === row.white.ply
                    ? "bg-emerald-700 text-white font-semibold shadow"
                    : "hover:bg-[#1f2330] text-slate-200"
                }`}
              >
                <span>{row.white?.san}</span>
                {row.white && renderBadge(row.white.grade)}
              </div>

              <div
                onClick={() => row.black && onSelectPly(row.black.ply)}
                className={`flex-1 flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition ${
                  row.black && currentPly === row.black.ply
                    ? "bg-emerald-700 text-white font-semibold shadow"
                    : "hover:bg-[#1f2330] text-slate-200"
                }`}
              >
                <span>{row.black?.san || ""}</span>
                {row.black && renderBadge(row.black.grade)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
