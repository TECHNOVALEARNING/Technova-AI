// Models actually available in TechNova, with their price in TechNova credits (1 credit ≈ 1 FCFA).
// Text prices come from model-pricing.ts, media prices from media-models.ts: one source of truth.
import { openRouterModelIds } from "@/lib/chat-models";
import { creditCost, modelCatalog } from "@/lib/model-pricing";
import { mediaModels, mediaReserve, type MediaKind } from "@/lib/media-models";

export type TextCap = "reasoning" | "coding" | "vision" | "fast" | "long";
export type PublicTextModel = { kind: "text"; name: string; provider: string; context: string; caps: TextCap[]; input: number; output: number; perMessage: number };
export type PublicMediaModel = { kind: MediaKind; id: string; name: string; provider: string; credits: number; seconds?: number; perSecond?: number; cheap: boolean };
export type PublicModel = PublicTextModel | PublicMediaModel;

// Context window and strengths of each chat model (provider specifications).
const textSpecs: Record<string, { context: string; caps: TextCap[] }> = {
  "GPT-4o": { context: "128K", caps: ["vision"] },
  "GPT-4o Mini": { context: "128K", caps: ["vision", "fast"] },
  "Claude Sonnet 5": { context: "1M", caps: ["reasoning", "coding", "vision", "long"] },
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

export const textModels: PublicTextModel[] = Object.keys(openRouterModelIds).flatMap((name) => {
  const price = modelCatalog.find((m) => m.name === name);
  if (!price) return [];
  const spec = textSpecs[name] ?? { context: "—", caps: [] };
  return [{ kind: "text" as const, name, provider: price.provider, context: spec.context, caps: spec.caps, input: price.input, output: price.output, perMessage: creditCost(name, TYPICAL_IN, TYPICAL_OUT) }];
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
