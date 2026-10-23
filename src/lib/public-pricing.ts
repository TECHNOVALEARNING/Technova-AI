import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBrain, faChartLine, faCode, faComments, faDatabase, faFilm, faGlobe, faImage, faInfinity, faPaperclip, faRobot, faRocket, faShareNodes, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

// Fallback shown before the live packs load; the database (credit_packs) is the source of truth.
export const fallbackPacks = [
  { slug: "starter", name: "Starter", price_xof: 999, credits: 1000, featured: false },
  { slug: "essential", name: "Essential", price_xof: 2499, credits: 2600, featured: false },
  { slug: "creator", name: "Creator", price_xof: 4999, credits: 5500, featured: false },
  { slug: "pro", name: "Pro", price_xof: 7699, credits: 8500, featured: true },
];
export type PublicPack = (typeof fallbackPacks)[number];
export const PENDING_PACK_KEY = "tn-pending-pack";

type Copy = { tagline: string; perks: { icon: IconDefinition; text: string }[] };

/** Card copy per pack. Websites need Essential+, videos need Creator+ (enforced server-side). */
export const packCopy: Record<string, { fr: Copy; en: Copy }> = {
  starter: {
    fr: { tagline: "Pour découvrir l'IA sans engagement", perks: [{ icon: faComments, text: "Chat avec GPT, Claude, Gemini, DeepSeek et plus" }, { icon: faBrain, text: "TechNova Smart choisit le modèle adapté le moins cher" }, { icon: faPaperclip, text: "Analyse de fichiers : images, PDF, audio" }, { icon: faImage, text: "Génération d'images IA" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "To discover AI with no commitment", perks: [{ icon: faComments, text: "Chat with GPT, Claude, Gemini, DeepSeek and more" }, { icon: faBrain, text: "TechNova Smart picks the cheapest suitable model" }, { icon: faPaperclip, text: "File analysis: images, PDF, audio" }, { icon: faImage, text: "AI image generation" }, { icon: faInfinity, text: "Credits that never expire" }] },
  },
  essential: {
    fr: { tagline: "Pour étudiants et usage quotidien", perks: [{ icon: faComments, text: "Tous les modèles de chat activés" }, { icon: faImage, text: "Génération d'images IA" }, { icon: faWandMagicSparkles, text: "TechNova Studio : un site complet à partir d'une idée" }, { icon: faShareNodes, text: "Partage de conversations par lien" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "For students and everyday use", perks: [{ icon: faComments, text: "Every enabled chat model" }, { icon: faImage, text: "AI image generation" }, { icon: faWandMagicSparkles, text: "TechNova Studio: a full website from one idea" }, { icon: faShareNodes, text: "Share conversations by link" }, { icon: faInfinity, text: "Credits that never expire" }] },
  },
  creator: {
    fr: { tagline: "Pour créateurs de contenu et freelances", perks: [{ icon: faFilm, text: "Images et vidéos IA" }, { icon: faWandMagicSparkles, text: "Sites générés avec TechNova Studio" }, { icon: faGlobe, text: "Publication de vos sites en un clic" }, { icon: faRobot, text: "Agents IA personnalisés (recherche web, lecture de pages)" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "For content creators and freelancers", perks: [{ icon: faFilm, text: "AI images and videos" }, { icon: faWandMagicSparkles, text: "Websites built with TechNova Studio" }, { icon: faGlobe, text: "One-click site publishing" }, { icon: faRobot, text: "Custom AI agents (web search, page reading)" }, { icon: faInfinity, text: "Credits that never expire" }] },
  },
  pro: {
    fr: { tagline: "Pour développeurs, agences et équipes", perks: [{ icon: faRocket, text: "Le plus grand volume de crédits" }, { icon: faCode, text: "Clés API : tous les modèles via une seule API" }, { icon: faGithub, text: "Envoi des sites générés vers GitHub" }, { icon: faDatabase, text: "Connexion à votre propre Supabase" }, { icon: faRobot, text: "Agents IA avec budget maîtrisé par réponse" }, { icon: faChartLine, text: "Suivi détaillé de la consommation" }] },
    en: { tagline: "For developers, agencies and teams", perks: [{ icon: faRocket, text: "The largest credit volume" }, { icon: faCode, text: "API keys: every model through one API" }, { icon: faGithub, text: "Push generated sites to GitHub" }, { icon: faDatabase, text: "Connect your own Supabase" }, { icon: faRobot, text: "AI agents with a per-reply budget" }, { icon: faChartLine, text: "Detailed usage tracking" }] },
  },
};
