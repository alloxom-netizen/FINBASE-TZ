import { Locale } from "@/types";
import { ExtractedData } from "@/types";

export function buildAccountingPrompt(
  extractedData: ExtractedData,
  language: Locale
): string {
  const dataContext = JSON.stringify(extractedData, null, 2);

  if (language === "sw") {
    return `Wewe ni mhasibu wa Afrika Mashariki. Unda muhtasari wa uhasibu wa hati hii ya fedha.

DATA YA HATI:
${dataContext}

Jibu kwa JSON wenye safu mlalo za Excel: rekodi za debit/credit, aina za hesabu, na kiasi katika TZS. Ikiwa sarafu nyingine imetumika, onyesha sarafu hiyo pia.

Jibu kwa muundo huu:
{
  "entries": [
    {
      "date": "tarehe au null",
      "description": "maelezo",
      "account": "aina ya hesabu",
      "debit": nambari au null,
      "credit": nambari au null,
      "currency": "TZS",
      "confidence": "high" | "medium" | "low",
      "notes": "maelezo yoyote ya ziada"
    }
  ],
  "totals": {
    "totalDebit": nambari,
    "totalCredit": nambari,
    "balance": nambari
  }
}`;
  }

  return `You are an East African accountant. Create an accounting summary for this financial document.

DOCUMENT DATA:
${dataContext}

Respond with JSON containing Excel-ready rows: debit/credit entries, account types, and amounts in TZS. If another currency is used, include that currency too.

Respond in this exact format:
{
  "entries": [
    {
      "date": "date string or null",
      "description": "description",
      "account": "account type",
      "debit": number or null,
      "credit": number or null,
      "currency": "TZS",
      "confidence": "high" | "medium" | "low",
      "notes": "any additional notes"
    }
  ],
  "totals": {
    "totalDebit": number,
    "totalCredit": number,
    "balance": number
  }
}`;
}
