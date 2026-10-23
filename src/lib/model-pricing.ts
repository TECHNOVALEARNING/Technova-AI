// TechNova credit prices per million tokens (input / output).
export type ModelInfo = { name: string; provider: string; input: number; output: number; kind: "chat" | "visual" };

// Chat prices in TechNova credits per million tokens = OpenRouter USD price × 1 200
// (CREDITS_PER_USD). Recalculated from live OpenRouter prices on 2026-10-23.
export const modelCatalog: ModelInfo[] = [
  { name: "GPT-4o", provider: "OpenAI", input: 3000, output: 12000, kind: "chat" },
  { name: "GPT-4o Mini", provider: "OpenAI", input: 180, output: 720, kind: "chat" },
  { name: "Claude Sonnet 5", provider: "Anthropic", input: 2400, output: 12000, kind: "chat" },
  { name: "Claude Haiku 4.5", provider: "Anthropic", input: 1200, output: 6000, kind: "chat" },
  { name: "DeepSeek R1", provider: "DeepSeek", input: 600, output: 2581, kind: "chat" },
  { name: "DeepSeek V3", provider: "DeepSeek", input: 309, output: 1235, kind: "chat" },
  { name: "Gemini 2.5 Flash", provider: "Google", input: 360, output: 3000, kind: "chat" },
  { name: "Gemini 2.5 Pro", provider: "Google", input: 1500, output: 12000, kind: "chat" },
  { name: "Llama 3.3 70B", provider: "Meta", input: 120, output: 384, kind: "chat" },
  { name: "Llama 3.1 8B", provider: "Meta", input: 60, output: 96, kind: "chat" },
  { name: "Mistral Large", provider: "Mistral AI", input: 2400, output: 7200, kind: "chat" },
  { name: "Qwen 2.5 72B", provider: "Alibaba", input: 432, output: 480, kind: "chat" },
  { name: "Qwen 2.5 Coder 32B", provider: "Alibaba", input: 792, output: 1200, kind: "chat" },
  { name: "Hermes 3 405B", provider: "NousResearch", input: 1200, output: 1200, kind: "chat" },
  { name: "Gemma 3 12B", provider: "Google", input: 60, output: 180, kind: "chat" },
  { name: "FLUX 1.1 Pro", provider: "Black Forest Labs", input: 0, output: 0, kind: "visual" },
  { name: "FLUX Schnell", provider: "Black Forest Labs", input: 0, output: 0, kind: "visual" },
  { name: "Google Imagen 4", provider: "KIE.ai", input: 0, output: 0, kind: "visual" },
  { name: "Ideogram V3", provider: "KIE.ai", input: 0, output: 0, kind: "visual" },
  { name: "Kling 2.1 Master Vidéo", provider: "KIE.ai", input: 0, output: 0, kind: "visual" },
  { name: "ByteDance Seedance Vidéo", provider: "KIE.ai", input: 0, output: 0, kind: "visual" },
];

export function creditCost(model: string, inputTokens: number, outputTokens: number) {
  const info = modelCatalog.find(m => m.name === model);
  if (!info) return 0;
  const raw = (inputTokens * info.input + outputTokens * info.output) / 1_000_000;
  return raw > 0 ? Math.max(1, Math.ceil(raw)) : 0;
}

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export type Currency = "FCFA" | "USD" | "EUR";
export function formatPrice(fcfa: number, currency: Currency) {
  if (currency === "FCFA") return `${fcfa.toLocaleString("fr-FR")} FCFA`;
  if (currency === "EUR") return `€${(fcfa / 655.957).toFixed(2)}`;
  return `$${(fcfa / 600).toFixed(2)}`;
}
