import React, { useState, useEffect, useRef } from "react";
import {
  aiCoachService,
  type CoachContext,
  type CoachMessage,
  type OpenSourceModelId,
  DEFAULT_GROQ_MODEL,
} from "../services/aiCoachService";
import {
  Bot,
  X,
  Send,
  Settings,
  Cpu,
} from "lucide-react";

interface AiCoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: CoachContext;
}

export const AiCoachDrawer: React.FC<AiCoachDrawerProps> = ({
  isOpen,
  onClose,
  context,
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>(() => [
    {
      id: "welcome-1",
      sender: "coach",
      text: "Hi! Ask me about the current position, a move from your game review, or your improvement plan. By default I answer with built-in templates; connect Groq or Ollama in settings for a real language model.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(() => aiCoachService.getSettings());
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || "");
  const [ollamaEndpoint, setOllamaEndpoint] = useState(settings.ollamaEndpoint || "http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel || "llama3.3");
  const [groqModel, setGroqModel] = useState(settings.groqModel || DEFAULT_GROQ_MODEL);
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [groqModelsError, setGroqModelsError] = useState<string | null>(null);

  const loadGroqModels = async () => {
    setGroqModelsError(null);
    try {
      const list = await aiCoachService.listGroqModels(apiKeyInput.trim());
      setGroqModels(list);
      if (list.length && !list.includes(groqModel)) setGroqModel(list[0]);
    } catch (e) {
      setGroqModelsError((e as Error).message);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isThinking) return;

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery("");
    setIsThinking(true);

    try {
      const response = await aiCoachService.askCoach(text, messages, context);
      const coachMsg: CoachMessage = {
        id: `coach-${Date.now()}`,
        sender: "coach",
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch {
      const errorMsg: CoachMessage = {
        id: `error-${Date.now()}`,
        sender: "coach",
        text: "I encountered an issue connecting to the inference engine. Please check your settings or switch to the built-in coach.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSaveSettings = () => {
    aiCoachService.saveSettings({
      apiKey: apiKeyInput.trim(),
      groqModel: groqModel.trim() || DEFAULT_GROQ_MODEL,
      ollamaEndpoint: ollamaEndpoint.trim(),
      ollamaModel: ollamaModel.trim(),
      selectedModel: settings.selectedModel,
    });
    setSettings(aiCoachService.getSettings());
    setShowSettings(false);
  };

  const handleModelChange = (modelId: OpenSourceModelId) => {
    aiCoachService.saveSettings({ selectedModel: modelId });
    setSettings((prev) => ({ ...prev, selectedModel: modelId }));
  };

  const suggestedPrompts = aiCoachService.getSuggestedPrompts(context);

  const modelLabels: Record<OpenSourceModelId, string> = {
    "builtin-gm": "Built-in coach (offline, rule-based)",
    groq: `Groq • ${settings.groqModel || DEFAULT_GROQ_MODEL}`,
    "ollama-local": `Ollama • ${settings.ollamaModel || "llama3.3"}`,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="bg-[#141620] w-full max-w-xl h-full border-l border-[#2e3444] shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-[#252a37] bg-[#10121a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  AI Coach
                </h3>
                <span className="text-[10px] font-mono text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded bg-emerald-950/60 font-semibold">
                  FIDE Senior Trainer
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Technical back-and-forth guidance & position clarifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2432] transition cursor-pointer"
              title="Open-Source Model Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2432] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Subpanel */}
        {showSettings && (
          <div className="bg-[#181b26] border-b border-[#2a3040] p-4 text-xs flex flex-col gap-3 animate-in slide-in-from-top-4 duration-150 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Open-Source Model Configuration
              </h4>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                Done
              </button>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Select Inference Engine</label>
              <select
                value={settings.selectedModel}
                onChange={(e) => handleModelChange(e.target.value as OpenSourceModelId)}
                className="w-full bg-[#10121a] text-slate-200 border border-[#2d3446] rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="builtin-gm">Built-in coach (offline, rule-based templates)</option>
                <option value="groq">Groq-hosted open model (needs a free API key)</option>
                <option value="ollama-local">Local Ollama (runs on your computer)</option>
              </select>
            </div>

            {settings.selectedModel === "ollama-local" ? (
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-slate-300 block mb-0.5">Ollama Endpoint URL</label>
                  <input
                    type="text"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-[#10121a] text-slate-200 border border-[#2d3446] rounded-lg p-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-0.5">Ollama Model Name</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3.3 or deepseek-r1:7b"
                    className="w-full bg-[#10121a] text-slate-200 border border-[#2d3446] rounded-lg p-1.5 font-mono text-xs"
                  />
                </div>
              </div>
            ) : settings.selectedModel === "groq" ? (
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-slate-300 block mb-0.5">Groq API key</label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-[#10121a] text-slate-200 border border-[#2d3446] rounded-lg p-1.5 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Get one at console.groq.com. It's saved unencrypted in this browser only. If a request fails, the
                    reply says so and the built-in coach answers instead.
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-slate-300">Model</label>
                    <button type="button" onClick={() => void loadGroqModels()} className="text-[10px] text-sky-300 cursor-pointer">
                      Load available models
                    </button>
                  </div>
                  {groqModels.length ? (
                    <select value={groqModel} onChange={(e) => setGroqModel(e.target.value)} className="w-full bg-[#10121a] text-slate-200 border border-[#2d3446] rounded-lg p-1.5 font-mono text-xs">
                      {groqModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                      className="w-full bg-[#10121a] text-slate-200 border border-[#2d3446] rounded-lg p-1.5 font-mono text-xs"
                    />
                  )}
                  {groqModelsError && <p className="text-[10px] text-amber-300 mt-1">Couldn't load models: {groqModelsError}</p>}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveSettings}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-semibold text-xs transition"
              >
                Apply Settings
              </button>
            </div>
          </div>
        )}

        {/* Context Awareness Bar */}
        <div className="bg-[#10121a] px-4 py-2 border-b border-[#212634] text-xs flex items-center justify-between text-slate-300 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="font-medium text-slate-300 truncate">
              {context.playedMove
                ? `Reviewing Move ${context.moveNumber}: ${context.playedMove.san} (${context.playedMove.grade}) vs ${context.engineMove?.san}★`
                : context.currentDrill
                ? `Drill Context: ${context.currentDrill.title}`
                : context.openingName
                ? `Position: ${context.openingName}`
                : `Position: ${context.turn === "w" ? "White" : "Black"} to move`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 bg-[#1a1d27] px-2 py-0.5 rounded border border-[#2c3243]">
              {modelLabels[settings.selectedModel].split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-emerald-800 text-white rounded-br-none shadow"
                    : "bg-[#1d212d] text-slate-200 border border-[#2d3446] rounded-bl-none shadow-md"
                }`}
              >
                {/* Render markdown-style paragraphs cleanly */}
                <div className="space-y-2 whitespace-pre-line font-sans">
                  {msg.text}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-mono px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-start gap-2">
              <div className="bg-[#1d212d] border border-[#2d3446] rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>Thinking…</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Clarification Chips */}
        <div className="p-2.5 bg-[#10121a] border-t border-[#202533] flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold shrink-0">
            Ask Coach:
          </span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={isThinking}
              className="text-[11px] bg-[#1a1e2a] hover:bg-[#252b3b] text-emerald-300 hover:text-white px-2.5 py-1 rounded-full border border-emerald-500/30 hover:border-emerald-500 whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#10121a] border-t border-[#242936] flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask your coach about this move, tactical motifs, or training..."
            disabled={isThinking}
            className="flex-1 bg-[#181c26] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#2d3446] focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isThinking}
            className="p-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition shadow cursor-pointer shrink-0"
            title="Send inquiry"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
