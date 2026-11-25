/**
 * Short, practical lessons tied to the weaknesses the app can detect.
 * Each lesson ends with a habit to practice and links to free exercises.
 * Puzzle links use Lichess puzzle-theme pages (lichess.org/training/<theme>).
 */
export interface LessonResource {
  label: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string[] }[];
  checklist: string[];
  puzzleThemes: LessonResource[];
  further: LessonResource[];
}

const puzzles = (theme: string, label: string): LessonResource => ({
  label: `Lichess puzzles: ${label}`,
  url: `https://lichess.org/training/${theme}`,
});

export const LESSONS: Record<string, Lesson> = {
  hung_material: {
    id: "hung_material",
    title: "Stop leaving pieces hanging",
    summary: "Most games below master level are decided by a piece left where it can be taken for free. The fix is a short safety check before every move.",
    sections: [
      {
        heading: "Why it happens",
        body: [
          "You look at what your move does, but not at what it stops doing. A piece that moves can stop defending another one, and a pawn push can open a line to something valuable.",
          "It also happens right after the opponent's move: you continue your own plan without asking what their last move threatens.",
        ],
      },
      {
        heading: "The two-question habit",
        body: [
          "Before you touch a piece, ask: (1) What does my opponent's last move attack or threaten? (2) After my move, which of my pieces are undefended or attacked more times than they are defended?",
          "Count attackers and defenders on any square where pieces meet. If they attack it more often than you defend it, or attack it with something cheaper, the piece is in danger.",
          "Watch especially for pieces that were defended only by the piece you are about to move.",
        ],
      },
    ],
    checklist: [
      "What did their last move change?",
      "After my move, is every piece defended or safe?",
      "Am I about to move a piece that was defending something?",
    ],
    puzzleThemes: [puzzles("hangingPiece", "Hanging piece"), puzzles("trappedPiece", "Trapped piece"), puzzles("defensiveMove", "Defensive move")],
    further: [{ label: "Lichess Practice: piece safety & checkmates", url: "https://lichess.org/practice" }],
  },
  missed_tactic: {
    id: "missed_tactic",
    title: "Spot the tactics you are missing",
    summary: "In these positions a forcing move won material and you played something quieter. Seeing tactics is pattern recognition, and patterns come from volume.",
    sections: [
      {
        heading: "Look at forcing moves first",
        body: [
          "On every move, list your checks, then captures, then moves that attack something (threats), in that order. Forcing moves limit the opponent's replies, so they are the easiest to calculate and the most likely to win something.",
          "Most tactics come from a few motifs: forks (one piece attacks two), pins and skewers (pieces lined up on a file, rank or diagonal), discovered attacks, and overloaded defenders.",
        ],
      },
      {
        heading: "Signs that a tactic is there",
        body: [
          "Undefended pieces, a king with few escape squares, two enemy pieces a knight's jump apart, and pieces lined up with their king or queen. When you see one of these, slow down and look for a forcing move.",
        ],
      },
    ],
    checklist: ["Checks, captures, threats — for me", "Any loose pieces or lined-up pieces?", "Calculate the forcing line to the end before rejecting it"],
    puzzleThemes: [puzzles("fork", "Fork"), puzzles("pin", "Pin"), puzzles("skewer", "Skewer"), puzzles("discoveredAttack", "Discovered attack")],
    further: [{ label: "Lichess Practice: tactics", url: "https://lichess.org/practice" }],
  },
  mates: {
    id: "mates",
    title: "Checkmate patterns and king safety",
    summary: "You either missed a mate or walked into one. Knowing the common mating patterns helps on both sides of the board.",
    sections: [
      {
        heading: "Patterns to know cold",
        body: [
          "Back-rank mate (king trapped by its own pawns), smothered mate, the queen-and-bishop battery on h7/h2, and rook-plus-rook ladder mates cover a large share of real-game mates.",
          "When the enemy king has no luft and your heavy pieces can reach its back rank, look for back-rank tactics before anything else.",
        ],
      },
      {
        heading: "Defending your own king",
        body: [
          "Before going after material, check whether your king has escape squares. A quiet move like h3 (or h6 for Black) at the right time removes back-rank mates.",
          "When the opponent's pieces are gathering near your king, count attackers against defenders and bring a piece back before it is too late.",
        ],
      },
    ],
    checklist: ["Does either king lack escape squares?", "Can a check lead to mate?", "Is my back rank safe?"],
    puzzleThemes: [puzzles("mateIn1", "Mate in 1"), puzzles("mateIn2", "Mate in 2"), puzzles("backRankMate", "Back-rank mate"), puzzles("kingsideAttack", "Kingside attack")],
    further: [{ label: "Lichess Practice: checkmate patterns", url: "https://lichess.org/practice" }],
  },
  opening: {
    id: "opening",
    title: "Tighten up your openings",
    summary: "You are coming out of the opening worse than you should in one or more lines. You don't need more theory; you need to understand the lines you already play.",
    sections: [
      {
        heading: "Study your own games, not a book",
        body: [
          "Open the games listed below, find the first move where the engine's evaluation turned against you, and look up that position in the opening explorer to see what stronger players play there.",
          "Write down one or two key ideas for the line (a typical pawn break, where the pieces belong) instead of memorizing long move orders.",
        ],
      },
      {
        heading: "Principles when you are out of book",
        body: [
          "Develop knights and bishops before moving the same piece twice, castle early, fight for the center with pawns, and don't grab pawns with your queen early unless you have checked the consequences.",
        ],
      },
    ],
    checklist: ["Where did the evaluation first drop?", "What do strong players play there?", "One key idea for this line"],
    puzzleThemes: [puzzles("opening", "Opening tactics")],
    further: [{ label: "Lichess opening explorer", url: "https://lichess.org/analysis#explorer" }],
  },
  endgame: {
    id: "endgame",
    title: "Endgame technique",
    summary: "Your accuracy drops once the pieces come off. A handful of key endgame ideas covers most practical cases.",
    sections: [
      {
        heading: "The ideas that matter most",
        body: [
          "Activate the king: in the endgame it is a strong piece and belongs in the center or near the pawns.",
          "Rook endgames are the most common: put rooks behind passed pawns (yours or the opponent's) and keep your rook active rather than passively defending.",
          "King-and-pawn endgames hinge on opposition and on counting moves; when you are ahead, trading pieces (not pawns) usually makes winning easier.",
        ],
      },
    ],
    checklist: ["Is my king active?", "Where are the passed pawns, and are rooks behind them?", "Should I trade pieces or keep them?"],
    puzzleThemes: [puzzles("endgame", "Endgame"), puzzles("rookEndgame", "Rook endgame"), puzzles("pawnEndgame", "Pawn endgame")],
    further: [{ label: "Lichess Practice: fundamental endgames", url: "https://lichess.org/practice" }],
  },
  positional: {
    id: "positional",
    title: "Plans and piece placement",
    summary: "These mistakes are not tactical: the move lost value slowly, through a weak pawn move, a misplaced piece or the wrong plan.",
    sections: [
      {
        heading: "Ask what your worst piece is",
        body: [
          "When there is no tactic, improve your least active piece. Knights want central outposts that pawns can't attack; bishops want open diagonals; rooks want open files.",
          "Pawn moves can't be taken back. Before pushing one, ask which squares it gives up permanently.",
        ],
      },
      {
        heading: "Compare with the engine's idea",
        body: [
          "For each of these positions, play through the engine's line and put into words what it is trying to achieve. That habit of naming plans is what transfers to your own games.",
        ],
      },
    ],
    checklist: ["Which is my worst piece?", "What squares does this pawn move weaken?", "What is my opponent's plan?"],
    puzzleThemes: [puzzles("quietMove", "Quiet move"), puzzles("advantage", "Advantage")],
    further: [],
  },
  time_trouble: {
    id: "time_trouble",
    title: "Managing the clock",
    summary: "A large share of your mistakes happen with little time left. Better time use is often the quickest rating gain available.",
    sections: [
      {
        heading: "Spend time where it matters",
        body: [
          "Play the opening moves you know quickly and save time for the moments that matter: when the position changes (captures, pawn breaks, an attack starting) or when you are about to commit to a plan.",
          "Set a checkpoint: for a 10-minute game, aim to have at least 5 minutes left at move 20.",
          "If you are short on time, choose safe, simple moves and avoid opening up the position.",
        ],
      },
      {
        heading: "Practice",
        body: ["Play some games at a longer time control (15+10 or longer) to build calculation habits without time pressure, then bring them back to faster games."],
      },
    ],
    checklist: ["Am I on pace for my move-20 checkpoint?", "Is this a critical moment worth thinking about?", "Short on time: keep it simple"],
    puzzleThemes: [puzzles("mix", "Puzzle mix (practice speed)")],
    further: [{ label: "Lichess Puzzle Storm (speed)", url: "https://lichess.org/storm" }],
  },
  conversion: {
    id: "conversion",
    title: "Converting winning positions",
    summary: "You reached clearly winning positions and did not win them. Winning a won game is a separate skill from getting one.",
    sections: [
      {
        heading: "When ahead, simplify",
        body: [
          "Trade pieces (not pawns) when you are up material: every trade makes your extra material count more.",
          "Before each move in a winning position, ask what the opponent's most dangerous idea is (counterattack, perpetual check, a trick against your king) and take it away first.",
          "Avoid unnecessary complications. The engine's fastest win is not required; a safe, clear plan is enough.",
        ],
      },
    ],
    checklist: ["What is their only counterplay?", "Can I trade a pair of pieces?", "Is my king safe from checks?"],
    puzzleThemes: [puzzles("crushing", "Crushing"), puzzles("defensiveMove", "Defensive move")],
    further: [],
  },
};
