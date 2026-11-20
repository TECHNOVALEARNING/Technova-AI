// Company plans (TechNova Team / TechNova Entreprise, migration 0057): the features an administrator can untick
// for the company's sub-accounts. Every feature is ticked by default; the server re-checks each one
// (src/lib/org.server.ts and the share / agent triggers), the dashboard only hides what is unticked.

export type OrgFeature =
  | "images" | "video" | "music" | "studio" | "design" | "sheet"
  | "expert" | "flagship" | "research" | "humanize" | "audio" | "files" | "agents"
  | "share" | "api" | "connections" | "templates";

export type OrgFeatureGroup = { fr: string; en: string; items: { key: OrgFeature; fr: string; en: string; dFr: string; dEn: string }[] };

export const orgFeatureGroups: OrgFeatureGroup[] = [
  { fr: "Créations", en: "Creations", items: [
    { key: "images", fr: "Images", en: "Images", dFr: "Génération et retouche d'images dans le chat.", dEn: "Image generation and editing in the chat." },
    { key: "video", fr: "Vidéos", en: "Videos", dFr: "Génération de vidéos (Création de vidéo).", dEn: "Video generation." },
    { key: "music", fr: "Musique", en: "Music", dFr: "Création de chansons et de musiques.", dEn: "Songs and music creation." },
    { key: "studio", fr: "Sites web (Studio)", en: "Websites (Studio)", dFr: "Mode Créer, TechNova Studio et Page de vente pro.", dEn: "Create mode, TechNova Studio and sales pages." },
    { key: "design", fr: "Créativité", en: "Creativity", dFr: "TechNova Design : présentations, CV, affiches, rédaction IA, outils Pro.", dEn: "TechNova Design: slides, CVs, posters, AI writing, Pro tools." },
    { key: "sheet", fr: "Tableur", en: "Spreadsheet", dFr: "TechNova Tableur et son assistant IA.", dEn: "TechNova Spreadsheet and its AI assistant." },
  ] },
  { fr: "Intelligence artificielle", en: "Artificial intelligence", items: [
    { key: "expert", fr: "Mode Expert", en: "Expert mode", dFr: "Le mode le plus puissant (et le plus cher) du chat.", dEn: "The most powerful (and most expensive) chat mode." },
    { key: "flagship", fr: "Modèles phares", en: "Flagship models", dFr: "Choix direct de GPT, Claude, Gemini, Grok… facturés au coût réel.", dEn: "Direct choice of GPT, Claude, Gemini, Grok… billed at real cost." },
    { key: "research", fr: "Recherche approfondie", en: "Deep research", dFr: "Rapports de recherche web détaillés.", dEn: "Detailed web research reports." },
    { key: "humanize", fr: "Humaniser un texte", en: "Humanize a text", dFr: "Réécriture naturelle de textes produits par une IA.", dEn: "Natural rewriting of AI-written texts." },
    { key: "audio", fr: "Résumé d'un audio", en: "Audio summary", dFr: "Transcription et résumé d'enregistrements.", dEn: "Transcription and summary of recordings." },
    { key: "files", fr: "Fichiers et connaissances", en: "Files and knowledge", dFr: "Envoi de documents et bases de connaissances.", dEn: "Document uploads and knowledge bases." },
    { key: "agents", fr: "Agents et plugins", en: "Agents and plugins", dFr: "Création d'agents IA personnalisés et installation de plugins.", dEn: "Custom AI agents and plugins." },
  ] },
  { fr: "Partage et intégrations", en: "Sharing and integrations", items: [
    { key: "share", fr: "Partage et publication", en: "Sharing and publishing", dFr: "Liens de partage de conversations et sites publiés.", dEn: "Conversation share links and published sites." },
    { key: "api", fr: "Clés API", en: "API keys", dFr: "Utilisation de TechNova depuis d'autres logiciels.", dEn: "Using TechNova from other software." },
    { key: "connections", fr: "Connexions", en: "Connections", dFr: "GitHub, Google Drive, Notion, Supabase, Netlify, Vercel, Stripe.", dEn: "GitHub, Google Drive, Notion, Supabase, Netlify, Vercel, Stripe." },
    { key: "templates", fr: "Templates", en: "Templates", dFr: "Bibliothèque de modèles de sites.", dEn: "Website template library." },
  ] },
];

export const orgFeatures: OrgFeature[] = orgFeatureGroups.flatMap((g) => g.items.map((i) => i.key));
export const isOrgFeature = (v: unknown): v is OrgFeature => typeof v === "string" && (orgFeatures as string[]).includes(v);

/** Shown everywhere a company has unticked a feature (server errors and dashboard notices). */
export const ORG_FEATURE_DISABLED = "ORG_FEATURE_DISABLED";
export const orgDisabledMessage = (feature: OrgFeature) =>
  `${ORG_FEATURE_DISABLED}:${feature} — Fonction désactivée par l'administrateur de votre entreprise. / Disabled by your company administrator.`;

/** Company plans, shown under the pricing packs (« Détails ») and in the company dashboard. */
export const orgPlans = [
  { slug: "team", name: "TechNova Team", price: 49000, credits: 58000, seats: 5 },
  { slug: "entreprise", name: "TechNova Entreprise", price: 149000, credits: 178000, seats: 25 },
] as const;
export type OrgPlanSlug = (typeof orgPlans)[number]["slug"];
