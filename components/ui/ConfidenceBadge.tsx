import { Confidence } from "@/types";

const styles: Record<Confidence, string> = {
  high: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low: "bg-red-50 text-red-700 border border-red-200",
};

const labels: Record<Confidence, { en: string; sw: string }> = {
  high: { en: "High", sw: "Juu" },
  medium: { en: "Medium", sw: "Kati" },
  low: { en: "Low", sw: "Chini" },
};

interface Props {
  confidence: Confidence;
  locale?: "en" | "sw";
}

export function ConfidenceBadge({ confidence, locale = "en" }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[confidence]}`}>
      {labels[confidence][locale]}
    </span>
  );
}
