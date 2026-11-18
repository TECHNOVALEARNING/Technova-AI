import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

// TechNova Studio runs on OpenRouter (same account as the chat). Override the
// model with STUDIO_MODEL, e.g. "openai/gpt-6-sol" or "anthropic/claude-sonnet-5.5".
const DEFAULT_STUDIO_MODEL = "anthropic/claude-sonnet-5";

/** Output ceiling per call: without it OpenRouter reserves the model maximum (65k tokens) up front. */
export const STUDIO_MAX_TOKENS = { intent: 1000, questions: 3000, plan: 6000, build: 32000 } as const;

/** The model the Studio runs on (STUDIO_MODEL in Vercel, else the default). */
export const studioModel = () => process.env["STUDIO_MODEL"]?.trim() || DEFAULT_STUDIO_MODEL;

export function studioStream(request: Request | null, system: string, messages: ModelMessage[], maxOutputTokens: number) {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const appUrl = process.env["TECHNOVA_APP_URL"]?.trim();
  const provider = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: { "X-Title": "TechNova AI Hub", ...(appUrl ? { "HTTP-Referer": appUrl } : {}) },
    // Privacy promise on the landing page: only providers that neither store prompts nor train on them.
    // usage.include makes OpenRouter add the real USD cost (hidden reasoning included) to the last chunk; a copy
    // of the response is read on the side to pick it up without touching what the AI SDK receives.
    fetch: async (input, init) => {
      if (typeof init?.body === "string") {
        try { init = { ...init, body: JSON.stringify({ ...JSON.parse(init.body), provider: { data_collection: "deny" }, usage: { include: true } }) }; } catch { /* not JSON: send as is */ }
      }
      const res = await fetch(input, init);
      if (!res.ok || !res.body) return res;
      const [forSdk, forCost] = res.body.tee();
      calls.push(readCost(forCost));
      return new Response(forSdk, { status: res.status, statusText: res.statusText, headers: res.headers });
    },
  });
  const calls: Promise<number>[] = [];
  // Stream errors (402, 429…) surface later as a generic "no output" error; keep the real one.
  let providerError: unknown = null;
  const result = streamText({
    model: provider.chat(studioModel()),
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
  return Object.assign(result, {
    providerError: () => providerError,
    /** Real USD cost OpenRouter billed for this stream (every HTTP call, retries included); 0 when unknown. */
    costUsd: async () => {
      const all = await Promise.race([Promise.all(calls), new Promise<number[]>((r) => setTimeout(() => r([]), 5000))]);
      return all.reduce((a, b) => a + b, 0);
    },
  });
}

/** Reads a copy of an OpenRouter response (SSE or JSON) and returns the last "cost" it reports. Model text is
 *  JSON-escaped inside the stream (\"cost\"), so only the real usage key matches. */
async function readCost(body: ReadableStream<Uint8Array>): Promise<number> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let tail = "", cost = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      tail += dec.decode(value, { stream: true });
      for (const m of tail.matchAll(/"cost"\s*:\s*([0-9.eE+-]+)/g)) { const n = Number(m[1]); if (Number.isFinite(n)) cost = n; }
      tail = tail.slice(-120);
    }
  } catch { /* stream aborted: keep what was seen */ }
  return cost;
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
