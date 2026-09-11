import type { MoveGrade } from "../types/chess";
import { detectOpening } from "../data/openings";

export interface MoveCommentaryParams {
  grade: MoveGrade;
  san: string;
  piece: string;
  from: string;
  to: string;
  color: "w" | "b";
  captured?: string;
  promotion?: string;
  flags?: string;
  bestMoveSan: string;
  evalBefore?: number;
  evalAfter?: number;
  ply: number;
  moveNumber: number;
  fenBefore?: string;
  fenAfter?: string;
  allSansSoFar?: string[];
  knownOpeningName?: string;
}

// Deterministic seed helper to guarantee consistent variety without static repetition
function getVariantIndex(seed: number, count: number): number {
  const hash = Math.abs((seed * 9301 + 49297) % 233280);
  return hash % count;
}

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

/**
 * Generates natural, technically rich, and varied chess commentary for any analyzed move.
 * Acknowledges active openings, strategic maneuvers, pawn structures, and tactical turning points.
 */
export function generateCoachExplanation(params: MoveCommentaryParams): string {
  const {
    grade,
    san,
    piece,
    from: _from,
    to,
    color,
    captured,
    promotion,
    flags = "",
    bestMoveSan,
    evalBefore = 0,
    evalAfter = 0,
    ply,
    moveNumber,
    allSansSoFar = [],
    knownOpeningName,
  } = params;

  const pieceName = PIECE_NAMES[piece] || "piece";
  const evalDropCp = Math.abs(evalBefore - evalAfter);
  const evalDropPawns = (evalDropCp / 100).toFixed(1);
  const seed = ply * 37 + moveNumber * 19;

  // 1. OPENING RECOGNITION (Moves 1-10)
  if (moveNumber <= 10) {
    const detected = detectOpening(allSansSoFar.length > 0 ? allSansSoFar : [san]);
    const openingName = knownOpeningName || detected?.name;

    if (openingName) {
      // Inaccuracy or Mistake in Opening
      if (grade === "inaccuracy" || grade === "mistake" || grade === "blunder") {
        const openingBlunderVariants = [
          `${san} is an early deviation from standard theory in the ${openingName}. Preferable was ${bestMoveSan} to preserve central stability.`,
          `${san} concedes opening momentum in the ${openingName}. Theoretical lines recommend ${bestMoveSan} to contest key squares.`,
          `${san} relinquishes sound coordination in the ${openingName}. Stockfish identifies ${bestMoveSan} as the established book continuation.`,
        ];
        return openingBlunderVariants[getVariantIndex(seed, openingBlunderVariants.length)];
      }

      // Best, Great, or Good Opening Book Move
      if (grade === "best" || grade === "great" || grade === "good") {
        // Specific tailored opening descriptions
        if (openingName.includes("Sicilian") && (san === "c5" || san === "cxd4" || san === "d6" || san === "a6")) {
          const sicilianNotes = [
            `${san} follows standard Sicilian Defense theory, creating dynamic asymmetrical imbalances and targeting the semi-open c-file.`,
            `${san} adheres to classic Sicilian counterplay, preparing active piece deployment against White's central presence.`,
            `${san} is book theory in the ${openingName}, actively contesting central initiative from the flank.`,
          ];
          return sicilianNotes[getVariantIndex(seed, sicilianNotes.length)];
        }

        if (openingName.includes("Italian") && (san === "Bc4" || san === "Bc5" || san === "c3" || san === "d3")) {
          const italianNotes = [
            `${san} is mainline Italian Game development, preparing harmonious piece coordination and contesting the center.`,
            `${san} follows classical Italian Game principles, exerting pressure along the vulnerable f7-a2 diagonal.`,
            `${san} adheres to textbook Giuoco Piano strategy, harmoniously building toward a solid central pawn wedge.`,
          ];
          return italianNotes[getVariantIndex(seed, italianNotes.length)];
        }

        if (openingName.includes("Ruy Lopez") && (san === "Bb5" || san === "a6" || san === "Ba4" || san === "Nf6" || san === "O-O")) {
          const ruyNotes = [
            `${san} is classical Ruy Lopez theory, sustaining long-term positional tension against Black's central stronghold.`,
            `${san} follows standard Spanish Opening development, preparing prompt kingside castling while probing opposing weaknesses.`,
            `${san} adheres to disciplined Ruy Lopez maneuvering, optimizing piece placement and maintaining central control.`,
          ];
          return ruyNotes[getVariantIndex(seed, ruyNotes.length)];
        }

        if (openingName.includes("Queen's Gambit") && (san === "c4" || san === "d5" || san === "e6" || san === "c6")) {
          const qgNotes = [
            `${san} follows standard Queen's Gambit strategy, fighting for central space while opening vital diagonal avenues for the pieces.`,
            `${san} is principled theoretical play in the ${openingName}, fortifying the central pawn chain.`,
            `${san} establishes solid positional control in the ${openingName}, balancing central security with long-term piece harmony.`,
          ];
          return qgNotes[getVariantIndex(seed, qgNotes.length)];
        }

        if (openingName.includes("London") && (san === "Bf4" || san === "e3" || san === "c3" || san === "Nf3")) {
          const londonNotes = [
            `${san} is the hallmark of the London System, developing the dark-square bishop outside the pawn chain before locking the center.`,
            `${san} solidifies White's characteristic London pyramid, guaranteeing a rock-solid, harmonious opening setup.`,
            `${san} adheres to disciplined London System development, preparing harmonious piece placement across the board.`,
          ];
          return londonNotes[getVariantIndex(seed, londonNotes.length)];
        }

        if (openingName.includes("Caro-Kann") && (san === "c6" || san === "d5" || san === "Bf5")) {
          const caroNotes = [
            `${san} is classical Caro-Kann Defense play, preparing solid central contention on d5 without creating early structural concessions.`,
            `${san} follows theoretical lines in the ${openingName}, preserving an uncompromised pawn chain.`,
          ];
          return caroNotes[getVariantIndex(seed, caroNotes.length)];
        }

        if (openingName.includes("French") && (san === "e6" || san === "d5" || san === "c5")) {
          const frenchNotes = [
            `${san} is hallmark French Defense strategy, establishing a resilient pawn chain and preparing counterplay against White's central wedge.`,
            `${san} follows theoretical lines in the ${openingName}, challenging White's spatial advantage with disciplined central tension.`,
          ];
          return frenchNotes[getVariantIndex(seed, frenchNotes.length)];
        }

        if (openingName.includes("King's Indian") && (san === "g6" || san === "Bg7" || san === "d6" || san === "O-O")) {
          const kidNotes = [
            `${san} adheres to the hypermodern King's Indian Defense, preparing a resilient kingside fortress and dynamic future central breaks.`,
            `${san} is textbook King's Indian development, allowing White temporary central space while preparing sharp tactical counter-punching.`,
          ];
          return kidNotes[getVariantIndex(seed, kidNotes.length)];
        }

        // Generic well-played opening move with opening name
        const genericOpeningVariants = [
          `${san} is sound theoretical development in the ${openingName}, efficiently harmonizing pieces and contesting the center.`,
          `${san} follows established book theory in the ${openingName}, maintaining structural integrity and active development.`,
          `${san} is the master recommendation in the ${openingName}, ensuring safe development and preparing tactical flexibility.`,
        ];
        return genericOpeningVariants[getVariantIndex(seed, genericOpeningVariants.length)];
      }
    }
  }

  // 2. TACTICAL & FORCING CHECKS / CHECKMATES
  if (san.includes("#")) {
    return `${san} delivers checkmate! A decisive conclusion coordinating the pieces to seal the opposing king's fate.`;
  }

  if (san.includes("+")) {
    const checkVariants = [
      `${san} delivers a forcing check that disrupts opposing defensive coordination and wrests immediate tactical tempo.`,
      `${san} is an incisive check, compelling a defensive concession from the king and keeping initiative on your side.`,
      `${san} delivers an assertive check that limits opposing defensive choices and sharpens the attack.`,
    ];
    if (grade === "best" || grade === "great") {
      return checkVariants[getVariantIndex(seed, checkVariants.length)];
    }
  }

  // 3. CASTLING & KING SAFETY
  if (flags.includes("k") || san === "O-O") {
    const castleVariants = [
      `${san} secures king safety behind an intact pawn shield while mobilizing the rook into active central play.`,
      `${san} completes kingside castling, tucking the king into safety and connecting the major pieces along the back rank.`,
      `${san} is a crucial safety measure, removing the king from dangerous central files and preparing rook coordination.`,
    ];
    return castleVariants[getVariantIndex(seed, castleVariants.length)];
  }

  if (flags.includes("q") || san === "O-O-O") {
    const queensideVariants = [
      `${san} castles queenside, signaling aggressive opposite-side castling intentions and immediately centralizing the rook on the d-file.`,
      `${san} completes queenside castling, securing the king while immediately exerting major piece pressure along the central files.`,
    ];
    return queensideVariants[getVariantIndex(seed, queensideVariants.length)];
  }

  // 4. PROMOTION
  if (promotion) {
    return `${san} promotes to a ${PIECE_NAMES[promotion.toLowerCase()] || "queen"}, transforming the passed pawn into decisive material advantage.`;
  }

  // 5. BLUNDER & MISSED WIN COMMENTARY (Concrete tactical explanations)
  if (grade === "blunder") {
    const blunderVariants = [
      `${san} is a critical tactical blunder, conceding approximately ${evalDropPawns} pawns of evaluation. Essential was ${bestMoveSan}.`,
      `${san} overlooks a sharp tactical threat, compromising piece security. Stockfish required ${bestMoveSan} to defuse the pressure.`,
      `${san} is a decisive oversight that concedes material or position. The only sound defensive resource was ${bestMoveSan}.`,
      `${san} miscalculates the tactical tension. Preferable was ${bestMoveSan}, preserving balance and coordinating defenses.`,
    ];
    return blunderVariants[getVariantIndex(seed, blunderVariants.length)];
  }

  if (grade === "missed_win") {
    const missedWinVariants = [
      `${san} overlooks an immediate winning continuation. ${bestMoveSan} forced decisive material gains or a forced checkmate sequence.`,
      `${san} lets a winning advantage slip away. The critical breakthrough was ${bestMoveSan}, which would have dismantled the defense.`,
      `${san} misses a decisive tactical resource. Stockfish calculates that ${bestMoveSan} delivered an overwhelming advantage.`,
    ];
    return missedWinVariants[getVariantIndex(seed, missedWinVariants.length)];
  }

  if (grade === "mistake") {
    const mistakeVariants = [
      `${san} is a measurable positional mistake with the ${pieceName}. Stronger was ${bestMoveSan} to maintain piece coordination.`,
      `${san} compromises the pawn structure and gives away momentum. More principled was ${bestMoveSan}.`,
      `${san} misjudges the operational requirements of the position. Stockfish preferred ${bestMoveSan} to preserve balance.`,
    ];
    return mistakeVariants[getVariantIndex(seed, mistakeVariants.length)];
  }

  if (grade === "inaccuracy") {
    const inaccuracyVariants = [
      `${san} is slightly imprecise, relinquishing momentum. Stockfish preferred ${bestMoveSan} to keep pressure on key squares.`,
      `${san} is a minor concession that allows the opponent breathing room. More energetic was ${bestMoveSan}.`,
      `${san} is slightly passive. The engine prioritized ${bestMoveSan} for superior harmony and central influence.`,
    ];
    return inaccuracyVariants[getVariantIndex(seed, inaccuracyVariants.length)];
  }

  // 6. ENDGAME TECHNIQUE (Moves 25+)
  if (moveNumber >= 25) {
    // King march in endgame
    if (piece === "k") {
      const kingEndgameVariants = [
        `${san} activates the king toward the center, adhering to the golden endgame rule that the king must lead the pawn conversion.`,
        `${san} marches the king into active territory, seizing opposition and controlling key breakthrough squares.`,
        `${san} centralizes the king in the endgame, keeping it active to support friendly pawns and restrict the opponent.`,
      ];
      return kingEndgameVariants[getVariantIndex(seed, kingEndgameVariants.length)];
    }

    // Passed pawn advance
    if (piece === "p" && (to[1] === "6" || to[1] === "7" || to[1] === "3" || to[1] === "2")) {
      const pawnAdvanceVariants = [
        `${san} advances the passed pawn toward promotion, stretching the defender's resources to the limit.`,
        `${san} decisively pushes the passed pawn, creating immediate promotion threats that compel opposing passivity.`,
      ];
      return pawnAdvanceVariants[getVariantIndex(seed, pawnAdvanceVariants.length)];
    }

    // Rook on 7th / 2nd rank in endgame
    if (piece === "r" && (to[1] === "7" || to[1] === "2")) {
      return `${san} seizes the 7th rank in textbook Tarrasch fashion, tying down the enemy rooks and attacking base pawns.`;
    }
  }

  // 7. POSITIONAL & STRATEGIC HIGHLIGHTS FOR BEST / GREAT / GOOD MOVES

  // A. Rook File Control & Infiltration
  if (piece === "r") {
    if (to[1] === "7" || to[1] === "2") {
      const rank7Variants = [
        `${san} infiltrates the critical 7th rank, tying down defensive pieces and targeting vulnerable pawn shelters.`,
        `${san} lands on the 7th rank in classic grandmaster style, creating immense back-rank and lateral pressure.`,
      ];
      return rank7Variants[getVariantIndex(seed, rank7Variants.length)];
    }

    if (to[0] === "d" || to[0] === "e" || to[0] === "c") {
      const rookFileVariants = [
        `${san} occupies the central ${to[0]}-file, optimizing major piece activity and preparing file penetration.`,
        `${san} seizes control of the semi-open ${to[0]}-file, coordinating major pieces along an active vertical avenue.`,
        `${san} mobilizes the rook to the ${to[0]}-file, increasing central pressure and preparing harmonious rook connection.`,
      ];
      return rookFileVariants[getVariantIndex(seed, rookFileVariants.length)];
    }
  }

  // B. Knight Outposts & Repositioning
  if (piece === "n") {
    const isOutpost = (color === "w" && (to === "d5" || to === "e5" || to === "c5" || to === "f5")) ||
                      (color === "b" && (to === "d4" || to === "e4" || to === "c4" || to === "f4"));
    if (isOutpost) {
      const outpostVariants = [
        `${san} establishes a commanding knight outpost on ${to}, radiating multi-directional pressure across the opponent's camp.`,
        `${san} plants the knight on a dominant central square where it anchors piece harmony and cannot be easily evicted.`,
        `${san} anchors an active central knight, restricting opposing piece mobility and preparing tactical breakthroughs.`,
      ];
      return outpostVariants[getVariantIndex(seed, outpostVariants.length)];
    }

    if (to === "f3" || to === "c3" || to === "f6" || to === "c6") {
      const knightDevVariants = [
        `${san} natural, principled knight development, controlling key central squares and preparing prompt castling.`,
        `${san} develops the knight toward the center, exerting vital influence over central breakthrough squares.`,
      ];
      return knightDevVariants[getVariantIndex(seed, knightDevVariants.length)];
    }
  }

  // C. Bishop Diagonals & Pins
  if (piece === "b") {
    // Fianchetto
    if (to === "g2" || to === "b2" || to === "g7" || to === "b7") {
      const fianchettoVariants = [
        `${san} fianchettoes the bishop along the long diagonal, exerting harmonious long-range diagonal pressure.`,
        `${san} places the bishop on the great diagonal, projecting deep strategic influence across the board.`,
      ];
      return fianchettoVariants[getVariantIndex(seed, fianchettoVariants.length)];
    }

    // Pinning moves
    if (to === "g5" || to === "b5" || to === "g4" || to === "b4") {
      const pinVariants = [
        `${san} pins the enemy knight against the major pieces, creating tactical paralysis and disrupting coordination.`,
        `${san} develops with an active pin, restricting opposing mobility and increasing central pressure.`,
      ];
      return pinVariants[getVariantIndex(seed, pinVariants.length)];
    }

    // Active diagonals
    if (to === "c4" || to === "f4" || to === "e3" || to === "c5" || to === "f5" || to === "e6") {
      const bishopDiagVariants = [
        `${san} posts the bishop on an active diagonal with direct sightlines into the opponent's territory.`,
        `${san} deploys the bishop along a dominant diagonal, integrating piece harmony with central control.`,
      ];
      return bishopDiagVariants[getVariantIndex(seed, bishopDiagVariants.length)];
    }
  }

  // D. Queen Maneuvers
  if (piece === "q") {
    const queenVariants = [
      `${san} centralizes the queen harmoniously, connecting the rooks and solidifying control over key central squares.`,
      `${san} repositions the queen with purpose, coordinating with minor pieces and maintaining active tactical vigilance.`,
      `${san} optimizes queen activity, keeping sightlines open while defending vital operational points.`,
    ];
    return queenVariants[getVariantIndex(seed, queenVariants.length)];
  }

  // E. Pawn Structure & Prophylaxis
  if (piece === "p") {
    // King Luft
    if (to === "h3" || to === "h6" || to === "a3" || to === "a6") {
      const luftVariants = [
        `${san} prudent prophylactic pawn step, creating an essential escape square (luft) and preventing annoying opposing pins.`,
        `${san} solid prophylactic advance, preemptively denying opposing pieces access to the ${to[0] === "h" ? "g4" : "b4"} square.`,
      ];
      return luftVariants[getVariantIndex(seed, luftVariants.length)];
    }

    // Central pawn breaks
    if (to === "e4" || to === "d4" || to === "e5" || to === "d5") {
      const centralBreakVariants = [
        `${san} stakes an assertive claim in the center, seizing vital space and opening diagonal avenues for piece mobilization.`,
        `${san} principled central advance, reinforcing pawn structure integrity and fighting for central supremacy.`,
      ];
      return centralBreakVariants[getVariantIndex(seed, centralBreakVariants.length)];
    }

    if (to === "c4" || to === "c5") {
      return `${san} challenges the central pawn anchor from the wing, creating dynamic structural imbalances.`;
    }
  }

  // F. Captures & Trades
  if (captured) {
    const captureVariants = [
      `${san} eliminates a key active piece, favorably clarifying positional tension and maintaining balance.`,
      `${san} executes a principled exchange, resolving tactical friction while preserving sound piece harmony.`,
      `${san} trades pieces advantageously, stripping away defensive resources and simplifying into a favorable structure.`,
    ];
    return captureVariants[getVariantIndex(seed, captureVariants.length)];
  }

  // 8. HIGH-VARIETY MASTER FALLBACKS FOR GENERAL SOUND MOVES
  if (grade === "brilliant") {
    const brilliantVariants = [
      `${san} is an exceptional tactical sacrifice that decisively disrupts opposing coordination and yields a winning initiative.`,
      `${san} is a master-level tactical breakthrough, sacrificing material to shatter the opposing defense.`,
      `${san} brilliant combination! A calculated sacrifice that completely overpowers the opponent's defensive structure.`,
    ];
    return brilliantVariants[getVariantIndex(seed, brilliantVariants.length)];
  }

  if (grade === "great") {
    const greatVariants = [
      `${san} is an outstanding continuation, seizing key central squares and exerting immediate pressure.`,
      `${san} demonstrates high-level positional clarity, finding the sole critical path to maintain active momentum.`,
      `${san} is an ambitious, high-impact move that capitalizes on subtle nuances in the opposing camp.`,
    ];
    return greatVariants[getVariantIndex(seed, greatVariants.length)];
  }

  if (grade === "best") {
    const bestVariants = [
      `${san} is Stockfish 19's primary recommendation, optimizing piece harmony and structural stability.`,
      `${san} is the engine's master choice, demonstrating deep tactical foresight and maintaining positional control.`,
      `${san} maintains optimal positional balance, seamlessly improving piece placement and restricting counterplay.`,
      `${san} is the most precise move on the board, consolidating the position and setting up strategic pressure.`,
    ];
    return bestVariants[getVariantIndex(seed, bestVariants.length)];
  }

  // Good
  const goodVariants = [
    `${san} is sound and principled, preserving balanced positional play and piece activity.`,
    `${san} keeps the position solid and dependable, declining to make unnecessary concessions.`,
    `${san} is a natural, steady continuation that maintains harmonious coordination across the board.`,
  ];
  return goodVariants[getVariantIndex(seed, goodVariants.length)];
}
