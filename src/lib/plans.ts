// Plan limits shared by browser and server (the /tarifs comparison table, minus the development section).
// A plan is the highest pack an account has bought; the server always re-checks (src/lib/plan.server.ts).

export type Tier = 0 | 1 | 2 | 3; // 0 Starter (or no purchase), 1 Essential, 2 Creator, 3 Pro
export const PLAN_UPGRADE = "PLAN_UPGRADE_REQUIRED";

export type PlanFeature =
  | "premium_models" | "image_quota" | "video" | "site" | "site_limit" | "share" | "publish"
  | "agents" | "agent_budget" | "api" | "github" | "supabase" | "usage_details";

export const featureMinTier: Record<PlanFeature, Tier> = {
  premium_models: 1, image_quota: 1, video: 2, site: 1, site_limit: 2, share: 1, publish: 2,
  agents: 2, agent_budget: 3, api: 3, github: 3, supabase: 3, usage_details: 3,
};

/** Chat models outside the Starter plan ("Partiel"): the most expensive ones. */
export const PREMIUM_CHAT_MODELS = new Set(["GPT-4o", "Claude Sonnet 5", "Gemini 2.5 Pro", "Mistral Large", "Hermes 3 405B", "DeepSeek R1"]);
/** TechNova Smart stays available on Starter: premium picks fall back to the closest included model. */
export const STARTER_SMART_FALLBACK: Record<string, string> = { "Gemini 2.5 Pro": "Gemini 2.5 Flash", "Claude Sonnet 5": "Claude Haiku 4.5", "GPT-4o": "GPT-4o Mini" };
/** Starter image quota ("Quota" in the table): images per rolling 24 hours. */
export const STARTER_DAILY_IMAGES = 10;
/** Essential builds one Studio website ("1 site"); Creator and Pro are unlimited. */
export const ESSENTIAL_STUDIO_SITES = 1;
/** Agent budget used when the plan cannot choose it. */
export const DEFAULT_AGENT_BUDGET = 20;

export const upgradeError = (feature: PlanFeature) => `${PLAN_UPGRADE}:${feature}`;
export function upgradeFeatureOf(message: string): PlanFeature | null {
  const m = new RegExp(`${PLAN_UPGRADE}:([a-z_]+)`).exec(message);
  return m && m[1]! in featureMinTier ? (m[1] as PlanFeature) : null;
}

export const packNames = ["Starter", "Essential", "Creator", "Pro"] as const;
export const packSlugs = ["starter", "essential", "creator", "pro"] as const;

export const featureText: Record<PlanFeature, { fr: string; en: string }> = {
  premium_models: { fr: "Ce modèle fait partie des modèles premium (GPT-4o, Claude Sonnet 5, Gemini 2.5 Pro…)", en: "This is a premium model (GPT-4o, Claude Sonnet 5, Gemini 2.5 Pro…)" },
  image_quota: { fr: `Le forfait Starter inclut ${STARTER_DAILY_IMAGES} images par 24 heures`, en: `The Starter plan includes ${STARTER_DAILY_IMAGES} images per 24 hours` },
  video: { fr: "La génération vidéo", en: "Video generation" },
  site: { fr: "La création de sites web avec TechNova Studio", en: "Website creation with TechNova Studio" },
  site_limit: { fr: "Le forfait Essential inclut 1 site TechNova Studio ; des sites illimités", en: "The Essential plan includes 1 TechNova Studio site; unlimited sites" },
  share: { fr: "Le partage de conversations par lien", en: "Sharing conversations by link" },
  publish: { fr: "La publication de sites en 1 clic", en: "One-click website publishing" },
  agents: { fr: "Les agents IA personnalisés", en: "Custom AI agents" },
  agent_budget: { fr: "Le réglage du budget par réponse des agents", en: "Setting the per-reply budget of agents" },
  api: { fr: "Les clés API", en: "API keys" },
  github: { fr: "L'envoi vers GitHub", en: "Pushing to GitHub" },
  supabase: { fr: "La connexion à votre propre Supabase", en: "Connecting your own Supabase" },
  usage_details: { fr: "Le suivi détaillé de la consommation", en: "Detailed usage tracking" },
};

/** "…est réservé(e) aux forfaits X et Y." for the upgrade card. */
export function upgradeSentence(feature: PlanFeature, fr: boolean) {
  const min = featureMinTier[feature];
  const names = packNames.slice(min).join(fr ? ", " : ", ").replace(/, ([^,]+)$/, fr ? " et $1" : " and $1");
  const what = featureText[feature][fr ? "fr" : "en"];
  if (feature === "image_quota") return fr ? `${what}. Passez à ${names} pour des images sans quota.` : `${what}. Upgrade to ${names} for unlimited images.`;
  if (feature === "site_limit") return fr ? `${what} sont inclus avec ${names}.` : `${what} come with ${names}.`;
  if (feature === "premium_models") return fr ? `${what}, inclus à partir du forfait Essential.` : `${what}, included from the Essential plan.`;
  return fr ? `${what} est réservé(e) aux forfaits ${names}.` : `${what} is reserved for the ${names} plans.`;
}
