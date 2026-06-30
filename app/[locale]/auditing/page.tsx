"use client";

import { useState, useCallback, useEffect } from "react";
import { useLocale } from "next-intl";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/lib/store/auth";
import { DocumentType, FinDocument } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────

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

type Phase = "pick" | "scanning" | "done" | "error";

// ── Lookup tables ──────────────────────────────────────────────

const TYPE_DOT: Record<string, string> = {
  invoice:   "bg-amber-400",
  receipt:   "bg-emerald-400",
  statement: "bg-blue-400",
  contract:  "bg-violet-400",
  ledger:    "bg-indigo-400",
  other:     "bg-neutral-600",
};

const TYPE_LABEL: Record<string, { en: string; sw: string }> = {
  invoice:   { en: "Invoice",   sw: "Ankara"   },
  receipt:   { en: "Receipt",   sw: "Risiti"   },
  statement: { en: "Statement", sw: "Taarifa"  },
  contract:  { en: "Contract",  sw: "Mkataba"  },
  ledger:    { en: "Ledger",    sw: "Daftari"  },
  other:     { en: "Other",     sw: "Nyingine" },
};

const SEV_STYLE = {
  high:   {
    border: "border-l-red-500",
    bg:     "bg-red-500/5",
    badge:  "bg-red-500/15 text-red-400 border border-red-500/25",
  },
  medium: {
    border: "border-l-orange-500",
    bg:     "bg-orange-500/5",
    badge:  "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  },
  low:    {
    border: "border-l-amber-500",
    bg:     "bg-amber-500/5",
    badge:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  },
};

const SEV_LABEL: Record<string, { en: string; sw: string }> = {
  high:   { en: "HIGH",   sw: "JUU"   },
  medium: { en: "MEDIUM", sw: "KATI"  },
  low:    { en: "LOW",    sw: "CHINI" },
};

const SCAN_STEPS = [
  { en: "Loading document data",               sw: "Kupakia data ya hati"               },
  { en: "Checking field consistency",          sw: "Kuangalia uthabiti wa data"          },
  { en: "Verifying totals & calculations",     sw: "Kuthibitisha jumla na mahesabu"      },
  { en: "Detecting anomalies & discrepancies", sw: "Kugundua tofauti na hitilafu"        },
  { en: "Generating audit recommendations",    sw: "Kuandaa mapendekezo ya ukaguzi"      },
];

// ── Helpers ────────────────────────────────────────────────────

function getTs(doc: FinDocument): number {
  const raw  = doc.uploadedAt as unknown;
  const secs = (raw as { seconds?: number })?.seconds;
  if (secs) return secs * 1000;
  if (raw instanceof Date) return raw.getTime();
  return 0;
}

function fmtDate(doc: FinDocument, locale: string): string {
  const ts = getTs(doc);
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", {
    day: "2-digit", month: "short",
  });
}

function computeScore(issues: AuditIssue[]) {
  const high   = issues.filter((i) => i.severity === "high").length;
  const medium = issues.filter((i) => i.severity === "medium").length;
  const low    = issues.filter((i) => i.severity === "low").length;
  const score  = Math.max(0, 100 - high * 25 - medium * 10 - low * 5);
  let grade: string;
  let color: string;
  if      (score >= 90) { grade = "A"; color = "text-emerald-400"; }
  else if (score >= 75) { grade = "B"; color = "text-teal-400";    }
  else if (score >= 60) { grade = "C"; color = "text-amber-400";   }
  else if (score >= 40) { grade = "D"; color = "text-orange-400";  }
  else                  { grade = "F"; color = "text-red-400";      }
  return { score, grade, color, high, medium, low };
}

// ── Doc card ───────────────────────────────────────────────────

