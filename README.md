# OmniChess Studio

**OmniChess Studio** is a tournament-grade chess analysis, training, and play platform built with **React 19, TypeScript, Vite, and Tailwind CSS v4**.

Designed with a clean FIDE tournament aesthetic, OmniChess Studio integrates embedded **Stockfish 19 WebAssembly NNUE**, deep multi-PV move analysis, multi-game playing history profiling, automated personalized blunder drill extraction, and conversational AI coaching.

---

## 🏛️ Key Features

### 1. Stockfish 19 WASM NNUE Engine
- Embedded WebAssembly NNUE Stockfish 19 engine running via Web Workers with UCI protocol communication.
- Real-time continuous position evaluation, centipawn bar, and depth calculation.
- 4 bot difficulty tiers from Novice (800) to Grandmaster (2600).

### 2. Multi-PV Engine Recommendations & Game Review
- Full game review with move classification badges modeled after FIDE Informant conventions (`!!`, `!`, `★`, `✓`, `?!`, `?`, `??`, `+-`).
- **Engine Recommendations (Multi-PV)**: Displays Top 1–3 candidate moves with live evaluation pills, continuation sequence (PV), and played move validation.
- One-click interactive board preview to demonstrate candidate lines directly on the chessboard.

### 3. Playing History Ingestion & Dynamic Training Regimen
- Direct API ingestion of player archives from **Chess.com** and **Lichess.com**.
- High-speed batch diagnostic analysis capable of evaluating 20+ games in under a second.
- **5 FIDE Technical Competencies**:
  1. *Opening Repertoire Discipline*
  2. *Tactical Vigilance & Calculation*
  3. *Piece Coordination & Harmony*
  4. *Pawn Structure & Strategic Integrity*
  5. *Endgame Technique & Conversion*
- **Personal Drill Lab**: Converts high-impact blunders and missed wins directly from your games into interactive tactical drills with instant move validation.
- **Adaptive 7-Day Performance Regimen**: Automatically prioritizes training on your lowest technical competency.

### 4. Player Profile & Lifetime Session Persistence
- 100% private, client-side session persistence via browser `localStorage` (`omnichess_performance_plan_v1`).
- Dedicated profile modal to inspect match records (W/L/D), win percentage, average accuracy, and competency diagnostics.
- Full profile backup export and restore via JSON.

### 5. Grandmaster AI Coach
- Conversational coaching drawer supporting open-source models:
  - Meta Llama 3.3 70B
  - DeepSeek-R1 (chain-of-thought)
  - Qwen 2.5 72B
  - Local Ollama (`http://localhost:11434`)
  - Built-in offline Grandmaster reasoning fallback
- Deep socratic exploration of tactical threats, pawn structure, and strategic plans.

### 6. Fluid Board Controls
- Dual-mode piece movement: Click-to-Move and Drag-and-Drop operate simultaneously.
- 4 tournament board themes: Emerald Classic, Heritage Wood, Tournament Slate, and High Contrast.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4
- **Chess Engine**: Stockfish 19 (WebAssembly NNUE via Web Worker), `chess.js`
- **Icons & UI**: Lucide React, Canvas Confetti
- **Linting & Tooling**: Oxlint

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/jpclarkin/omnichess-studio.git
cd omnichess-studio

# Install dependencies
npm install

# Launch development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 📄 License
MIT License
