import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

// TechNova Studio runs on OpenRouter (same account as the chat). Override the
// model with STUDIO_MODEL, e.g. "openai/gpt-6-sol" or "anthropic/claude-sonnet-5.5".
const DEFAULT_STUDIO_MODEL = "anthropic/claude-sonnet-5";

/** Output ceiling per call: without it OpenRouter reserves the model maximum (65k tokens) up front. */
export const STUDIO_MAX_TOKENS = { intent: 1000, questions: 3000, plan: 6000, build: 32000 } as const;

export function studioStream(request: Request | null, system: string, messages: ModelMessage[], maxOutputTokens: number) {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const appUrl = process.env["TECHNOVA_APP_URL"]?.trim();
  const provider = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: { "X-Title": "TechNova AI Hub", ...(appUrl ? { "HTTP-Referer": appUrl } : {}) },
  });
  // Stream errors (402, 429…) surface later as a generic "no output" error; keep the real one.
  let providerError: unknown = null;
  const result = streamText({
    model: provider.chat(process.env["STUDIO_MODEL"]?.trim() || DEFAULT_STUDIO_MODEL),
    system,
    messages,
    maxOutputTokens,
    ...(request ? { abortSignal: request.signal } : {}),
    maxRetries: 1,
    onError: ({ error }) => {
      providerError = error;
      console.error("studio provider error", (error as { statusCode?: number })?.statusCode, (error as Error)?.message?.slice(0, 300));
    },
  });
  return Object.assign(result, { providerError: () => providerError });
}

/** HTTP status of a provider failure, looking through wrapped AI SDK errors. */
export function studioErrorStatus(e: unknown, providerError?: unknown): number | undefined {
  for (const candidate of [providerError, e, (e as { cause?: unknown })?.cause, (e as { lastError?: unknown })?.lastError]) {
    const status = (candidate as { statusCode?: number } | null)?.statusCode;
    if (typeof status === "number") return status;
  }
  return undefined;
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
