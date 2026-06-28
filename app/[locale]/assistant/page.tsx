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
  needsDoc: boolean;
  needsAuth: boolean;
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
    needsDoc: false,
    needsAuth: false,
    placeholder: "Ask anything about finance…",
    placeholderSw: "Uliza chochote kuhusu fedha…",
  },
  {
    key: "summary",
    label: "Summary",
    labelSw: "Muhtasari",
    needsDoc: true,
    needsAuth: false,
    placeholder: "Ask for more details about the summary…",
    placeholderSw: "Uliza maelezo zaidi kuhusu muhtasari…",
    autoPrompt: "Please provide a concise structured summary of this document.",
    autoPromptSw: "Tafadhali toa muhtasari mfupi na uliopangwa wa hati hii.",
  },
  {
    key: "qa",
    label: "Q&A",
    labelSw: "Maswali",
    needsDoc: true,
    needsAuth: false,
    placeholder: "Ask a question about this document…",
    placeholderSw: "Uliza swali kuhusu hati hii…",
  },
  {
    key: "drafts",
    label: "Draft",
    labelSw: "Andika Barua",
    needsDoc: false,
    needsAuth: true,
    placeholder: "Describe what you'd like drafted…",
    placeholderSw: "Elezea barua unayohitaji…",
  },
  {
    key: "negotiation",
    label: "Negotiate",
    labelSw: "Mazungumzo ya Biashara",
    needsDoc: false,
    needsAuth: true,
    placeholder: "Describe the deal or contract you're negotiating…",
    placeholderSw: "Elezea mkataba unaoujadili…",
  },
  {
    key: "accounting",
    label: "Excel",
    labelSw: "Excel",
    needsDoc: true,
    needsAuth: true,
    placeholder: "",
    placeholderSw: "",
  },
];

