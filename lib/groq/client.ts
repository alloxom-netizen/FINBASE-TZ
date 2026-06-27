import Groq from "groq-sdk";

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set in environment variables");
    _client = new Groq({ apiKey });
  }
  return _client;
}

// Fast large-context model for text tasks
export const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
// Reasoning model (same as text model — deepseek-r1 was decommissioned on Groq)
export const GROQ_REASONING_MODEL = "llama-3.3-70b-versatile";
// Vision model for image documents (jpg, png, webp)
export const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
