import Anthropic from "@anthropic-ai/sdk";

// Server-side only — never import this in client components
let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _client;
}
