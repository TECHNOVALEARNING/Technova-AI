import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBrain, faChartLine, faCode, faComments, faDatabase, faFilm, faGlobe, faImage, faInfinity, faLayerGroup, faPaperclip, faRobot, faRocket, faShareNodes, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
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
/** Where a sign-in lands: AI Chat, or Credits when a pack was chosen before signing in (to finish the purchase). */
export function afterSignInPath(): "/dashboard/chat" | "/dashboard/credits" {
  try { if (localStorage.getItem(PENDING_PACK_KEY)) return "/dashboard/credits"; } catch { /* storage blocked */ }
  return "/dashboard/chat";
}

/** `lead`: the first line of a higher pack ("Everything in X, plus:"), followed only by what it adds. */
type Copy = { tagline: string; perks: { icon: IconDefinition; text: string; lead?: boolean }[] };

/** Card copy per pack. Websites need Essential+, videos need Creator+ (enforced server-side). */
export const packCopy: Record<string, { fr: Copy; en: Copy; es: Copy; pt: Copy }> = {
  starter: {
    fr: { tagline: "Pour découvrir l'IA sans engagement", perks: [{ icon: faComments, text: "Chat avec GPT, Claude, Gemini, DeepSeek et plus" }, { icon: faBrain, text: "TechNova Smart choisit le modèle adapté le moins cher" }, { icon: faPaperclip, text: "Analyse de fichiers : images, PDF, audio" }, { icon: faImage, text: "Génération d'images IA" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "To discover AI with no commitment", perks: [{ icon: faComments, text: "Chat with GPT, Claude, Gemini, DeepSeek and more" }, { icon: faBrain, text: "TechNova Smart picks the cheapest suitable model" }, { icon: faPaperclip, text: "File analysis: images, PDF, audio" }, { icon: faImage, text: "AI image generation" }, { icon: faInfinity, text: "Credits that never expire" }] },
    es: { tagline: "Para descubrir la IA sin compromiso", perks: [{ icon: faComments, text: "Chat con GPT, Claude, Gemini, DeepSeek y más" }, { icon: faBrain, text: "TechNova Smart elige el modelo adecuado más económico" }, { icon: faPaperclip, text: "Análisis de archivos: imágenes, PDF, audio" }, { icon: faImage, text: "Generación de imágenes con IA" }, { icon: faInfinity, text: "Créditos sin fecha de caducidad" }] },
    pt: { tagline: "Para descobrir a IA sem compromisso", perks: [{ icon: faComments, text: "Chat com GPT, Claude, Gemini, DeepSeek e mais" }, { icon: faBrain, text: "O TechNova Smart escolhe o modelo adequado mais barato" }, { icon: faPaperclip, text: "Análise de arquivos: imagens, PDF, áudio" }, { icon: faImage, text: "Geração de imagens com IA" }, { icon: faInfinity, text: "Créditos sem data de expiração" }] },
  },
  essential: {
    fr: { tagline: "Pour étudiants et usage quotidien", perks: [{ icon: faLayerGroup, text: "Tout de Starter, plus :", lead: true }, { icon: faComments, text: "Tous les modèles de chat activés" }, { icon: faWandMagicSparkles, text: "TechNova Studio : un site complet à partir d'une idée" }, { icon: faShareNodes, text: "Partage de conversations par lien" }] },
    en: { tagline: "For students and everyday use", perks: [{ icon: faLayerGroup, text: "Everything in Starter, plus:", lead: true }, { icon: faComments, text: "Every enabled chat model" }, { icon: faWandMagicSparkles, text: "TechNova Studio: a full website from one idea" }, { icon: faShareNodes, text: "Share conversations by link" }] },
    es: { tagline: "Para estudiantes y uso diario", perks: [{ icon: faLayerGroup, text: "Todo lo de Starter, más:", lead: true }, { icon: faComments, text: "Todos los modelos de chat activados" }, { icon: faWandMagicSparkles, text: "TechNova Studio: un sitio completo a partir de una idea" }, { icon: faShareNodes, text: "Compartir conversaciones por enlace" }] },
    pt: { tagline: "Para estudantes e uso diário", perks: [{ icon: faLayerGroup, text: "Tudo do Starter, mais:", lead: true }, { icon: faComments, text: "Todos os modelos de chat ativados" }, { icon: faWandMagicSparkles, text: "TechNova Studio: um site completo a partir de uma ideia" }, { icon: faShareNodes, text: "Compartilhamento de conversas por link" }] },
  },
  creator: {
    fr: { tagline: "Pour créateurs de contenu et freelances", perks: [{ icon: faLayerGroup, text: "Tout d'Essential, plus :", lead: true }, { icon: faBrain, text: "Choix des modèles phares dans le chat (GPT, Claude, Gemini…)" }, { icon: faFilm, text: "Génération de vidéos IA" }, { icon: faWandMagicSparkles, text: "Sites TechNova Studio illimités" }, { icon: faGlobe, text: "Publication de vos sites en un clic" }, { icon: faRobot, text: "Agents IA personnalisés (recherche web, lecture de pages)" }] },
    en: { tagline: "For content creators and freelancers", perks: [{ icon: faLayerGroup, text: "Everything in Essential, plus:", lead: true }, { icon: faBrain, text: "Pick flagship models in the chat (GPT, Claude, Gemini…)" }, { icon: faFilm, text: "AI video generation" }, { icon: faWandMagicSparkles, text: "Unlimited TechNova Studio sites" }, { icon: faGlobe, text: "One-click site publishing" }, { icon: faRobot, text: "Custom AI agents (web search, page reading)" }] },
    es: { tagline: "Para creadores de contenido y freelancers", perks: [{ icon: faLayerGroup, text: "Todo lo de Essential, más:", lead: true }, { icon: faBrain, text: "Elección de modelos insignia en el chat (GPT, Claude, Gemini…)" }, { icon: faFilm, text: "Generación de vídeos con IA" }, { icon: faWandMagicSparkles, text: "Sitios de TechNova Studio ilimitados" }, { icon: faGlobe, text: "Publicación de tus sitios en un clic" }, { icon: faRobot, text: "Agentes de IA personalizados (búsqueda web, lectura de páginas)" }] },
    pt: { tagline: "Para criadores de conteúdo e freelancers", perks: [{ icon: faLayerGroup, text: "Tudo do Essential, mais:", lead: true }, { icon: faBrain, text: "Escolha de modelos de ponta no chat (GPT, Claude, Gemini…)" }, { icon: faFilm, text: "Geração de vídeos com IA" }, { icon: faWandMagicSparkles, text: "Sites do TechNova Studio ilimitados" }, { icon: faGlobe, text: "Publicação dos seus sites em um clique" }, { icon: faRobot, text: "Agentes de IA personalizados (pesquisa na web, leitura de páginas)" }] },
  },
  pro: {
    fr: { tagline: "Pour développeurs, agences et équipes", perks: [{ icon: faLayerGroup, text: "Tout de Creator, plus :", lead: true }, { icon: faCode, text: "Clés API : tous les modèles via une seule API" }, { icon: faGithub, text: "Envoi des sites générés vers GitHub" }, { icon: faDatabase, text: "Connexion à votre propre Supabase" }, { icon: faRobot, text: "Agents IA avec budget maîtrisé par réponse" }, { icon: faChartLine, text: "Suivi détaillé de la consommation" }] },
    en: { tagline: "For developers, agencies and teams", perks: [{ icon: faLayerGroup, text: "Everything in Creator, plus:", lead: true }, { icon: faCode, text: "API keys: every model through one API" }, { icon: faGithub, text: "Push generated sites to GitHub" }, { icon: faDatabase, text: "Connect your own Supabase" }, { icon: faRobot, text: "AI agents with a per-reply budget" }, { icon: faChartLine, text: "Detailed usage tracking" }] },
    es: { tagline: "Para desarrolladores, agencias y equipos", perks: [{ icon: faLayerGroup, text: "Todo lo de Creator, más:", lead: true }, { icon: faCode, text: "Claves API: todos los modelos con una sola API" }, { icon: faGithub, text: "Envío de los sitios generados a GitHub" }, { icon: faDatabase, text: "Conexión a tu propio Supabase" }, { icon: faRobot, text: "Agentes de IA con presupuesto controlado por respuesta" }, { icon: faChartLine, text: "Seguimiento detallado del consumo" }] },
    pt: { tagline: "Para desenvolvedores, agências e equipes", perks: [{ icon: faLayerGroup, text: "Tudo do Creator, mais:", lead: true }, { icon: faCode, text: "Chaves de API: todos os modelos por uma única API" }, { icon: faGithub, text: "Envio dos sites gerados para o GitHub" }, { icon: faDatabase, text: "Conexão ao seu próprio Supabase" }, { icon: faRobot, text: "Agentes de IA com orçamento controlado por resposta" }, { icon: faChartLine, text: "Acompanhamento detalhado do consumo" }] },
  },
};
