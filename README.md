# OmniChess Studio

A personal chess-improvement app. It pulls in your games from **Chess.com** and **Lichess**, analyzes every one with **Stockfish** in your browser, finds the patterns that cost you games, and gives you a weekly plan: short lessons, drills built from your own mistakes, and themed puzzles.

Built with React 19, TypeScript, Vite and Tailwind CSS v4. Everything runs in the browser; your games and progress stay on your machine.

## Features

### My Improvement
- **Automatic game sync** — add your Chess.com and/or Lichess username once. New games are fetched each time you open the app (at most every 10 minutes) and analyzed in the background.
- **Insights** — accuracy by game phase, where your mistakes come from (hanging material, missed tactics, missed/allowed mates, opening, endgame, positional), how many came in time trouble, how often you convert winning positions, your openings with results and the engine evaluation after move 12, and your real Chess.com/Lichess rating history.
- **Weekly plan** — the two or three issues costing you the most, each with the evidence from your games, a short lesson with a before-every-move checklist, and a week of tasks: drills, Lichess themed puzzles, game reviews and practice games. It rebuilds every Monday.
- **My mistakes (drills)** — every mistake from your games becomes a "find the better move" position. Alternative answers are checked with Stockfish, and drills come back on a spaced-repetition schedule.

### Play, review, explore
- **Play vs Stockfish** at seven levels, using Stockfish's own strength limiter (Skill Level for the lowest two, `UCI_Elo` 1400–2400, then full strength). "Engine Elo" is Stockfish's scale, not a Chess.com/Lichess rating.
- **Game review** — every position is searched once with MultiPV 2. Moves are graded with Lichess's win-probability thresholds (inaccuracy / mistake / blunder at 5 / 10 / 15 points of win chance), and accuracy uses [Lichess's published formula](https://lichess.org/page/accuracy). "Brilliant" is reserved for real sacrifices the engine approves of; "Great" means the only good move.
- **Opening explorer** (ChessDB cloud book; Lichess masters database when you add a Lichess API token) and **Syzygy tablebase** lookups for positions with 7 or fewer pieces.
- **Tactics trainer** with a curated set and the Lichess daily puzzle.
- **AI coach** — a built-in, offline rule-based coach, or a real language model via [Groq](https://console.groq.com) (free API key; model list loaded from your account) or a local [Ollama](https://ollama.com) server. If a model request fails, the reply says so.

## Engine

The bundled engine is **Stockfish 18 Lite** (single-threaded WASM build from [stockfish.js](https://github.com/nmrugg/stockfish.js)), in `public/stockfish/`. It runs in a Web Worker behind a priority queue: live evaluation, bot moves and on-screen reviews jump ahead of background analysis. Searches that run long are stopped with `stop`, and if Stockfish can't start, the app says so instead of substituting a weaker engine.

## Data and privacy

- Games and their analysis are stored in your browser's IndexedDB; plans, settings and drill progress in localStorage.
- Usernames are only sent to Chess.com and Lichess. API keys/tokens (Groq, Lichess) are stored unencrypted in this browser and sent only to their own services.
- Clearing site data for the app removes everything.

## Getting started

Requires Node.js 20+.

```bash
git clone https://github.com/jpclarkin/omnichess-studio.git
cd omnichess-studio
npm install
npm run dev        # http://localhost:5173
```

Then open **My Improvement**, click **Accounts**, enter your usernames and press **Save & sync**. The first sync imports your last 60 games per site (configurable) and analyzes them at depth 12; expect a few seconds per game.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build |
| `npm test` | Unit tests (Vitest) for grading, insights, plan building and API mapping |
| `npm run lint` | Oxlint |

## License

GPL-3.0-or-later (see [LICENSE](LICENSE)). The app bundles Stockfish, which is licensed under the GPLv3, so the project as a whole is distributed under the GPL.
