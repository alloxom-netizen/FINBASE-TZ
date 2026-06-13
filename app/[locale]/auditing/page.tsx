"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

interface AuditIssue {
  severity: "high" | "medium" | "low";
  field: string | null;
  description: string;
  recommendation: string;
}

interface AuditResult {
  issues: AuditIssue[];
  overallAssessment: string;
}

const severityStyle: Record<string, string> = {
  high: "bg-red-50 border-red-200 text-red-800",
  medium: "bg-orange-50 border-orange-200 text-orange-800",
  low: "bg-amber-50 border-amber-200 text-amber-800",
};

const severityLabel: Record<string, { en: string; sw: string }> = {
  high: { en: "High", sw: "Juu" },
  medium: { en: "Medium", sw: "Kati" },
  low: { en: "Low", sw: "Chini" },
};

export default function AuditingPage() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "sw";
  const { user } = useAuthStore();

  const [documentId, setDocumentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);

  async function runAudit() {
    if (!documentId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/assistant/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, language: locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.auditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">{t("auditing.title")}</h1>
        <p className="text-sm text-slate-500">{t("auditing.requiresLogin")}</p>
        <Link href={`/${locale}/auth/login`}>
          <Button>{t("auth.signIn")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{t("auditing.title")}</h1>

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

      <Button onClick={runAudit} loading={loading} disabled={!documentId.trim()}>
        {t("auditing.runAudit")}
      </Button>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner size="sm" /> {t("auditing.running")}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && !loading && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            {result.overallAssessment}
          </div>

          {result.issues.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
              {t("auditing.noIssues")}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">
                {t("auditing.issuesFound", { count: result.issues.length })}
              </p>
              {result.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 space-y-1 ${severityStyle[issue.severity]}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {severityLabel[issue.severity]?.[locale]}
                    </span>
                    {issue.field && (
                      <span className="text-xs opacity-70">· {issue.field}</span>
                    )}
                  </div>
                  <p className="text-sm">{issue.description}</p>
                  <p className="text-xs opacity-75">
                    {locale === "sw" ? "Pendekezo: " : "Recommendation: "}
                    {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
