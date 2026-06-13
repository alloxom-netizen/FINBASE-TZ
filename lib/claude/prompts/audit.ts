import { Locale } from "@/types";
import { ExtractedData } from "@/types";

export function buildAuditPrompt(
  extractedData: ExtractedData,
  language: Locale
): string {
  const dataContext = JSON.stringify(extractedData, null, 2);

  if (language === "sw") {
    return `Wewe ni mkaguzi wa fedha wa Afrika Mashariki. Kagua hati hii kwa makini na utafute matatizo yoyote.

DATA YA HATI:
${dataContext}

Angalia: makosa ya hesabu, thamani zinazopingana, maelezo yanayokosekana, tarehe zisizo sahihi, thamani zisizo za kawaida, au mambo yanayohitaji uchunguzi zaidi. Jibu kwa JSON na orodha ya matatizo. Ikiwa hakuna tatizo, sema hivyo.

Jibu kwa muundo huu:
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "field": "jina la uga au null",
      "description": "maelezo ya tatizo",
      "recommendation": "pendekezo la hatua"
    }
  ],
  "overallAssessment": "maelezo ya jumla"
}`;
  }

  return `You are an East African financial auditor. Carefully audit this document for any issues.

DOCUMENT DATA:
${dataContext}

Check for: arithmetic errors, contradictory values, missing required fields, implausible dates, unusual amounts, TRA compliance issues, or anything requiring further investigation. Respond with JSON listing all issues found.

Respond in this exact format:
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "field": "field name or null",
      "description": "description of the issue",
      "recommendation": "recommended action"
    }
  ],
  "overallAssessment": "overall assessment summary"
}`;
}
