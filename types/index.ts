export type Locale = "en" | "sw";

export type DocumentStatus =
  | "processing"
  | "processed"
  | "needs_review"
  | "failed";

export type DocumentType =
  | "invoice"
  | "receipt"
  | "statement"
  | "contract"
  | "ledger"
  | "other";

export type Confidence = "high" | "medium" | "low";

export interface ExtractedField {
  name: string;
  label: string;
  labelSw: string;
  value: string | number | null;
  correctedValue?: string | number | null;
  confidence: Confidence;
  sourceNote: string;
  isUnreadable: boolean;
  isTotal?: boolean;
}

export interface ExtractedSection {
  title: string;
  titleSw: string;
  fields: ExtractedField[];
}

export interface ExtractedData {
  documentType: DocumentType;
  sections?: ExtractedSection[];
  fields: ExtractedField[];
  overallConfidence: Confidence;
  summary: string;
  summarySw: string;
  discrepancies: string[];
  rawText?: string;
}

export interface FinDocument {
  id: string;
  userId: string | null;
  sessionId: string | null;
  fileName: string;
  fileType: "pdf" | "jpg" | "png" | "webp";
  fileSize: number;
  storagePath: string;
  status: DocumentStatus;
  uploadedAt: Date;
  processedAt: Date | null;
  extractedData: ExtractedData | null;
  userCorrections: Record<string, string | number | null>;
  language: Locale;
}

export interface User {
  id: string;
  email: string;
  language: Locale;
  createdAt: Date;
}

export interface AssistantRequest {
  documentId: string;
  tool: "drafts" | "accounting" | "qa" | "negotiation" | "summary" | "audit";
  language: Locale;
  userQuery?: string;
  additionalContext?: string;
}

export interface AssistantResponse {
  content: string;
  language: Locale;
}
