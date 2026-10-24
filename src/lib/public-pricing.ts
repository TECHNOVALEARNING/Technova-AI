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
export const packCopy: Record<string, { fr: Copy; en: Copy; es: Copy; pt: Copy }> = {
  starter: {
    fr: { tagline: "Pour découvrir l'IA sans engagement", perks: [{ icon: faComments, text: "Chat avec GPT, Claude, Gemini, DeepSeek et plus" }, { icon: faBrain, text: "TechNova Smart choisit le modèle adapté le moins cher" }, { icon: faPaperclip, text: "Analyse de fichiers : images, PDF, audio" }, { icon: faImage, text: "Génération d'images IA" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "To discover AI with no commitment", perks: [{ icon: faComments, text: "Chat with GPT, Claude, Gemini, DeepSeek and more" }, { icon: faBrain, text: "TechNova Smart picks the cheapest suitable model" }, { icon: faPaperclip, text: "File analysis: images, PDF, audio" }, { icon: faImage, text: "AI image generation" }, { icon: faInfinity, text: "Credits that never expire" }] },
    es: { tagline: "Para descubrir la IA sin compromiso", perks: [{ icon: faComments, text: "Chat con GPT, Claude, Gemini, DeepSeek y más" }, { icon: faBrain, text: "TechNova Smart elige el modelo adecuado más económico" }, { icon: faPaperclip, text: "Análisis de archivos: imágenes, PDF, audio" }, { icon: faImage, text: "Generación de imágenes con IA" }, { icon: faInfinity, text: "Créditos sin fecha de caducidad" }] },
    pt: { tagline: "Para descobrir a IA sem compromisso", perks: [{ icon: faComments, text: "Chat com GPT, Claude, Gemini, DeepSeek e mais" }, { icon: faBrain, text: "O TechNova Smart escolhe o modelo adequado mais barato" }, { icon: faPaperclip, text: "Análise de arquivos: imagens, PDF, áudio" }, { icon: faImage, text: "Geração de imagens com IA" }, { icon: faInfinity, text: "Créditos sem data de expiração" }] },
  },
  essential: {
    fr: { tagline: "Pour étudiants et usage quotidien", perks: [{ icon: faComments, text: "Tous les modèles de chat activés" }, { icon: faImage, text: "Génération d'images IA" }, { icon: faWandMagicSparkles, text: "TechNova Studio : un site complet à partir d'une idée" }, { icon: faShareNodes, text: "Partage de conversations par lien" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "For students and everyday use", perks: [{ icon: faComments, text: "Every enabled chat model" }, { icon: faImage, text: "AI image generation" }, { icon: faWandMagicSparkles, text: "TechNova Studio: a full website from one idea" }, { icon: faShareNodes, text: "Share conversations by link" }, { icon: faInfinity, text: "Credits that never expire" }] },
    es: { tagline: "Para estudiantes y uso diario", perks: [{ icon: faComments, text: "Todos los modelos de chat activados" }, { icon: faImage, text: "Generación de imágenes con IA" }, { icon: faWandMagicSparkles, text: "TechNova Studio: un sitio completo a partir de una idea" }, { icon: faShareNodes, text: "Compartir conversaciones por enlace" }, { icon: faInfinity, text: "Créditos sin fecha de caducidad" }] },
    pt: { tagline: "Para estudantes e uso diário", perks: [{ icon: faComments, text: "Todos os modelos de chat ativados" }, { icon: faImage, text: "Geração de imagens com IA" }, { icon: faWandMagicSparkles, text: "TechNova Studio: um site completo a partir de uma ideia" }, { icon: faShareNodes, text: "Compartilhamento de conversas por link" }, { icon: faInfinity, text: "Créditos sem data de expiração" }] },
  },
  creator: {
    fr: { tagline: "Pour créateurs de contenu et freelances", perks: [{ icon: faFilm, text: "Images et vidéos IA" }, { icon: faWandMagicSparkles, text: "Sites générés avec TechNova Studio" }, { icon: faGlobe, text: "Publication de vos sites en un clic" }, { icon: faRobot, text: "Agents IA personnalisés (recherche web, lecture de pages)" }, { icon: faInfinity, text: "Crédits sans date d'expiration" }] },
    en: { tagline: "For content creators and freelancers", perks: [{ icon: faFilm, text: "AI images and videos" }, { icon: faWandMagicSparkles, text: "Websites built with TechNova Studio" }, { icon: faGlobe, text: "One-click site publishing" }, { icon: faRobot, text: "Custom AI agents (web search, page reading)" }, { icon: faInfinity, text: "Credits that never expire" }] },
    es: { tagline: "Para creadores de contenido y freelancers", perks: [{ icon: faFilm, text: "Imágenes y vídeos con IA" }, { icon: faWandMagicSparkles, text: "Sitios generados con TechNova Studio" }, { icon: faGlobe, text: "Publicación de tus sitios en un clic" }, { icon: faRobot, text: "Agentes de IA personalizados (búsqueda web, lectura de páginas)" }, { icon: faInfinity, text: "Créditos sin fecha de caducidad" }] },
    pt: { tagline: "Para criadores de conteúdo e freelancers", perks: [{ icon: faFilm, text: "Imagens e vídeos com IA" }, { icon: faWandMagicSparkles, text: "Sites gerados com o TechNova Studio" }, { icon: faGlobe, text: "Publicação dos seus sites em um clique" }, { icon: faRobot, text: "Agentes de IA personalizados (pesquisa na web, leitura de páginas)" }, { icon: faInfinity, text: "Créditos sem data de expiração" }] },
  },
  pro: {
    fr: { tagline: "Pour développeurs, agences et équipes", perks: [{ icon: faRocket, text: "Le plus grand volume de crédits" }, { icon: faCode, text: "Clés API : tous les modèles via une seule API" }, { icon: faGithub, text: "Envoi des sites générés vers GitHub" }, { icon: faDatabase, text: "Connexion à votre propre Supabase" }, { icon: faRobot, text: "Agents IA avec budget maîtrisé par réponse" }, { icon: faChartLine, text: "Suivi détaillé de la consommation" }] },
    en: { tagline: "For developers, agencies and teams", perks: [{ icon: faRocket, text: "The largest credit volume" }, { icon: faCode, text: "API keys: every model through one API" }, { icon: faGithub, text: "Push generated sites to GitHub" }, { icon: faDatabase, text: "Connect your own Supabase" }, { icon: faRobot, text: "AI agents with a per-reply budget" }, { icon: faChartLine, text: "Detailed usage tracking" }] },
    es: { tagline: "Para desarrolladores, agencias y equipos", perks: [{ icon: faRocket, text: "El mayor volumen de créditos" }, { icon: faCode, text: "Claves API: todos los modelos con una sola API" }, { icon: faGithub, text: "Envío de los sitios generados a GitHub" }, { icon: faDatabase, text: "Conexión a tu propio Supabase" }, { icon: faRobot, text: "Agentes de IA con presupuesto controlado por respuesta" }, { icon: faChartLine, text: "Seguimiento detallado del consumo" }] },
    pt: { tagline: "Para desenvolvedores, agências e equipes", perks: [{ icon: faRocket, text: "O maior volume de créditos" }, { icon: faCode, text: "Chaves de API: todos os modelos por uma única API" }, { icon: faGithub, text: "Envio dos sites gerados para o GitHub" }, { icon: faDatabase, text: "Conexão ao seu próprio Supabase" }, { icon: faRobot, text: "Agentes de IA com orçamento controlado por resposta" }, { icon: faChartLine, text: "Acompanhamento detalhado do consumo" }] },
  },
};
