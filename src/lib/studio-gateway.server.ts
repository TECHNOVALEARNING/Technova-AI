import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

// TechNova Studio runs on OpenRouter (same account as the chat). Override the
// model with STUDIO_MODEL, e.g. "openai/gpt-6-sol" or "anthropic/claude-sonnet-5.5".
const DEFAULT_STUDIO_MODEL = "anthropic/claude-sonnet-5";

export function studioStream(request: Request | null, system: string, messages: ModelMessage[]) {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const appUrl = process.env["TECHNOVA_APP_URL"]?.trim();
  const provider = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: { "X-Title": "TechNova AI Hub", ...(appUrl ? { "HTTP-Referer": appUrl } : {}) },
  });
  return streamText({
    model: provider.chat(process.env["STUDIO_MODEL"]?.trim() || DEFAULT_STUDIO_MODEL),
    system,
    messages,
    ...(request ? { abortSignal: request.signal } : {}),
    maxRetries: 1,
  });
}

export function parseJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