function DocCard({
  doc, selected, locale, onClick,
}: {
  doc: FinDocument;
  selected: boolean;
  locale: "en" | "sw";
  onClick: () => void;
}) {
  const sw        = locale === "sw";
  const type      = (doc.extractedData?.documentType ?? "other") as DocumentType;
  const canSelect = doc.status === "processed";

  return (
    <button
      onClick={canSelect ? onClick : undefined}
      disabled={!canSelect}
      title={canSelect ? undefined : (sw ? "Haijashughulikiwa bado" : "Not yet processed")}
      className={[
        "relative w-full text-left rounded-xl border p-4 transition-all duration-150",
        selected
          ? "border-teal-500/40 bg-teal-500/[0.07] shadow-[0_0_0_1px_rgba(20,184,166,0.15)]"
          : canSelect
            ? "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13] hover:bg-white/[0.04] cursor-pointer"
            : "border-white/[0.04] bg-white/[0.01] opacity-35 cursor-not-allowed",
      ].join(" ")}
    >
      {/* Selected check */}
      {selected && (
        <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-teal-500 flex items-center justify-center">
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Type */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[type] ?? "bg-neutral-600"}`} />
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider truncate">
          {(TYPE_LABEL[type] ?? TYPE_LABEL.other)[sw ? "sw" : "en"]}
        </span>
      </div>

      {/* Filename */}
      <p className="text-sm font-medium text-neutral-200 truncate leading-snug mb-2">
        {doc.fileName}
      </p>

      {/* Date */}
      <p className="text-xs text-neutral-600">{fmtDate(doc, locale)}</p>
    </button>
  );
}

// ── Scan step row ──────────────────────────────────────────────

function ScanStep({ text, state }: { text: string; state: "pending" | "active" | "done" }) {
  return (
    <div className={`flex items-center gap-3 transition-opacity duration-300 ${state === "pending" ? "opacity-25" : "opacity-100"}`}>
      {state === "done" ? (
        <div className="h-5 w-5 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
          <svg className="h-3 w-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : state === "active" ? (
        <div className="h-5 w-5 rounded-full border border-teal-500/40 flex items-center justify-center shrink-0">
          <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
        </div>
      ) : (
        <div className="h-5 w-5 rounded-full border border-white/[0.08] shrink-0" />
      )}
      <span className={`text-sm font-mono tracking-tight ${
        state === "done"   ? "text-teal-400"    :
        state === "active" ? "text-neutral-200"  :
                             "text-neutral-600"
      }`}>
        {text}{state === "active" && <span className="animate-pulse">...</span>}
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function AuditingPage() {
  const locale = useLocale() as "en" | "sw";
  const sw     = locale === "sw";
  const { user, loading: authLoading } = useAuthStore();

  const [docs,        setDocs]        = useState<FinDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<FinDocument | null>(null);
  const [phase,       setPhase]       = useState<Phase>("pick");
  const [stepsDone,   setStepsDone]   = useState(0);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditError,  setAuditError]  = useState("");

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setLoadingDocs(true);
    const snap = await getDocs(
      query(collection(db, "documents"), where("userId", "==", user.uid), orderBy("uploadedAt", "desc"))
    );
    setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FinDocument));
    setLoadingDocs(false);
  }, [user]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function runAudit() {
    if (!selectedDoc) return;
    setPhase("scanning");
    setStepsDone(0);
    setAuditResult(null);
    setAuditError("");

    // Fire API call in parallel with step animation
    const apiPromise = fetch("/api/assistant/audit", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ documentId: selectedDoc.id, language: locale }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      return data.auditResult as AuditResult;
    });

    // Animate steps — each 700 ms
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      await new Promise<void>((r) => setTimeout(r, 700));
      setStepsDone(i + 1);
    }

    // Wait for API (may already be done)
    try {
      const result = await apiPromise;
      setAuditResult(result);
      setPhase("done");
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Audit failed");
      setPhase("error");
    }
  }

  function selectDoc(doc: FinDocument) {
    setSelectedDoc(doc);
    setPhase("pick");
    setAuditResult(null);
    setAuditError("");
  }

  // ── Auth loading ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Unauthenticated ─────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-100 mb-2">
              {sw ? "Ukaguzi wa Hati" : "Document Audit"}
            </h1>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {sw
                ? "Ingia ili kufanya ukaguzi wa hati zako za kifedha"
                : "Sign in to run forensic audits on your financial documents"}
            </p>
          </div>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-sm font-medium text-white transition-colors"
          >
            {sw ? "Ingia →" : "Sign in →"}
          </Link>
        </div>
      </div>
    );
  }

  const score = auditResult ? computeScore(auditResult.issues) : null;

  return (
    <div className="min-h-screen px-8 pt-8 pb-16">

      {/* ── Page header ────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <svg className="h-4 w-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest">
            {sw ? "Ukaguzi wa Hati" : "Document Audit"}
          </p>
        </div>
        <p className="text-xs text-neutral-700 ml-6.5">
          {sw
            ? "Gundua hitilafu, tofauti, na matatizo kwenye hati zako za kifedha"
            : "Detect errors, discrepancies, and compliance issues in your financial documents"}
        </p>
      </div>

      {/* ── Doc picker ─────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs font-medium text-neutral-700 uppercase tracking-widest mb-3">
          {sw ? "1. Chagua Hati" : "1. Select Document"}
        </p>

        {loadingDocs ? (
          <div className="flex items-center gap-2 py-6 text-sm text-neutral-600">
            <Spinner size="sm" />
            <span>{sw ? "Inapakia..." : "Loading..."}</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] px-6 py-10 text-center max-w-lg">
            <p className="text-sm text-neutral-600 mb-3">
              {sw ? "Hakuna hati bado" : "No documents yet"}
            </p>
            <Link
              href={`/${locale}/dashboard`}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              {sw ? "Pakia hati kwenye dashibodi →" : "Upload a document from the dashboard →"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                selected={selectedDoc?.id === doc.id}
                locale={locale}
                onClick={() => selectDoc(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Run button ─────────────────────────────────────── */}
      {phase === "pick" && selectedDoc && (
        <div className="mb-8">
          <p className="text-xs font-medium text-neutral-700 uppercase tracking-widest mb-3">
            {sw ? "2. Endesha Ukaguzi" : "2. Run Audit"}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={runAudit}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-sm font-semibold text-white transition-colors duration-150 shadow-lg shadow-teal-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {sw ? "Fanya Ukaguzi wa Kina" : "Run Forensic Audit"}
            </button>
            <p className="text-xs text-neutral-600 truncate max-w-[200px]">
              {selectedDoc.fileName}
            </p>
          </div>
        </div>
      )}

      {/* ── Scanning animation ─────────────────────────────── */}
      {phase === "scanning" && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-6 max-w-lg">
          {/* Scan header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <svg className="h-4.5 w-4.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-200">
                {sw ? "Ukaguzi unaendelea..." : "Scanning in progress..."}
              </p>
              <p className="text-xs text-neutral-600 truncate">{selectedDoc?.fileName}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3.5">
            {SCAN_STEPS.map((step, i) => {
              const state = i < stepsDone ? "done" : i === stepsDone ? "active" : "pending";
              return <ScanStep key={i} text={sw ? step.sw : step.en} state={state} />;
            })}
          </div>

          {/* Finalizing */}
          {stepsDone >= SCAN_STEPS.length && (
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.05] text-xs text-neutral-500">
              <Spinner size="sm" />
              {sw ? "Inafinalisha matokeo..." : "Finalizing results..."}
            </div>
          )}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 mb-6 max-w-lg">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-red-400">
              {sw ? "Ukaguzi umeshindwa" : "Audit failed"}
            </p>
          </div>
          {auditError && (
            <p className="text-xs text-red-400/60 mb-3 ml-6">{auditError}</p>
          )}
          <button
            onClick={() => setPhase("pick")}
            className="ml-6 text-xs text-red-400 hover:text-red-300 underline transition-colors"
          >
            {sw ? "Jaribu tena" : "Try again"}
          </button>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────── */}
      {phase === "done" && auditResult && score && (
        <div className="space-y-5 max-w-2xl">

          {/* Score card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="flex items-start gap-6">
              {/* Grade */}
              <div className="shrink-0 text-center w-16">
                <p className={`text-6xl font-bold tabular-nums leading-none ${score.color}`}>
                  {score.grade}
                </p>
                <p className="text-xs text-neutral-600 mt-2 font-mono">{score.score}/100</p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-200 mb-1.5">
                  {sw ? "Tathmini ya Ukaguzi" : "Audit Assessment"}
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {auditResult.overallAssessment}
                </p>

                {/* Issue tally */}
                {auditResult.issues.length > 0 && (
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.05]">
                    {score.high > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-xs text-neutral-500">
                          {score.high} {sw ? "juu" : "high"}
                        </span>
                      </div>
                    )}
                    {score.medium > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-xs text-neutral-500">
                          {score.medium} {sw ? "kati" : "medium"}
                        </span>
                      </div>
                    )}
                    {score.low > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-xs text-neutral-500">
                          {score.low} {sw ? "chini" : "low"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* No issues */}
          {auditResult.issues.length === 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 flex items-center gap-3">
              <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-400 font-medium">
                {sw ? "Hakuna matatizo yaliyopatikana — hati iko sawa" : "No issues found — document looks clean"}
              </p>
            </div>
          )}

          {/* Findings */}
          {auditResult.issues.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-700 uppercase tracking-widest mb-3">
                {sw ? "Matokeo ya Ukaguzi" : "Findings"}
              </p>
              <div className="space-y-2">
                {auditResult.issues.map((issue, i) => {
                  const s = SEV_STYLE[issue.severity];
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border border-white/[0.06] border-l-2 ${s.border} ${s.bg} p-4`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded font-mono ${s.badge}`}>
                          {SEV_LABEL[issue.severity]?.[locale]}
                        </span>
                        {issue.field && (
                          <span className="text-xs text-neutral-600 font-mono">· {issue.field}</span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-300 leading-relaxed mb-2">
                        {issue.description}
                      </p>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        <span className="text-neutral-600 font-medium">
                          {sw ? "Pendekezo: " : "Recommendation: "}
                        </span>
                        {issue.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => { setPhase("pick"); setAuditResult(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              {sw ? "← Ukaguzi Mwingine" : "← Audit Another"}
            </button>
            <Link
              href={`/${locale}/assistant?docId=${encodeURIComponent(selectedDoc?.id ?? "")}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              {sw ? "Uliza maswali zaidi →" : "Ask follow-up questions →"}
            </Link>
          </div>

        </div>
      )}

    </div>
  );
}
