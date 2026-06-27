"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

type Mode = "chat" | "summary" | "qa" | "drafts" | "negotiation" | "accounting";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  isStreaming?: boolean;
}

interface ModeConfig {
  key: Mode;
  label: string;
  labelSw: string;
  icon: string;
  needsDoc: boolean;
  docRequired: boolean;
  placeholder: string;
  placeholderSw: string;
  autoPrompt?: string;
  autoPromptSw?: string;
}

const MODES: ModeConfig[] = [
  {
    key: "chat",
    label: "Chat",
    labelSw: "Mazungumzo",
    icon: "💬",
    needsDoc: false,
    docRequired: false,
    placeholder: "Ask anything about finance…",
    placeholderSw: "Uliza chochote kuhusu fedha…",
  },
  {
    key: "summary",
    label: "Summary",
    labelSw: "Muhtasari",
    icon: "📋",
    needsDoc: true,
    docRequired: true,
    placeholder: "Ask for more details about the summary…",
    placeholderSw: "Uliza maelezo zaidi kuhusu muhtasari…",
    autoPrompt: "Please provide a concise structured summary of this document.",
    autoPromptSw: "Tafadhali toa muhtasari mfupi na uliopangwa wa hati hii.",
  },
  {
    key: "qa",
    label: "Q&A",
    labelSw: "Maswali",
    icon: "❓",
    needsDoc: true,
    docRequired: true,
    placeholder: "Ask a question about this document…",
    placeholderSw: "Uliza swali kuhusu hati hii…",
  },
  {
    key: "drafts",
    label: "Draft",
    labelSw: "Andika Barua",
    icon: "✉️",
    needsDoc: false,
    docRequired: false,
    placeholder: "Describe what you'd like drafted (e.g. payment request, dispute letter)…",
    placeholderSw: "Elezea barua unayohitaji (k.m. ombi la malipo, barua ya pingamizi)…",
  },
  {
    key: "negotiation",
    label: "Negotiate",
    labelSw: "Mazungumzo ya Biashara",
    icon: "🤝",
    needsDoc: false,
    docRequired: false,
    placeholder: "Describe the deal or contract you're negotiating…",
    placeholderSw: "Elezea mkataba au makubaliano unayozungumzia…",
  },
  {
    key: "accounting",
    label: "Excel",
    labelSw: "Excel",
    icon: "📊",
    needsDoc: true,
    docRequired: true,
    placeholder: "",
    placeholderSw: "",
  },
];

const AUTH_REQUIRED: Mode[] = ["drafts", "negotiation", "accounting"];

const SUGGESTIONS = {
  en: [
    "What is a cash flow statement?",
    "Explain the difference between profit and cash flow",
    "How do I calculate VAT in Tanzania?",
    "What should I check in an invoice before paying?",
  ],
  sw: [
    "Taarifa ya mtiririko wa pesa ni nini?",
    "Eleza tofauti kati ya faida na mtiririko wa pesa",
    "Jinsi ya kukokotoa VAT Tanzania?",
    "Niangalie nini kwenye ankara kabla ya kulipa?",
  ],
};

function SendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function BotAvatar() {
  return (
    <div className="h-7 w-7 rounded-lg bg-teal-500 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-white font-bold text-xs">F</span>
    </div>
  );
}

