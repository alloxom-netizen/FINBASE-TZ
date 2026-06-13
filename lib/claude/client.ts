import Anthropic from "@anthropic-ai/sdk";

// Server-side only — never import this in client components
let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
