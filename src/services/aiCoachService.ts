import type { MoveGrade } from "../types/chess";

export interface CoachContext {
  fen: string;
  turn: "w" | "b";
  currentPly?: number;
  moveNumber?: number;
  playedMove?: {
    san: string;
    grade: MoveGrade;
    eval: number;
    explanation?: string;
  };
  engineMove?: {
    san: string;
    eval: number;
  };
  openingName?: string;
  playerRating?: number;
  weaknesses?: string[];
  strengths?: string[];
  competenciesSummary?: string;
  currentDrill?: {
    title: string;
    objective: string;
    badMovePlayed?: string;
    solution: string;
  };
}

export interface CoachMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
}

export type OpenSourceModelId = "builtin-gm" | "groq" | "ollama-local";

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export interface CoachSettings {
  selectedModel: OpenSourceModelId;
  /** Groq API key. Stored unencrypted in this browser's localStorage. */
  apiKey?: string;
  /** Groq model id, e.g. "openai/gpt-oss-120b". Use listGroqModels() to see what's available. */
  groqModel?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
}

const SETTINGS_KEY = "omnichess_ai_coach_settings_v1";

class AiCoachService {
  private settings: CoachSettings = {
    selectedModel: "builtin-gm",
    ollamaEndpoint: "http://localhost:11434",
    ollamaModel: "llama3.3",
  };

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate per-model ids from earlier versions to the single Groq option.
        if (["llama-3.3-70b", "deepseek-r1-70b", "qwen-2.5-72b"].includes(parsed.selectedModel)) {
          parsed.selectedModel = "groq";
        }
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {
      console.warn("Could not load coach settings:", e);
    }
  }

  public saveSettings(newSettings: Partial<CoachSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn("Could not save coach settings:", e);
      }
    }
  }

  public getSettings(): CoachSettings {
    return this.settings;
  }

  public generateSystemPrompt(context: CoachContext): string {
    const parts: string[] = [];

    parts.push(
      "You are an experienced, plain-spoken chess coach inside OmniChess Studio. Base every claim on the engine data provided; if you are unsure, say so.",
      "Your tone is dignified, articulate, encouraging, and technically rigorous. Never use internet memes or casual slang.",
      "Always reference standard algebraic notation (e.g. 14... Nxd4, 15. Qh5+) when explaining moves.",
      "Your student is an aspiring player dedicated to deliberate improvement."
    );

    if (context.playerRating) {
      parts.push(`Student's Estimated Rating: ~${context.playerRating} Elo.`);
      if (context.playerRating < 1200) {
        parts.push(
          "Pedagogical Instruction for Novice/Intermediate (~1000 Elo): Keep tactical advice concrete, accessible, and intuitive. Prioritize piece safety (not leaving pieces undefended), basic checks/captures/threats, king safety, and simple 1-2 move combinations rather than overly obscure positional theories."
        );
      } else if (context.playerRating < 1600) {
        parts.push(
          "Pedagogical Instruction for Club/Intermediate (~1200-1600 Elo): Emphasize active piece development, pawn structure integrity, coordination, and recognizing 2-3 move tactical motifs (forks, pins, skewers, deflection)."
        );
      } else {
        parts.push(
          "Pedagogical Instruction for Advanced/Master (1600+ Elo): Delve deeply into positional nuances, dynamic compensation, piece outposts, prophylaxis, and precise endgame conversion."
        );
      }
    }

    if (context.competenciesSummary) {
      parts.push(`Student's Diagnosed Skill Profile: ${context.competenciesSummary}`);
    }

    if (context.weaknesses && context.weaknesses.length > 0) {
      parts.push(`Known Student Deficits: ${context.weaknesses.join("; ")}`);
    }

    parts.push(`Active Board Position FEN: ${context.fen} (${context.turn === "w" ? "White" : "Black"} to move).`);

    if (context.openingName) {
      parts.push(`Active Opening: ${context.openingName}.`);
    }

    if (context.playedMove && context.engineMove) {
      parts.push(
        `Reviewing Move ${context.moveNumber || ""}: Played Move was ${context.playedMove.san} (${context.playedMove.grade.toUpperCase()}, eval: ${(context.playedMove.eval / 100).toFixed(2)}).`,
        `Stockfish Recommended Continuation: ${context.engineMove.san} (eval: ${(context.engineMove.eval / 100).toFixed(2)}).`,
        context.playedMove.explanation ? `Engine note: ${context.playedMove.explanation}` : ""
      );
    }

    if (context.currentDrill) {
      parts.push(
        `Active Tactical Drill: "${context.currentDrill.title}". Objective: ${context.currentDrill.objective}. Solution: ${context.currentDrill.solution}.`
      );
    }

    parts.push(
      "Instructions for your response:",
      "- Answer the student's question directly with clear positional and tactical rationale.",
      "- If asked for clarification or why a move was bad, explain both the immediate tactical threat and the resulting positional damage.",
      "- Relate concepts back to their diagnosed development goals whenever relevant.",
      "- Keep explanations structured, concise, and master-level."
    );

    return parts.filter(Boolean).join("\n");
  }

  public async askCoach(
    userMessage: string,
    history: CoachMessage[],
    context: CoachContext
  ): Promise<string> {
    const model = this.settings.selectedModel;

    // 1. If Local Ollama is chosen
    if (model === "ollama-local") {
      try {
        return await this.callOllama(userMessage, history, context);
      } catch (err: any) {
        console.warn("Ollama connection failed, falling back to built-in GM coach:", err);
        return (
          `*(Ollama local connection to ${this.settings.ollamaEndpoint || "http://localhost:11434"} failed. Answering with the built-in coach instead)*\n\n` +
          this.generateBuiltinResponse(userMessage, context)
        );
      }
    }

    // 2. Groq-hosted open model
    if (model === "groq") {
      if (!this.settings.apiKey) {
        return "*(No Groq API key set — answering with the built-in coach instead.)*\n\n" + this.generateBuiltinResponse(userMessage, context);
      }
      try {
        return await this.callGroq(userMessage, history, context);
      } catch (err) {
        console.warn("Groq request failed, falling back to built-in coach:", err);
        return (
          `*(Groq request failed: ${(err as Error).message}. Answering with the built-in coach instead.)*\n\n` +
          this.generateBuiltinResponse(userMessage, context)
        );
      }
    }

    // 3. Default Built-in rule-based coach
    return this.generateBuiltinResponse(userMessage, context);
  }

  private async callOllama(
    userMessage: string,
    history: CoachMessage[],
    context: CoachContext
  ): Promise<string> {
    const endpoint = (this.settings.ollamaEndpoint || "http://localhost:11434").replace(/\/$/, "");
    const modelName = this.settings.ollamaModel || "llama3.3";
    const systemPrompt = this.generateSystemPrompt(context);

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await fetch(`${endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || "No response received from local Ollama model.";
  }

  /** Model ids available to this API key (Groq's OpenAI-compatible /models endpoint). */
  public async listGroqModels(apiKey = this.settings.apiKey): Promise<string[]> {
    if (!apiKey) return [];
    const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error(`Groq returned ${res.status}`);
    const json = await res.json();
    return (json.data ?? [])
      .filter((m: { id: string; active?: boolean }) => m.active !== false && !/whisper|tts|orpheus|guard/i.test(m.id))
      .map((m: { id: string }) => m.id)
      .sort();
  }

  private async callGroq(userMessage: string, history: CoachMessage[], context: CoachContext): Promise<string> {
    const systemPrompt = this.generateSystemPrompt(context);
    const apiModel = this.settings.groqModel || DEFAULT_GROQ_MODEL;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: userMessage },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages,
        temperature: 0.3,
        max_tokens: 850,
      }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.error?.message ?? `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || "No response generated by model.";
  }

  /**
   * Built-in rule-based coach (offline). Template answers built from the engine data in the context.
   */
  public generateBuiltinResponse(userMessage: string, context: CoachContext): string {
    const lower = userMessage.toLowerCase();
    const played = context.playedMove;
    const engine = context.engineMove;

    // 1. Clarification regarding played blunder or mistake
    if (lower.includes("blunder") || lower.includes("mistake") || lower.includes("why was") || lower.includes("why is")) {
      if (played && engine) {
        const deltaPawns = Math.abs(played.eval - engine.eval) / 100;
        return (
          `### Tactical Review: **${played.san}** vs **${engine.san}**\n\n` +
          `In this position, **${played.san}** is graded as a **${played.grade.toUpperCase()}**, conceding approximately **${deltaPawns.toFixed(1)} pawns** in theoretical evaluation.\n\n` +
          `#### Why ${played.san} Fails:\n` +
          `- **Tactical Deficit**: ${played.explanation || `It disrupts piece harmony and creates an exploitable target on the board.`}\n` +
          `- **Underlying Vulnerability**: In positions of high central tension, committal moves must strictly account for opposing forcing checks and captures.\n\n` +
          `#### Why Stockfish Recommends **${engine.san}**:\n` +
          `- **${engine.san}** addresses the critical square, optimizing your piece coordination while keeping the position structurally sound.\n` +
          `- It prevents opponent tactical counterplay and maintains an evaluation of **${(engine.eval / 100).toFixed(2)}**.\n\n` +
          `**Coach's Advice**: Before making committal moves, always scan for undefended minor pieces and forced tactical sequences.`
        );
      }
      return (
        `To evaluate why a move is imprecise, we must calculate the candidate checks, captures, and threats (CCT principle). In this position (${context.fen}), ensure your pieces are defending one another and check if opponent pieces have tactical outposts.`
      );
    }

    // 2. Strategic plan / Continuation inquiry
    if (lower.includes("plan") || lower.includes("what should i do") || lower.includes("strategy")) {
      const turnLabel = context.turn === "w" ? "White" : "Black";
      const opName = context.openingName ? `in the **${context.openingName}**` : "in this structure";
      return (
        `### Strategic Blueprint for ${turnLabel} ${opName}\n\n` +
        `1. **Central Control**: Ensure your central pawn chain is supported. Do not surrender central squares without receiving dynamic compensation or bishop pair advantage.\n` +
        `2. **Piece Activity**: Look to post your knights onto advanced outposts (e.g. e5, d5, c4) supported by pawns where enemy pawns cannot dislodge them.\n` +
        `3. **Rook Coordination**: Double your rooks along open or semi-open files. If the game approaches an endgame, infiltrating the 7th rank is the single highest-priority conversion technique.\n` +
        `4. **Prophylaxis (King Safety)**: Create an escape square (*luft*) on h3 or h6 to completely eliminate back-rank tactical threats before initiating wing expansion.`
      );
    }

    // 3. Opening Repertoire Question
    if (lower.includes("opening") || lower.includes("french") || lower.includes("sicilian") || lower.includes("caro") || lower.includes("gambit")) {
      return (
        `### Opening Principles & Theoretical Discipline\n\n` +
        `When navigating complex opening variations:\n` +
        `- **Central Stake**: Direct piece pressure against the center (e4/d4/e5/d5) is superior to passive development.\n` +
        `- **Early Deviations**: In our diagnostic analysis, early inaccuracies on moves 5–9 frequently originate from resolving central tension prematurely. Maintain pawn tension until opponent commits their king or rooks.\n` +
        `- **King Placement**: Complete castling before launching tactical attacks. An uncastled king on the e-file invites deflections.`
      );
    }

    // 4. Personalized Training & Weaknesses
    if (lower.includes("weakness") || lower.includes("train") || lower.includes("improve") || lower.includes("deficit") || lower.includes("drill")) {
      const weaknessesText = context.weaknesses && context.weaknesses.length > 0
        ? context.weaknesses.map((w) => `- ${w}`).join("\n")
        : "- Tactical oversight of intermediate checks under time pressure.\n- Passive piece placement in 6-piece endgames.";

      return (
        `### Your Personalized Training Prescription\n\n` +
        `Based on games analyzed by Stockfish:\n\n` +
        `**Diagnosed Areas for Immediate Focus**:\n${weaknessesText}\n\n` +
        `**Actionable Regimen**:\n` +
        `1. **Personal Drill Lab**: Spend 15 minutes daily solving the customized drills extracted from your own blunders in the **Coach & Drills** tab.\n` +
        `2. **Calculation Checklist**: Whenever you calculate a move, check: *What does my opponent threaten if I play this? Are any of my pieces hanging?*\n` +
        `3. **Endgame King Activity**: In rook endgames, never leave your king passive on the back rank. King centralization is worth a full tempo.`
      );
    }

    // 5. Clarification / Simplification
    if (lower.includes("clarify") || lower.includes("simpler") || lower.includes("simplify") || lower.includes("explain again")) {
      return (
        `### Clarification & Fundamental Principle\n\n` +
        `Let us strip away the complexity:\n` +
        `- Chess is fundamentally an economy of time (tempi) and coordination.\n` +
        `- When you make a move that does not threaten anything or defend an existing weakness, you hand the initiative to your opponent.\n` +
        `- In this exact position, the difference between the engine move and a lower-quality move is **piece efficiency**: the engine move accomplishes two things at once (e.g. defending while exerting pressure), whereas passive moves only do one or none.\n\n` +
        `Does this clarify the distinction, or would you like to examine a specific piece on the board?`
      );
    }

    // Generic Grandmaster Response
    return (
      `### Position Assessment\n\n` +
      `Analyzing position **${context.fen.split(" ")[0]}** (${context.turn === "w" ? "White" : "Black"} to move):\n\n` +
      `- **Material & Structure**: Evaluate the open files and identify any pawn weaknesses (isolated or backward pawns).\n` +
      `- **Tactical Tension**: Search for alignments: queen and king on the same file, rooks on open files, and loose (undefended) minor pieces.\n` +
      `- **Stockfish Recommendation**: Focus on activating your least active piece and placing it where it controls key central squares.\n\n` +
      `Feel free to ask for a specific tactical breakdown of any candidate move, opening continuation, or advice on your training regimen!`
    );
  }

  public getSuggestedPrompts(context: CoachContext): string[] {
    const prompts: string[] = [];

    if (context.playedMove && context.engineMove) {
      prompts.push(`Why was ${context.playedMove.san} a ${context.playedMove.grade}?`);
      prompts.push(`Explain Stockfish's continuation ${context.engineMove.san}`);
    }

    if (context.openingName) {
      prompts.push(`What are the key plans in the ${context.openingName}?`);
    } else {
      prompts.push("What is the best strategic plan from here?");
    }

    prompts.push("How does this position relate to my diagnosed weaknesses?");
    prompts.push("Can you explain the tactical motifs in simple terms?");

    return prompts.slice(0, 4);
  }
}

export const aiCoachService = new AiCoachService();
