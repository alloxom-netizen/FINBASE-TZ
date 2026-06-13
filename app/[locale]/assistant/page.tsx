"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

type Tool = "summary" | "qa" | "drafts" | "negotiation" | "accounting";

const AUTH_REQUIRED_TOOLS: Tool[] = ["drafts", "negotiation", "accounting"];

export default function AssistantPage() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "sw";
  const { user } = useAuthStore();

  const [activeTool, setActiveTool] = useState<Tool>("summary");
  const [documentId, setDocumentId] = useState("");
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requiresAuth = AUTH_REQUIRED_TOOLS.includes(activeTool) && !user;

  async function runTool() {
    if (!documentId.trim()) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      let res: Response;
      const body: Record<string, string> = { documentId, language: locale };
      if (userInput) body.context = userInput;
      if (userInput) body.question = userInput;

      if (activeTool === "accounting") {
        res = await fetch("/api/assistant/accounting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, format: "json" }),
        });
        const data = await res.json();
        setResult(JSON.stringify(data.accountingData, null, 2));
      } else {
        res = await fetch(`/api/assistant/${activeTool}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResult(
          data.answer ?? data.summary ?? data.draft ?? data.guidance ?? data.auditResult ?? ""
        );
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
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
    a.download = `accounting-${documentId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tools: { key: Tool; label: string }[] = [
    { key: "summary", label: t("assistant.tools.summary") },
    { key: "qa", label: t("assistant.tools.qa") },
    { key: "drafts", label: t("assistant.tools.drafts") },
    { key: "negotiation", label: t("assistant.tools.negotiation") },
    { key: "accounting", label: t("assistant.tools.accounting") },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{t("assistant.title")}</h1>

      {/* Tool tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tools.map(({ key, label }) => {
          const locked = AUTH_REQUIRED_TOOLS.includes(key) && !user;
          return (
            <button
              key={key}
              onClick={() => { setActiveTool(key); setResult(""); setError(""); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTool === key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
              {locked && (
                <span className="ml-1 text-xs opacity-60">🔒</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Document ID input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {locale === "sw" ? "Kitambulisho cha Hati" : "Document ID"}
        </label>
        <input
          type="text"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          placeholder={locale === "sw" ? "Weka kitambulisho cha hati..." : "Paste document ID from dashboard..."}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Per-tool context input */}
      {(activeTool === "qa" || activeTool === "drafts" || activeTool === "negotiation") && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {activeTool === "qa"
              ? (locale === "sw" ? "Swali lako" : "Your question")
              : (locale === "sw" ? "Ombi lako" : "Your request")}
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={3}
            placeholder={
              activeTool === "qa"
                ? (locale === "sw" ? "Uliza swali kuhusu hati hii..." : "Ask a question about this document...")
                : (locale === "sw" ? "Elezea unachohitaji..." : "Describe what you need...")
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
        </div>
      )}

      {requiresAuth ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {t("assistant.requiresLogin")}{" "}
          <Link href={`/${locale}/auth/login`} className="text-slate-700 underline underline-offset-2">
            {t("auth.signIn")}
          </Link>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button onClick={runTool} loading={loading} disabled={!documentId.trim()}>
            {t("assistant.generate")}
          </Button>
          {activeTool === "accounting" && result && (
            <Button variant="secondary" onClick={downloadExcel}>
              {t("assistant.download")}
            </Button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner size="sm" /> {t("assistant.generating")}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {result && !loading && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          {activeTool === "accounting" ? (
            <pre className="text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">{result}</pre>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result}</p>
          )}
        </div>
      )}
    </div>
  );
}
