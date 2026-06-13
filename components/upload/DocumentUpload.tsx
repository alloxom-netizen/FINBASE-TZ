"use client";

import { useCallback, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  onDocumentReady: (documentId: string) => void;
}

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

export function DocumentUpload({ onDocumentReady }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuthStore();
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getSessionId = () => {
    if (typeof window === "undefined") return null;
    let sid = sessionStorage.getItem("finbase_session");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("finbase_session", sid);
    }
    return sid;
  };

  const processFile = useCallback(
    async (file: File) => {
      setStage("uploading");
      setErrorMsg("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", locale);
      if (user) formData.append("userId", user.uid);
      else formData.append("sessionId", getSessionId() ?? "");

      try {
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error ?? "Upload failed");
        }

        const { documentId } = await uploadRes.json();
        setStage("processing");

        const processRes = await fetch(`/api/documents/${documentId}/process`, {
          method: "POST",
        });

        if (!processRes.ok) throw new Error("Processing failed");

        setStage("done");
        onDocumentReady(documentId);
      } catch (err) {
        setStage("error");
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [locale, user, onDocumentReady]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const isActive = stage === "uploading" || stage === "processing";

  return (
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
      <div className="p-10">
        {isActive ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-neutral-400">
              {stage === "uploading" ? t("upload.uploading") : t("upload.processing")}
            </p>
          </div>
        ) : stage === "done" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
              <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-neutral-300">{t("upload.success")}</p>
            <button
              onClick={() => setStage("idle")}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              {locale === "sw" ? "Pakia nyingine" : "Upload another"}
            </button>
          </div>
        ) : stage === "error" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-400">{errorMsg || t("upload.error")}</p>
            <button
              onClick={() => setStage("idle")}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-neutral-200">{t("upload.dragDrop")}</p>
              <p className="text-xs text-neutral-500">{t("upload.orBrowse")}</p>
            </div>
            <span className="text-xs text-neutral-600 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-lg">
              {t("upload.supported")}
            </span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={onFileChange}
            />
          </label>
        )}
      </div>
    </div>
  );
}
