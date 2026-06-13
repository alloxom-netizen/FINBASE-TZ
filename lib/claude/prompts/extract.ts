import { Locale } from "@/types";

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise financial document analyst specializing in East African (especially Tanzanian) financial documents. Your task is to extract structured data from financial documents.

CRITICAL RULES:
- NEVER fabricate, guess, or infer values that are not clearly present in the document.
- If a field is absent, set value to null and isUnreadable to false.
- If a field exists but cannot be read (blurry, torn, obscured), set value to null and isUnreadable to true.
- Assign confidence levels honestly: high = clearly printed/typed text, medium = somewhat unclear but readable, low = barely legible or inferred from context.
- Use TZS (Tanzanian Shilling) as default currency unless another currency is clearly stated.
- Dates should follow DD/MM/YYYY format as common in Tanzania.
- For amounts, preserve the exact figure shown — do not round or normalize.
- Identify the document type accurately: invoice, receipt, bank statement, contract, ledger, or other.

Respond ONLY with valid JSON matching the schema provided. No prose outside the JSON.`;

export function buildExtractionPrompt(language: Locale): string {
  if (language === "sw") {
    return `Toa data zote za fedha kutoka kwa hati hii. Jibu kwa JSON kulingana na muundo uliotolewa. Usibuni maelezo yoyote ambayo hayapo wazi kwenye hati.`;
  }
  return `Extract all financial data from this document. Respond with JSON matching the provided schema. Do not invent any values not clearly present in the document.`;
}

export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    documentType: {
      type: "string",
      enum: ["invoice", "receipt", "statement", "contract", "ledger", "other"],
    },
    overallConfidence: { type: "string", enum: ["high", "medium", "low"] },
    summary: { type: "string", description: "Brief summary in English" },
    summarySw: { type: "string", description: "Brief summary in Swahili" },
    discrepancies: {
      type: "array",
      items: { type: "string" },
      description: "Any arithmetic errors, inconsistencies, or suspicious values found",
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          label: { type: "string", description: "English label" },
          labelSw: { type: "string", description: "Swahili label" },
          value: {
            oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          sourceNote: {
            type: "string",
            description: "Where in the document this value was found",
          },
          isUnreadable: { type: "boolean" },
        },
        required: [
          "name",
          "label",
          "labelSw",
          "value",
          "confidence",
          "sourceNote",
          "isUnreadable",
        ],
      },
    },
  },
  required: [
    "documentType",
    "overallConfidence",
    "summary",
    "summarySw",
    "discrepancies",
    "fields",
  ],
};
