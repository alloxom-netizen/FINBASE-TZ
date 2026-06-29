"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/lib/store/auth";
import { DocumentType, FinDocument } from "@/types";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { DocumentUpload } from "@/components/upload/DocumentUpload";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

// ── Timestamp helpers ─────────────────────────────────────────

function getTs(doc: FinDocument): number {
  const raw = doc.uploadedAt as unknown;
  const secs = (raw as { seconds?: number })?.seconds;
  if (secs) return secs * 1000;
  if (raw instanceof Date) return raw.getTime();
  return 0;
}

function fmtDate(doc: FinDocument, locale: string): string {
  const ts = getTs(doc);
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", {
    day: "2-digit", month: "short", year: "2-digit",
  });
}

// ── Group documents into time buckets ─────────────────────────

interface Group { label: string; labelSw: string; docs: FinDocument[] }

function groupDocs(docs: FinDocument[]): Group[] {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 864e5);
  const weekAgo   = new Date(today.getTime() - 7 * 864e5);

  const b: Record<string, FinDocument[]> = { today: [], yesterday: [], week: [], earlier: [] };

  for (const d of docs) {
    const ts = getTs(d);
    if (!ts)                          { b.earlier.push(d);   continue; }
    if (ts >= today.getTime())        { b.today.push(d);     continue; }
    if (ts >= yesterday.getTime())    { b.yesterday.push(d); continue; }
    if (ts >= weekAgo.getTime())      { b.week.push(d);      continue; }
    b.earlier.push(d);
  }

  return [
    { label: "Today",     labelSw: "Leo",      docs: b.today     },
    { label: "Yesterday", labelSw: "Jana",      docs: b.yesterday },
    { label: "This Week", labelSw: "Wiki Hii",  docs: b.week      },
    { label: "Earlier",   labelSw: "Awali",     docs: b.earlier   },
  ].filter((g) => g.docs.length > 0);
}

// ── Styles ────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  processing:   "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  processed:    "bg-teal-500/15 text-teal-400 border border-teal-500/20",
  needs_review: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  failed:       "bg-red-500/15 text-red-400 border border-red-500/20",
};

const TYPE_DOT: Record<string, string> = {
  invoice:   "bg-amber-400",
  receipt:   "bg-emerald-400",
  statement: "bg-blue-400",
  contract:  "bg-violet-400",
  ledger:    "bg-indigo-400",
  other:     "bg-neutral-600",
};

const TYPE_CHIP: Record<string, string> = {
  invoice:   "text-amber-400",
  receipt:   "text-emerald-400",
  statement: "text-blue-400",
  contract:  "text-violet-400",
  ledger:    "text-indigo-400",
  other:     "text-neutral-500",
};