const SUGGESTIONS = {
  en: [
    "What is a cash flow statement?",
    "What should I check in an invoice before paying?",
  ],
  sw: [
    "Taarifa ya mtiririko wa pesa ni nini?",
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
            {isStreaming && <span className="inline-block w-1.5 h-3 bg-neutral-700 animate-pulse ml-0.5 align-middle" />}
          </p>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const showThinking = !!(msg.thinking || (msg.isStreaming && !msg.content && !msg.thinking));
  return (
    <div className="flex gap-3">
      <BotAvatar />
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-white/[0.06] text-neutral-300">
        {showThinking && <ThinkingSection thinking={msg.thinking ?? ""} isStreaming={msg.isStreaming ?? false} />}
        {msg.content ? (
          <p className="whitespace-pre-wrap">
            {msg.content}
            {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-neutral-400 animate-pulse ml-0.5 align-middle" />}
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
  const sw = locale === "sw";
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
  const docInputRef = useRef<HTMLInputElement>(null);

  const messages = messagesByMode[mode];
  const modeConfig = MODES.find((m) => m.key === mode)!;
  const requiresAuth = modeConfig.needsAuth && !user;
  const missingDoc = modeConfig.needsDoc && !documentId.trim();
  const canSend = !loading && !requiresAuth && !missingDoc && input.trim();
  const isEmptyChat = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setInput("");
    setExcelResult(null);
    setTimeout(() => inputRef.current?.focus(), 0);
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
            m.id === streamingId ? { ...m, content: err.error ?? "Something went wrong.", isStreaming: false } : m
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
                [mode]: prev[mode].map((m) => m.id === streamingId ? { ...m, isStreaming: false } : m),
              }));
            } else if (parsed.thinking !== undefined) {
              thinking += parsed.thinking;
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) => m.id === streamingId ? { ...m, thinking } : m),
              }));
            } else if (parsed.content !== undefined) {
              content += parsed.content;
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) => m.id === streamingId ? { ...m, content } : m),
              }));
            } else if (parsed.error) {
              setMessagesByMode((prev) => ({
                ...prev,
                [mode]: prev[mode].map((m) =>
                  m.id === streamingId ? { ...m, content: parsed.error, isStreaming: false } : m
                ),
              }));
            }
          } catch { /* ignore malformed SSE */ }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessagesByMode((prev) => ({
        ...prev,
        [mode]: prev[mode].map((m) => m.id === streamingId ? { ...m, content: message, isStreaming: false } : m),
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
      setExcelResult(sw ? "Imeshindwa kuzalisha. Jaribu tena." : "Failed to generate. Please try again.");
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── Input placeholder logic ───────────────────────────────────
  function getPlaceholder(): string {
    if (requiresAuth) return sw ? "Ingia ili kutumia hali hii…" : "Sign in to use this mode…";
    if (missingDoc)   return sw ? "Weka ID ya hati hapa chini…" : "Paste a document ID below…";
    return sw ? modeConfig.placeholderSw : modeConfig.placeholder;
  }

  return (
    <div className="flex flex-col h-screen">

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-white/[0.06] px-6 h-14 flex items-center">
        <h1 className="text-sm font-semibold text-neutral-200">FinBase AI</h1>
      </div>

      {/* ── Conversation area ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Excel / accounting mode */}
        {mode === "accounting" && (
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-200">
                {sw ? "Muhtasari wa Uhasibu" : "Accounting Summary"}
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                {sw
                  ? "Zalisha muhtasari unaoweza kupakuliwa kama Excel"
                  : "Generate a structured summary downloadable as Excel"}
              </p>
            </div>
            {requiresAuth ? (
              <p className="text-sm text-neutral-500">
                {sw ? "Ingia ili kutumia Excel — " : "Sign in to use Excel — "}
                <Link href={`/${locale}/auth/login`} className="text-teal-400 hover:text-teal-300 transition-colors">
                  {sw ? "Ingia" : "Sign in"}
                </Link>
              </p>
            ) : missingDoc ? (
              <p className="text-sm text-neutral-600">
                {sw ? "Weka ID ya hati kwenye sehemu hapa chini." : "Paste a document ID in the context strip below."}
              </p>
            ) : (
              <>
                <div className="flex gap-3">
                  <button
                    onClick={generateExcel}
                    disabled={excelLoading}
                    className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {excelLoading && <Spinner size="sm" />}
                    {sw ? "Zalisha" : "Generate"}
                  </button>
                  {excelResult && (
                    <button
                      onClick={downloadExcel}
                      className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 text-sm transition-colors"
                    >
                      {sw ? "⬇ Pakua Excel" : "⬇ Download Excel"}
                    </button>
                  )}
                </div>
                {excelResult && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap font-mono">{excelResult}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty greeting — chat mode, no messages */}
        {mode !== "accounting" && isEmptyChat && (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6 pb-20">
            {modeConfig.autoPrompt && !missingDoc && !requiresAuth ? (
              /* Auto-prompt modes (summary) — show a single trigger button */
              <div className="text-center space-y-4">
                <p className="text-sm text-neutral-500">
                  {sw
                    ? `Tayari kufanya ${modeConfig.labelSw.toLowerCase()} wa hati yako`
                    : `Ready to ${modeConfig.label.toLowerCase()} your document`}
                </p>
                <button
                  onClick={() => send(sw ? modeConfig.autoPromptSw : modeConfig.autoPrompt)}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium transition-colors"
                >
                  {sw ? `Anza ${modeConfig.labelSw}` : `Generate ${modeConfig.label}`}
                </button>
              </div>
            ) : (
              /* Default empty state */
              <div className="text-center space-y-4">
                <p className="text-sm text-neutral-500">
                  {sw ? "Niulize chochote kuhusu fedha au hati za biashara." : "Ask anything about finance or business documents."}
                </p>
                <div className="flex items-center gap-3 justify-center flex-wrap">
                  {SUGGESTIONS[locale].map((s, i) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors duration-150"
                    >
                      {s}
                      {i < SUGGESTIONS[locale].length - 1 && (
                        <span className="ml-3 text-neutral-800">·</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {mode !== "accounting" && !isEmptyChat && (
          <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
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

      {/* ── Bottom context strip + input ── */}
      <div className="shrink-0 border-t border-white/[0.06] px-6 pt-3 pb-4">
        <div className="max-w-3xl mx-auto w-full space-y-2">

          {/* Mode pills */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {MODES.map((m) => {
              const locked = m.needsAuth && !user;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  title={locked ? (sw ? "Ingia kutumia hali hii" : "Sign in to use this mode") : undefined}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                    active
                      ? "text-teal-400 bg-teal-500/10"
                      : locked
                      ? "text-neutral-700 hover:text-neutral-600 cursor-default"
                      : "text-neutral-600 hover:text-neutral-300"
                  }`}
                >
                  {sw ? m.labelSw : m.label}
                </button>
              );
            })}
          </div>

          {/* Document context strip */}
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 min-h-[36px]">
            <svg className="h-3.5 w-3.5 text-neutral-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>

            {documentId ? (
              /* Loaded state — badge + clear */
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-mono text-teal-400 truncate">{documentId}</span>
                <button
                  onClick={() => setDocumentId("")}
                  className="text-neutral-700 hover:text-neutral-400 transition-colors shrink-0 ml-auto"
                  aria-label="Clear document"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} suppressHydrationWarning>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              /* Empty state — inline input */
              <input
                ref={docInputRef}
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder={
                  modeConfig.needsDoc
                    ? (sw ? "Weka ID ya hati ili kutumia hali hii…" : "Paste document ID to use this mode…")
                    : (sw ? "Weka ID ya hati (hiari)…" : "Paste document ID to work with a document…")
                }
                className="flex-1 text-xs bg-transparent text-neutral-400 placeholder-neutral-700 focus:outline-none"
              />
            )}

            {/* Inline auth notice */}
            {requiresAuth && (
              <Link
                href={`/${locale}/auth/login`}
                className="ml-auto shrink-0 text-xs text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap"
              >
                {sw ? "Ingia →" : "Sign in →"}
              </Link>
            )}
          </div>

          {/* Input textarea + send */}
          {mode !== "accounting" && (
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder={getPlaceholder()}
                disabled={loading || requiresAuth || missingDoc}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none disabled:opacity-40 transition-colors"
                style={{ maxHeight: "160px", overflowY: "auto" }}
              />
              <button
                onClick={() => send()}
                disabled={!canSend}
                className="h-11 w-11 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-white flex items-center justify-center transition-colors shrink-0"
              >
                {loading ? <Spinner size="sm" /> : <SendIcon />}
              </button>
            </div>
          )}

          <p className="text-xs text-neutral-800 text-center">
            {sw ? "Enter kupeleka · Shift+Enter mstari mpya" : "Enter to send · Shift+Enter for new line"}
          </p>
        </div>
      </div>
    </div>
  );
}
