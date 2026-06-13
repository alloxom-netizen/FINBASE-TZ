import { Locale } from "@/types";
import { ExtractedData } from "@/types";

export function buildQAPrompt(
  extractedData: ExtractedData,
  question: string,
  language: Locale
): string {
  const dataContext = JSON.stringify(extractedData, null, 2);

  if (language === "sw") {
    return `Wewe ni msaidizi wa fedha wa Afrika Mashariki. Jibu swali hili kuhusu hati ya fedha kwa Kiswahili.

DATA YA HATI:
${dataContext}

SWALI: ${question}

Jibu kwa Kiswahili. Kama jibu halipo wazi kwenye data, sema hivyo wazi. Usibuni habari.`;
  }

  return `You are an East African financial assistant. Answer the following question about this financial document.

DOCUMENT DATA:
${dataContext}

QUESTION: ${question}

Answer in English. If the answer is not clearly present in the document data, say so explicitly. Never fabricate information.`;
}
