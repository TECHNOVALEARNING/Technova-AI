// New-user onboarding choices (keys match the CHECK constraints of migration 0030).

type Option<K extends string> = { key: K; fr: string; en: string; hint?: { fr: string; en: string } };

export const accountTypes: Option<"individual" | "organization">[] = [
  { key: "individual", fr: "Individuel", en: "Individual", hint: { fr: "Pour moi : freelance, créateur, étudiant…", en: "Just me: freelancer, creator, student…" } },
  { key: "organization", fr: "Organisation", en: "Organization", hint: { fr: "Entreprise, agence, école, association…", en: "Company, agency, school, non-profit…" } },
];

export const workDomains: Option<"designer" | "developer" | "senior_engineer" | "data_ai" | "devops_cloud" | "cybersecurity" | "product_project" | "marketing_digital" | "student" | "entrepreneur" | "other">[] = [
  { key: "designer", fr: "Graphiste / Designer", en: "Graphic designer / Designer" },
  { key: "developer", fr: "Développeur", en: "Developer" },
  { key: "senior_engineer", fr: "Ingénieur (+10 ans d'expérience)", en: "Engineer (10+ years of experience)" },
  { key: "data_ai", fr: "Data / Intelligence artificielle", en: "Data / Artificial intelligence" },
  { key: "devops_cloud", fr: "DevOps / Cloud / Réseaux", en: "DevOps / Cloud / Networks" },
  { key: "cybersecurity", fr: "Cybersécurité", en: "Cybersecurity" },
  { key: "product_project", fr: "Chef de projet / Product manager", en: "Project / Product manager" },
  { key: "marketing_digital", fr: "Marketing digital / Community manager", en: "Digital marketing / Community manager" },
  { key: "student", fr: "Étudiant en informatique", en: "Computer science student" },
  { key: "entrepreneur", fr: "Entrepreneur / Fondateur", en: "Entrepreneur / Founder" },
  { key: "other", fr: "Autre", en: "Other" },
];

export const referralSources: Option<"facebook" | "instagram" | "tiktok" | "whatsapp" | "youtube" | "linkedin" | "x_twitter" | "google" | "word_of_mouth" | "event" | "other">[] = [
  { key: "facebook", fr: "Facebook", en: "Facebook" },
  { key: "instagram", fr: "Instagram", en: "Instagram" },
  { key: "tiktok", fr: "TikTok", en: "TikTok" },
  { key: "whatsapp", fr: "WhatsApp", en: "WhatsApp" },
  { key: "youtube", fr: "YouTube", en: "YouTube" },
  { key: "linkedin", fr: "LinkedIn", en: "LinkedIn" },
  { key: "x_twitter", fr: "X (Twitter)", en: "X (Twitter)" },
  { key: "google", fr: "Recherche Google", en: "Google search" },
  { key: "word_of_mouth", fr: "Bouche-à-oreille / un ami", en: "Word of mouth / a friend" },
  { key: "event", fr: "Événement, formation ou école", en: "Event, training or school" },
  { key: "other", fr: "Autre", en: "Other" },
];

export type AccountType = (typeof accountTypes)[number]["key"];
export type WorkDomain = (typeof workDomains)[number]["key"];
export type ReferralSource = (typeof referralSources)[number]["key"];

export const labelFor = (list: Option<string>[], key: string, fr: boolean) => {
  const o = list.find((x) => x.key === key);
  return o ? (fr ? o.fr : o.en) : key;
};
