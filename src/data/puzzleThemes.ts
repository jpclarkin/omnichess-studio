/** Puzzle themes: display label -> Lichess "angle" (used for live fetches), plus shared copy. */
export interface ThemeInfo {
  angle: string;
  description: string;
  tip: string;
}

export const THEME_INFO: Record<string, ThemeInfo> = {
  "Mate in 1": { angle: "mateIn1", description: "Find the checkmate in one move.", tip: "Check every checking move; one of them leaves the king no escape." },
  "Mate in 2": { angle: "mateIn2", description: "Find a forcing sequence that mates in two moves.", tip: "Start with the most forcing move and look at how the king's flight squares disappear." },
  "Mate in 3": { angle: "mateIn3", description: "Find a forcing sequence that mates in three moves.", tip: "Calculate checks and threats first; quiet moves that take away flight squares often decide it." },
  "Hanging Piece": { angle: "hangingPiece", description: "An enemy piece is undefended or can be won outright. Find the best way to take advantage.", tip: "Before moving, ask what is undefended and what your opponent just left loose." },
  Fork: { angle: "fork", description: "Find the move that attacks two targets at once.", tip: "Look for a single piece that can attack two valuable targets, ideally with check." },
  "Back-Rank Mate": { angle: "backRankMate", description: "The enemy king is boxed in on its back rank. Find the winning blow.", tip: "A king with no luft is vulnerable to a rook or queen landing on the back rank." },
  Pin: { angle: "pin", description: "Use a pin to win material or gain a decisive advantage.", tip: "A pinned piece cannot move freely; pile up attackers on it." },
  Skewer: { angle: "skewer", description: "Attack a valuable piece so that it must move and expose another behind it.", tip: "Line up your rook, bishop or queen with two enemy pieces on the same line." },
  "Discovered Attack": { angle: "discoveredAttack", description: "Move one piece to unleash an attack from another.", tip: "Moving the front piece with a threat of its own makes a discovered attack hard to meet." },
  "Trapped Piece": { angle: "trappedPiece", description: "An enemy piece has almost no safe squares. Find a way to win it.", tip: "Count the squares the piece can reach and take them away one by one." },
  Deflection: { angle: "deflection", description: "Force a key defender away from its post.", tip: "Find the piece guarding something critical and make it move, or capture it." },
  Sacrifice: { angle: "sacrifice", description: "Give up material to win more, or to force a decisive attack.", tip: "Check that each forced reply leaves you ahead before you commit the sacrifice." },
  "Smothered Mate": { angle: "smotheredMate", description: "Find a mate where the king is boxed in by its own pieces.", tip: "A knight check is hard to stop when the king's own pieces block every flight square." },
  Attraction: { angle: "attraction", description: "Lure an enemy piece, often the king, onto a square where it can be hit.", tip: "Offer a piece that must be captured and see where the capturing piece ends up." },
  "X-Ray Attack": { angle: "xRayAttack", description: "Use a piece's influence through another piece to win material.", tip: "A piece can defend or attack 'through' an enemy piece along the same line." },
  Intermezzo: { angle: "intermezzo", description: "Insert an in-between move before the obvious recapture.", tip: "Before recapturing, look for a check or bigger threat that changes the position first." },
  "Double Check": { angle: "doubleCheck", description: "Deliver check with two pieces at once.", tip: "Against a double check the king must move, which limits the defence severely." },
  Clearance: { angle: "clearance", description: "Vacate a square or line so another piece can use it.", tip: "Ask which of your own pieces is in the way and how to move it with tempo." },
  "Quiet Move": { angle: "quietMove", description: "The winning move isn't a check or capture. Find the quiet blow.", tip: "Look for the move that creates an unstoppable threat rather than an immediate one." },
  "Advanced Pawn": { angle: "advancedPawn", description: "A pawn close to promotion decides the position.", tip: "Count the moves to promotion and whether the defender can stop it." },
  Endgame: { angle: "endgame", description: "Find the accurate technique in this endgame.", tip: "In endgames, king activity and precise move order matter more than material." },
};

export const PUZZLE_THEMES = ["All Themes", ...Object.keys(THEME_INFO)];
