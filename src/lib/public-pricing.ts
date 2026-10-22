// Fallback shown before the live packs load; the database (credit_packs) is the source of truth.
export const fallbackPacks = [
  { slug: "starter", name: "Starter", price_xof: 999, credits: 1000, featured: false },
  { slug: "essential", name: "Essential", price_xof: 2499, credits: 2600, featured: false },
  { slug: "creator", name: "Creator", price_xof: 4999, credits: 5500, featured: false },
  { slug: "pro", name: "Pro", price_xof: 7699, credits: 8500, featured: true },
];
export type PublicPack = (typeof fallbackPacks)[number];
export const PENDING_PACK_KEY = "tn-pending-pack";

type Copy = { tagline: string; perks: string[] };

/** Card copy per pack. Every feature is open to every pack; packs differ by credit volume. */
export const packCopy: Record<string, { fr: Copy; en: Copy }> = {
  starter: {
    fr: { tagline: "Pour découvrir l'IA sans engagement", perks: ["💬 Chat avec GPT, Claude, Gemini, DeepSeek et plus", "🧠 TechNova Smart choisit le modèle adapté le moins cher", "📎 Analyse de fichiers : images, PDF, audio", "🎨 Génération d'images IA", "♾️ Crédits sans date d'expiration"] },
    en: { tagline: "To discover AI with no commitment", perks: ["💬 Chat with GPT, Claude, Gemini, DeepSeek and more", "🧠 TechNova Smart picks the cheapest suitable model", "📎 File analysis: images, PDF, audio", "🎨 AI image generation", "♾️ Credits that never expire"] },
  },
  essential: {
    fr: { tagline: "Pour étudiants et usage quotidien", perks: ["💬 Tous les modèles de chat activés", "🎨 Génération d'images IA", "🛠️ TechNova Studio : un site complet à partir d'une idée", "🔗 Partage de conversations par lien", "♾️ Crédits sans date d'expiration"] },
    en: { tagline: "For students and everyday use", perks: ["💬 Every enabled chat model", "🎨 AI image generation", "🛠️ TechNova Studio: a full website from one idea", "🔗 Share conversations by link", "♾️ Credits that never expire"] },
  },
  creator: {
    fr: { tagline: "Pour créateurs de contenu et freelances", perks: ["🎬 Images et vidéos IA", "🛠️ Sites générés avec TechNova Studio", "🌐 Publication de vos sites en un clic", "🤖 Agents IA personnalisés (recherche web, lecture de pages)", "♾️ Crédits sans date d'expiration"] },
    en: { tagline: "For content creators and freelancers", perks: ["🎬 AI images and videos", "🛠️ Websites built with TechNova Studio", "🌐 One-click site publishing", "🤖 Custom AI agents (web search, page reading)", "♾️ Credits that never expire"] },
  },
  pro: {
    fr: { tagline: "Pour développeurs, agences et équipes", perks: ["🚀 Le plus grand volume de crédits", "🔌 Clés API : tous les modèles via une seule API", "🐙 Envoi des sites générés vers GitHub", "🗄️ Connexion à votre propre Supabase", "🤖 Agents IA avec budget maîtrisé par réponse", "📊 Suivi détaillé de la consommation"] },
    en: { tagline: "For developers, agencies and teams", perks: ["🚀 The largest credit volume", "🔌 API keys: every model through one API", "🐙 Push generated sites to GitHub", "🗄️ Connect your own Supabase", "🤖 AI agents with a per-reply budget", "📊 Detailed usage tracking"] },
  },
};
