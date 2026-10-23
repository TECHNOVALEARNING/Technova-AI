// Server-only OpenRouter helpers for features billed at real provider cost (Deep Research, Arena).

/** TechNova credits per US dollar of provider cost — the factor used by the model pricing table. */
export const CREDITS_PER_USD = 1200;

export type Citation = { url: string; title: string };
export type OrResult = { content: string; citations: Citation[]; costUsd: number; inputTokens: number; outputTokens: number };

export class OpenRouterError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type OrMessage = { role: "system" | "user" | "assistant"; content: string };
type OrOptions = { model: string; messages: OrMessage[]; maxTokens: number; webResults?: number; signal?: AbortSignal; temperature?: number };

/** One non-streaming completion; `usage.cost` from OpenRouter includes web search fees. */
export async function orComplete(o: OrOptions): Promise<OrResult> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new OpenRouterError(503, "OPENROUTER_API_KEY missing");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: o.signal ? AbortSignal.any([o.signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "TechNova AI Hub" },
    body: JSON.stringify({
      model: o.model,
      messages: o.messages,
      max_tokens: o.maxTokens,
      usage: { include: true },
      ...(o.temperature !== undefined ? { temperature: o.temperature } : {}),
      ...(o.webResults ? { plugins: [{ id: "web", max_results: o.webResults }] } : {}),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
    choices?: { message?: { content?: string; annotations?: { type: string; url_citation?: { url?: string; title?: string } }[] } }[];
    usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number };
  };
  if (!res.ok || json.error) throw new OpenRouterError(json.error?.code ?? res.status, json.error?.message ?? `OpenRouter ${res.status}`);
  const message = json.choices?.[0]?.message;
  const citations = (message?.annotations ?? [])
    .filter((a) => a.type === "url_citation" && a.url_citation?.url?.startsWith("http"))
    .map((a) => ({ url: a.url_citation!.url!, title: a.url_citation!.title?.trim() || a.url_citation!.url! }));
  return {
    content: message?.content ?? "",
    citations,
    costUsd: json.usage?.cost ?? 0,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
  };
}

export const creditsFor = (usd: number) => (usd > 0 ? Math.max(1, Math.ceil(usd * CREDITS_PER_USD)) : 0);

/** User-facing message for a provider failure. */
export function providerMessage(status: number) {
  return status === 402
    ? "Le service IA est momentanément indisponible (solde du fournisseur épuisé). / The AI provider is out of balance."
    : status === 429
      ? "Trop de requêtes, réessayez dans un instant. / Rate limited, try again shortly."
      : "Le modèle n'a pas pu répondre, réessayez. / The model could not answer.";
}
