"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FinDocument } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { useLocale } from "next-intl";
import Link from "next/link";

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

          {/* Suggested questions */}
          {(() => {
            const sw = locale === "sw";
            const docType = extractedData.documentType ?? "other";

            const QUESTIONS: Record<string, { en: string; sw: string }[]> = {
              invoice: [
                { en: "What is the total amount due on this invoice?",         sw: "Kiasi gani cha jumla kinachopaswa kulipwa?" },
                { en: "Are the line item totals calculated correctly?",         sw: "Je, jumla za bidhaa zimehesabiwa vizuri?" },
                { en: "What is the payment due date?",                          sw: "Tarehe ya mwisho ya malipo ni lini?" },
                { en: "Draft a payment confirmation email for this invoice",    sw: "Andika barua ya uthibitisho wa malipo kwa ankara hii" },
              ],
              receipt: [
                { en: "What was the total amount paid?",                        sw: "Kiasi gani kilicholipwa?" },
                { en: "What items were purchased?",                             sw: "Bidhaa zipi zilinunuliwa?" },
                { en: "Is there a VAT breakdown on this receipt?",              sw: "Je, kuna muhtasari wa VAT kwenye risiti hii?" },
                { en: "Draft a reimbursement request for this receipt",         sw: "Andika ombi la urejeshaji pesa kwa risiti hii" },
              ],
              statement: [
                { en: "What is the closing balance?",                           sw: "Salio la mwisho ni ngapi?" },
                { en: "What are the largest transactions in this statement?",   sw: "Miamala mikubwa zaidi katika taarifa hii ni ipi?" },
                { en: "Are there any unusual or suspicious transactions?",      sw: "Je, kuna miamala ya kushangaza au ya kutia shaka?" },
                { en: "Summarize the cash flow for this period",               sw: "Toa muhtasari wa mtiririko wa pesa kwa kipindi hiki" },
              ],
              contract: [
                { en: "What are the key obligations for each party?",          sw: "Majukumu makuu ya kila upande ni yapi?" },
                { en: "What are the payment terms in this contract?",          sw: "Masharti ya malipo katika mkataba huu ni yapi?" },
                { en: "What happens if this contract is breached?",            sw: "Nini kitatokea ikiwa mkataba huu utavunjwa?" },
                { en: "Identify any risks or red flags in this contract",      sw: "Taja hatari au alama nyekundu katika mkataba huu" },
              ],
              ledger: [
                { en: "What are the total debits and credits?",                sw: "Jumla ya madeni na mikopo ni ngapi?" },
                { en: "Is the ledger balanced?",                               sw: "Je, daftari limelingana?" },
                { en: "Which accounts have the highest activity?",             sw: "Akaunti zipi zina shughuli nyingi zaidi?" },
                { en: "Summarize the financial position from this ledger",     sw: "Toa muhtasari wa hali ya kifedha kutoka kwa daftari hili" },
              ],
              other: [
                { en: "What are the key points of this document?",            sw: "Mambo muhimu ya hati hii ni yapi?" },
                { en: "Are there any figures or amounts mentioned?",           sw: "Je, kuna nambari au kiasi kilichotajwa?" },
                { en: "What action is required based on this document?",       sw: "Hatua gani zinahitajika kulingana na hati hii?" },
                { en: "Summarize this document in simple terms",              sw: "Toa muhtasari wa hati hii kwa maneno rahisi" },
              ],
            };

            const questions = (QUESTIONS[docType] ?? QUESTIONS.other).slice(0, 4);

            return (
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    {sw ? "Maswali yanayopendekezwa" : "Suggested questions"}
                  </p>
                  <p className="text-xs text-neutral-700 mt-0.5">
                    {sw ? "Bonyeza swali lolote hapa chini kupata jibu" : "Click any question to ask the AI about this document"}
                  </p>
                </div>

                {questions.map((q, i) => {
                  const text = sw ? q.sw : q.en;
                  const href = `/${locale}/assistant?docId=${encodeURIComponent(documentId)}&q=${encodeURIComponent(text)}`;
                  return (
                    <Link
                      key={i}
                      href={href}
                      className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors duration-150 group"
                    >
                      <svg className="h-3.5 w-3.5 text-neutral-700 shrink-0 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="flex-1 text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors duration-150">
                        {text}
                      </span>
                      <svg className="h-3.5 w-3.5 text-neutral-800 group-hover:text-teal-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            );
          })()}

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
