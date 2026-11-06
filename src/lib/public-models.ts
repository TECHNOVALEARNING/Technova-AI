// Models actually available in TechNova, with their price in TechNova credits (1 credit ≈ 1 FCFA).
// Text prices come from model-pricing.ts, media prices from media-models.ts: one source of truth.
import { openRouterModelIds } from "@/lib/chat-models";
import { creditCost, modelCatalog } from "@/lib/model-pricing";
import { mediaModels, mediaReserve, type MediaKind } from "@/lib/media-models";

export type TextCap = "reasoning" | "coding" | "vision" | "fast" | "long";
export type ModeLabel = { fr: string; en: string; es: string; pt: string };
export type PublicTextModel = { kind: "text"; name: string; provider: string; context: string; caps: TextCap[]; input: number; output: number; perMessage: number; mode?: ModeLabel; soon?: boolean };
export type PublicMediaModel = { kind: MediaKind; id: string; name: string; provider: string; credits: number; seconds?: number; perSecond?: number; cheap: boolean };
export type PublicModel = PublicTextModel | PublicMediaModel;

// Context window and strengths of each chat model (provider specifications).
const textSpecs: Record<string, { context: string; caps: TextCap[] }> = {
  "GPT-4o": { context: "128K", caps: ["vision"] },
  "GPT-4o Mini": { context: "128K", caps: ["vision", "fast"] },
  "Claude Sonnet 5": { context: "1M", caps: ["reasoning", "coding", "vision", "long"] },
  "Claude Opus 5": { context: "1M", caps: ["reasoning", "coding", "vision", "long"] },
  "GPT-6 Astra": { context: "1M", caps: ["reasoning", "coding", "vision", "long"] },
  "Gemini 4 Argon": { context: "1M", caps: ["reasoning", "coding", "vision", "long"] },
  "Gemini 2.5 Flash Lite": { context: "1M", caps: ["vision", "fast", "long"] },
  "Gemini 3.5 Flash Lite": { context: "1M", caps: ["vision", "fast", "long"] },
  "Qwen3 235B": { context: "262K", caps: ["reasoning", "coding"] },
  "Claude Haiku 4.5": { context: "200K", caps: ["reasoning", "vision", "fast"] },
  "DeepSeek R1": { context: "164K", caps: ["reasoning", "coding"] },
  "DeepSeek V3": { context: "164K", caps: ["coding"] },
  "Gemini 2.5 Flash": { context: "1M", caps: ["reasoning", "vision", "fast", "long"] },
  "Gemini 2.5 Pro": { context: "1M", caps: ["reasoning", "coding", "vision", "long"] },
  "Llama 3.3 70B": { context: "131K", caps: [] },
  "Mistral Large": { context: "128K", caps: ["coding"] },
  "Qwen 2.5 Coder 32B": { context: "33K", caps: ["coding"] },
  "Qwen 2.5 72B": { context: "33K", caps: [] },
  "Hermes 3 405B": { context: "131K", caps: ["long"] },
  "Llama 3.1 8B": { context: "131K", caps: ["fast"] },
  "Gemma 3 12B": { context: "131K", caps: ["vision", "fast"] },
};

/** A typical exchange: a 1 000-token question and a 700-token answer. */
const TYPICAL_IN = 1000, TYPICAL_OUT = 700;

/** Engines behind the chat modes: their card shows the mode's fixed price per message (src/lib/chat-modes.ts). */
const modePrices: Record<string, { credits: number; mode: ModeLabel }> = {
  "Gemini 2.5 Flash Lite": { credits: 1, mode: { fr: "Mode Éclair", en: "Flash mode", es: "Modo Relámpago", pt: "Modo Relâmpago" } },
  "Qwen3 235B": { credits: 3, mode: { fr: "Mode Équilibré", en: "Balanced mode", es: "Modo Equilibrado", pt: "Modo Equilibrado" } },
  "Gemini 3.5 Flash Lite": { credits: 4, mode: { fr: "Mode Équilibré avec fichier", en: "Balanced mode with a file", es: "Modo Equilibrado con archivo", pt: "Modo Equilibrado com arquivo" } },
  "Claude Sonnet 5": { credits: 25, mode: { fr: "Mode Expert · Creator", en: "Expert mode · Creator", es: "Modo Experto · Creator", pt: "Modo Especialista · Creator" } },
  "Claude Opus 5": { credits: 60, mode: { fr: "Mode Expert · Pro", en: "Expert mode · Pro", es: "Modo Experto · Pro", pt: "Modo Especialista · Pro" } },
};

/** Shown in the catalog only: too costly to open in the chat, agents or API for now (not in openRouterModelIds). */
const showcaseOnly = ["GPT-6 Astra", "Gemini 4 Argon"];

export const textModels: PublicTextModel[] = [...Object.keys(openRouterModelIds), ...showcaseOnly].flatMap((name) => {
  const price = modelCatalog.find((m) => m.name === name);
  if (!price) return [];
  const spec = textSpecs[name] ?? { context: "—", caps: [] };
  const fixed = modePrices[name];
  return [{ kind: "text" as const, name, provider: price.provider, context: spec.context, caps: spec.caps, input: price.input, output: price.output, perMessage: fixed ? fixed.credits : creditCost(name, TYPICAL_IN, TYPICAL_OUT), ...(fixed ? { mode: fixed.mode } : {}), ...(showcaseOnly.includes(name) ? { soon: true } : {}) }];
});

export const mediaCatalog: PublicMediaModel[] = mediaModels.map((m) => {
  if (m.kind === "video") {
    // Price of the shortest clip the model accepts (fixed-length models: their only length).
    const timed = m.durationStyle && m.durationStyle !== "none" && m.durations?.length;
    const seconds = timed ? Math.min(...m.durations!) : m.id.includes("hailuo/02-text-to-video-pro") ? 6 : 5;
    return { kind: m.kind, id: m.id, name: m.label, provider: m.provider, credits: mediaReserve(m, seconds), seconds, ...(timed ? { perSecond: mediaReserve(m, 1) } : {}), cheap: !!m.cheap };
  }
  return { kind: m.kind, id: m.id, name: m.label, provider: m.provider, credits: mediaReserve(m, 0), cheap: !!m.cheap };
});

export const allPublicModels: PublicModel[] = [...textModels, ...mediaCatalog];
