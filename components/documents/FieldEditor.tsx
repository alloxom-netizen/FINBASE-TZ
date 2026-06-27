"use client";

import { useState, useEffect } from "react";
import { ExtractedField } from "@/types";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { useLocale } from "next-intl";

interface Props {
  field: ExtractedField;
  onCorrect: (fieldName: string, value: string) => void;
}

export function FieldRow({ field, onCorrect }: Props) {
  const locale = useLocale() as "en" | "sw";
  const canonical = String(field.correctedValue ?? field.value ?? "");
  const [value, setValue] = useState(canonical);
  const [saved, setSaved] = useState(false);

  // Keep in sync if parent data changes (e.g. real-time snapshot)
  useEffect(() => {
    setValue(String(field.correctedValue ?? field.value ?? ""));
  }, [field.correctedValue, field.value]);

  const label = locale === "sw" ? field.labelSw : field.label;

  function save() {
    const trimmed = value.trim();
    const original = String(field.correctedValue ?? field.value ?? "");
    if (trimmed === original) return;
    onCorrect(field.name, trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setValue(canonical);
      e.currentTarget.blur();
    }
  }

  return (
    <div className="group py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-neutral-500 font-medium">{label}</span>
        <ConfidenceBadge confidence={field.confidence} locale={locale} />
        {field.isUnreadable && (
          <span className="text-xs text-neutral-700 italic">
            {locale === "sw" ? "Haiwezi kusomwa" : "unreadable"}
          </span>
        )}
        {field.correctedValue !== undefined && !saved && (
          <span className="text-xs text-teal-500">
            {locale === "sw" ? "✓ Imesahihishwa" : "✓ corrected"}
          </span>
        )}
        {saved && (
          <span className="text-xs text-teal-400 animate-pulse">
            {locale === "sw" ? "Imehifadhiwa ✓" : "Saved ✓"}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKey}
        placeholder={locale === "sw" ? "Andika thamani…" : "Type value…"}
        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-teal-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-teal-500/20 transition-colors"
      />
      {field.sourceNote && (
        <p className="mt-1 text-xs text-neutral-700">{field.sourceNote}</p>
      )}
    </div>
  );
}
