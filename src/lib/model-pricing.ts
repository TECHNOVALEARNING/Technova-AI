// TechNova credit prices per million tokens (input / output), from the client's original catalogue.
export type ModelInfo = { name: string; provider: string; input: number; output: number; kind: "chat" | "visual" };

export const modelCatalog: ModelInfo[] = [
  { name: "GPT-4o", provider: "OpenAI", input: 3000, output: 12000, kind: "chat" },
  { name: "GPT-4o Mini", provider: "OpenAI", input: 180, output: 720, kind: "chat" },
  { name: "Claude Sonnet 5", provider: "Anthropic", input: 3600, output: 18000, kind: "chat" },
  { name: "Claude Haiku 4.5", provider: "Anthropic", input: 960, output: 4800, kind: "chat" },
  { name: "DeepSeek R1", provider: "DeepSeek", input: 660, output: 2628, kind: "chat" },
  { name: "DeepSeek V3", provider: "DeepSeek", input: 168, output: 336, kind: "chat" },
  { name: "Gemini 2.5 Flash", provider: "Google", input: 180, output: 720, kind: "chat" },
  { name: "Gemini 2.5 Pro", provider: "Google", input: 1500, output: 12000, kind: "chat" },
  { name: "Llama 3.3 70B", provider: "Meta", input: 468, output: 468, kind: "chat" },
  { name: "Llama 3.1 8B", provider: "Meta", input: 0, output: 0, kind: "chat" },
  { name: "Mistral Large", provider: "Mistral AI", input: 2400, output: 7200, kind: "chat" },
  { name: "Qwen 2.5 72B", provider: "Alibaba", input: 432, output: 432, kind: "chat" },
  { name: "Qwen 2.5 Coder 32B", provider: "Alibaba", input: 216, output: 216, kind: "chat" },
  { name: "Hermes 3 405B", provider: "NousResearch", input: 2400, output: 2400, kind: "chat" },
  { name: "Gemma 3 12B", provider: "Google", input: 0, output: 0, kind: "chat" },
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

// Credit packs: 1 FCFA = 1 credit; bonus credits added on top.
export const creditPacks = [
  { id: "free", name: "Free", fcfa: 0, credits: 50, bonus: 0 },
  { id: "starter", name: "Starter", fcfa: 1000, credits: 1000, bonus: 0 },
  { id: "essential", name: "Essential", fcfa: 2500, credits: 2500, bonus: 100 },
  { id: "advanced", name: "Advanced", fcfa: 5000, credits: 5000, bonus: 500, popular: true },
  { id: "professional", name: "Professional", fcfa: 10000, credits: 10000, bonus: 1500 },
  { id: "business", name: "Business", fcfa: 30000, credits: 30000, bonus: 8000 },
] as const;

export type Currency = "FCFA" | "USD" | "EUR";
export function formatPrice(fcfa: number, currency: Currency) {
  if (currency === "FCFA") return `${fcfa.toLocaleString("fr-FR")} FCFA`;
  if (currency === "EUR") return `€${(fcfa / 655.957).toFixed(2)}`;
  return `$${(fcfa / 600).toFixed(2)}`;
}
