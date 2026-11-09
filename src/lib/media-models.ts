// kie.ai text-to-image / text-to-video / music catalogue (Market jobs API), from docs.kie.ai.
// Client-safe: no secrets. The server builds the request input from these specs.

export type MediaRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type MediaKind = "image" | "video" | "music";
type SizeStyle = "aspect_ratio" | "image_size_named" | "image_size_ratio" | "none";
type DurationStyle = "string" | "integer" | "none";

export type MediaModel = {
  id: string;
  label: string;
  provider: string;
  kind: MediaKind;
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

// Every engine kie.ai offers (kept for reference); the chat only sells the five fixed-price choices below.
const kieEngines: MediaModel[] = [
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

  // Suno via kie.ai (docs.kie.ai/suno-api/generate-music): kie.ai returns two takes per request; only the first is kept.
  { id: "ai-music-api/generate", label: "Suno V6", provider: "Suno", kind: "music", size: "none", ratios: [] },
];

/** The media choices sold in TechNova, at a fixed price (docs/prompt-v6.3.md §3). Engines are never shown. */
export type MediaTier = "image_rapide" | "image_hd" | "video_fast" | "video_quality" | "musique";
export const mediaTiers: Record<MediaTier, { engine: string; credits: number; fr: string; en: string }> = {
  image_rapide: { engine: "seedream/5-flash-text-to-image", credits: 35, fr: "Image rapide", en: "Quick image" },
  image_hd: { engine: "nano-banana-2", credits: 50, fr: "Image HD", en: "HD image" },
  video_fast: { engine: "bytedance/seedance-2-fast", credits: 350, fr: "Vidéo rapide", en: "Quick video" },
  video_quality: { engine: "kling-3.0-omni/text-to-video", credits: 1800, fr: "Vidéo qualité", en: "Quality video" },
  musique: { engine: "ai-music-api/generate", credits: 130, fr: "Musique", en: "Music" },
};
/** Videos are 5-second clips at their fixed price. */
export const MEDIA_VIDEO_SECONDS = 5;

export const mediaModels: MediaModel[] = (Object.keys(mediaTiers) as MediaTier[]).map((tier) => {
  const engine = kieEngines.find((m) => m.id === mediaTiers[tier].engine)!;
  return { ...engine, label: mediaTiers[tier].fr, provider: "TechNova", cheap: tier === "image_rapide" || tier === "video_fast" };
});

/** Edits an existing image ("Modifier" on a generated image), priced like a quick image. */
export const imageEditModel: MediaModel = { id: "google/nano-banana-edit", label: "Retouche d’image", provider: "TechNova", kind: "image", size: "aspect_ratio", ratios: all5 };
const IMAGE_EDIT_CREDITS = 35;

/** Name shown for a generation: its choice, or a plain kind for creations made before the fixed prices. */
export function mediaLabel(modelId: string, kind: string): string {
  const found = mediaModels.find((m) => m.id === modelId) ?? (modelId === imageEditModel.id ? imageEditModel : undefined);
  if (found) return found.label;
  return kind === "video" ? "Vidéo" : kind === "music" ? "Musique" : "Image";
}

export const defaultImageModel = mediaTiers.image_rapide.engine;
export const defaultVideoModel = mediaTiers.video_fast.engine;
export const qualityImageModel = mediaTiers.image_hd.engine;
export const qualityVideoModel = mediaTiers.video_quality.engine;
export const defaultMusicModel = "ai-music-api/generate";
export const findMediaModel = (id: string) => mediaModels.find((m) => m.id === id) ?? (id === imageEditModel.id ? imageEditModel : undefined);

const named: Record<MediaRatio, string> = {
  "1:1": "square_hd", "16:9": "landscape_16_9", "9:16": "portrait_16_9", "4:3": "landscape_4_3", "3:4": "portrait_4_3",
};

export function buildMediaInput(model: MediaModel, prompt: string, ratio: MediaRatio, seconds: number) {
  if (model.kind === "music") {
    // Simple mode: the description drives the song; kie.ai requires a style (or lyrics) alongside it.
    const instrumental = /\b(instrumental|sans paroles|sans voix|no vocals|without vocals)\b/i.test(prompt);
    return { input: { custom_mode: false, instrumental, model: "V6", prompt: prompt.slice(0, 3000), style: prompt.slice(0, 200) }, ratio: "auto", duration: null };
  }
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

/** Credits charged for one creation: the fixed price of its choice (a failed creation is refunded). */
export function mediaReserve(model: MediaModel, _seconds?: number): number {
  if (model.id === imageEditModel.id) return IMAGE_EDIT_CREDITS;
  const tier = (Object.keys(mediaTiers) as MediaTier[]).find((t) => mediaTiers[t].engine === model.id);
  if (!tier) throw new Error("Choix de création indisponible.");
  return mediaTiers[tier].credits;
}
