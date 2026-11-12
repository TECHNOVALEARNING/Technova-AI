// Upcoming connectors shown under the official plugins (Plugins page, "Voir les connecteurs à venir").
// Nothing here is connected yet: each card is marked "Bientôt" until its integration is built and configured.
// Icons are the services' own marks, kept in public/media/connectors/<slug>.png.

export type ConnectorCategory = "ai" | "work" | "communicate" | "sell" | "grow";
type Txt = { fr: string; en: string };
export type UpcomingConnector = { slug: string; name: string; category: ConnectorCategory; text: Txt };

export const connectorCategories: Record<ConnectorCategory, Txt> = {
  ai: { fr: "IA", en: "AI" },
  work: { fr: "Travailler", en: "Work" },
  communicate: { fr: "Communiquer", en: "Communicate" },
  sell: { fr: "Vendre", en: "Sell" },
  grow: { fr: "Croître", en: "Grow" },
};

const c = (slug: string, name: string, category: ConnectorCategory, fr: string, en: string): UpcomingConnector => ({ slug, name, category, text: { fr, en } });

export const upcomingConnectors: UpcomingConnector[] = [
  c("firecrawl", "Firecrawl", "ai", "Extraction, recherche et lecture de pages web par IA", "AI-powered scraper, search and retrieval tool"),
  c("elevenlabs", "ElevenLabs", "ai", "Voix IA, synthèse vocale et transcription", "AI voice generation, text-to-speech and speech-to-text"),
  c("perplexity", "Perplexity", "ai", "Moteur de recherche et de réponses par IA", "AI-powered search and answer engine"),
  c("logo-dev", "Logo.dev", "ai", "Logos d'entreprises à partir de leur domaine", "Dynamic company logos by domain"),
  c("apify", "Apify", "ai", "Robots d'extraction et jeux de données du web", "Run Actors and access web scraping datasets"),
  c("klipy", "KLIPY", "ai", "GIF, autocollants, clips et emojis IA", "GIF, sticker, clip and AI-emoji media API"),
  c("fireworks-ai", "Fireworks AI", "ai", "Texte, images et embeddings rapides, ajustement de modèles", "Fast text, image and embedding generation, plus fine-tuning"),
  c("llamaparse", "LlamaParse Platform", "ai", "Lecture de documents et recherche dans votre base de connaissances", "Parse documents and search your knowledge base"),
  c("parallel", "Parallel", "ai", "Recherche web, extraction et API de recherche pour l'IA", "Web search, extraction and research APIs for AI"),
  c("replicate", "Replicate", "ai", "Modèles open source pour l'image, la vidéo et l'audio", "Run open-source AI models for image, video and audio"),
  c("heygen", "HeyGen", "ai", "Vidéos IA, avatars et traduction de contenus", "Create AI videos, avatars and translate content"),

  c("gmail", "Gmail", "work", "Lire, envoyer et gérer vos e-mails", "Read, send and manage your emails"),
  c("google-sheets", "Google Sheets", "work", "Lire et mettre à jour des feuilles de calcul", "Read and update spreadsheet data"),
  c("google-calendar", "Google Calendar", "work", "Créer et gérer des événements d'agenda", "Create and manage calendar events"),
  c("google-docs", "Google Docs", "work", "Créer et modifier des documents", "Create and edit documents"),
  c("airtable", "Airtable", "work", "Base de données en tableur et automatisations", "Spreadsheet-database hybrid and automation platform"),
  c("microsoft-outlook", "Microsoft Outlook", "work", "E-mails et événements d'agenda", "Read, send and manage emails and calendar events"),
  c("google-slides", "Google Slides", "work", "Créer et gérer des présentations", "Create and manage presentations"),
  c("microsoft-excel", "Microsoft Excel", "work", "Lire et écrire des classeurs", "Read and write spreadsheets"),
  c("microsoft-onedrive", "Microsoft OneDrive", "work", "Déposer et lire des fichiers", "Upload and read files"),
  c("linear", "Linear", "work", "Suivi de tickets et gestion de projets", "Issue tracking and project management"),
  c("microsoft-teams", "Microsoft Teams", "work", "Envoyer des messages et gérer des canaux", "Send messages and manage channels"),
  c("microsoft-word", "Microsoft Word", "work", "Lire et écrire des documents", "Read and write documents"),
  c("fireflies", "Fireflies", "work", "Transcription et analyse de réunions", "Meeting transcription and conversation intelligence"),
  c("microsoft-powerpoint", "Microsoft PowerPoint", "work", "Lire et écrire des présentations", "Read and write presentations"),
  c("asana", "Asana", "work", "Gestion des tâches, projets et équipes", "Work management for tasks, projects and teams"),
  c("granola", "Granola", "work", "Notes et transcriptions de réunions", "Meeting notes and transcripts"),
  c("microsoft-onenote", "Microsoft OneNote", "work", "Lire et écrire des notes", "Read and write notes"),
  c("calendly", "Calendly", "work", "Prise de rendez-vous en ligne", "Calendly scheduling"),
  c("microsoft-sharepoint", "Microsoft SharePoint", "work", "Sites, listes et bibliothèques de documents", "Read sites, lists and document libraries"),

  c("slack", "Slack", "communicate", "Envoyer des messages dans vos espaces Slack", "Send messages and interact with Slack workspaces"),
  c("resend", "Resend", "communicate", "API d'e-mails pour les développeurs", "Email API for developers"),
  c("twilio", "Twilio", "communicate", "SMS, appels et messagerie", "Cloud communications for SMS, voice and messaging"),
  c("telegram", "Telegram", "communicate", "Messagerie avec bots automatisés", "Messaging platform with a Bot API"),
  c("brevo", "Brevo", "communicate", "E-mails, SMS, CRM et automatisation marketing", "Email, SMS, CRM and marketing automation API"),
  c("klaviyo", "Klaviyo", "communicate", "Campagnes e-mail et SMS, profils clients", "Email and SMS campaigns, flows and customer profiles"),
  c("discord", "Discord", "communicate", "Messages et serveurs avec un bot Discord", "Send messages and read servers with a Discord bot"),
  c("mailgun", "Mailgun", "communicate", "API d'e-mails transactionnels", "Transactional email API"),
  c("mailchimp", "Mailchimp", "communicate", "Audiences, contacts et campagnes e-mail", "Audiences, contacts and email campaigns"),
  c("mailchimp-transactional", "Mailchimp Transactional", "communicate", "E-mails transactionnels (ex-Mandrill)", "Transactional email API, formerly Mandrill"),
  c("beehiiv", "beehiiv", "communicate", "Newsletters, publications et abonnés", "Newsletter publications, posts and subscribers"),
  c("firebase-messaging", "Firebase Cloud Messaging", "communicate", "Notifications push vers appareils et sujets", "Push notifications to devices and topics"),
  c("gatewayapi", "GatewayAPI", "communicate", "API de SMS et RCS", "SMS and RCS messaging API"),
  c("loops", "Loops", "communicate", "Contacts, événements et e-mails transactionnels", "Contacts, events and transactional email"),
  c("whatsapp-business", "WhatsApp Business", "communicate", "Messages WhatsApp Business et modèles", "WhatsApp Business messages and templates"),

  c("paddle", "Paddle", "sell", "Paiements avec gestion des taxes", "Payments with tax handled for you"),
  c("shopify", "Shopify", "sell", "Créer une boutique en ligne", "Build an e-commerce store"),
  c("paypal", "PayPal", "sell", "Paiement, encaissement et remboursements", "Checkout, order capture and refunds"),
  c("chargebee", "Chargebee", "sell", "Abonnements et gestion des revenus", "Subscription billing and revenue management"),
  c("lexware", "Lexware", "sell", "Comptabilité, factures et contacts", "Accounting, invoices, contacts and vouchers"),
  c("lightspeed", "Lightspeed", "sell", "Caisse, produits, stocks et ventes", "Retail POS products, inventory, customers and sales"),
  c("mollie", "Mollie", "sell", "Paiements par carte, iDEAL, Bancontact…", "Payments with iDEAL, Bancontact, cards and more"),
  c("prestashop", "PrestaShop", "sell", "Plateforme e-commerce open source", "Open-source e-commerce platform"),
  c("ramp", "Ramp", "sell", "Cartes d'entreprise et gestion des dépenses", "Corporate cards, expense management and spend data"),
  c("sevdesk", "Sevdesk", "sell", "Comptabilité, facturation et contacts", "Accounting, invoicing, contacts and voucher API"),
  c("wave", "Wave", "sell", "Comptabilité et facturation pour petites entreprises", "Accounting and invoicing for small businesses"),
  c("wix", "Wix", "sell", "Site, e-commerce, réservations et API", "Website, e-commerce, bookings and business APIs"),
  c("woocommerce", "WooCommerce", "sell", "Boutique en ligne pour WordPress", "Open-source e-commerce for WordPress"),
  c("xero", "Xero", "sell", "Données comptables Xero", "Connect accounting data from Xero"),
  c("zoho-books", "Zoho Books", "sell", "Flux comptables avec Zoho Books", "Accounting workflows with Zoho Books"),

  c("google-search-console", "Google Search Console", "grow", "Statistiques de recherche et gestion des sites", "Search analytics and site management"),
  c("linkedin", "LinkedIn", "grow", "Profil et publications LinkedIn", "LinkedIn profile and posting"),
  c("x-twitter", "X (Twitter)", "grow", "Publications, comptes et tendances de X", "Read posts, users and trends from X"),
  c("semrush", "Semrush", "grow", "SEO, mots-clés et analyse de la concurrence", "SEO, keyword research and competitive analysis"),
  c("twitch", "Twitch", "grow", "Streaming en direct et contenus créatifs", "Live streaming for gaming and creative content"),
  c("bing-webmaster", "Bing Webmaster Tools", "grow", "Clics, requêtes et soumission d'URL sur Bing", "Search clicks, queries, crawl stats and URL submission"),
  c("google-ads", "Google Ads", "grow", "Campagnes publicitaires Google", "Run Google Ads campaigns"),
  c("google-analytics", "Google Analytics", "grow", "Audience et trafic de votre site", "Web analytics and traffic insights"),
  c("google-business-profile", "Google Business Profile", "grow", "Fiches d'établissement, avis et statistiques", "Business locations, reviews and insights"),
  c("meta-ads", "Meta ads", "grow", "Publicités Facebook et Instagram", "Facebook and Instagram ad campaigns"),
  c("posthog", "PostHog", "grow", "Analyse produit, feature flags et événements", "Product analytics, feature flags and event capture"),
  c("tiktok", "TikTok", "grow", "Comptes et contenus TikTok", "TikTok user and content APIs"),
  c("amplitude", "Amplitude", "grow", "Analyse produit et retours utilisateurs", "Product analytics and feedback"),
];
