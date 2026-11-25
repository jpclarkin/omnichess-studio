import type { TacticalPuzzle } from "../types/chess";

/**
 * Curated tactics library. Every puzzle here is a real puzzle from the Lichess
 * puzzle database (CC0, https://database.lichess.org/#puzzles); the solution is the
 * engine-verified line, with the solver's moves at even indexes and the opponent's
 * forced replies at odd indexes.
 *
 * Do not hand-write puzzles: run `node scripts/validate-puzzles.mjs` after any edit.
 */
export const TACTICAL_PUZZLES: TacticalPuzzle[] = [
  {
    "id": "lichess-fBda6",
    "title": "Hanging Piece",
    "rating": 755,
    "theme": "Hanging Piece",
    "fen": "k4r2/pp6/1n1Q4/3pP3/2pP4/P1P3K1/1P2q3/8 w - - 1 1",
    "moves": [
      "Qxf8+",
      "Nc8",
      "Qxc8#"
    ],
    "turn": "w",
    "description": "White to move. An enemy piece is undefended or can be won outright. Find the best way to take advantage.",
    "coachTip": "Before moving, ask what is undefended and what your opponent just left loose.",
    "sourceUrl": "https://lichess.org/training/fBda6"
  },
  {
    "id": "lichess-bEvra",
    "title": "Pin",
    "rating": 844,
    "theme": "Pin",
    "fen": "r1b2r1k/2B3pp/p1p1p1q1/3p1p2/3P3Q/P2BP3/1PPn1PPP/R2R2K1 b - - 1 1",
    "moves": [
      "Nf3+",
      "Kh1",
      "Nxh4"
    ],
    "turn": "b",
    "description": "Black to move. Use a pin to win material or gain a decisive advantage.",
    "coachTip": "A pinned piece cannot move freely; pile up attackers on it.",
    "sourceUrl": "https://lichess.org/training/bEvra"
  },
  {
    "id": "lichess-KdzM9",
    "title": "Fork",
    "rating": 889,
    "theme": "Fork",
    "fen": "3r2k1/p1pr2p1/1p5p/4R3/4Q3/2q2P2/6PP/5RK1 w - - 0 1",
    "moves": [
      "Re8+",
      "Rxe8",
      "Qxe8+",
      "Kh7",
      "Qxd7"
    ],
    "turn": "w",
    "description": "White to move. Find the move that attacks two targets at once.",
    "coachTip": "Look for a single piece that can attack two valuable targets, ideally with check.",
    "sourceUrl": "https://lichess.org/training/KdzM9"
  },
  {
    "id": "lichess-VQoQm",
    "title": "Mate in 1",
    "rating": 966,
    "theme": "Mate in 1",
    "fen": "6k1/pp3pp1/2p2pp1/3q4/3P3Q/1PP3B1/P3r3/4R1K1 b - - 1 1",
    "moves": [
      "Qg2#"
    ],
    "turn": "b",
    "description": "Black to move. Find the checkmate in one move.",
    "coachTip": "Check every checking move; one of them leaves the king no escape.",
    "sourceUrl": "https://lichess.org/training/VQoQm"
  },
  {
    "id": "lichess-kJICJ",
    "title": "Back-Rank Mate",
    "rating": 976,
    "theme": "Back-Rank Mate",
    "fen": "RR6/2r2ppk/7p/8/2n5/8/PP5P/1KN5 b - - 1 1",
    "moves": [
      "Nd2+",
      "Ka1",
      "Rxc1#"
    ],
    "turn": "b",
    "description": "Black to move. The enemy king is boxed in on its back rank. Find the winning blow.",
    "coachTip": "A king with no luft is vulnerable to a rook or queen landing on the back rank.",
    "sourceUrl": "https://lichess.org/training/kJICJ"
  },
  {
    "id": "lichess-8rloX",
    "title": "Fork",
    "rating": 1147,
    "theme": "Fork",
    "fen": "r2q2k1/1b3p1N/3pp1r1/1pp4Q/5P2/PP1PP2R/7P/R4K2 b - - 1 1",
    "moves": [
      "Bg2+",
      "Ke2",
      "Bxh3"
    ],
    "turn": "b",
    "description": "Black to move. Find the move that attacks two targets at once.",
    "coachTip": "Look for a single piece that can attack two valuable targets, ideally with check.",
    "sourceUrl": "https://lichess.org/training/8rloX"
  },
  {
    "id": "lichess-DKqZ6",
    "title": "Mate in 2",
    "rating": 1160,
    "theme": "Mate in 2",
    "fen": "Qq3k1r/6p1/3b1pP1/8/1pP2n2/4R3/PK6/3R4 w - - 1 1",
    "moves": [
      "Qxb8+",
      "Bxb8",
      "Rd8#"
    ],
    "turn": "w",
    "description": "White to move. Find a forcing sequence that mates in two moves.",
    "coachTip": "Start with the most forcing move and look at how the king's flight squares disappear.",
    "sourceUrl": "https://lichess.org/training/DKqZ6"
  },
  {
    "id": "lichess-FQYPN",
    "title": "Hanging Piece",
    "rating": 1198,
    "theme": "Hanging Piece",
    "fen": "6rk/p1pq1p2/2p5/5P2/3pP2r/3P2Pb/PPP2Q1K/R3R3 w - - 0 1",
    "moves": [
      "gxh4",
      "Rg2+",
      "Qxg2"
    ],
    "turn": "w",
    "description": "White to move. An enemy piece is undefended or can be won outright. Find the best way to take advantage.",
    "coachTip": "Before moving, ask what is undefended and what your opponent just left loose.",
    "sourceUrl": "https://lichess.org/training/FQYPN"
  },
  {
    "id": "lichess-bVXf8",
    "title": "Discovered Attack",
    "rating": 1211,
    "theme": "Discovered Attack",
    "fen": "1r5k/2Qb2p1/6qp/3B1p2/5P2/6P1/1b5P/1K2R2R b - - 1 1",
    "moves": [
      "Be5+",
      "Qxb8+",
      "Bxb8"
    ],
    "turn": "b",
    "description": "Black to move. Move one piece to unleash an attack from another.",
    "coachTip": "Moving the front piece with a threat of its own makes a discovered attack hard to meet.",
    "sourceUrl": "https://lichess.org/training/bVXf8"
  },
  {
    "id": "lichess-RoR5n",
    "title": "Mate in 3",
    "rating": 1292,
    "theme": "Mate in 3",
    "fen": "4r1k1/BQ4pp/2p2p2/8/8/1P1q4/1Pb2PPP/5RK1 b - - 0 1",
    "moves": [
      "Qxf1+",
      "Kxf1",
      "Bd3+",
      "Kg1",
      "Re1#"
    ],
    "turn": "b",
    "description": "Black to move. Find a forcing sequence that mates in three moves.",
    "coachTip": "Calculate checks and threats first; quiet moves that take away flight squares often decide it.",
    "sourceUrl": "https://lichess.org/training/RoR5n"
  },
  {
    "id": "lichess-RdwFc",
    "title": "X-Ray Attack",
    "rating": 1330,
    "theme": "X-Ray Attack",
    "fen": "r1b3k1/ppQ2ppp/4pn2/8/8/1B4P1/PPPr2qP/2KR3R w - - 0 1",
    "moves": [
      "Qd8+",
      "Rxd8",
      "Rxd8+",
      "Ne8",
      "Rxe8#"
    ],
    "turn": "w",
    "description": "White to move. Use a piece's influence through another piece to win material.",
    "coachTip": "A piece can defend or attack 'through' an enemy piece along the same line.",
    "sourceUrl": "https://lichess.org/training/RdwFc"
  },
  {
    "id": "lichess-xCesB",
    "title": "Skewer",
    "rating": 1333,
    "theme": "Skewer",
    "fen": "7k/3p3p/p3p2R/1p2P3/3P4/1KPr4/PP4q1/7R w - - 0 1",
    "moves": [
      "Rxh7+",
      "Kg8",
      "Rh8+",
      "Kg7",
      "R1h7+",
      "Kg6",
      "Rg8+",
      "Kxh7",
      "Rxg2"
    ],
    "turn": "w",
    "description": "White to move. Attack a valuable piece so that it must move and expose another behind it.",
    "coachTip": "Line up your rook, bishop or queen with two enemy pieces on the same line.",
    "sourceUrl": "https://lichess.org/training/xCesB"
  },
  {
    "id": "lichess-l13AF",
    "title": "Trapped Piece",
    "rating": 1334,
    "theme": "Trapped Piece",
    "fen": "r4rk1/pp2n1pp/1bp2pq1/3pPb2/3P4/N3B3/PP2BPPP/2RQ1RK1 w - - 0 1",
    "moves": [
      "Bh5",
      "Qxh5",
      "Qxh5"
    ],
    "turn": "w",
    "description": "White to move. An enemy piece has almost no safe squares. Find a way to win it.",
    "coachTip": "Count the squares the piece can reach and take them away one by one.",
    "sourceUrl": "https://lichess.org/training/l13AF"
  },
  {
    "id": "lichess-Nv5UI",
    "title": "Smothered Mate",
    "rating": 1342,
    "theme": "Smothered Mate",
    "fen": "6k1/p1p2p1p/1p4p1/P7/1PPbB1n1/3Q4/5qPP/5R1K b - - 1 1",
    "moves": [
      "Qg1+",
      "Rxg1",
      "Nf2#"
    ],
    "turn": "b",
    "description": "Black to move. Find a mate where the king is boxed in by its own pieces.",
    "coachTip": "A knight check is hard to stop when the king's own pieces block every flight square.",
    "sourceUrl": "https://lichess.org/training/Nv5UI"
  },
  {
    "id": "lichess-HfZMl",
    "title": "Sacrifice",
    "rating": 1404,
    "theme": "Sacrifice",
    "fen": "2r5/5kb1/3p1qp1/1p1P4/p3PpR1/P1rB1P2/1P1NQ3/1K5R b - - 1 1",
    "moves": [
      "Rc1+",
      "Rxc1",
      "Qxb2#"
    ],
    "turn": "b",
    "description": "Black to move. Give up material to win more, or to force a decisive attack.",
    "coachTip": "Check that each forced reply leaves you ahead before you commit the sacrifice.",
    "sourceUrl": "https://lichess.org/training/HfZMl"
  },
  {
    "id": "lichess-11xhg",
    "title": "Intermezzo",
    "rating": 1479,
    "theme": "Intermezzo",
    "fen": "4Rr1k/6bp/6p1/5q2/4Q3/1B3P2/PP6/1K2R3 b - - 1 1",
    "moves": [
      "Rxe8",
      "Qxf5",
      "Rxe1+",
      "Kc2",
      "gxf5"
    ],
    "turn": "b",
    "description": "Black to move. Insert an in-between move before the obvious recapture.",
    "coachTip": "Before recapturing, look for a check or bigger threat that changes the position first.",
    "sourceUrl": "https://lichess.org/training/11xhg"
  },
  {
    "id": "lichess-tuBHL",
    "title": "Attraction",
    "rating": 1522,
    "theme": "Attraction",
    "fen": "6k1/7p/R3p3/3bPpp1/8/4P1PP/5KP1/2r2B2 b - - 1 1",
    "moves": [
      "Rxf1+",
      "Kxf1",
      "Bc4+",
      "Kf2",
      "Bxa6"
    ],
    "turn": "b",
    "description": "Black to move. Lure an enemy piece, often the king, onto a square where it can be hit.",
    "coachTip": "Offer a piece that must be captured and see where the capturing piece ends up.",
    "sourceUrl": "https://lichess.org/training/tuBHL"
  },
  {
    "id": "lichess-sYBME",
    "title": "Deflection",
    "rating": 1598,
    "theme": "Deflection",
    "fen": "Rn5k/3R2p1/4p2p/4P1b1/2pP4/2P2QK1/3q2PP/8 b - - 1 1",
    "moves": [
      "Qe1+",
      "Qf2",
      "Bh4+",
      "Kxh4",
      "Qxf2+"
    ],
    "turn": "b",
    "description": "Black to move. Force a key defender away from its post.",
    "coachTip": "Find the piece guarding something critical and make it move, or capture it.",
    "sourceUrl": "https://lichess.org/training/sYBME"
  },
  {
    "id": "lichess-mfc0B",
    "title": "Endgame",
    "rating": 1630,
    "theme": "Endgame",
    "fen": "2r3k1/3P1pp1/1Q3q1p/p2p4/P2Np3/4P2P/3R1PP1/7K b - - 0 1",
    "moves": [
      "Rc1+",
      "Kh2",
      "Qxb6"
    ],
    "turn": "b",
    "description": "Black to move. Find the accurate technique in this endgame.",
    "coachTip": "In endgames, king activity and precise move order matter more than material.",
    "sourceUrl": "https://lichess.org/training/mfc0B"
  },
  {
    "id": "lichess-sxue4",
    "title": "Double Check",
    "rating": 1633,
    "theme": "Double Check",
    "fen": "r1bk1r2/p1p3b1/1p1P1q2/2P1nn1Q/7N/2N1P1P1/PP3P2/2KR3R w - - 1 1",
    "moves": [
      "dxc7+",
      "Kxc7",
      "Nd5+",
      "Kb7",
      "Nxf6"
    ],
    "turn": "w",
    "description": "White to move. Deliver check with two pieces at once.",
    "coachTip": "Against a double check the king must move, which limits the defence severely.",
    "sourceUrl": "https://lichess.org/training/sxue4"
  },
  {
    "id": "lichess-ZvUnf",
    "title": "Quiet Move",
    "rating": 1665,
    "theme": "Quiet Move",
    "fen": "8/p4pkp/6p1/1P3p2/P6P/8/4nPP1/2r2R1K w - - 1 1",
    "moves": [
      "Rxc1",
      "Nxc1",
      "a5",
      "Nd3",
      "b6",
      "axb6",
      "a6"
    ],
    "turn": "w",
    "description": "White to move. The winning move isn't a check or capture. Find the quiet blow.",
    "coachTip": "Look for the move that creates an unstoppable threat rather than an immediate one.",
    "sourceUrl": "https://lichess.org/training/ZvUnf"
  },
  {
    "id": "lichess-DVeQl",
    "title": "Deflection",
    "rating": 1680,
    "theme": "Deflection",
    "fen": "3nk3/1b4pp/p3P3/8/1b6/3Q2P1/P6q/R2K4 w - - 0 1",
    "moves": [
      "Qd7+",
      "Kf8",
      "Qxd8#"
    ],
    "turn": "w",
    "description": "White to move. Force a key defender away from its post.",
    "coachTip": "Find the piece guarding something critical and make it move, or capture it.",
    "sourceUrl": "https://lichess.org/training/DVeQl"
  },
  {
    "id": "lichess-dw98b",
    "title": "Advanced Pawn",
    "rating": 1715,
    "theme": "Advanced Pawn",
    "fen": "r4r1k/3n1p1P/1qppn2P/8/4PPQ1/p2Bb3/1PK1N3/6RR w - - 0 1",
    "moves": [
      "Qg7+",
      "Nxg7",
      "hxg7#"
    ],
    "turn": "w",
    "description": "White to move. A pawn close to promotion decides the position.",
    "coachTip": "Count the moves to promotion and whether the defender can stop it.",
    "sourceUrl": "https://lichess.org/training/dw98b"
  },
  {
    "id": "lichess-kYtij",
    "title": "Sacrifice",
    "rating": 1826,
    "theme": "Sacrifice",
    "fen": "r3qr1k/ppp1bp2/5n2/6Q1/2NnP3/3B3P/PPP2PP1/R3R1K1 b - - 0 1",
    "moves": [
      "Nf3+",
      "gxf3",
      "Rg8"
    ],
    "turn": "b",
    "description": "Black to move. Give up material to win more, or to force a decisive attack.",
    "coachTip": "Check that each forced reply leaves you ahead before you commit the sacrifice.",
    "sourceUrl": "https://lichess.org/training/kYtij"
  },
  {
    "id": "lichess-TJtY8",
    "title": "Pin",
    "rating": 1857,
    "theme": "Pin",
    "fen": "6k1/1R2Rp2/4b1pp/1p1r4/1Pn5/2P4P/6PK/8 w - - 1 1",
    "moves": [
      "Re8+",
      "Kg7",
      "Rxe6"
    ],
    "turn": "w",
    "description": "White to move. Use a pin to win material or gain a decisive advantage.",
    "coachTip": "A pinned piece cannot move freely; pile up attackers on it.",
    "sourceUrl": "https://lichess.org/training/TJtY8"
  },
  {
    "id": "lichess-0gHAW",
    "title": "Fork",
    "rating": 1905,
    "theme": "Fork",
    "fen": "5n2/1p3pkp/1r4p1/3P4/2Q4P/1PP3P1/q4PK1/5R2 w - - 1 1",
    "moves": [
      "Qd4+",
      "Rf6",
      "g4",
      "Kg8",
      "Qxf6"
    ],
    "turn": "w",
    "description": "White to move. Find the move that attacks two targets at once.",
    "coachTip": "Look for a single piece that can attack two valuable targets, ideally with check.",
    "sourceUrl": "https://lichess.org/training/0gHAW"
  },
  {
    "id": "lichess-ayQNN",
    "title": "Attraction",
    "rating": 2002,
    "theme": "Attraction",
    "fen": "r3rk2/3b1p1R/8/p2P2Q1/6P1/2P5/1qBK1P2/3R4 b - - 0 1",
    "moves": [
      "Re2+",
      "Kxe2",
      "Qxc2+",
      "Kf3",
      "Qxh7"
    ],
    "turn": "b",
    "description": "Black to move. Lure an enemy piece, often the king, onto a square where it can be hit.",
    "coachTip": "Offer a piece that must be captured and see where the capturing piece ends up.",
    "sourceUrl": "https://lichess.org/training/ayQNN"
  },
  {
    "id": "lichess-Y8DXI",
    "title": "Intermezzo",
    "rating": 2112,
    "theme": "Intermezzo",
    "fen": "5rk1/5pp1/2p1N3/p1qpQ3/4P3/2b4P/P4BP1/1R4K1 b - - 0 1",
    "moves": [
      "Qxf2+",
      "Kxf2",
      "fxe6+",
      "Ke3",
      "Bxe5"
    ],
    "turn": "b",
    "description": "Black to move. Insert an in-between move before the obvious recapture.",
    "coachTip": "Before recapturing, look for a check or bigger threat that changes the position first.",
    "sourceUrl": "https://lichess.org/training/Y8DXI"
  },
  {
    "id": "lichess-S5Nt6",
    "title": "Endgame",
    "rating": 2203,
    "theme": "Endgame",
    "fen": "7Q/3k1p2/2p5/1pBqP1p1/1P1p1r1b/2P4P/8/R5K1 w - - 1 1",
    "moves": [
      "Ra7+",
      "Ke6",
      "Re7+",
      "Kf5",
      "Qh7#"
    ],
    "turn": "w",
    "description": "White to move. Find the accurate technique in this endgame.",
    "coachTip": "In endgames, king activity and precise move order matter more than material.",
    "sourceUrl": "https://lichess.org/training/S5Nt6"
  }
];
