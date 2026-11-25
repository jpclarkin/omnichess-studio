import React, { useState, useRef } from "react";
import { Chess, type Square, type Move } from "chess.js";
import { ChessPiece } from "./ChessPiece";
import type { BoardTheme } from "../types/chess";

interface ChessboardProps {
  game: Chess;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  isFlipped?: boolean;
  theme?: BoardTheme;
  lastMove?: { from: string; to: string } | null;
  interactive?: boolean;
  customSquareStyles?: Record<string, string>;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  game,
  onMove,
  isFlipped = false,
  theme = "emerald",
  lastMove = null,
  interactive = true,
  customSquareStyles = {},
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: "w" | "b";
  } | null>(null);

  // Dragging state
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; square: Square } | null>(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);

  // Theme color definitions
  const themeColors = {
    emerald: {
      light: "bg-[#ebecd0]",
      dark: "bg-[#739552]",
      highlight: "bg-[#f5f682]/60",
      legalDot: "bg-[#1e293b]/30",
      legalCapture: "border-[#1e293b]/40",
    },
    wood: {
      light: "bg-[#f0d9b5]",
      dark: "bg-[#b58863]",
      highlight: "bg-[#f3dc76]/70",
      legalDot: "bg-[#451a03]/30",
      legalCapture: "border-[#451a03]/40",
    },
    slate: {
      light: "bg-[#e2e8f0]",
      dark: "bg-[#475569]",
      highlight: "bg-[#38bdf8]/50",
      legalDot: "bg-[#0f172a]/35",
      legalCapture: "border-[#0f172a]/45",
    },
    cyberpunk: {
      light: "bg-[#3b0764]",
      dark: "bg-[#18032e]",
      highlight: "bg-[#a855f7]/60",
      legalDot: "bg-[#ec4899]/50",
      legalCapture: "border-[#ec4899]/60",
    },
  }[theme];

  const files = isFlipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = isFlipped ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["8", "7", "6", "5", "4", "3", "2", "1"];

  // Find king square if in check
  let checkSquare: Square | null = null;
  if (game.inCheck()) {
    const turn = game.turn();
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === "k" && p.color === turn) {
          checkSquare = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
          break;
        }
      }
      if (checkSquare) break;
    }
  }

  // Handle Square Selection (Click-to-Move)
  const handleSquareClick = (square: Square) => {
    if (!interactive || pendingPromotion) return;
    if (justDraggedRef.current) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect current piece
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Check if clicked square is a valid legal move destination
      const move = legalMoves.find((m) => m.to === square);
      if (move) {
        // Check for pawn promotion
        const piece = game.get(selectedSquare);
        if (
          piece &&
          piece.type === "p" &&
          ((piece.color === "w" && square[1] === "8") ||
            (piece.color === "b" && square[1] === "1"))
        ) {
          setPendingPromotion({
            from: selectedSquare,
            to: square,
            color: piece.color,
          });
          return;
        }

        // Execute Move
        onMove({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // If clicking another piece belonging to the current player, switch selection
      const clickedPiece = game.get(square);
      if (clickedPiece && clickedPiece.color === game.turn()) {
        setSelectedSquare(square);
        setLegalMoves(game.moves({ square, verbose: true }));
        return;
      }

      // Otherwise deselect
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // No square currently selected: select if piece belongs to current player
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      setLegalMoves(game.moves({ square, verbose: true }));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Promotion choice
  const handlePromotionSelect = (promoPiece: "q" | "r" | "b" | "n") => {
    if (!pendingPromotion) return;
    onMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promoPiece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // Drag and Drop Handlers
  const handleMouseDown = (_e: React.MouseEvent, square: Square) => {
    if (!interactive || pendingPromotion) return;
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      dragStartRef.current = { x: _e.clientX, y: _e.clientY, square };
      isDraggingRef.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartRef.current) {
      const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
      if (!isDraggingRef.current && dist > 5) {
        isDraggingRef.current = true;
        const square = dragStartRef.current.square;
        setDraggedSquare(square);
        setSelectedSquare(square);
        setLegalMoves(game.moves({ square, verbose: true }));
      }
      if (isDraggingRef.current) {
        setDragPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const wasDragging = isDraggingRef.current;
    const dragSource = dragStartRef.current?.square;

    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);

    if (wasDragging && dragSource && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const squareSize = rect.width / 8;
        const fileIndex = Math.floor(x / squareSize);
        const rankIndex = Math.floor(y / squareSize);

        if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
          const targetSquare = `${files[fileIndex]}${ranks[rankIndex]}` as Square;
          const currentMoves = game.moves({ square: dragSource, verbose: true });
          const move = currentMoves.find((m) => m.to === targetSquare);

          if (move && dragSource !== targetSquare) {
            const piece = game.get(dragSource);
            if (
              piece &&
              piece.type === "p" &&
              ((piece.color === "w" && targetSquare[1] === "8") ||
                (piece.color === "b" && targetSquare[1] === "1"))
            ) {
              setPendingPromotion({
                from: dragSource,
                to: targetSquare,
                color: piece.color,
              });
            } else {
              onMove({ from: dragSource, to: targetSquare });
              setSelectedSquare(null);
              setLegalMoves([]);
            }
          }
        }
      }

      setDraggedSquare(null);
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 80);
      return;
    }

    setDraggedSquare(null);
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent, square: Square) => {
    if (!interactive || pendingPromotion) return;
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY, square };
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartRef.current) {
      const touch = e.touches[0];
      const dist = Math.hypot(touch.clientX - dragStartRef.current.x, touch.clientY - dragStartRef.current.y);
      if (!isDraggingRef.current && dist > 7) {
        isDraggingRef.current = true;
        const square = dragStartRef.current.square;
        setDraggedSquare(square);
        setSelectedSquare(square);
        setLegalMoves(game.moves({ square, verbose: true }));
      }
      if (isDraggingRef.current) {
        setDragPos({ x: touch.clientX, y: touch.clientY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const wasDragging = isDraggingRef.current;
    const dragSource = dragStartRef.current?.square;

    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);

    if (wasDragging && dragSource && boardRef.current) {
      const touch = e.changedTouches[0];
      const rect = boardRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const squareSize = rect.width / 8;
        const fileIndex = Math.floor(x / squareSize);
        const rankIndex = Math.floor(y / squareSize);

        if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
          const targetSquare = `${files[fileIndex]}${ranks[rankIndex]}` as Square;
          const currentMoves = game.moves({ square: dragSource, verbose: true });
          const move = currentMoves.find((m) => m.to === targetSquare);

          if (move && dragSource !== targetSquare) {
            const piece = game.get(dragSource);
            if (
              piece &&
              piece.type === "p" &&
              ((piece.color === "w" && targetSquare[1] === "8") ||
                (piece.color === "b" && targetSquare[1] === "1"))
            ) {
              setPendingPromotion({
                from: dragSource,
                to: targetSquare,
                color: piece.color,
              });
            } else {
              onMove({ from: dragSource, to: targetSquare });
              setSelectedSquare(null);
              setLegalMoves([]);
            }
          }
        }
      }

      setDraggedSquare(null);
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 80);
      return;
    }

    setDraggedSquare(null);
  };

  return (
    <div className="relative select-none w-full max-w-[var(--board-size)] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-[#2d3342]">
      {/* 8x8 Board Container */}
      <div
        ref={boardRef}
        className="w-full h-full grid grid-cols-8 grid-rows-8"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {ranks.map((rank, rankIdx) =>
          files.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const isLight = (fileIdx + rankIdx) % 2 === 0;
            const piece = game.get(square);
            const isSelected = selectedSquare === square;
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck = checkSquare === square;
            const legalMove = legalMoves.find((m) => m.to === square);
            const isCapture = legalMove && (legalMove.captured || game.get(square));

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onMouseDown={(e) => handleMouseDown(e, square)}
                onTouchStart={(e) => handleTouchStart(e, square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                  isLight ? themeColors.light : themeColors.dark
                } ${customSquareStyles[square] || ""}`}
              >
                {/* Last Move Highlight */}
                {isLastMove && (
                  <div className={`absolute inset-0 ${themeColors.highlight} pointer-events-none`} />
                )}

                {/* Selected Square Highlight */}
                {isSelected && (
                  <div className="absolute inset-0 bg-yellow-400/40 pointer-events-none ring-2 ring-yellow-400 inset-ring" />
                )}

                {/* In-Check King Glow */}
                {isCheck && (
                  <div className="absolute inset-0 bg-red-600/70 animate-pulse pointer-events-none rounded-full" />
                )}

                {/* Chess Piece */}
                {piece && (
                  <div
                    className={`w-[84%] h-[84%] relative z-10 transition-transform duration-75 ${
                      draggedSquare === square ? "opacity-30" : "opacity-100"
                    }`}
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal Move Indicators */}
                {legalMove && !isCapture && (
                  <div
                    className={`absolute w-3.5 h-3.5 rounded-full ${themeColors.legalDot} pointer-events-none z-20 shadow-sm`}
                  />
                )}
                {legalMove && isCapture && (
                  <div
                    className={`absolute inset-1 rounded-full border-4 ${themeColors.legalCapture} pointer-events-none z-20`}
                  />
                )}

                {/* Rank & File Coordinate Labels */}
                {fileIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-bold select-none ${
                      isLight ? "text-[#739552]" : "text-[#ebecd0]"
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-bold select-none ${
                      isLight ? "text-[#739552]" : "text-[#ebecd0]"
                    }`}
                  >
                    {file}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Drag Preview */}
      {draggedSquare && dragPos && (
        <div
          className="fixed pointer-events-none z-50 w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          {(() => {
            const p = game.get(draggedSquare);
            return p ? <ChessPiece type={p.type} color={p.color} /> : null;
          })()}
        </div>
      )}

      {/* Promotion Choice Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e222d] p-5 rounded-xl border border-[#3b4252] shadow-2xl text-center max-w-xs w-full animate-in fade-in zoom-in duration-200">
            <h4 className="text-white font-bold mb-3 text-lg">Promote Pawn</h4>
            <div className="grid grid-cols-4 gap-3 bg-[#13151c] p-3 rounded-lg border border-[#2d3342]">
              {(["q", "n", "r", "b"] as const).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="w-14 h-14 bg-[#232733] hover:bg-emerald-600/30 hover:border-emerald-500 border border-transparent rounded-lg p-2 transition flex items-center justify-center shadow"
                >
                  <ChessPiece type={pType} color={pendingPromotion.color} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingPromotion(null)}
              className="mt-4 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
