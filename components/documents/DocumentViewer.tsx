"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FinDocument } from "@/types";
import { FieldRow } from "./FieldEditor";
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

  async function handleCorrect(fieldName: string, value: string) {
    await updateDoc(doc(db, "documents", documentId), {
      [`userCorrections.${fieldName}`]: value,
      [`extractedData.fields`]: (document?.extractedData?.fields ?? []).map((f) =>
        f.name === fieldName ? { ...f, correctedValue: value } : f
      ),
    });
  }

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

          {/* Editable fields */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {locale === "sw" ? "Sehemu Zilizotolewa" : "Extracted Fields"}
              </p>
              <p className="text-xs text-neutral-700">
                {locale === "sw" ? "Bonyeza kwenye thamani kuhariri" : "Click any value to correct it"}
              </p>
            </div>
            <div>
              {(extractedData.fields ?? []).map((field) => (
                <FieldRow
                  key={field.name}
                  field={field}
                  onCorrect={handleCorrect}
                />
              ))}
            </div>
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
