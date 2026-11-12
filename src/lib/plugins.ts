// Official TechNova plugins: each one bundles ready-made agents (installed into the user's own agents table,
// subject to the Creator plan and the per-reply budget enforced in the database) and "/" commands (prompt
// templates offered in the chat composer). Installing copies nothing else: tools stay deny-by-default and
// only the read-only tools listed below can be requested. The catalogue lives in code, so it is reviewed
// like any other change; only the installed state (user_plugins, migration 0041) is stored per owner.

export type PluginTool = "web_search" | "web_fetch" | "read_file";
type Txt = { fr: string; en: string };
export type PluginAgent = { name: Txt; description: Txt; instructions: Txt; tools: PluginTool[] };
export type PluginCommand = { slug: string; label: Txt; prompt: Txt };
export type PluginCategory = "sales" | "marketing" | "dev" | "data" | "legal" | "education" | "business";
export type Plugin = {
  id: string; icon: "briefcase" | "scale" | "graduation" | "megaphone" | "code" | "table" | "users" | "calculator" | "store" | "pen";
  hue: number; category: PluginCategory; name: Txt; tagline: Txt; description: Txt;
  agents: PluginAgent[]; commands: PluginCommand[];
};

export const pluginCategories: Record<PluginCategory, Txt> = {
  sales: { fr: "Vente", en: "Sales" }, marketing: { fr: "Marketing", en: "Marketing" }, dev: { fr: "Développement", en: "Development" },
  data: { fr: "Données", en: "Data" }, legal: { fr: "Juridique", en: "Legal" }, education: { fr: "Éducation", en: "Education" }, business: { fr: "Gestion", en: "Business" },
};

export const toolLabels: Record<PluginTool, Txt & { detail: Txt }> = {
  web_search: { fr: "Recherche web", en: "Web search", detail: { fr: "Cherche des informations publiques sur Internet.", en: "Looks up public information on the web." } },
  web_fetch: { fr: "Lecture de pages web", en: "Reading web pages", detail: { fr: "Lit les adresses que vous donnez dans le message.", en: "Reads the addresses you give in the message." } },
  read_file: { fr: "Lecture de vos fichiers", en: "Reading your files", detail: { fr: "Lit vos fichiers prêts nommés dans le message (lecture seule).", en: "Reads your ready files named in the message (read-only)." } },
};

const honest = { fr: " N'invente jamais de chiffres, d'avis ou de sources ; si une information manque, demande-la.", en: " Never invent figures, reviews or sources; if information is missing, ask for it." };
const agent = (name: Txt, description: Txt, instructions: Txt, tools: PluginTool[] = []): PluginAgent =>
  ({ name, description, instructions: { fr: instructions.fr + honest.fr, en: instructions.en + honest.en }, tools });
const cmd = (slug: string, fr: [string, string], en: [string, string]): PluginCommand => ({ slug, label: { fr: fr[0], en: en[0] }, prompt: { fr: fr[1], en: en[1] } });

