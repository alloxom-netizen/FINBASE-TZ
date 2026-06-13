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

const statusColor: Record<string, string> = {
  processing: "bg-amber-100 text-amber-700",
  processed: "bg-emerald-100 text-emerald-700",
  needs_review: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
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
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <DocumentUpload onDocumentReady={setSelectedId} />
        {selectedId && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <DocumentViewer documentId={selectedId} />
          </div>
        )}
        <p className="text-sm text-slate-400 text-center">
          {locale === "sw"
            ? "Ingia ili kuhifadhi hati zako na kuona historia"
            : "Log in to save documents and view history"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <DocumentUpload onDocumentReady={(id) => setSelectedId(id)} />

          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide text-xs">
            {t("dashboard.recentDocuments")}
          </h2>

          {loadingDocs ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-400">{t("dashboard.noDocuments")}</p>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                    selectedId === d.id
                      ? "border-slate-300 bg-slate-50"
                      : "border-transparent hover:bg-white hover:border-slate-200"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800 truncate">{d.fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[d.status]}`}>
                      {t(`document.status.${d.status}`)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {d.uploadedAt
                        ? new Date((d.uploadedAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString(
                            locale === "sw" ? "sw-TZ" : "en-TZ"
                          )
                        : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedId ? (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <DocumentViewer documentId={selectedId} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              {locale === "sw" ? "Chagua hati kuona maelezo" : "Select a document to view details"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
