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
- Identify the document type accurately: invoice, receipt, statement, contract, ledger, or other.
- Group fields into logical sections that mirror how the document is structured (e.g. "Vendor Information", "Current Assets", "Line Items", "Totals"). Each document type should have appropriate sections.
- Mark total/subtotal rows with isTotal: true — these will be rendered with emphasis.
- Also include ALL fields in the flat "fields" array (same objects, just duplicated there).

Respond ONLY with valid JSON matching the schema provided. No prose outside the JSON.`;

export function buildExtractionPrompt(language: Locale): string {
  if (language === "sw") {
    return `Toa data zote za fedha kutoka kwa hati hii. Panga sehemu kwa muundo unaofanana na hati halisi (mfano: "Taarifa za Muuzaji", "Mali za Sasa", "Jumla"). Jibu kwa JSON kulingana na muundo uliotolewa. Usibuni maelezo yoyote ambayo hayapo wazi kwenye hati.`;
  }
  return `Extract all financial data from this document. Group fields into sections that mirror the document's own structure (e.g. "Vendor Information", "Current Assets", "Line Items", "Totals"). Mark any total/subtotal rows with isTotal: true. Respond with JSON matching the provided schema. Do not invent any values not clearly present in the document.`;
}

export const EXTRACTION_SCHEMA = {
  type: "object",
  required: ["documentType", "overallConfidence", "summary", "summarySw", "discrepancies", "sections", "fields"],
  properties: {
    documentType: {
      type: "string",
      enum: ["invoice", "receipt", "statement", "contract", "ledger", "other"],
    },
    overallConfidence: { type: "string", enum: ["high", "medium", "low"] },
    summary: { type: "string", description: "1–2 sentence summary in English" },
    summarySw: { type: "string", description: "1–2 sentence summary in Swahili" },
    discrepancies: {
      type: "array",
      items: { type: "string" },
      description: "Arithmetic errors, totals mismatches, or suspicious values. Empty array if none.",
    },
    sections: {
      type: "array",
      description: "Fields grouped by logical document section, mirroring the document layout",
      items: {
        type: "object",
        required: ["title", "titleSw", "fields"],
        properties: {
          title: { type: "string", description: "Section name in English (e.g. 'Current Assets', 'Vendor Information')" },
          titleSw: { type: "string", description: "Section name in Swahili" },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "label", "labelSw", "value", "confidence", "sourceNote", "isUnreadable", "isTotal"],
              properties: {
                name: { type: "string", description: "snake_case unique identifier" },
                label: { type: "string", description: "English field label" },
                labelSw: { type: "string", description: "Swahili field label" },
                value: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                sourceNote: { type: "string", description: "Where in the document this was found" },
                isUnreadable: { type: "boolean" },
                isTotal: { type: "boolean", description: "true for total/subtotal rows (bold display)" },
              },
            },
          },
        },
      },
    },
    fields: {
      type: "array",
      description: "All fields from all sections, flattened into a single array (same objects as above)",
      items: {
        type: "object",
        required: ["name", "label", "labelSw", "value", "confidence", "sourceNote", "isUnreadable", "isTotal"],
        properties: {
          name: { type: "string" },
          label: { type: "string" },
          labelSw: { type: "string" },
          value: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          sourceNote: { type: "string" },
          isUnreadable: { type: "boolean" },
          isTotal: { type: "boolean" },
        },
      },
    },
  },
};
