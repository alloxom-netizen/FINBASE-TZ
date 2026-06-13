"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { DocumentUpload } from "@/components/upload/DocumentUpload";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuthStore();
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-neutral-100 tracking-tight">
            {t("home.uploadPrompt")}
          </h1>
          <p className="text-neutral-500 text-sm">{t("home.tagline")}</p>
          {!user && (
            <p className="text-sm text-neutral-600">
              {t("home.getStarted")} &mdash;{" "}
              <Link
                href={`/${locale}/auth/login`}
                className="text-teal-400 hover:text-teal-300 transition-colors"
              >
                {t("home.loginForMore")}
              </Link>
            </p>
          )}
        </div>

        <DocumentUpload onDocumentReady={setActiveDocId} />

        {activeDocId && (
          <div className="bg-neutral-900 rounded-2xl border border-white/[0.06] p-6">
            <DocumentViewer documentId={activeDocId} />
          </div>
        )}
      </div>
    </div>
  );
}
