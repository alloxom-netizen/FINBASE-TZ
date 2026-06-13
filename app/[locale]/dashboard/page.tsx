"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/lib/store/auth";
import { FinDocument } from "@/types";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { DocumentUpload } from "@/components/upload/DocumentUpload";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

const statusColor: Record<string, string> = {
  processing: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  processed: "bg-teal-500/15 text-teal-400 border border-teal-500/20",
  needs_review: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  failed: "bg-red-500/15 text-red-400 border border-red-500/20",
};

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "sw";
  const { user, loading: authLoading } = useAuthStore();
  const [documents, setDocuments] = useState<FinDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingDocs(true);
    const q = query(
      collection(db, "documents"),
      where("userId", "==", user.uid),
      orderBy("uploadedAt", "desc")
    );
    getDocs(q).then((snap) => {
      setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FinDocument));
      setLoadingDocs(false);
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-100">{t("dashboard.title")}</h1>
          <p className="text-sm text-neutral-500">
            {locale === "sw" ? "Ingia ili kuhifadhi hati zako" : "Sign in to save and manage your documents"}
          </p>
        </div>
        <DocumentUpload onDocumentReady={setSelectedId} />
        {selectedId && (
          <div className="bg-neutral-900 rounded-2xl border border-white/[0.06] p-6">
            <DocumentViewer documentId={selectedId} />
          </div>
        )}
        <div className="text-center">
          <Link href={`/${locale}/auth/login`} className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
            {locale === "sw" ? "Ingia kwa akaunti yako →" : "Sign in to your account →"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — upload + doc list */}
      <div className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <h1 className="text-sm font-semibold text-neutral-200 mb-3">{t("dashboard.title")}</h1>
          <DocumentUpload onDocumentReady={(id) => setSelectedId(id)} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider mb-3">
            {t("dashboard.recentDocuments")}
          </p>

          {loadingDocs ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : documents.length === 0 ? (
            <p className="text-xs text-neutral-600 text-center py-8">{t("dashboard.noDocuments")}</p>
          ) : (
            documents.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedId === d.id
                    ? "border-teal-500/30 bg-teal-500/10"
                    : "border-transparent hover:bg-white/5 hover:border-white/[0.06]"
                }`}
              >
                <p className="text-xs font-medium text-neutral-200 truncate">{d.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[d.status]}`}>
                    {t(`document.status.${d.status}`)}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {d.uploadedAt
                      ? new Date((d.uploadedAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString(
                          locale === "sw" ? "sw-TZ" : "en-TZ"
                        )
                      : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — document viewer */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedId ? (
          <div className="max-w-2xl">
            <DocumentViewer documentId={selectedId} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <p className="text-neutral-500 text-sm">
              {locale === "sw" ? "Chagua hati kuona maelezo" : "Select a document to view details"}
            </p>
            <p className="text-neutral-700 text-xs">
              {locale === "sw" ? "au pakia hati mpya" : "or upload a new one"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
