// kie.ai text-to-image / text-to-video catalogue (Market jobs API), from docs.kie.ai.
// Client-safe: no secrets. The server builds the request input from these specs.

export type MediaRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type SizeStyle = "aspect_ratio" | "image_size_named" | "image_size_ratio" | "none";
type DurationStyle = "string" | "integer" | "none";

export type MediaModel = {
  id: string;
  label: string;
  provider: string;
  kind: "image" | "video";
  size: SizeStyle;
  ratios: MediaRatio[];
  durationStyle?: DurationStyle;
  durations?: number[];
  extra?: Record<string, unknown>;
  cheap?: boolean;
};

const all5: MediaRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const tri: MediaRatio[] = ["1:1", "16:9", "9:16"];
const img = (id: string, label: string, provider: string, size: SizeStyle, ratios: MediaRatio[] = all5, extra?: Record<string, unknown>, cheap?: boolean): MediaModel =>
  ({ id, label, provider, kind: "image", size, ratios, ...(extra ? { extra } : {}), ...(cheap ? { cheap } : {}) });
const vid = (id: string, label: string, provider: string, size: SizeStyle, ratios: MediaRatio[], durationStyle: DurationStyle, durations: number[], extra?: Record<string, unknown>, cheap?: boolean): MediaModel =>
  ({ id, label, provider, kind: "video", size, ratios, durationStyle, durations, ...(extra ? { extra } : {}), ...(cheap ? { cheap } : {}) });

export const mediaModels: MediaModel[] = [
  img("nano-banana-2-lite", "Nano Banana 2 Lite", "Google", "aspect_ratio", all5, undefined, true),
  img("nano-banana-2", "Nano Banana 2", "Google", "aspect_ratio", all5, { resolution: "1K" }),
  img("google/nano-banana", "Nano Banana", "Google", "aspect_ratio"),
  img("google/imagen4-fast", "Imagen 4 Fast", "Google", "aspect_ratio", all5, undefined, true),
  img("google/imagen4", "Imagen 4", "Google", "aspect_ratio"),
  img("google/imagen4-ultra", "Imagen 4 Ultra", "Google", "aspect_ratio"),
  img("gpt-image-2-5-flare-text-to-image", "GPT Image 2.5 Flare", "OpenAI", "aspect_ratio", all5, { resolution: "1K" }),
  img("gpt-image-2-5-sunburst-text-to-image", "GPT Image 2.5 Sunburst", "OpenAI", "aspect_ratio", all5, { resolution: "1K" }),
  img("gpt-image-2-text-to-image", "GPT Image 2", "OpenAI", "aspect_ratio", all5, { resolution: "1K" }),
  img("gpt-image/1.5-text-to-image", "GPT Image 1.5", "OpenAI", "aspect_ratio", ["1:1"], { quality: "medium" }),
  img("seedream/5-flash-text-to-image", "Seedream 5.0 Flash", "ByteDance", "aspect_ratio", all5, { size: "1K" }, true),
  img("seedream/5-lite-text-to-image", "Seedream 5.0 Lite", "ByteDance", "aspect_ratio", all5, { quality: "basic" }),
  img("seedream/5-pro-text-to-image", "Seedream 5.0 Pro", "ByteDance", "aspect_ratio", all5, { quality: "basic" }),
  img("seedream/4.5-text-to-image", "Seedream 4.5", "ByteDance", "aspect_ratio", all5, { quality: "basic" }),
  img("bytedance/seedream-v4-text-to-image", "Seedream 4.0", "ByteDance", "image_size_named"),
  img("bytedance/seedream", "Seedream 3.0", "ByteDance", "image_size_named"),
  img("flux-2/pro-text-to-image", "Flux 2 Pro", "Black Forest Labs", "aspect_ratio", all5, { resolution: "1K" }),
  img("flux-2/flex-text-to-image", "Flux 2 Flex", "Black Forest Labs", "aspect_ratio", all5, { resolution: "1K" }),
  img("grok-imagine-image-2-0/text-to-image", "Grok Imagine Image 2.0", "xAI", "aspect_ratio", tri),
  img("grok-imagine/text-to-image", "Grok Imagine", "xAI", "aspect_ratio", tri),
  img("ideogram/v3-text-to-image", "Ideogram V3", "Ideogram", "image_size_named"),
  img("qwen3/pro-text-to-image", "Qwen 3 Pro", "Alibaba", "image_size_ratio", all5, { resolution: "1K" }),
  img("qwen3/text-to-image", "Qwen 3", "Alibaba", "image_size_ratio", all5, { resolution: "1K" }),
  img("qwen2-1/text-to-image", "Qwen 2.1", "Alibaba", "aspect_ratio", all5, { resolution: "1K" }),
  img("qwen/text-to-image", "Qwen Image", "Alibaba", "image_size_named"),
  img("z-image", "Z-Image", "Tongyi", "aspect_ratio", all5, undefined, true),

  vid("kling-3.0-omni/text-to-video", "Kling 3.0 Omni", "Kuaishou", "aspect_ratio", tri, "integer", [5, 10], { resolution: "720p" }),
  vid("kling/v3-turbo-text-to-video", "Kling 3 Turbo", "Kuaishou", "aspect_ratio", tri, "string", [5, 10], { resolution: "720p" }),
  vid("kling-2.6/text-to-video", "Kling 2.6", "Kuaishou", "aspect_ratio", tri, "string", [5, 10], { sound: false }),
  vid("kling/v2-5-turbo-text-to-video-pro", "Kling 2.5 Turbo Pro", "Kuaishou", "aspect_ratio", tri, "string", [5, 10]),
  vid("kling/v2-1-master-text-to-video", "Kling 2.1 Master", "Kuaishou", "aspect_ratio", tri, "string", [5, 10]),
  vid("bytedance/seedance-2-5", "Seedance 2.5", "ByteDance", "aspect_ratio", all5, "integer", [5, 10], { resolution: "720p" }),
  vid("bytedance/seedance-2", "Seedance 2", "ByteDance", "aspect_ratio", all5, "integer", [5, 10], { resolution: "720p" }),
  vid("bytedance/seedance-2-fast", "Seedance 2 Fast", "ByteDance", "aspect_ratio", all5, "integer", [5, 10], { resolution: "480p" }, true),
  vid("bytedance/seedance-2-mini", "Seedance 2 Mini", "ByteDance", "aspect_ratio", all5, "integer", [5, 10], { resolution: "480p" }, true),
  vid("bytedance/seedance-1.5-pro", "Seedance 1.5 Pro", "ByteDance", "aspect_ratio", all5, "integer", [5, 10], { resolution: "720p" }),
  vid("bytedance/v1-pro-text-to-video", "Seedance 1 Pro", "ByteDance", "aspect_ratio", all5, "string", [5, 10], { resolution: "720p" }),
  vid("bytedance/v1-lite-text-to-video", "Seedance 1 Lite", "ByteDance", "aspect_ratio", all5, "string", [5, 10], { resolution: "720p" }, true),
  vid("grok-imagine/text-to-video", "Grok Imagine Video", "xAI", "aspect_ratio", tri, "integer", [6, 10], { mode: "normal", resolution: "720p" }),
  vid("grok-imagine-video-1-5-preview", "Grok Imagine Video 1.5", "xAI", "aspect_ratio", tri, "integer", [8], { resolution: "720p" }),
  vid("hailuo/02-text-to-video-pro", "Hailuo 02 Pro", "MiniMax", "none", [], "none", []),
  vid("hailuo/02-text-to-video-standard", "Hailuo 02 Standard", "MiniMax", "none", [], "string", [6, 10]),
  vid("wan/2-7-text-to-video", "Wan 2.7", "Alibaba", "none", [], "integer", [5, 10], { resolution: "720p" }),
  vid("wan/2-6-text-to-video", "Wan 2.6", "Alibaba", "none", [], "string", [5, 10, 15], { resolution: "720p" }),
  vid("wan/2-5-text-to-video", "Wan 2.5", "Alibaba", "aspect_ratio", tri, "string", [5, 10], { resolution: "720p" }),
  vid("wan/2-2-a14b-text-to-video-turbo", "Wan 2.2 Turbo", "Alibaba", "aspect_ratio", ["16:9", "9:16"], "none", [], { resolution: "480p" }, true),
];

