import type { SiteLang } from "@/lib/i18n";

// Search titles and descriptions of the main public pages in the four site languages. French is served at the
// plain URL, the others at ?lang=en|es|pt (rendered in that language on the server, so search engines index each
// version); pageHead adds the hreflang alternates and the matching og:locale.
type Seo = { title: string; description: string; ogTitle?: string; ogDescription?: string };
export type SeoPath = "/" | "/tarifs" | "/modeles" | "/documentation" | "/a-propos" | "/blog" | "/inscription" | "/connexion";

export const seoText: Record<SeoPath, Record<SiteLang, Seo>> = {
  "/": {
    fr: { title: "TechNova AI Hub — GPT, Claude, Gemini et plus en un seul hub IA", description: "Discutez, codez, créez images, vidéos et musique avec GPT, Claude, Gemini et les meilleurs modèles d'IA. Sans abonnement obligatoire, crédits sans expiration, paiement Mobile Money.", ogTitle: "TechNova AI Hub | Toutes les meilleures IA, un seul hub", ogDescription: "Les meilleurs modèles d'IA, une seule API, crédits sans expiration, paiement en FCFA par Mobile Money ou carte." },
    en: { title: "TechNova AI Hub — GPT, Claude, Gemini and more in one AI hub", description: "Chat, code, create images, videos and music with GPT, Claude, Gemini and the best AI models. No subscription required, credits that never expire, pay by Mobile Money or card.", ogTitle: "TechNova AI Hub | All the best AI, one single hub", ogDescription: "The best AI models, one API, credits that never expire, pay in FCFA by Mobile Money or card." },
    es: { title: "TechNova AI Hub — GPT, Claude, Gemini y más en un solo hub de IA", description: "Converse, programe y cree imágenes, vídeos y música con GPT, Claude, Gemini y los mejores modelos de IA. Sin suscripción obligatoria, créditos sin caducidad.", ogTitle: "TechNova AI Hub | Todas las mejores IA, un solo hub", ogDescription: "Los mejores modelos de IA, una sola API, créditos sin caducidad, pago con Mobile Money o tarjeta." },
    pt: { title: "TechNova AI Hub — GPT, Claude, Gemini e mais num único hub de IA", description: "Converse, programe e crie imagens, vídeos e música com GPT, Claude, Gemini e os melhores modelos de IA. Sem assinatura obrigatória, créditos sem expiração.", ogTitle: "TechNova AI Hub | Todas as melhores IAs, um único hub", ogDescription: "Os melhores modelos de IA, uma só API, créditos sem expiração, pagamento por Mobile Money ou cartão." },
  },
  "/tarifs": {
    fr: { title: "Tarifs et crédits Technova — TechNova AI Hub", description: "Quatre packs de crédits TechNova, de 999 à 9 000 FCFA : Starter, Essential, Creator et Pro. Sans abonnement obligatoire, crédits sans expiration, paiement Mobile Money ou carte.", ogDescription: "Quatre packs de crédits TechNova prépayés, sans abonnement obligatoire." },
    en: { title: "Pricing and Technova credits — TechNova AI Hub", description: "Four TechNova credit packs from 999 to 9,000 FCFA: Starter, Essential, Creator and Pro, plus monthly and team plans. No subscription required, pay by Mobile Money or card.", ogDescription: "Four prepaid TechNova credit packs, no subscription required." },
    es: { title: "Precios y créditos Technova — TechNova AI Hub", description: "Cuatro packs de créditos TechNova de 999 a 9 000 FCFA: Starter, Essential, Creator y Pro. Sin suscripción obligatoria, pago con Mobile Money o tarjeta.", ogDescription: "Cuatro packs de créditos TechNova prepagados, sin suscripción obligatoria." },
    pt: { title: "Preços e créditos Technova — TechNova AI Hub", description: "Quatro pacotes de créditos TechNova de 999 a 9 000 FCFA: Starter, Essential, Creator e Pro. Sem assinatura obrigatória, pagamento por Mobile Money ou cartão.", ogDescription: "Quatro pacotes de créditos TechNova pré-pagos, sem assinatura obrigatória." },
  },
  "/modeles": {
    fr: { title: "Modèles IA disponibles et prix en crédits — TechNova AI Hub", description: "GPT, Claude, Gemini, Qwen et plus : les modèles d'IA de TechNova pour écrire, coder et analyser, avec images, vidéos et musique à prix fixe, en crédits Technova.", ogTitle: "Modèles IA disponibles — TechNova AI Hub", ogDescription: "Texte, code, images, vidéos et musique : les modèles disponibles sur TechNova et leur prix en crédits." },
    en: { title: "Available AI models and credit prices — TechNova AI Hub", description: "GPT, Claude, Gemini, Qwen and more: TechNova's AI models to write, code and analyse, with images, videos and music at a fixed price, in Technova credits.", ogTitle: "Available AI models — TechNova AI Hub", ogDescription: "Text, code, images, videos and music: the models available on TechNova and their price in credits." },
    es: { title: "Modelos de IA disponibles y precios en créditos — TechNova AI Hub", description: "GPT, Claude, Gemini, Qwen y más: los modelos de IA de TechNova para escribir, programar y analizar, con imágenes, vídeos y música a precio fijo.", ogTitle: "Modelos de IA disponibles — TechNova AI Hub" },
    pt: { title: "Modelos de IA disponíveis e preços em créditos — TechNova AI Hub", description: "GPT, Claude, Gemini, Qwen e mais: os modelos de IA da TechNova para escrever, programar e analisar, com imagens, vídeos e música a preço fixo.", ogTitle: "Modelos de IA disponíveis — TechNova AI Hub" },
  },
  "/documentation": {
    fr: { title: "Documentation & API — TechNova AI Hub", description: "Démarrage rapide, exemples JavaScript, Python, PHP et cURL, authentification, chat completions, modèles, crédits, codes d'erreur et limites de l'API TechNova.", ogDescription: "Une seule clé API pour les meilleurs modèles d'IA : tout pour l'intégrer à votre produit, de la première requête à la production." },
    en: { title: "Documentation & API — TechNova AI Hub", description: "Quick start, JavaScript, Python, PHP and cURL examples, authentication, chat completions, models, credits, error codes and limits of the TechNova API.", ogDescription: "One API key for the best AI models: everything to plug it into your product, from the first request to production." },
    es: { title: "Documentación y API — TechNova AI Hub", description: "Inicio rápido, ejemplos en JavaScript, Python, PHP y cURL, autenticación, chat completions, modelos, créditos, códigos de error y límites de la API de TechNova." },
    pt: { title: "Documentação e API — TechNova AI Hub", description: "Início rápido, exemplos em JavaScript, Python, PHP e cURL, autenticação, chat completions, modelos, créditos, códigos de erro e limites da API da TechNova." },
  },
  "/a-propos": {
    fr: { title: "À propos — TechNova AI Hub", description: "La vision, la mission et l'équipe de TechNova AI Hub : les meilleurs modèles d'IA réunis dans un seul espace pour apprendre, créer et développer.", ogDescription: "Ouvert au monde : la vision, la mission et l'équipe de TechNova AI Hub." },
    en: { title: "About — TechNova AI Hub", description: "The vision, mission and team of TechNova AI Hub: the best AI models in one place to learn, create and build.", ogDescription: "Open to the world: the vision, mission and team of TechNova AI Hub." },
    es: { title: "Acerca de — TechNova AI Hub", description: "La visión, la misión y el equipo de TechNova AI Hub: los mejores modelos de IA en un solo espacio para aprender, crear y desarrollar." },
    pt: { title: "Sobre — TechNova AI Hub", description: "A visão, a missão e a equipe da TechNova AI Hub: os melhores modelos de IA num só espaço para aprender, criar e desenvolver." },
  },
  "/blog": {
    fr: { title: "Blog IA — TechNova AI Hub", description: "Comparatifs de modèles, guides pratiques, cadre réglementaire et retours d'expérience sur l'IA, en français.", ogDescription: "Comprendre l'IA, puis l'utiliser : comparatifs, guides et réglementation." },
    en: { title: "AI blog — TechNova AI Hub", description: "Model comparisons, practical guides, regulation and field notes on AI (articles in French)." },
    es: { title: "Blog de IA — TechNova AI Hub", description: "Comparativas de modelos, guías prácticas, regulación y experiencias sobre la IA (artículos en francés)." },
    pt: { title: "Blog de IA — TechNova AI Hub", description: "Comparativos de modelos, guias práticos, regulamentação e experiências sobre IA (artigos em francês)." },
  },
  "/inscription": {
    fr: { title: "Inscription | TechNova AI Hub", description: "Créez votre compte TechNova AI Hub et utilisez les meilleurs modèles d'IA pour discuter, coder et créer, payés en crédits sans abonnement obligatoire.", ogDescription: "Créez votre compte TechNova AI Hub : les meilleurs modèles d'IA, payés en crédits sans abonnement obligatoire." },
    en: { title: "Sign up | TechNova AI Hub", description: "Create your TechNova AI Hub account and use the best AI models to chat, code and create, paid in credits with no subscription required." },
    es: { title: "Registro | TechNova AI Hub", description: "Cree su cuenta TechNova AI Hub y use los mejores modelos de IA para conversar, programar y crear, pagados en créditos sin suscripción obligatoria." },
    pt: { title: "Cadastro | TechNova AI Hub", description: "Crie sua conta TechNova AI Hub e use os melhores modelos de IA para conversar, programar e criar, pagos em créditos sem assinatura obrigatória." },
  },
  "/connexion": {
    fr: { title: "Connexion | TechNova AI Hub", description: "Retrouvez votre espace TechNova AI Hub et accédez à vos outils d'intelligence artificielle.", ogDescription: "Retrouvez votre espace TechNova AI Hub et vos outils d'intelligence artificielle." },
    en: { title: "Sign in | TechNova AI Hub", description: "Get back to your TechNova AI Hub workspace and your AI tools." },
    es: { title: "Iniciar sesión | TechNova AI Hub", description: "Vuelva a su espacio TechNova AI Hub y a sus herramientas de inteligencia artificial." },
    pt: { title: "Entrar | TechNova AI Hub", description: "Volte ao seu espaço TechNova AI Hub e às suas ferramentas de inteligência artificial." },
  },
};

export const SEO_LANGS: SiteLang[] = ["fr", "en", "es", "pt"];
/** The page language asked in the URL (?lang=en|es|pt), French otherwise. */
export function langFromSearch(search: unknown): SiteLang {
  const v = typeof search === "object" && search !== null ? (search as Record<string, unknown>)["lang"] : undefined;
  return v === "en" || v === "es" || v === "pt" ? v : "fr";
}
/** Title, description and language of a page for pageHead. */
export const seoFor = (path: SeoPath, search: unknown) => {
  const lang = langFromSearch(search);
  return { path, lang, alternates: true as const, ...seoText[path][lang] };
};