function ThinkingSection({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!isStreaming) {
      const t = setTimeout(() => setExpanded(false), 800);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  if (!thinking && !isStreaming) return null;

  return (
    <div className="mb-2 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden text-xs">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-neutral-500 hover:text-neutral-300 transition-colors text-left"
      >
        <span className="text-base">{isStreaming ? "🧠" : "💭"}</span>
        <span className="font-medium">{isStreaming ? "Thinking…" : "Reasoning"}</span>
        {isStreaming && <Spinner size="sm" />}
        <svg
          className={`ml-auto h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/[0.04] max-h-52 overflow-y-auto">
          <p className="text-neutral-600 font-mono whitespace-pre-wrap leading-relaxed">
            {thinking}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3 bg-neutral-700 animate-pulse ml-0.5 align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const showThinking = !!(msg.thinking || (msg.isStreaming && !msg.content && !msg.thinking));

  return (
    <div className="flex gap-3 flex-row">
      <BotAvatar />
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-white/[0.06] text-neutral-300">
        {showThinking && (
          <ThinkingSection thinking={msg.thinking ?? ""} isStreaming={msg.isStreaming ?? false} />
        )}
        {msg.content ? (
          <p className="whitespace-pre-wrap">
            {msg.content}
            {msg.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-neutral-400 animate-pulse ml-0.5 align-middle" />
            )}
          </p>
        ) : msg.isStreaming && !msg.thinking ? (
          <div className="flex items-center gap-2 text-neutral-500">
            <Spinner size="sm" />
            <span className="text-xs">Thinking…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const locale = useLocale() as "en" | "sw";
  const { user } = useAuthStore();

  const [mode, setMode] = useState<Mode>("chat");
  const [messagesByMode, setMessagesByMode] = useState<Record<Mode, Message[]>>({
    chat: [], summary: [], qa: [], drafts: [], negotiation: [], accounting: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [excelResult, setExcelResult] = useState<string | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = messagesByMode[mode];
  const modeConfig = MODES.find((m) => m.key === mode)!;
  const requiresAuth = AUTH_REQUIRED.includes(mode) && !user;
  const missingDoc = modeConfig.docRequired && !documentId.trim();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setInput("");
    setExcelResult(null);
    inputRef.current?.focus();
  }

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading || missingDoc || requiresAuth) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userText };
    const updated = [...messages, userMsg];
    setMessagesByMode((prev) => ({ ...prev, [mode]: updated }));
    setInput("");
    setLoading(true);

    const streamingId = (Date.now() + 1).toString();
    setMessagesByMode((prev) => ({
      ...prev,
      [mode]: [...updated, { id: streamingId, role: "assistant", content: "", thinking: "", isStreaming: true }],
    }));

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          documentId: documentId.trim() || undefined,
          language: locale,
          mode,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessagesByMode((prev) => ({
          ...prev,
          [mode]: prev[mode].map((m) =>
            m.id === streamingId
              ? { ...m, content: err.error ?? "Something went wrong.", isStreaming: false }
              : m
          ),
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuf = "";
      let thinking = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuf += decoder.decode(value, { stream: true });
        const lines = lineBuf.split("\n");
        lineBuf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);
            if (parsed.done) {
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) =>
                  m.id === streamingId ? { ...m, isStreaming: false } : m
                ),
              }));
            } else if (parsed.thinking !== undefined) {
              thinking += parsed.thinking;
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) =>
                  m.id === streamingId ? { ...m, thinking } : m
                ),
              }));
            } else if (parsed.content !== undefined) {
              content += parsed.content;
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) =>
                  m.id === streamingId ? { ...m, content } : m
                ),
              }));
            } else if (parsed.error) {
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) =>
                  m.id === streamingId
                    ? { ...m, content: parsed.error, isStreaming: false }
                    : m
                ),
              }));
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessagesByMode((prev) => ({
        ...prev,
        [mode]: prev[mode].map((m) =>
          m.id === streamingId
            ? { ...m, content: message, isStreaming: false }
            : m
        ),
      }));
    } finally {
      setLoading(false);
    }
  }

  async function generateExcel() {
    if (!documentId.trim()) return;
    setExcelLoading(true);
    setExcelResult(null);
    try {
      const res = await fetch("/api/assistant/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, language: locale, format: "json" }),
      });
      const data = await res.json();
      setExcelResult(JSON.stringify(data.accountingData, null, 2));
    } catch {
      setExcelResult(locale === "sw" ? "Imeshindwa kuzalisha. Jaribu tena." : "Failed to generate. Please try again.");
    } finally {
      setExcelLoading(false);
    }
  }

  async function downloadExcel() {
    if (!documentId.trim()) return;
    const res = await fetch("/api/assistant/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, language: locale, format: "excel" }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accounting-${documentId.slice(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmptyChat = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="shrink-0 border-b border-white/[0.06] px-6 h-14 flex items-center justify-between gap-4">
        <h1 className="text-sm font-semibold text-neutral-200">FinBase AI</h1>
        <div className="flex items-center gap-2">
          {documentId && (
            <span className="text-xs bg-teal-500/15 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              📄 {documentId.slice(0, 8)}…
            </span>
          )}
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder={locale === "sw" ? "ID ya hati (hiari)…" : "Document ID (optional)…"}
            className="w-44 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
          />
        </div>
      </div>

      {/* Mode tabs */}
      <div className="shrink-0 border-b border-white/[0.06] px-6 flex items-center gap-1 overflow-x-auto py-2">
        {MODES.map((m) => {
          const locked = AUTH_REQUIRED.includes(m.key) && !user;
          return (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                mode === m.key
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <span>{m.icon}</span>
              {locale === "sw" ? m.labelSw : m.label}
              {locked && <span className="opacity-40">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {requiresAuth ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <p className="text-neutral-400 text-sm">
              {locale === "sw" ? "Ingia ili kutumia chombo hiki" : "Sign in to use this tool"}
            </p>
            <Link
              href={`/${locale}/auth/login`}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium transition-colors"
            >
              {locale === "sw" ? "Ingia" : "Sign in"}
            </Link>
          </div>
        ) : missingDoc ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <p className="text-neutral-400 text-sm">
              {locale === "sw" ? "Weka kitambulisho cha hati hapo juu" : "Enter a document ID in the top bar"}
            </p>
            <p className="text-neutral-600 text-xs">
              {locale === "sw" ? "Pata ID kutoka kwenye dashibodi" : "Find the ID on your dashboard after uploading"}
            </p>
          </div>
        ) : mode === "accounting" ? (
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-neutral-200">
                {locale === "sw" ? "Muhtasari wa Uhasibu" : "Accounting Summary"}
              </h2>
              <p className="text-xs text-neutral-500">
                {locale === "sw"
                  ? "Zalisha muhtasari wa uhasibu unaoweza kupakuliwa kama Excel"
                  : "Generate a structured accounting summary downloadable as Excel"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={generateExcel}
                disabled={excelLoading}
                className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-teal-900 disabled:text-teal-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                {excelLoading && <Spinner size="sm" />}
                {locale === "sw" ? "Zalisha" : "Generate"}
              </button>
              {excelResult && (
                <button
                  onClick={downloadExcel}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 text-sm transition-colors"
                >
                  ⬇ {locale === "sw" ? "Pakua Excel" : "Download Excel"}
                </button>
              )}
            </div>
            {excelResult && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap font-mono">
                  {excelResult}
                </pre>
              </div>
            )}
          </div>
        ) : isEmptyChat && mode === "chat" ? (
          <div className="flex flex-col items-center justify-center h-full px-6 pb-16 space-y-8">
            <div className="text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-teal-500 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <h2 className="text-xl font-semibold text-neutral-100">
                {locale === "sw" ? "Habari! Mimi ni FinBase AI" : "Hi, I'm FinBase AI"}
              </h2>
              <p className="text-sm text-neutral-500 max-w-sm">
                {locale === "sw"
                  ? "Niulize chochote kuhusu fedha, hesabu, au hati za biashara."
                  : "Ask me anything about finance, accounting, or business documents."}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS[locale].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.14] text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
            {isEmptyChat && modeConfig.autoPrompt && (
              <div className="text-center py-8">
                <p className="text-neutral-500 text-sm mb-4">
                  {locale === "sw"
                    ? `Tayari kufanya ${modeConfig.labelSw.toLowerCase()} wa hati yako`
                    : `Ready to ${modeConfig.label.toLowerCase()} your document`}
                </p>
                <button
                  onClick={() =>
                    send(locale === "sw" ? modeConfig.autoPromptSw : modeConfig.autoPrompt)
                  }
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium transition-colors"
                >
                  {locale === "sw" ? `Anza ${modeConfig.labelSw}` : `Generate ${modeConfig.label}`}
                </button>
              </div>
            )}
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex gap-3 flex-row-reverse">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed bg-teal-500/20 text-neutral-100">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <AssistantMessage key={msg.id} msg={msg} />
              )
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      {mode !== "accounting" && !requiresAuth && !missingDoc && (
        <div className="shrink-0 border-t border-white/[0.06] px-6 py-4">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder={locale === "sw" ? modeConfig.placeholderSw : modeConfig.placeholder}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none disabled:opacity-50 transition-colors"
              style={{ maxHeight: "160px", overflowY: "auto" }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="h-11 w-11 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-white flex items-center justify-center transition-colors shrink-0"
            >
              {loading ? <Spinner size="sm" /> : <SendIcon />}
            </button>
          </div>
          <p className="text-xs text-neutral-700 text-center mt-2">
            {locale === "sw" ? "Enter kupeleka · Shift+Enter mstari mpya" : "Enter to send · Shift+Enter for new line"}
          </p>
        </div>
      )}
    </div>
  );
}
