import type { OpeningData } from "../types/chess";

export const OPENINGS_DATABASE: OpeningData[] = [
  // Sicilian Defense Family
  {
    eco: "B90",
    name: "Sicilian Defense: Najdorf Variation",
    moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
    description: "The sharpest and most popular system in modern chess, favored by Fischer and Kasparov. Black aims for queenside counterplay while White attacks the kingside.",
    stats: { games: 42800, whiteWinPct: 37, drawPct: 34, blackWinPct: 29 },
    continuations: [
      { san: "Be3", games: 18500, whiteWinPct: 38, drawPct: 35, blackWinPct: 27 },
      { san: "Bg5", games: 12400, whiteWinPct: 39, drawPct: 32, blackWinPct: 29 },
      { san: "Be2", games: 6100, whiteWinPct: 34, drawPct: 40, blackWinPct: 26 },
      { san: "h3", games: 3200, whiteWinPct: 36, drawPct: 35, blackWinPct: 29 },
    ],
  },
  {
    eco: "B70",
    name: "Sicilian Defense: Dragon Variation",
    moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6",
    description: "Fiercely combative system where Black fianchettoes the dark-squared bishop, aiming for razor-sharp opposite-side castling battles.",
    stats: { games: 24500, whiteWinPct: 41, drawPct: 28, blackWinPct: 31 },
    continuations: [
      { san: "Be3", games: 15200, whiteWinPct: 43, drawPct: 27, blackWinPct: 30 },
      { san: "Be2", games: 5100, whiteWinPct: 37, drawPct: 33, blackWinPct: 30 },
    ],
  },
  {
    eco: "B33",
    name: "Sicilian Defense: Sveshnikov Variation",
    moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5",
    description: "An aggressive Sicilian where Black weakens the d5-square in exchange for active piece play and dynamic central counterattacks.",
    stats: { games: 21500, whiteWinPct: 36, drawPct: 39, blackWinPct: 25 },
    continuations: [
      { san: "Ndb5", games: 19800, whiteWinPct: 37, drawPct: 39, blackWinPct: 24 },
      { san: "Nf3", games: 1200, whiteWinPct: 31, drawPct: 41, blackWinPct: 28 },
    ],
  },
  {
    eco: "B20",
    name: "Sicilian Defense",
    moves: "e4 c5",
    description: "The most popular and combative response to 1.e4. Black fights for the center from the flank, creating dynamic structural imbalances.",
    stats: { games: 88500, whiteWinPct: 37, drawPct: 33, blackWinPct: 30 },
    continuations: [
      { san: "Nf3", games: 62000, whiteWinPct: 38, drawPct: 34, blackWinPct: 28 },
      { san: "Nc3", games: 14200, whiteWinPct: 36, drawPct: 32, blackWinPct: 32 },
      { san: "c3", games: 7300, whiteWinPct: 37, drawPct: 35, blackWinPct: 28 },
    ],
  },

  // Open Games (1.e4 e5)
  {
    eco: "C50",
    name: "Italian Game: Giuoco Piano",
    moves: "e4 e5 Nf3 Nc6 Bc4 Bc5",
    description: "One of the oldest recorded openings. White develops rapidly towards f7 and prepares c3 and d4 to seize central space.",
    stats: { games: 35400, whiteWinPct: 40, drawPct: 32, blackWinPct: 28 },
    continuations: [
      { san: "c3", games: 16500, whiteWinPct: 41, drawPct: 33, blackWinPct: 26 },
      { san: "d3", games: 12100, whiteWinPct: 38, drawPct: 35, blackWinPct: 27 },
      { san: "b4", games: 4300, whiteWinPct: 43, drawPct: 27, blackWinPct: 30 },
      { san: "O-O", games: 2500, whiteWinPct: 39, drawPct: 31, blackWinPct: 30 },
    ],
  },
  {
    eco: "C55",
    name: "Italian Game: Two Knights Defense",
    moves: "e4 e5 Nf3 Nc6 Bc4 Nf6",
    description: "Dynamic counter-attacking system where Black counter-attacks White's e4 pawn immediately instead of developing passively.",
    stats: { games: 26100, whiteWinPct: 39, drawPct: 32, blackWinPct: 29 },
    continuations: [
      { san: "d3", games: 13200, whiteWinPct: 38, drawPct: 34, blackWinPct: 28 },
      { san: "Ng5", games: 9800, whiteWinPct: 42, drawPct: 27, blackWinPct: 31 },
    ],
  },
  {
    eco: "C65",
    name: "Ruy Lopez: Berlin Defense",
    moves: "e4 e5 Nf3 Nc6 Bb5 Nf6",
    description: "The Berlin Wall made famous by Kramnik against Kasparov. Highly solid endgame-oriented defense that neutralizes White's attacking ambitions.",
    stats: { games: 31200, whiteWinPct: 34, drawPct: 48, blackWinPct: 18 },
    continuations: [
      { san: "O-O", games: 24000, whiteWinPct: 35, drawPct: 49, blackWinPct: 16 },
      { san: "d3", games: 5200, whiteWinPct: 36, drawPct: 43, blackWinPct: 21 },
    ],
  },
  {
    eco: "C88",
    name: "Ruy Lopez: Closed Variation",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O",
    description: "The classical pinnacle of strategic chess maneuvering. White maintains an enduring bind while Black builds flexible counter-pressure.",
    stats: { games: 28900, whiteWinPct: 42, drawPct: 38, blackWinPct: 20 },
    continuations: [
      { san: "h3", games: 19500, whiteWinPct: 43, drawPct: 38, blackWinPct: 19 },
      { san: "d4", games: 6300, whiteWinPct: 41, drawPct: 37, blackWinPct: 22 },
    ],
  },
  {
    eco: "C60",
    name: "Ruy Lopez (Spanish Opening)",
    moves: "e4 e5 Nf3 Nc6 Bb5",
    description: "The Spanish Opening puts immediate indirect pressure on Black's central e5 pawn by threatening its primary defender on c6.",
    stats: { games: 64200, whiteWinPct: 39, drawPct: 37, blackWinPct: 24 },
    continuations: [
      { san: "a6", games: 42000, whiteWinPct: 39, drawPct: 38, blackWinPct: 23 },
      { san: "Nf6", games: 16200, whiteWinPct: 35, drawPct: 45, blackWinPct: 20 },
    ],
  },
  {
    eco: "C42",
    name: "Petrov's Defense",
    moves: "e4 e5 Nf3 Nf6",
    description: "Symmetrical counter-attack against White's e4 pawn, renowned at World Championship levels for its extraordinary defensive resilience.",
    stats: { games: 22400, whiteWinPct: 35, drawPct: 46, blackWinPct: 19 },
    continuations: [
      { san: "Nxe5", games: 16100, whiteWinPct: 36, drawPct: 45, blackWinPct: 19 },
      { san: "d4", games: 4800, whiteWinPct: 34, drawPct: 48, blackWinPct: 18 },
    ],
  },
  {
    eco: "C45",
    name: "Scotch Game",
    moves: "e4 e5 Nf3 Nc6 d4",
    description: "White forces open the central files immediately on move 3, leading to early tactical skirmishes and open piece play.",
    stats: { games: 18900, whiteWinPct: 39, drawPct: 33, blackWinPct: 28 },
    continuations: [
      { san: "exd4", games: 18200, whiteWinPct: 39, drawPct: 33, blackWinPct: 28 },
    ],
  },
  {
    eco: "C20",
    name: "King's Pawn Game",
    moves: "e4 e5",
    description: "Classical open game where both sides stake equal claims in the center, leading to rapid tactical development.",
    stats: { games: 92000, whiteWinPct: 38, drawPct: 34, blackWinPct: 28 },
    continuations: [
      { san: "Nf3", games: 74000, whiteWinPct: 39, drawPct: 35, blackWinPct: 26 },
      { san: "Bc4", games: 9200, whiteWinPct: 38, drawPct: 31, blackWinPct: 31 },
    ],
  },

  // Semi-Open Games (1.e4 other)
  {
    eco: "B12",
    name: "Caro-Kann Defense: Advance Variation",
    moves: "e4 c6 d4 d5 e5",
    description: "White locks up the central chain and clamps down on kingside space, while Black seeks to activate the light-squared bishop to f5.",
    stats: { games: 26300, whiteWinPct: 41, drawPct: 33, blackWinPct: 26 },
    continuations: [
      { san: "Bf5", games: 21000, whiteWinPct: 40, drawPct: 34, blackWinPct: 26 },
      { san: "c5", games: 4100, whiteWinPct: 42, drawPct: 30, blackWinPct: 28 },
    ],
  },
  {
    eco: "B10",
    name: "Caro-Kann Defense",
    moves: "e4 c6",
    description: "A bulletproof, hyper-solid defense. Black prepares ...d5 supported by c6, avoiding weaknesses in the pawn structure.",
    stats: { games: 54100, whiteWinPct: 39, drawPct: 35, blackWinPct: 26 },
    continuations: [
      { san: "d4", games: 46000, whiteWinPct: 40, drawPct: 35, blackWinPct: 25 },
      { san: "Nf3", games: 4200, whiteWinPct: 37, drawPct: 36, blackWinPct: 27 },
    ],
  },
  {
    eco: "C10",
    name: "French Defense",
    moves: "e4 e6 d4 d5",
    description: "Black establishes a sturdy central pawn chain (e6, d5) and targets White's extended center with ...c5 and ...f6.",
    stats: { games: 29800, whiteWinPct: 42, drawPct: 32, blackWinPct: 26 },
    continuations: [
      { san: "Nc3", games: 14500, whiteWinPct: 43, drawPct: 32, blackWinPct: 25 },
      { san: "Nd2", games: 8200, whiteWinPct: 41, drawPct: 35, blackWinPct: 24 },
      { san: "e5", games: 5700, whiteWinPct: 40, drawPct: 31, blackWinPct: 29 },
    ],
  },
  {
    eco: "C00",
    name: "French Defense (Initial Setup)",
    moves: "e4 e6",
    description: "Solid, strategic opening where Black accepts a somewhat cramped position to launch counter-blows against White's center.",
    stats: { games: 48900, whiteWinPct: 41, drawPct: 33, blackWinPct: 26 },
    continuations: [
      { san: "d4", games: 42100, whiteWinPct: 41, drawPct: 33, blackWinPct: 26 },
    ],
  },
  {
    eco: "B01",
    name: "Scandinavian Defense",
    moves: "e4 d5",
    description: "Black strikes at the center on move 1, forcing White to clarify the position and usually leading to an early open board.",
    stats: { games: 28400, whiteWinPct: 43, drawPct: 29, blackWinPct: 28 },
    continuations: [
      { san: "exd5", games: 27100, whiteWinPct: 43, drawPct: 29, blackWinPct: 28 },
    ],
  },
  {
    eco: "B07",
    name: "Pirc Defense",
    moves: "e4 d6 d4 Nf6 Nc3 g6",
    description: "Hypermodern defense allowing White a broad pawn center before Black launches flank attacks and kingside bishop activity.",
    stats: { games: 17200, whiteWinPct: 43, drawPct: 29, blackWinPct: 28 },
    continuations: [
      { san: "Nf3", games: 8200, whiteWinPct: 42, drawPct: 31, blackWinPct: 27 },
      { san: "f4", games: 4900, whiteWinPct: 45, drawPct: 26, blackWinPct: 29 },
    ],
  },

  // 1.d4 Systems
  {
    eco: "D30",
    name: "Queen's Gambit Declined",
    moves: "d4 d5 c4 e6",
    description: "A classical cornerstone of chess theory. Black bolsters the d5 pawn with e6, resulting in rich strategic maneuvering.",
    stats: { games: 38700, whiteWinPct: 39, drawPct: 41, blackWinPct: 20 },
    continuations: [
      { san: "Nc3", games: 19800, whiteWinPct: 40, drawPct: 41, blackWinPct: 19 },
      { san: "Nf3", games: 14200, whiteWinPct: 38, drawPct: 42, blackWinPct: 20 },
    ],
  },
  {
    eco: "D20",
    name: "Queen's Gambit Accepted",
    moves: "d4 d5 c4 dxc4",
    description: "Black temporarily accepts White's wing pawn to obtain open piece play and fast development in the center.",
    stats: { games: 19400, whiteWinPct: 41, drawPct: 36, blackWinPct: 23 },
    continuations: [
      { san: "Nf3", games: 11200, whiteWinPct: 42, drawPct: 37, blackWinPct: 21 },
      { san: "e4", games: 4800, whiteWinPct: 43, drawPct: 32, blackWinPct: 25 },
    ],
  },
  {
    eco: "D06",
    name: "Queen's Gambit",
    moves: "d4 d5 c4",
    description: "One of the most classical ways to fight for the center. White offers the c4 pawn to pull Black's central anchor off d5.",
    stats: { games: 68000, whiteWinPct: 40, drawPct: 39, blackWinPct: 21 },
    continuations: [
      { san: "e6", games: 38000, whiteWinPct: 39, drawPct: 41, blackWinPct: 20 },
      { san: "c6", games: 22000, whiteWinPct: 40, drawPct: 38, blackWinPct: 22 },
    ],
  },
  {
    eco: "D10",
    name: "Slav Defense",
    moves: "d4 d5 c4 c6",
    description: "Extremely reliable defense where Black supports d5 with the c-pawn, keeping the light-squared bishop's c8-h3 diagonal unobstructed.",
    stats: { games: 32100, whiteWinPct: 38, drawPct: 42, blackWinPct: 20 },
    continuations: [
      { san: "Nf3", games: 17200, whiteWinPct: 38, drawPct: 43, blackWinPct: 19 },
      { san: "Nc3", games: 11400, whiteWinPct: 39, drawPct: 40, blackWinPct: 21 },
    ],
  },
  {
    eco: "E60",
    name: "King's Indian Defense",
    moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6",
    description: "A favorite of Garry Kasparov and Bobby Fischer. Black cedes the center early to launch devastating kingside pawn storms.",
    stats: { games: 33400, whiteWinPct: 43, drawPct: 31, blackWinPct: 26 },
    continuations: [
      { san: "Nf3", games: 18200, whiteWinPct: 42, drawPct: 32, blackWinPct: 26 },
      { san: "f3", games: 7400, whiteWinPct: 45, drawPct: 29, blackWinPct: 26 },
      { san: "Be2", games: 4100, whiteWinPct: 44, drawPct: 30, blackWinPct: 26 },
    ],
  },
  {
    eco: "E20",
    name: "Nimzo-Indian Defense",
    moves: "d4 Nf6 c4 e6 Nc3 Bb4",
    description: "Classical hypermodern masterpiece. Black pins White's knight to control e4 and inflict doubled c-pawns.",
    stats: { games: 27800, whiteWinPct: 37, drawPct: 43, blackWinPct: 20 },
    continuations: [
      { san: "Qc2", games: 12100, whiteWinPct: 39, drawPct: 42, blackWinPct: 19 },
      { san: "e3", games: 10400, whiteWinPct: 37, drawPct: 44, blackWinPct: 19 },
    ],
  },
  {
    eco: "E00",
    name: "Catalan Opening",
    moves: "d4 Nf6 c4 e6 g3",
    description: "Sophisticated hybrid of the Queen's Gambit and Réti Opening. White fianchettoes the light-squared bishop for lasting pressure.",
    stats: { games: 21400, whiteWinPct: 42, drawPct: 41, blackWinPct: 17 },
    continuations: [
      { san: "d5", games: 16800, whiteWinPct: 41, drawPct: 42, blackWinPct: 17 },
    ],
  },
  {
    eco: "D00",
    name: "London System",
    moves: "d4 d5 Bf4",
    description: "A universally solid, harmonious system where White develops the dark-squared bishop outside the pawn chain before playing e3.",
    stats: { games: 36700, whiteWinPct: 40, drawPct: 35, blackWinPct: 25 },
    continuations: [
      { san: "Nf6", games: 22000, whiteWinPct: 40, drawPct: 36, blackWinPct: 24 },
      { san: "c5", games: 8900, whiteWinPct: 39, drawPct: 33, blackWinPct: 28 },
    ],
  },
  {
    eco: "D02",
    name: "Queen's Pawn Game",
    moves: "d4 d5",
    description: "Classical closed opening foundation where both sides contest central territory without an early pawn sacrifice.",
    stats: { games: 52000, whiteWinPct: 39, drawPct: 37, blackWinPct: 24 },
    continuations: [
      { san: "Nf3", games: 22000, whiteWinPct: 39, drawPct: 38, blackWinPct: 23 },
      { san: "c4", games: 26000, whiteWinPct: 40, drawPct: 39, blackWinPct: 21 },
    ],
  },
  {
    eco: "A45",
    name: "Trompowsky Attack",
    moves: "d4 Nf6 Bg5",
    description: "White avoids deep Indian theory by developing the bishop actively to pin and provoke Black's knight on f6.",
    stats: { games: 14200, whiteWinPct: 41, drawPct: 31, blackWinPct: 28 },
    continuations: [
      { san: "e6", games: 6200, whiteWinPct: 40, drawPct: 33, blackWinPct: 27 },
      { san: "Ne4", games: 5800, whiteWinPct: 41, drawPct: 30, blackWinPct: 29 },
    ],
  },

  // Flank Openings
  {
    eco: "A10",
    name: "English Opening",
    moves: "c4",
    description: "White stakes a claim on the d5 square from the wing, often transposing into rich Sicilian-reversed structures or Queen's Pawn positions.",
    stats: { games: 25100, whiteWinPct: 39, drawPct: 38, blackWinPct: 23 },
    continuations: [
      { san: "e5", games: 10400, whiteWinPct: 38, drawPct: 37, blackWinPct: 25 },
      { san: "Nf6", games: 8200, whiteWinPct: 40, drawPct: 39, blackWinPct: 21 },
      { san: "c5", games: 4100, whiteWinPct: 37, drawPct: 43, blackWinPct: 20 },
    ],
  },
  {
    eco: "A04",
    name: "Réti Opening",
    moves: "Nf3",
    description: "Hypermodern flank opening pioneered by Richard Réti, controlling the center from afar with piece pressure rather than early pawn occupation.",
    stats: { games: 28200, whiteWinPct: 39, drawPct: 38, blackWinPct: 23 },
    continuations: [
      { san: "d5", games: 15400, whiteWinPct: 39, drawPct: 38, blackWinPct: 23 },
      { san: "Nf6", games: 8900, whiteWinPct: 38, drawPct: 41, blackWinPct: 21 },
    ],
  },
];

