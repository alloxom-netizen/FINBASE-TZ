"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { ExtractedData, ExtractedField, ExtractedSection } from "@/types";

interface Props {
  onDocumentReady: (documentId: string) => void;
}

type Step =
  | { type: "idle" }
  | { type: "selected"; file: File }
  | { type: "analyzing"; file: File }
  | { type: "review"; file: File; data: ExtractedData; edits: Record<string, string> }
  | { type: "saving"; file: File; data: ExtractedData; edits: Record<string, string> }
  | { type: "done"; documentId: string }
  | { type: "error"; message: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "anon";
  let sid = sessionStorage.getItem("finbase_session");
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("finbase_session", sid); }
  return sid;
}

const CONF_DOT: Record<string, string> = {
  high: "bg-teal-400",
  medium: "bg-amber-400",
  low: "bg-red-400",
};

// ── Field row ─────────────────────────────────────────────────
function FieldRow({
  field,
  value,
  isSaving,
  sw,
  onChange,
}: {
  field: ExtractedField;
  value: string;
  isSaving: boolean;
  sw: boolean;
  onChange: (name: string, val: string) => void;
}) {
  const label = sw ? field.labelSw : field.label;

  if (field.isTotal) {
    return (
      <div className="flex items-center gap-4 pt-2.5 pb-2 mt-1 border-t border-white/[0.10]">
        <span className="flex-1 text-sm font-semibold text-neutral-200">{label}</span>
        <input
          type="text"
          value={value}
          disabled={isSaving}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.isUnreadable ? "—" : ""}
          className="w-44 text-right text-sm font-semibold tabular-nums bg-transparent border-b border-transparent text-white placeholder-neutral-700 focus:outline-none focus:border-teal-500 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors duration-150"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex-1 min-w-0 text-sm text-neutral-500 truncate">{label}</span>
      <input
        type="text"
        value={value}
        disabled={isSaving}
        onChange={(e) => onChange(field.name, e.target.value)}
        placeholder={field.isUnreadable ? "—" : (sw ? "Andika…" : "Enter…")}
        className={`w-44 text-right text-sm tabular-nums bg-transparent border-b border-transparent focus:outline-none transition-colors duration-150 ${
          isSaving
            ? "text-neutral-600 cursor-not-allowed"
            : value
            ? "text-neutral-200 hover:border-white/[0.10] focus:border-teal-500"
            : "text-neutral-600 placeholder-neutral-700 focus:border-teal-500"
        }`}
      />
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${CONF_DOT[field.confidence] ?? "bg-neutral-700"}`} />
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
function SectionBlock({
  section,
  edits,
  isSaving,
  sw,
  onChange,
}: {
  section: ExtractedSection;
  edits: Record<string, string>;
  isSaving: boolean;
  sw: boolean;
  onChange: (name: string, val: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-600 shrink-0">
          {sw ? section.titleSw : section.title}
        </p>
        <div className="flex-1 border-b border-white/[0.06]" />
      </div>
      <div>
        {(section.fields ?? []).map((field) => (
          <FieldRow
            key={field.name}
            field={field}
            value={edits[field.name] ?? ""}
            isSaving={isSaving}
            sw={sw}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function DocumentUpload({ onDocumentReady }: Props) {
  const locale   = useLocale() as "en" | "sw";
  const router   = useRouter();
  const { user } = useAuthStore();
  const sw = locale === "sw";
  const [step, setStep]         = useState<Step>({ type: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied]     = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step.type === "done") {
      resetRef.current = setTimeout(() => setStep({ type: "idle" }), 4000);
    }
    return () => { if (resetRef.current) clearTimeout(resetRef.current); };
  }, [step.type]);

  const startOver = useCallback(() => setStep({ type: "idle" }), []);

  const pickFile = useCallback((file: File) => {
    setStep({ type: "selected", file });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, [pickFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = "";
  }, [pickFile]);

  const copyId = useCallback((id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  const onFieldChange = useCallback((name: string, val: string) => {
    setStep((prev) =>
      prev.type === "review"
        ? { ...prev, edits: { ...prev.edits, [name]: val } }
        : prev
    );
  }, []);

  // ── analyze ──────────────────────────────────────────────────
  async function analyzeFile() {
    if (step.type !== "selected") return;
    const { file } = step;
    setStep({ type: "analyzing", file });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("language", locale);

    try {
      const res  = await fetch("/api/documents/preview", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");

      const data: ExtractedData = json.extractedData;
      const edits: Record<string, string> = {};
      // Build edits from sections if present, else flat fields
      const allFields = (data.sections ?? []).flatMap((s) => s.fields ?? []);
      const source = allFields.length > 0 ? allFields : (data.fields ?? []);
      source.forEach((f) => {
        const v = f.correctedValue ?? f.value;
        edits[f.name] = v != null ? String(v) : "";
      });
      setStep({ type: "review", file, data, edits });
    } catch (err) {
      setStep({ type: "error", message: err instanceof Error ? err.message : "Analysis failed" });
    }
  }

  // ── save ─────────────────────────────────────────────────────
  async function saveDocument() {
    if (step.type !== "review") return;
    const { file, data, edits } = step;

    function mergeField(f: ExtractedField): ExtractedField {
      const edited = edits[f.name];
      return {
        ...f,
        value: edited !== undefined ? edited : f.value,
        correctedValue: edited !== undefined && edited !== String(f.value ?? "") ? edited : f.correctedValue,
      };
    }

    const finalData: ExtractedData = {
      ...data,
      fields: (data.fields ?? []).map(mergeField),
      sections: (data.sections ?? []).map((s) => ({
        ...s,
        fields: (s.fields ?? []).map(mergeField),
      })),
    };

    setStep({ type: "saving", file, data, edits });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("language", locale);
    fd.append("extractedData", JSON.stringify(finalData));
    if (user) fd.append("userId", user.uid);
    else fd.append("sessionId", getSessionId());

    try {
      const res  = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStep({ type: "done", documentId: json.documentId });
      onDocumentReady(json.documentId);
    } catch (err) {
      setStep({ type: "error", message: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  // ── ANALYZING ─────────────────────────────────────────────────
  if (step.type === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-9 w-9 rounded-full border-2 border-neutral-800 border-t-teal-500 animate-spin" />
        <p className="text-sm text-neutral-400">
          {sw ? "Inachambua hati…" : "Analyzing document…"}
        </p>
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────
  if (step.type === "done") {
    return (
      <div className="flex flex-col items-center gap-5 py-12">
        <div className="h-11 w-11 rounded-full border border-teal-500/30 flex items-center justify-center">
          <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-neutral-400">{sw ? "Imehifadhiwa" : "Saved successfully"}</p>
          <button
            onClick={() => copyId(step.documentId)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] transition-colors duration-150 text-xs font-mono text-neutral-400 hover:text-neutral-200"
          >
            {step.documentId}
            {copied ? (
              <svg className="h-3 w-3 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-3 w-3 shrink-0 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="text-teal-400 hover:text-teal-300 transition-colors duration-150"
          >
            {sw ? "Angalia Hati" : "View Document"}
          </button>
          <span className="text-neutral-800">·</span>
          <button
            onClick={startOver}
            className="text-neutral-600 hover:text-neutral-400 transition-colors duration-150"
          >
            {sw ? "Pakia nyingine" : "Upload another"}
          </button>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────
  if (step.type === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400 text-center max-w-xs">{step.message}</p>
        <button onClick={startOver} className="text-xs text-teal-400 hover:text-teal-300 transition-colors duration-150">
          {sw ? "Jaribu tena" : "Try again"}
        </button>
      </div>
    );
  }

  // ── IDLE / SELECTED ───────────────────────────────────────────
  if (step.type === "idle" || step.type === "selected") {
    const hasFile = step.type === "selected";
    return (
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed transition-colors duration-150 ${
            dragOver
              ? "border-teal-500 bg-teal-500/[0.04]"
              : hasFile
              ? "border-white/[0.10]"
              : "border-white/[0.08] hover:border-teal-500/40"
          }`}
        >
          {hasFile ? (
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-200 truncate">{step.file.name}</p>
                <p className="text-xs text-neutral-600 mt-0.5">{formatBytes(step.file.size)}</p>
              </div>
              <button onClick={startOver} className="shrink-0 text-neutral-700 hover:text-neutral-400 transition-colors duration-150" aria-label="Remove">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-5 p-12">
              <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <svg className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm text-neutral-400">
                  {sw ? "Buruta faili hapa, au " : "Drop your file here, or "}
                  <span className="text-teal-400">{sw ? "chagua kutoka kwenye kifaa chako" : "browse your device"}</span>
                </p>
                <p className="text-xs text-neutral-700">PDF · JPG · PNG · WEBP — {sw ? "hadi" : "up to"} 10 MB</p>
              </div>
              <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onFileChange} />
            </label>
          )}
        </div>

        {hasFile && (
          <button
            onClick={analyzeFile}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-sm font-medium text-white transition-colors duration-150"
          >
            {sw ? "Changanua Hati" : "Analyze Document"}
          </button>
        )}
      </div>
    );
  }

  // ── REVIEW / SAVING ───────────────────────────────────────────
  const isReview = step.type === "review";
  const isSaving = step.type === "saving";
  const { file, data, edits } = step;

  // Use sections if AI returned them, else wrap flat fields in one pseudo-section
  const sections: ExtractedSection[] =
    (data.sections ?? []).length > 0
      ? (data.sections as ExtractedSection[])
      : data.fields?.length > 0
      ? [{ title: "Extracted Fields", titleSw: "Sehemu Zilizotolewa", fields: data.fields }]
      : [];

  const docTypeLabel = data.documentType
    ? data.documentType.charAt(0).toUpperCase() + data.documentType.slice(1)
    : "";

  return (
    <div className="space-y-3">
      {/* Compact file strip */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <svg className="h-3.5 w-3.5 text-neutral-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="flex-1 text-xs text-neutral-600 truncate min-w-0">{file.name}</p>
        <span className="text-xs text-neutral-700 shrink-0">{formatBytes(file.size)}</span>
      </div>

      {/* Document card */}
      <div className="rounded-2xl border border-white/[0.08] bg-neutral-900 overflow-hidden">

        {/* Document heading — like the balance sheet title */}
        <div className="px-6 pt-6 pb-5 text-center border-b border-white/[0.06]">
          {docTypeLabel && (
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-600 mb-1">
              {sw ? "Taarifa ya Fedha" : "Financial Document"}
            </p>
          )}
          <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100">
            {docTypeLabel || (sw ? "Hati" : "Document")}
          </h2>
          {/* Confidence */}
          {data.overallConfidence && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className={`h-1.5 w-1.5 rounded-full ${CONF_DOT[data.overallConfidence] ?? "bg-neutral-700"}`} />
              <span className="text-xs text-neutral-600">
                {{ high: sw ? "Uhakika wa juu" : "High confidence", medium: sw ? "Uhakika wa kati" : "Medium confidence", low: sw ? "Uhakika mdogo" : "Low confidence" }[data.overallConfidence]}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Summary */}
          {(sw ? data.summarySw : data.summary) && (
            <p className="text-sm text-neutral-400 leading-relaxed text-center">
              {sw ? data.summarySw : data.summary}
            </p>
          )}

          {/* Discrepancies */}
          {(data.discrepancies ?? []).length > 0 && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
              <svg className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.068 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-amber-400/90 leading-relaxed">
                {data.discrepancies.join(" · ")}
              </p>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-5">
            {sections.map((section, i) => (
              <SectionBlock
                key={`${section.title}-${i}`}
                section={section}
                edits={edits}
                isSaving={isSaving}
                sw={sw}
                onChange={onFieldChange}
              />
            ))}
          </div>

          {/* Divider + actions */}
          <div className="border-t border-white/[0.06] pt-4 flex items-center justify-end gap-4">
            <button
              onClick={startOver}
              disabled={isSaving}
              className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sw ? "Anza upya" : "Start over"}
            </button>

            {user ? (
              <button
                onClick={saveDocument}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors duration-150"
              >
                {isSaving && (
                  <span className="h-3.5 w-3.5 rounded-full border border-white/30 border-t-white animate-spin shrink-0" />
                )}
                {isSaving ? (sw ? "Inahifadhi…" : "Saving…") : (sw ? "Hifadhi Hati" : "Save Document")}
              </button>
            ) : (
              <p className="text-xs text-neutral-600">
                {sw ? "Ingia ili kuhifadhi — " : "Sign in to save — "}
                <a href={`/${locale}/auth/login`} className="text-teal-400 hover:text-teal-300 transition-colors duration-150">
                  {sw ? "Ingia" : "Sign in"}
                </a>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
