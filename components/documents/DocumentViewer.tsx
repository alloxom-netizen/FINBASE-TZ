"use client";

import { useEffect, useState } from "react";
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
      [`extractedData.fields`]: document?.extractedData?.fields.map((f) =>
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
      <div className="flex items-center gap-3">
        <h2 className="font-medium text-neutral-200 truncate text-sm">{fileName}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[status]}`}>
          {statusLabel[status]?.[locale] ?? status}
        </span>
      </div>

      {status === "processing" && (
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <Spinner size="sm" />
          {locale === "sw" ? "AI inashughulikia hati…" : "AI is processing your document…"}
        </div>
      )}

      {extractedData && (
        <>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-sm text-neutral-400 leading-relaxed">
              {locale === "sw" ? extractedData.summarySw : extractedData.summary}
            </p>
          </div>

          {extractedData.discrepancies.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <h3 className="text-sm font-medium text-orange-400 mb-2">
                {locale === "sw" ? "Tofauti zilizopatikana" : "Discrepancies found"}
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {extractedData.discrepancies.map((d, i) => (
                  <li key={i} className="text-sm text-orange-400/80">{d}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-xs font-medium text-neutral-600 mb-3 uppercase tracking-wider">
              {locale === "sw" ? "Sehemu Zilizotolewa" : "Extracted Fields"}
            </h3>
            <div className="divide-y divide-white/[0.04]">
              {extractedData.fields.map((field) => (
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

      {status === "failed" && (
        <div className="text-sm text-red-400">
          {locale === "sw"
            ? "Kushindwa kushughulikia hati. Jaribu tena."
            : "Failed to process document. Please try again."}
        </div>
      )}
    </div>
  );
}
