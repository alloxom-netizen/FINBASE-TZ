import { Confidence } from "@/types";

const styles: Record<Confidence, string> = {
  high: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  low: "bg-red-500/10 text-red-400 border border-red-500/20",
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${styles[confidence]}`}>
      {labels[confidence][locale]}
    </span>
  );
}