export const plugins: Plugin[] = [
  {
    id: "commercial", icon: "briefcase", hue: 215, category: "sales",
    name: { fr: "Commercial", en: "Sales rep" },
    tagline: { fr: "Prospection, devis et relances qui signent", en: "Prospecting, quotes and follow-ups that close" },
    description: { fr: "Un assistant commercial qui rédige vos messages de prospection, prépare vos devis et relance vos clients au bon ton, sur WhatsApp comme par e-mail.", en: "A sales assistant that writes your prospecting messages, prepares quotes and follows up with clients in the right tone, on WhatsApp or by email." },
    agents: [agent({ fr: "Commercial", en: "Sales rep" }, { fr: "Prospection, devis, relances", en: "Prospecting, quotes, follow-ups" },
      { fr: "Tu es un commercial expérimenté en Afrique francophone. Tu écris des messages courts, concrets et polis, adaptés à WhatsApp ou à l'e-mail, avec un seul appel à l'action clair.", en: "You are an experienced sales rep. You write short, concrete, polite messages suited to WhatsApp or email, with one clear call to action." }, ["web_search"])],
    commands: [
      cmd("prospection", ["Message de prospection", "Rédige 3 messages de prospection WhatsApp pour vendre [mon offre] à [type de client], chacun en moins de 60 mots."], ["Prospecting message", "Write 3 WhatsApp prospecting messages selling [my offer] to [type of client], each under 60 words."]),
      cmd("devis", ["Devis", "Prépare un devis clair pour [client] : [prestations et quantités], prix unitaires en [devise], total, conditions de paiement et validité."], ["Quote", "Prepare a clear quote for [client]: [services and quantities], unit prices in [currency], total, payment terms and validity."]),
      cmd("relance", ["Relance client", "Écris une relance courtoise pour [client] qui n'a pas répondu à mon devis du [date], avec une question simple pour relancer l'échange."], ["Client follow-up", "Write a polite follow-up for [client] who hasn't answered my quote from [date], with one simple question to restart the conversation."]),
    ],
  },
  {
    id: "juriste", icon: "scale", hue: 260, category: "legal",
    name: { fr: "Juriste", en: "Legal assistant" },
    tagline: { fr: "Contrats, CGV et courriers clairs", en: "Clear contracts, terms and letters" },
    description: { fr: "Rédige et relit des contrats simples, des conditions générales de vente et des courriers, en signalant les points à faire valider par un professionnel.", en: "Drafts and reviews simple contracts, terms of sale and letters, flagging the points to have checked by a professional." },
    agents: [agent({ fr: "Juriste", en: "Legal assistant" }, { fr: "Contrats et courriers", en: "Contracts and letters" },
      { fr: "Tu es un assistant juridique prudent (droit OHADA et droit français quand c'est pertinent). Tu rédiges clairement, signales les clauses risquées et rappelles qu'un avocat doit valider les actes importants. Tu ne donnes pas de conseil personnalisé définitif.", en: "You are a careful legal assistant. You draft clearly, flag risky clauses and remind that a lawyer must validate important documents. You never give definitive personal legal advice." }, ["read_file"])],
    commands: [
      cmd("contrat", ["Contrat de prestation", "Rédige un contrat de prestation entre [prestataire] et [client] pour [mission], avec durée, prix, paiement, confidentialité et résiliation."], ["Service contract", "Draft a service contract between [provider] and [client] for [mission], with term, price, payment, confidentiality and termination."]),
      cmd("cgv", ["CGV boutique", "Rédige des conditions générales de vente pour ma boutique de [produits] : commande, paiement Mobile Money, livraison, retours et réclamations."], ["Store terms", "Write terms of sale for my [products] store: ordering, Mobile Money payment, delivery, returns and complaints."]),
      cmd("relire", ["Relire un contrat", "Relis le contrat joint : résume-le, liste les clauses risquées pour moi et propose des reformulations."], ["Review a contract", "Review the attached contract: summarise it, list the clauses that are risky for me and suggest rewordings."]),
    ],
  },
  {
    id: "prof", icon: "graduation", hue: 150, category: "education",
    name: { fr: "Prof particulier", en: "Private tutor" },
    tagline: { fr: "Explications, exercices et corrigés", en: "Explanations, exercises and answers" },
    description: { fr: "Explique pas à pas, crée des exercices adaptés au niveau et corrige avec bienveillance — du primaire au BAC et au-delà.", en: "Explains step by step, creates level-appropriate exercises and corrects kindly — from primary school to university." },
    agents: [agent({ fr: "Prof particulier", en: "Private tutor" }, { fr: "Cours, exercices, corrections", en: "Lessons, exercises, corrections" },
      { fr: "Tu es un professeur patient. Tu vérifies d'abord le niveau de l'élève, expliques avec des exemples du quotidien, poses une question de vérification et ne donnes pas la réponse d'un exercice sans avoir laissé l'élève essayer.", en: "You are a patient teacher. You first check the student's level, explain with everyday examples, ask a check question and never give an exercise's answer before letting the student try." })],
    commands: [
      cmd("expliquer", ["Expliquer une notion", "Explique [notion] à un élève de [classe], avec un exemple concret et une question pour vérifier qu'il a compris."], ["Explain a concept", "Explain [concept] to a [grade] student, with a concrete example and a question to check understanding."]),
      cmd("exercices", ["Fiche d'exercices", "Crée 5 exercices progressifs sur [chapitre] pour le niveau [classe], puis le corrigé détaillé à part."], ["Exercise sheet", "Create 5 progressive exercises on [chapter] for [grade] level, then the detailed answers separately."]),
      cmd("revision", ["Plan de révision", "Fais-moi un plan de révision de [nombre] jours pour [examen], avec les chapitres, le temps par jour et des mini-tests."], ["Revision plan", "Make me a [number]-day revision plan for [exam], with chapters, time per day and mini-tests."]),
    ],
  },
  {
    id: "community", icon: "megaphone", hue: 330, category: "marketing",
    name: { fr: "Community manager", en: "Community manager" },
    tagline: { fr: "Posts, calendrier et réponses aux clients", en: "Posts, calendar and replies to customers" },
    description: { fr: "Planifie vos publications, écrit des posts Facebook, Instagram, TikTok et LinkedIn, et prépare des réponses aux commentaires.", en: "Plans your posts, writes Facebook, Instagram, TikTok and LinkedIn content, and drafts replies to comments." },
    agents: [agent({ fr: "Community manager", en: "Community manager" }, { fr: "Réseaux sociaux", en: "Social media" },
      { fr: "Tu es community manager. Tu écris dans le ton de la marque, adaptes chaque post au réseau (longueur, hashtags, accroche), proposes un visuel à créer et restes respectueux dans les réponses.", en: "You are a community manager. You write in the brand's tone, adapt each post to the network (length, hashtags, hook), suggest a visual to create and stay respectful in replies." }, ["web_search"])],
    commands: [
      cmd("calendrier", ["Calendrier éditorial", "Crée un calendrier de publications sur 4 semaines pour [ma marque] sur [réseaux], avec thème, accroche et format de chaque post."], ["Content calendar", "Create a 4-week posting calendar for [my brand] on [networks], with theme, hook and format for each post."]),
      cmd("post", ["Post réseau social", "Écris un post [Instagram/Facebook/LinkedIn] pour annoncer [nouveauté], avec une accroche forte, 3 hashtags et une idée de visuel."], ["Social post", "Write an [Instagram/Facebook/LinkedIn] post announcing [news], with a strong hook, 3 hashtags and a visual idea."]),
      cmd("reponse", ["Répondre à un commentaire", "Propose 3 réponses polies et professionnelles à ce commentaire client : « [commentaire] »."], ["Reply to a comment", "Suggest 3 polite, professional replies to this customer comment: “[comment]”."]),
    ],
  },
  {
    id: "dev-web", icon: "code", hue: 190, category: "dev",
    name: { fr: "Développeur web", en: "Web developer" },
    tagline: { fr: "Code relu, bugs trouvés, docs écrites", en: "Code reviewed, bugs found, docs written" },
    description: { fr: "Relit votre code, explique les erreurs, propose des corrections et rédige la documentation de vos projets.", en: "Reviews your code, explains errors, suggests fixes and writes your project documentation." },
    agents: [agent({ fr: "Développeur web", en: "Web developer" }, { fr: "Code, bugs, documentation", en: "Code, bugs, documentation" },
      { fr: "Tu es un développeur web senior (JavaScript, TypeScript, React, PHP, SQL). Tu expliques la cause d'un problème avant la correction, fournis du code complet et testable et signales les failles de sécurité.", en: "You are a senior web developer (JavaScript, TypeScript, React, PHP, SQL). You explain a problem's cause before the fix, give complete testable code and flag security issues." }, ["web_fetch", "read_file"])],
    commands: [
      cmd("bug", ["Corriger un bug", "Voici l'erreur : [message d'erreur]. Voici le code concerné : [code]. Explique la cause puis donne la correction."], ["Fix a bug", "Here is the error: [error message]. Here is the code: [code]. Explain the cause, then give the fix."]),
      cmd("revue", ["Revue de code", "Fais une revue de ce code : lisibilité, bugs possibles, sécurité et performances, avec les corrections proposées : [code]"], ["Code review", "Review this code: readability, possible bugs, security and performance, with suggested fixes: [code]"]),
      cmd("readme", ["README de projet", "Rédige le README de mon projet [nom] : description, installation, utilisation, variables d'environnement et déploiement."], ["Project README", "Write the README for my project [name]: description, setup, usage, environment variables and deployment."]),
    ],
  },
  {
    id: "analyste-excel", icon: "table", hue: 140, category: "data",
    name: { fr: "Analyste Excel", en: "Excel analyst" },
    tagline: { fr: "Formules, tableaux et analyses de chiffres", en: "Formulas, tables and number analysis" },
    description: { fr: "Écrit vos formules Excel, analyse vos fichiers de ventes ou de stock et produit des tableaux exportables en Excel.", en: "Writes your Excel formulas, analyses your sales or stock files and produces tables you can export to Excel." },
    agents: [agent({ fr: "Analyste Excel", en: "Excel analyst" }, { fr: "Formules et analyses", en: "Formulas and analysis" },
      { fr: "Tu es analyste de données expert d'Excel et Google Sheets. Tu donnes les formules en français et en anglais, présentes les résultats dans des tableaux Markdown et expliques chaque calcul.", en: "You are a data analyst expert in Excel and Google Sheets. You give formulas, present results as Markdown tables and explain each calculation." }, ["read_file"])],
    commands: [
      cmd("formule", ["Écrire une formule", "Donne-moi la formule Excel pour [ce que je veux calculer], sachant que mes données sont en [colonnes], avec une explication."], ["Write a formula", "Give me the Excel formula to [what I want to calculate], my data being in [columns], with an explanation."]),
      cmd("analyse", ["Analyser un fichier", "Analyse le fichier joint : tendances, meilleurs et moins bons [produits/mois], anomalies, puis 3 recommandations, avec des tableaux."], ["Analyse a file", "Analyse the attached file: trends, best and worst [products/months], anomalies, then 3 recommendations, with tables."]),
      cmd("tableau", ["Modèle de tableau", "Crée un modèle de tableau de suivi de [ventes/stock/dépenses] avec les colonnes, des exemples de lignes et les formules de totaux."], ["Table template", "Create a tracking table template for [sales/stock/expenses] with columns, sample rows and total formulas."]),
    ],
  },
  {
    id: "rh", icon: "users", hue: 30, category: "business",
    name: { fr: "Ressources humaines", en: "HR assistant" },
    tagline: { fr: "Offres d'emploi, entretiens et fiches de poste", en: "Job ads, interviews and job descriptions" },
    description: { fr: "Rédige des offres d'emploi, des fiches de poste et des grilles d'entretien, et aide à rédiger les courriers RH.", en: "Writes job ads, job descriptions and interview grids, and helps draft HR letters." },
    agents: [agent({ fr: "Assistant RH", en: "HR assistant" }, { fr: "Recrutement et courriers RH", en: "Hiring and HR letters" },
      { fr: "Tu es responsable RH. Tu écris des textes inclusifs et non discriminants, structurés et précis sur les missions, et rappelles de vérifier le droit du travail local.", en: "You are an HR manager. You write inclusive, non-discriminatory, structured texts that are precise about duties, and remind to check local labour law." })],
    commands: [
      cmd("offre", ["Offre d'emploi", "Rédige une offre d'emploi pour un poste de [poste] à [ville] : missions, profil, conditions et comment postuler."], ["Job ad", "Write a job ad for a [position] in [city]: duties, profile, conditions and how to apply."]),
      cmd("entretien", ["Grille d'entretien", "Prépare 10 questions d'entretien pour un [poste], avec ce qu'une bonne réponse doit contenir."], ["Interview grid", "Prepare 10 interview questions for a [position], with what a good answer should contain."]),
      cmd("fiche-poste", ["Fiche de poste", "Rédige la fiche de poste de [poste] : rattachement, missions, compétences, indicateurs de réussite."], ["Job description", "Write the job description for [position]: reporting line, duties, skills, success indicators."]),
    ],
  },
  {
    id: "compta", icon: "calculator", hue: 50, category: "business",
    name: { fr: "Gestion & compta PME", en: "SME accounting" },
    tagline: { fr: "Factures, prix de revient et trésorerie", en: "Invoices, cost prices and cash flow" },
    description: { fr: "Aide à fixer vos prix, préparer vos factures, suivre votre trésorerie et comprendre vos chiffres, sans jargon.", en: "Helps set your prices, prepare invoices, track cash flow and understand your numbers, without jargon." },
    agents: [agent({ fr: "Gestionnaire PME", en: "SME manager" }, { fr: "Prix, factures, trésorerie", en: "Prices, invoices, cash flow" },
      { fr: "Tu es gestionnaire de PME (SYSCOHADA quand c'est pertinent). Tu montres chaque calcul, utilises la devise de l'utilisateur et conseilles un expert-comptable pour les déclarations officielles.", en: "You are an SME manager. You show every calculation, use the user's currency and recommend an accountant for official filings." }, ["read_file"])],
    commands: [
      cmd("prix", ["Calculer un prix de vente", "Calcule mon prix de vente pour [produit] : coût d'achat [montant], frais [liste], marge visée [pourcentage]."], ["Set a selling price", "Calculate my selling price for [product]: purchase cost [amount], costs [list], target margin [percent]."]),
      cmd("facture", ["Facture", "Prépare une facture pour [client] : [lignes et montants], numéro [numéro], échéance [date], mentions utiles."], ["Invoice", "Prepare an invoice for [client]: [lines and amounts], number [number], due date [date], useful mentions."]),
      cmd("tresorerie", ["Plan de trésorerie", "Fais un plan de trésorerie sur 6 mois à partir de : entrées [montants], sorties [montants], solde de départ [montant]."], ["Cash-flow plan", "Make a 6-month cash-flow plan from: income [amounts], expenses [amounts], starting balance [amount]."]),
    ],
  },
  {
    id: "e-commerce", icon: "store", hue: 15, category: "sales",
    name: { fr: "Vendeur en ligne", en: "Online seller" },
    tagline: { fr: "Fiches produit, offres et service client", en: "Product pages, offers and customer service" },
    description: { fr: "Écrit des fiches produit qui vendent, imagine des offres promotionnelles et répond aux questions de vos clients.", en: "Writes product descriptions that sell, designs promotional offers and answers your customers' questions." },
    agents: [agent({ fr: "Vendeur en ligne", en: "Online seller" }, { fr: "Fiches produit et service client", en: "Product pages and customer service" },
      { fr: "Tu es spécialiste du e-commerce et de la vente sur WhatsApp et les réseaux. Tu écris des textes orientés bénéfices, rassures sur le paiement et la livraison et ne promets rien que le vendeur ne peut tenir.", en: "You are an e-commerce specialist selling on WhatsApp and social media. You write benefit-led copy, reassure on payment and delivery and never promise what the seller can't deliver." }, ["web_search"])],
    commands: [
      cmd("fiche-produit", ["Fiche produit", "Écris la fiche produit de [produit] : titre accrocheur, 5 bénéfices, caractéristiques, prix [prix] et réponse aux 3 objections principales."], ["Product page", "Write the product page for [product]: catchy title, 5 benefits, features, price [price] and answers to the 3 main objections."]),
      cmd("promo", ["Offre promotionnelle", "Propose 3 idées d'offres promotionnelles honnêtes pour écouler [produit] pendant [période], avec le message d'annonce."], ["Promotional offer", "Suggest 3 honest promotional offers to sell [product] during [period], with the announcement message."]),
      cmd("sav", ["Réponse client", "Un client écrit : « [message] ». Rédige une réponse rassurante et précise qui règle son problème."], ["Customer reply", "A customer writes: “[message]”. Write a reassuring, precise reply that solves their issue."]),
    ],
  },
  {
    id: "redacteur", icon: "pen", hue: 280, category: "marketing",
    name: { fr: "Rédacteur & SEO", en: "Writer & SEO" },
    tagline: { fr: "Articles, newsletters et référencement", en: "Articles, newsletters and SEO" },
    description: { fr: "Rédige des articles de blog optimisés pour Google, des newsletters et des textes de site, à partir de vos idées.", en: "Writes Google-friendly blog articles, newsletters and website copy from your ideas." },
    agents: [agent({ fr: "Rédacteur SEO", en: "SEO writer" }, { fr: "Articles et newsletters", en: "Articles and newsletters" },
      { fr: "Tu es rédacteur web et expert SEO. Tu structures avec des titres clairs, places le mot-clé naturellement, écris pour les humains d'abord et cites tes sources quand tu fais une recherche.", en: "You are a web writer and SEO expert. You structure with clear headings, place the keyword naturally, write for humans first and cite sources when you research." }, ["web_search", "web_fetch"])],
    commands: [
      cmd("article", ["Article de blog", "Rédige un article de blog de 900 mots sur [sujet] pour le mot-clé « [mot-clé] », avec titre, méta-description et intertitres."], ["Blog article", "Write a 900-word blog article on [topic] for the keyword “[keyword]”, with title, meta description and subheadings."]),
      cmd("newsletter", ["Newsletter", "Écris la newsletter de ce mois pour [mon activité] : nouveautés [liste], un conseil utile et un appel à l'action."], ["Newsletter", "Write this month's newsletter for [my business]: news [list], one useful tip and a call to action."]),
      cmd("reformuler", ["Reformuler un texte", "Reformule ce texte pour qu'il soit plus clair et plus convaincant, sans changer le sens : [texte]"], ["Rewrite a text", "Rewrite this text to make it clearer and more convincing, without changing the meaning: [text]"]),
    ],
  },
];

export const pluginById = (id: string) => plugins.find((p) => p.id === id);

/** The tools a plugin asks for (union of its agents' tools), for the "accesses requested" list. */
export const pluginTools = (p: Plugin): PluginTool[] => [...new Set(p.agents.flatMap((a) => a.tools))];

export type SlashCommand = PluginCommand & { pluginId: string; pluginName: Txt; hue: number };
/** Commands offered after "/" in the composer: those of installed and enabled plugins. */
export function slashCommands(enabledIds: string[]): SlashCommand[] {
  return plugins.filter((p) => enabledIds.includes(p.id)).flatMap((p) => p.commands.map((c) => ({ ...c, pluginId: p.id, pluginName: p.name, hue: p.hue })));
}
