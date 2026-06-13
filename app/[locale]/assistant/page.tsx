"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

type Tool = "summary" | "qa" | "drafts" | "negotiation" | "accounting";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: Tool;
}

const TOOLS: { key: Tool; label: string; labelSw: string; needsInput: boolean; placeholder: string; placeholderSw: string }[] = [
  { key: "summary",     label: "Summary",     labelSw: "Muhtasari",   needsInput: false, placeholder: "Generate a summary of this document", placeholderSw: "Tengeneza muhtasari wa hati hii" },
  { key: "qa",          label: "Ask",         labelSw: "Uliza",       needsInput: true,  placeholder: "Ask a question about this document…", placeholderSw: "Uliza swali kuhusu hati hii…" },
  { key: "drafts",      label: "Draft Letter",labelSw: "Andika Barua",needsInput: true,  placeholder: "Describe what kind of letter to draft…", placeholderSw: "Elezea barua unayohitaji…" },
  { key: "negotiation", label: "Negotiate",   labelSw: "Mazungumzo",  needsInput: true,  placeholder: "Describe the negotiation context…", placeholderSw: "Elezea muktadha wa mazungumzo…" },
  { key: "accounting",  label: "Accounting",  labelSw: "Uhasibu",     needsInput: false, placeholder: "Generate an accounting summary", placeholderSw: "Tengeneza muhtasari wa uhasibu" },
];

const AUTH_REQUIRED: Tool[] = ["drafts", "negotiation", "accounting"];

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

export default function AssistantPage() {
  const locale = useLocale() as "en" | "sw";
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: locale === "sw"
        ? "Habari! Mimi ni msaidizi wa FinBase. Weka kitambulisho cha hati yako hapo juu, kisha niulize chochote kuhusu hati hiyo."
        : "Hi! I'm the FinBase assistant. Enter your document ID above, then ask me anything about it.",
    },
  ]);
  const [documentId, setDocumentId] = useState("");
  const [input, setInput] = useState("");
  const [activeTool, setActiveTool] = useState<Tool>("qa");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const tool = TOOLS.find((t) => t.key === activeTool)!;
  const requiresAuth = AUTH_REQUIRED.includes(activeTool) && !user;
  const placeholder = locale === "sw" ? tool.placeholderSw : tool.placeholder;

  async function send() {
    if (!documentId.trim()) {
      pushAssistant(locale === "sw" ? "Tafadhali weka kitambulisho cha hati kwanza." : "Please enter a document ID first.");
      return;
    }
    if (requiresAuth) return;

    const userText = input.trim() || placeholder;
    const msgId = Date.now().toString();

    setMessages((prev) => [...prev, { id: msgId, role: "user", content: userText, tool: activeTool }]);
    setInput("");
    setLoading(true);

    // Optimistic loading bubble
    const loadingId = msgId + "-loading";
    setMessages((prev) => [...prev, { id: loadingId, role: "assistant", content: "…", tool: activeTool }]);

    try {
      let content = "";
      const body: Record<string, string> = { documentId: documentId.trim(), language: locale };
      if (input.trim()) {
        body.question = input.trim();
        body.context = input.trim();
      }

      if (activeTool === "accounting") {
        const res = await fetch("/api/assistant/accounting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, format: "json" }),
        });
        const data = await res.json();
        content = data.accountingData
          ? JSON.stringify(data.accountingData, null, 2)
          : (data.error ?? "Failed to generate accounting summary.");
      } else {
        const res = await fetch(`/api/assistant/${activeTool}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        content = data.answer ?? data.summary ?? data.draft ?? data.guidance ?? data.auditResult ?? data.error ?? "No response.";
      }

      setMessages((prev) => prev.map((m) => m.id === loadingId ? { ...m, id: msgId + "-reply", content } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === loadingId
        ? { ...m, id: msgId + "-reply", content: locale === "sw" ? "Kuna tatizo. Jaribu tena." : "Something went wrong. Please try again." }
        : m));
    } finally {
      setLoading(false);
    }
  }

  function pushAssistant(content: string) {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content }]);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header bar */}
      <div className="shrink-0 border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <h1 className="text-sm font-semibold text-neutral-200">
          {locale === "sw" ? "Msaidizi wa AI" : "AI Assistant"}
        </h1>
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder={locale === "sw" ? "Kitambulisho cha hati…" : "Document ID…"}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
          />
        </div>
        {!documentId && (
          <p className="text-xs text-neutral-600 hidden sm:block">
            {locale === "sw" ? "Pata ID kutoka kwenye dashibodi" : "Find the ID on your dashboard"}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "assistant" && <BotAvatar />}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-teal-500/20 text-neutral-100 rounded-tr-sm"
                  : "bg-white/[0.06] text-neutral-300 rounded-tl-sm"
              }`}
            >
              {msg.content === "…" ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-neutral-500 text-xs">
                    {locale === "sw" ? "Inajibu…" : "Thinking…"}
                  </span>
                </div>
              ) : msg.tool === "accounting" && msg.role === "assistant" ? (
                <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap font-mono">{msg.content}</pre>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.06] px-6 py-4 space-y-3">
        {/* Tool pills */}
        <div className="flex flex-wrap gap-2">
          {TOOLS.map(({ key, label, labelSw }) => {
            const locked = AUTH_REQUIRED.includes(key) && !user;
            return (
              <button
                key={key}
                onClick={() => { setActiveTool(key); inputRef.current?.focus(); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTool === key
                    ? "bg-teal-500 text-white"
                    : "bg-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/10 border border-white/[0.06]"
                }`}
              >
                {locale === "sw" ? labelSw : label}
                {locked && <span className="ml-1 opacity-50">🔒</span>}
              </button>
            );
          })}
        </div>

        {requiresAuth ? (
          <div className="text-xs text-neutral-500 px-1">
            {locale === "sw" ? "Ingia ili kutumia chombo hiki" : "Login required for this tool"}{" "}
            <Link href={`/${locale}/auth/login`} className="text-teal-400 hover:text-teal-300">
              {locale === "sw" ? "Ingia" : "Sign in"}
            </Link>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder={placeholder}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none disabled:opacity-50 transition-colors"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <button
              onClick={send}
              disabled={loading}
              className="h-11 w-11 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-teal-900 disabled:text-teal-700 text-white flex items-center justify-center transition-colors shrink-0"
            >
              {loading ? <Spinner size="sm" /> : <SendIcon />}
            </button>
          </div>
        )}
        <p className="text-xs text-neutral-700">
          {locale === "sw" ? "Enter kupeleka · Shift+Enter mstari mpya" : "Enter to send · Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}