// ── Copy button ───────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button onClick={copy} title="Copy ID" className="shrink-0 text-neutral-700 hover:text-teal-400 transition-colors">
      {copied ? (
        <svg className="h-3 w-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} suppressHydrationWarning>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

// ── Feed row ──────────────────────────────────────────────────

function FeedRow({
  doc, selected, onClick, locale, t,
}: {
  doc: FinDocument;
  selected: boolean;
  onClick: () => void;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const type = (doc.extractedData?.documentType ?? "other") as DocumentType;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150 group ${
        selected
          ? "border-teal-500/25 bg-teal-500/[0.05]"
          : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.03]"
      }`}
    >
      {/* Type dot */}
      <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[type] ?? "bg-neutral-600"}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-200 truncate">{doc.fileName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-medium capitalize ${TYPE_CHIP[type] ?? "text-neutral-500"}`}>
            {type}
          </span>
          <span className="text-neutral-800 text-xs">·</span>
          <span className="text-xs font-mono text-neutral-700 truncate">{doc.id}</span>
          <CopyBtn text={doc.id} />
        </div>
      </div>

      {/* Right meta */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[doc.status]}`}>
          {t(`document.status.${doc.status}`)}
        </span>
        <span className="text-xs text-neutral-700">{fmtDate(doc, locale)}</span>
      </div>

      {/* Chevron */}
      <svg
        className={`h-3.5 w-3.5 shrink-0 transition-colors duration-150 ${
          selected ? "text-teal-400" : "text-neutral-800 group-hover:text-neutral-500"
        }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────

function StatsBar({ docs, locale }: { docs: FinDocument[]; locale: string }) {
  const sw = locale === "sw";
  const weekAgo = Date.now() - 7 * 864e5;

  const items = [
    {
      label: sw ? "Hati Zote"        : "Total",
      value: docs.length,
      color: "text-neutral-100",
    },
    {
      label: sw ? "Zilishughulikiwa" : "Processed",
      value: docs.filter((d) => d.status === "processed").length,
      color: "text-teal-400",
    },
    {
      label: sw ? "Zilishindwa"      : "Failed",
      value: docs.filter((d) => d.status === "failed").length,
      color: docs.some((d) => d.status === "failed") ? "text-red-400" : "text-neutral-600",
    },
    {
      label: sw ? "Wiki Hii"         : "This Week",
      value: docs.filter((d) => getTs(d) > weekAgo).length,
      color: "text-neutral-100",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-8">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1.5">{s.label}</p>
          <p className={`text-3xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Panel type ────────────────────────────────────────────────

type Panel = { type: "closed" } | { type: "upload" } | { type: "view"; documentId: string };

// ── Feature sidebar ───────────────────────────────────────────

function FeatureSidebar({
  locale,
  onUpload,
}: {
  locale: string;
  onUpload: () => void;
}) {
  const sw = locale === "sw";

  const features = [
    {
      title: sw ? "Uchambuzi wa Hati kwa AI" : "AI Document Extraction",
      desc:  sw
        ? "Pakia PDF au picha yoyote. AI inatoa data zote muhimu moja kwa moja bila makosa."
        : "Upload any PDF or image. AI extracts every key field automatically — no manual entry.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      ),
    },
    {
      title: sw ? "Maswali Mahiri" : "Smart Q&A",
      desc:  sw
        ? "Uliza maswali kuhusu hati zako kwa lugha ya kawaida na upate majibu sahihi."
        : "Ask questions about your documents in plain language and get precise answers.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      title: sw ? "Tengeneza Barua na Ripoti" : "Draft Letters & Reports",
      desc:  sw
        ? "Zalisha barua za malipo, majibu ya madai, au ripoti kwa sekunde chache."
        : "Generate payment letters, dispute responses, or summaries in seconds.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      ),
    },
    {
      title: sw ? "Kiingereza + Kiswahili" : "English + Swahili",
      desc:  sw
        ? "Msaada kamili wa lugha mbili kwa hati za biashara za Afrika Mashariki."
        : "Full bilingual support built for East African business documents.",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* Brand header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div>
            <p className="text-base font-semibold text-neutral-100 tracking-tight">FinBase</p>
            <p className="text-xs text-neutral-600">
              {sw ? "Akili ya Kifedha" : "Financial Intelligence"}
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {sw
            ? "AI inayosaidia biashara za Afrika Mashariki kuelewa, kuchambua, na kufanya kazi na hati zao za kifedha."
            : "AI that helps East African businesses understand, analyse, and act on their financial documents."}
        </p>
      </div>

      {/* Features */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <p className="text-xs font-medium text-neutral-700 uppercase tracking-widest">
          {sw ? "Unachoweza Kufanya" : "What you can do"}
        </p>
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-3.5">
            <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} suppressHydrationWarning>
                {f.icon}
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-300">{f.title}</p>
              <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="shrink-0 px-6 py-5 border-t border-white/[0.06] space-y-2">
        <Link
          href={`/${locale}/assistant`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-sm font-medium text-white transition-colors duration-150"
        >
          {sw ? "Jaribu Msaidizi →" : "Try the Assistant →"}
        </Link>
        <button
          onClick={onUpload}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-150"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {sw ? "Pakia Hati" : "Upload a Document"}
        </button>
      </div>

    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const t       = useTranslations();
  const locale  = useLocale() as "en" | "sw";
  const sw      = locale === "sw";
  const { user, loading: authLoading } = useAuthStore();

  const [docs,       setDocs]       = useState<FinDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [panel,      setPanel]      = useState<Panel>({ type: "closed" });

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

  function onDocumentReady(id: string) {
    setPanel({ type: "view", documentId: id });
    loadDocs();
  }

  // ── Auth loading ──────────────────────────────────────────
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
  }

  // ── Unauthenticated ───────────────────────────────────────
  if (!user) {
    const viewId = panel.type === "view" ? panel.documentId : null;
    return (
      <div className="max-w-xl mx-auto px-6 py-16 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">{t("dashboard.title")}</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {sw ? "Ingia ili kuhifadhi na kusimamia hati zako" : "Sign in to save and manage your documents"}
          </p>
        </div>
        <DocumentUpload onDocumentReady={(id) => setPanel({ type: "view", documentId: id })} />
        {viewId && (
          <div className="bg-neutral-900 rounded-2xl border border-white/[0.06] p-6">
            <DocumentViewer documentId={viewId} />
          </div>
        )}
        <p className="text-center">
          <Link href={`/${locale}/auth/login`} className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
            {sw ? "Ingia kwa akaunti yako →" : "Sign in to your account →"}
          </Link>
        </p>
      </div>
    );
  }

  // ── Authenticated ─────────────────────────────────────────
  const groups   = groupDocs(docs);
  const panelOpen = panel.type !== "closed";
  const selectedId = panel.type === "view" ? panel.documentId : null;

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Feed ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-8 pb-24">

          {/* Header */}
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest mb-6">
            {t("dashboard.title")}
          </p>

          {/* Stats */}
          {docs.length > 0 && <StatsBar docs={docs} locale={locale} />}

          {/* Feed */}
          {loadingDocs ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <p className="text-sm text-neutral-500">
                {sw ? "Hakuna hati bado" : "No documents yet"}
              </p>
              <button
                onClick={() => setPanel({ type: "upload" })}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {sw ? "Pakia hati yako ya kwanza →" : "Upload your first document →"}
              </button>
            </div>
          ) : (
            <div className="space-y-7">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="text-xs font-medium text-neutral-700 uppercase tracking-widest mb-1.5 px-1">
                    {sw ? g.labelSw : g.label}
                  </p>
                  <div className="space-y-0.5">
                    {g.docs.map((d) => (
                      <FeedRow
                        key={d.id}
                        doc={d}
                        selected={selectedId === d.id}
                        onClick={() => setPanel({ type: "view", documentId: d.id })}
                        locale={locale}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right column — always visible ── */}
      <div className="w-[400px] shrink-0 border-l border-white/[0.06] flex flex-col">
        {panel.type === "closed" ? (

          /* Feature sidebar — default state */
          <FeatureSidebar
            locale={locale}
            onUpload={() => setPanel({ type: "upload" })}
          />

        ) : (
          <>
            {/* Panel header */}
            <div className="shrink-0 h-14 px-5 flex items-center justify-between border-b border-white/[0.06]">
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {panel.type === "upload"
                  ? (sw ? "Pakia Hati" : "Upload Document")
                  : (sw ? "Maelezo ya Hati" : "Document Details")}
              </p>
              <button
                onClick={() => setPanel({ type: "closed" })}
                className="text-neutral-700 hover:text-neutral-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-5">
              {panel.type === "upload" && (
                <DocumentUpload onDocumentReady={onDocumentReady} />
              )}
              {panel.type === "view" && (
                <DocumentViewer documentId={panel.documentId} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
