"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FinDocument } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { useLocale } from "next-intl";

interface Props {
  documentId: string;
}

const statusColor: Record<string, string> = {
  processing: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  processed: "bg-teal-500/15 text-teal-400 border border-teal-500/20",
  needs_review: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  failed: "bg-red-500/15 text-red-400 border border-red-500/20",
};

const statusLabel: Record<string, { en: string; sw: string }> = {
  processing: { en: "Processing", sw: "Inashughulikiwa" },
  processed: { en: "Processed", sw: "Imeshughulikiwa" },
  needs_review: { en: "Needs Review", sw: "Inahitaji Ukaguzi" },
  failed: { en: "Failed", sw: "Imeshindwa" },
};

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [id]);
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono text-neutral-400 hover:text-neutral-200"
    >
      <span>{id}</span>
      {copied ? (
        <svg className="h-3 w-3 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} suppressHydrationWarning>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

export function DocumentViewer({ documentId }: Props) {
  const locale = useLocale() as "en" | "sw";
  const [document, setDocument] = useState<FinDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "documents", documentId), (snap) => {
      if (snap.exists()) {
        setDocument({ id: snap.id, ...snap.data() } as FinDocument);
      }
      setLoading(false);
    });
    return unsub;
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-16 text-neutral-600 text-sm">
        {locale === "sw" ? "Hati haipatikani" : "Document not found"}
      </div>
    );
  }

  const { status, fileName, extractedData } = document;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-medium text-neutral-200 truncate text-sm">{fileName}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[status]}`}>
            {statusLabel[status]?.[locale] ?? status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600">
            {locale === "sw" ? "ID ya hati:" : "Document ID:"}
          </span>
          <CopyIdButton id={documentId} />
        </div>
      </div>

      {/* Processing indicator */}
      {status === "processing" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <Spinner size="sm" />
          <p className="text-sm text-amber-400">
            {locale === "sw" ? "AI inashughulikia hati yako…" : "AI is reading your document…"}
          </p>
        </div>
      )}

      {/* Extracted content */}
      {extractedData && (
        <>
          {/* Summary */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-1">
            <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {locale === "sw" ? "Muhtasari" : "Summary"}
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {locale === "sw" ? extractedData.summarySw : extractedData.summary}
            </p>
          </div>

          {/* Discrepancies */}
          {(extractedData.discrepancies ?? []).length > 0 && (
            <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-4">
              <p className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-2">
                {locale === "sw" ? "Tofauti zilizopatikana" : "Discrepancies found"}
              </p>
              <ul className="space-y-1">
                {(extractedData.discrepancies ?? []).map((d, i) => (
                  <li key={i} className="text-sm text-orange-400/80 flex gap-2">
                    <span className="shrink-0">·</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Usage guide */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {locale === "sw" ? "Unaweza kufanya nini na hati hii" : "What you can do with this document"}
              </p>
              <p className="text-xs text-neutral-700 mt-0.5">
                {locale === "sw"
                  ? "Nenda kwenye ukurasa wa Msaidizi, weka ID ya hati hapo juu, kisha chagua hali."
                  : "Go to the Assistant page, paste the document ID above, then pick a mode."}
              </p>
            </div>

            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                ),
                mode: locale === "sw" ? "Mazungumzo" : "Chat",
                desc: locale === "sw"
                  ? "Uliza maswali yoyote kuhusu hati hii kwa lugha ya kawaida."
                  : "Ask any question about this document in plain language.",
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                ),
                mode: locale === "sw" ? "Muhtasari" : "Summary",
                desc: locale === "sw"
                  ? "Pata muhtasari wa kina na mambo muhimu yaliyogunduliwa."
                  : "Get a detailed breakdown and key figures highlighted.",
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
                mode: "Q&A",
                desc: locale === "sw"
                  ? "Uliza maswali maalum kuhusu takwimu, tarehe, au masharti."
                  : "Query specific figures, dates, or terms with precise answers.",
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ),
                mode: locale === "sw" ? "Rasimu" : "Draft",
                desc: locale === "sw"
                  ? "Tengeneza barua, ripoti, au majibu kulingana na hati hii."
                  : "Generate response letters, reports, or follow-up emails.",
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                ),
                mode: locale === "sw" ? "Mazungumzo ya Bei" : "Negotiate",
                desc: locale === "sw"
                  ? "Pata ushauri wa mazungumzo ya bei au masharti ya mkataba."
                  : "Get advice on pricing negotiation or contract terms.",
              },
            ].map(({ icon, mode, desc }) => (
              <div key={mode} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
                <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="h-3.5 w-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
                    {icon}
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-400">{mode}</p>
                  <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </>
      )}

      {/* Failed state */}
      {status === "failed" && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-4">
          <p className="text-sm text-red-400">
            {locale === "sw"
              ? "Kushindwa kushughulikia hati. Jaribu kupakia tena."
              : "Failed to process document. Please try uploading again."}
          </p>
        </div>
      )}
    </div>
  );
}
