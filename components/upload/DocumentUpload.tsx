"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { ExtractedData, ExtractedField } from "@/types";

interface Props {
  onDocumentReady: (documentId: string) => void;
}

type Step =
  | { type: "idle" }
  | { type: "analyzing"; file: File }
  | { type: "review"; file: File; data: ExtractedData; edits: Record<string, string> }
  | { type: "saving" }
  | { type: "done"; documentId: string }
  | { type: "error"; message: string };


function getSessionId(): string {
  if (typeof window === "undefined") return "anon";
  let sid = sessionStorage.getItem("finbase_session");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("finbase_session", sid);
  }
  return sid;
}

export function DocumentUpload({ onDocumentReady }: Props) {
  const locale = useLocale() as "en" | "sw";
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>({ type: "idle" });
  const [dragOver, setDragOver] = useState(false);

  // ── Step 1: Analyze file ──────────────────────────────────────
  const analyzeFile = useCallback(
    async (file: File) => {
      setStep({ type: "analyzing", file });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", locale);

      try {
        const res = await fetch("/api/documents/preview", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Analysis failed");

        const data: ExtractedData = json.extractedData;
        // Initialise edits with the extracted values
        const edits: Record<string, string> = {};
        (data.fields ?? []).forEach((f) => {
          const v = f.correctedValue ?? f.value;
          edits[f.name] = v != null ? String(v) : "";
        });
        setStep({ type: "review", file, data, edits });
      } catch (err) {
        setStep({ type: "error", message: err instanceof Error ? err.message : "Analysis failed" });
      }
    },
    [locale]
  );

  // ── Step 2: Confirm & upload ──────────────────────────────────
  async function confirmUpload() {
    if (step.type !== "review") return;
    const { file, data, edits } = step;

    // Merge user edits back into the extracted fields
    const finalData: ExtractedData = {
      ...data,
      fields: (data.fields ?? []).map((f) => ({
        ...f,
        correctedValue: edits[f.name] !== String(f.value ?? "") ? edits[f.name] : f.correctedValue,
        value: edits[f.name] ?? f.value,
      })),
    };

    setStep({ type: "saving" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", locale);
    formData.append("extractedData", JSON.stringify(finalData));
    if (user) formData.append("userId", user.uid);
    else formData.append("sessionId", getSessionId());

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStep({ type: "done", documentId: json.documentId });
      onDocumentReady(json.documentId);
    } catch (err) {
      setStep({ type: "error", message: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  // ── Drop / file-change handlers ───────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) analyzeFile(file);
    },
    [analyzeFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) analyzeFile(file);
      e.target.value = ""; // allow re-selecting same file
    },
    [analyzeFile]
  );

  // ── Render ────────────────────────────────────────────────────

  if (step.type === "analyzing") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-neutral-900 p-8 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <div className="text-center space-y-1">
          <p className="text-sm text-neutral-300 font-medium">
            {locale === "sw" ? "AI inasoma hati yako…" : "AI is reading your document…"}
          </p>
          <p className="text-xs text-neutral-600">
            {locale === "sw" ? "Hii inachukua sekunde 10-20" : "This takes 10–20 seconds"}
          </p>
        </div>
        <p className="text-xs text-neutral-700 truncate max-w-full">{step.file.name}</p>
      </div>
    );
  }

  if (step.type === "saving") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-neutral-900 p-8 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-neutral-300">
          {locale === "sw" ? "Inahifadhi…" : "Saving…"}
        </p>
      </div>
    );
  }

  if (step.type === "done") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-neutral-900 p-6 flex flex-col items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
          <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-neutral-300">
          {locale === "sw" ? "Imehifadhiwa" : "Saved"}
        </p>
        <button
          onClick={() => setStep({ type: "idle" })}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          {locale === "sw" ? "Pakia nyingine" : "Upload another"}
        </button>
      </div>
    );
  }

  if (step.type === "error") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-neutral-900 p-6 flex flex-col items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm text-red-400 text-center">{step.message}</p>
        <button
          onClick={() => setStep({ type: "idle" })}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          {locale === "sw" ? "Jaribu tena" : "Try again"}
        </button>
      </div>
    );
  }

  // ── Review modal ──────────────────────────────────────────────
  const isReview = step.type === "review";

  return (
    <>
      {/* Drop zone (always rendered so it's the base) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-2xl border transition-all duration-200 ${
          dragOver
            ? "border-teal-500/50 bg-teal-500/5 scale-[1.01]"
            : "border-white/[0.08] bg-neutral-900 hover:border-white/[0.14]"
        }`}
      >
        <label className="cursor-pointer flex flex-col items-center gap-5 p-10">
          <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-neutral-200">
              {locale === "sw" ? "Buruta faili hapa" : "Drag & drop your file here"}
            </p>
            <p className="text-xs text-neutral-500">
              {locale === "sw" ? "au bonyeza kuchagua" : "or click to browse"}
            </p>
          </div>
          <span className="text-xs text-neutral-600 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-lg">
            PDF, JPG, PNG, WEBP — {locale === "sw" ? "hadi" : "up to"} 10 MB
          </span>
          <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onFileChange} />
        </label>
      </div>

      {/* Review overlay */}
      {isReview && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-neutral-900 border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Modal header */}
            <div className="shrink-0 px-5 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-neutral-100">
                  {locale === "sw" ? "Kagua Taarifa Zilizotolewa" : "Review Extracted Data"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">{step.file.name}</p>
              </div>
              <button
                onClick={() => setStep({ type: "idle" })}
                className="shrink-0 text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body — mirrors DocumentViewer layout */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Document type badge */}
              {step.data.documentType && (
                <div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-teal-500/15 text-teal-400 border border-teal-500/20 capitalize">
                    {step.data.documentType}
                  </span>
                </div>
              )}

              {/* Summary card */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-1">
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {locale === "sw" ? "Muhtasari" : "Summary"}
                </p>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {locale === "sw" ? step.data.summarySw : step.data.summary}
                </p>
              </div>

              {/* Discrepancies card */}
              {(step.data.discrepancies ?? []).length > 0 && (
                <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-4">
                  <p className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-2">
                    {locale === "sw" ? "Tofauti zilizopatikana" : "Discrepancies found"}
                  </p>
                  <ul className="space-y-1">
                    {(step.data.discrepancies ?? []).map((d: string, i: number) => (
                      <li key={i} className="text-sm text-orange-400/80 flex gap-2">
                        <span className="shrink-0">·</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted fields card */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    {locale === "sw" ? "Sehemu Zilizotolewa" : "Extracted Fields"}
                  </p>
                  <p className="text-xs text-neutral-700">
                    {locale === "sw" ? "Bonyeza kuhariri" : "Click any value to edit"}
                  </p>
                </div>
                <div>
                  {(step.data.fields ?? []).map((field: ExtractedField) => {
                    const editValue = step.edits[field.name] ?? "";
                    return (
                      <div key={field.name} className="py-3 border-b border-white/[0.04] last:border-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-neutral-500 font-medium">
                            {locale === "sw" ? field.labelSw : field.label}
                          </span>
                          <ConfidenceBadge confidence={field.confidence} locale={locale} />
                          {field.isUnreadable && (
                            <span className="text-xs text-neutral-700 italic">
                              {locale === "sw" ? "haiwezi kusomwa" : "unreadable"}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) =>
                            setStep((prev) =>
                              prev.type === "review"
                                ? { ...prev, edits: { ...prev.edits, [field.name]: e.target.value } }
                                : prev
                            )
                          }
                          placeholder={locale === "sw" ? "Andika thamani…" : "Type value…"}
                          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-teal-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-teal-500/20 transition-colors"
                        />
                        {field.sourceNote && (
                          <p className="mt-1 text-xs text-neutral-700">{field.sourceNote}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.06] flex gap-3">
              <button
                onClick={() => setStep({ type: "idle" })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-neutral-300 transition-colors"
              >
                {locale === "sw" ? "Ghairi" : "Cancel"}
              </button>
              <button
                onClick={confirmUpload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-sm font-medium text-white transition-colors"
              >
                {locale === "sw" ? "Hifadhi Hati" : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
