import { Locale } from "@/types";
import { ExtractedData } from "@/types";

export function buildSummaryPrompt(
  extractedData: ExtractedData,
  language: Locale
): string {
  const dataContext = JSON.stringify(extractedData, null, 2);

  if (language === "sw") {
    return `Wewe ni mchambuzi wa fedha wa Afrika Mashariki. Toa muhtasari mfupi na wazi wa hati hii ya fedha kwa Kiswahili.

DATA YA HATI:
${dataContext}

Andika muhtasari wa aya 2-3 unaoelezea: aina ya hati, pande zinazohusika, kiasi kikuu, tarehe, na mambo yoyote muhimu. Tumia lugha rahisi. Ikiwa kuna thamani za uhakika wa chini, taja hilo.`;
  }

  return `You are an East African financial analyst. Provide a concise, clear summary of this financial document in English.

DOCUMENT DATA:
${dataContext}

Write a 2-3 paragraph summary covering: document type, parties involved, key amounts, dates, and any notable items. Use plain language suitable for a business owner. Note any low-confidence values explicitly.`;
}