/**
 * High-precision opening detection that matches the longest fully-aligned opening
 * sequence played so far.
 */
export function detectOpening(movesSoFar: string[] | string): OpeningData | null {
  const moveArray = Array.isArray(movesSoFar)
    ? movesSoFar
    : movesSoFar.trim().split(/\s+/).filter(Boolean);
  if (moveArray.length === 0) return null;

  let bestMatch: OpeningData | null = null;
  let maxMatchedTokens = 0;

  for (const opening of OPENINGS_DATABASE) {
    const openingTokens = opening.moves.split(/\s+/).filter(Boolean);
    let matchCount = 0;

    for (let i = 0; i < openingTokens.length && i < moveArray.length; i++) {
      if (openingTokens[i] === moveArray[i]) {
        matchCount++;
      } else {
        break;
      }
    }

    // Only valid match if:
    // 1. All moves of this opening were played: matchCount === openingTokens.length
    // 2. Or the game is in its opening plies (<= 4 moves) and matches all moves played so far
    if (
      matchCount === openingTokens.length ||
      (moveArray.length <= 4 && matchCount === moveArray.length && matchCount >= 2)
    ) {
      if (matchCount > maxMatchedTokens) {
        maxMatchedTokens = matchCount;
        bestMatch = opening;
      }
    }
  }

  return bestMatch;
}
