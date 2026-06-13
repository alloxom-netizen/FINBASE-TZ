import { Locale } from "@/types";
import { ExtractedData } from "@/types";

export function buildDraftPrompt(
  extractedData: ExtractedData,
  context: string,
  language: Locale
): string {
  const dataContext = JSON.stringify(extractedData.fields, null, 2);

  if (language === "sw") {
    return `Wewe ni mshauri wa biashara wa Afrika Mashariki. Andika barua rasmi ya biashara kwa Kiswahili kulingana na hati hii ya fedha.

DATA YA HATI:
${dataContext}

MAOMBI: ${context}

Andika barua kamili, rasmi, na yenye heshima kwa Kiswahili. Tumia muundo wa barua ya biashara ya Tanzania.`;
  }

  return `You are an East African business advisor. Draft a formal business letter in English based on this financial document.

DOCUMENT DATA:
${dataContext}

REQUEST: ${context}

Write a complete, formal, professional letter. Use standard Tanzanian business letter format. Only include facts present in the document.`;
}
