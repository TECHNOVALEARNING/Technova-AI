// Fallback shown before the live packs load; the database (credit_packs) is the source of truth.
export const fallbackPacks = [
  { slug: "starter", name: "Starter", price_xof: 999, credits: 1000, featured: false },
  { slug: "essential", name: "Essential", price_xof: 2499, credits: 2600, featured: false },
  { slug: "creator", name: "Creator", price_xof: 4999, credits: 5500, featured: false },
  { slug: "pro", name: "Pro", price_xof: 7699, credits: 8500, featured: true },
  { slug: "expert", name: "Expert", price_xof: 14000, credits: 16000, featured: false },
  { slug: "business", name: "Business", price_xof: 19999, credits: 24000, featured: false },
];
export type PublicPack = (typeof fallbackPacks)[number];
export type AccessLevel = "included" | "limited" | "unavailable";
export type PlanFeature = { key: string; label_fr: string; label_en: string; access: string[]; status: string };
export type Estimate = { category: string; model: string; unit: string; cost: number };
export const PENDING_PACK_KEY = "tn-pending-pack";

export const estimateCategories = ["chat", "code", "image_standard", "image_premium", "video_standard", "video_pro"] as const;

/** Alternative-use estimate for one balance, rounded down. Videos are priced per 5 s slice. */
export function estimateFor(credits: number, e: Estimate | undefined) {
  if (!e || e.cost <= 0) return null;
  const units = Math.floor(credits / e.cost);
  return e.category.startsWith("video") ? units * 5 : units;
}