export const defaultImageModel = "nano-banana-2-lite";
export const defaultVideoModel = "kling/v2-1-master-text-to-video";
export const findMediaModel = (id: string) => mediaModels.find((m) => m.id === id);

const named: Record<MediaRatio, string> = {
  "1:1": "square_hd", "16:9": "landscape_16_9", "9:16": "portrait_16_9", "4:3": "landscape_4_3", "3:4": "portrait_4_3",
};

export function buildMediaInput(model: MediaModel, prompt: string, ratio: MediaRatio, seconds: number) {
  const chosen = model.ratios.includes(ratio) ? ratio : (model.ratios.includes("16:9") ? "16:9" : model.ratios[0]);
  const input: Record<string, unknown> = { prompt, ...(model.extra ?? {}) };
  if (chosen && model.size === "aspect_ratio") input["aspect_ratio"] = chosen;
  if (chosen && model.size === "image_size_ratio") input["image_size"] = chosen;
  if (chosen && model.size === "image_size_named") input["image_size"] = named[chosen];
  let duration: number | null = null;
  if (model.durationStyle && model.durationStyle !== "none" && model.durations?.length) {
    duration = model.durations.reduce((best, d) => Math.abs(d - seconds) < Math.abs(best - seconds) ? d : best, model.durations[0]!);
    input["duration"] = model.durationStyle === "string" ? String(duration) : duration;
  }
  return { input, ratio: chosen ?? "auto", duration };
}

// TechNova pricing: kie.ai cost × 3 margin. 1 kie credit ≈ $0.005 ≈ 3 FCFA = 3 TechNova credits.
export const KIE_TO_TECHNOVA = 3 * 3;
// Known kie.ai costs (kie credits per image, or per 5 s of video). Others use a conservative ceiling.
const knownKieCost: Record<string, number> = { "nano-banana-2-lite": 4 };
export function mediaReserve(model: MediaModel, seconds: number) {
  const base = knownKieCost[model.id] ?? (model.kind === "image" ? 20 : 100);
  const kie = model.kind === "video" ? base * Math.max(1, seconds / 5) : base;
  return Math.ceil(kie * KIE_TO_TECHNOVA);
}
