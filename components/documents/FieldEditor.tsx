"use client";

import { useState } from "react";
import { ExtractedField } from "@/types";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { Button } from "@/components/ui/Button";
import { useLocale } from "next-intl";

interface Props {
  field: ExtractedField;
  onCorrect: (fieldName: string, value: string) => void;
}

export function FieldRow({ field, onCorrect }: Props) {
  const locale = useLocale() as "en" | "sw";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(field.correctedValue ?? field.value ?? ""));

  const displayValue = field.correctedValue ?? field.value;
  const label = locale === "sw" ? field.labelSw : field.label;

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <ConfidenceBadge confidence={field.confidence} locale={locale} />
          {field.isUnreadable && (
            <span className="text-xs text-slate-400 italic">
              {locale === "sw" ? "Haiwezi kusomwa" : "Unreadable"}
            </span>
          )}
          {field.correctedValue !== undefined && (
            <span className="text-xs text-blue-600">
              {locale === "sw" ? "Imesahihishwa" : "Corrected"}
            </span>
          )}
        </div>
        {editing ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => {
                onCorrect(field.name, draft);
                setEditing(false);
              }}
            >
              {locale === "sw" ? "Hifadhi" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {locale === "sw" ? "Ghairi" : "Cancel"}
            </Button>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-slate-500 truncate">
            {displayValue !== null && displayValue !== undefined
              ? String(displayValue)
              : <span className="italic text-slate-400">—</span>
            }
          </p>
        )}
        {field.sourceNote && !editing && (
          <p className="mt-0.5 text-xs text-slate-400">{field.sourceNote}</p>
        )}
      </div>
      {!editing && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs"
          onClick={() => {
            setDraft(String(field.correctedValue ?? field.value ?? ""));
            setEditing(true);
          }}
        >
          {locale === "sw" ? "Hariri" : "Edit"}
        </Button>
      )}
    </div>
  );
}
