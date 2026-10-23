// TechNova Design Library — original themes and section blueprints, Google Fonts only
// (all fonts below are under the SIL Open Font License: free for commercial use).
// A selection becomes a plain-text design brief that the Studio receives with the request.

type Text = { fr: string; en: string };

export type DesignFont = { name: string; category: "sans" | "serif" | "display"; note: Text };
export type DesignTheme = {
  id: string; name: string; mood: Text;
  colors: { background: string; surface: string; text: string; muted: string; primary: string; accent: string };
  heading: string; body: string; radius: "sharp" | "soft" | "round";
};
export type DesignSection = { id: string; name: Text; summary: Text; blueprint: string };

export const designFonts: DesignFont[] = [
  { name: "Inter", category: "sans", note: { fr: "Neutre et très lisible", en: "Neutral, highly legible" } },
  { name: "Manrope", category: "sans", note: { fr: "Moderne et chaleureuse", en: "Modern and warm" } },
  { name: "Plus Jakarta Sans", category: "sans", note: { fr: "Startup, produit", en: "Startup, product" } },
  { name: "Outfit", category: "sans", note: { fr: "Géométrique, aérée", en: "Geometric, airy" } },
  { name: "Poppins", category: "sans", note: { fr: "Ronde et amicale", en: "Round and friendly" } },
  { name: "Montserrat", category: "sans", note: { fr: "Affirmée, titres forts", en: "Bold headlines" } },
  { name: "Nunito", category: "sans", note: { fr: "Douce, accessible", en: "Soft, approachable" } },
  { name: "IBM Plex Sans", category: "sans", note: { fr: "Technique, sérieuse", en: "Technical, serious" } },
  { name: "Space Grotesk", category: "display", note: { fr: "Tech, caractère", en: "Tech with character" } },
  { name: "Sora", category: "display", note: { fr: "Futuriste, nette", en: "Futuristic, crisp" } },
  { name: "Bricolage Grotesque", category: "display", note: { fr: "Expressive, culturelle", en: "Expressive, cultural" } },
  { name: "Archivo", category: "display", note: { fr: "Éditoriale, compacte", en: "Editorial, compact" } },
  { name: "Playfair Display", category: "serif", note: { fr: "Luxe, élégance", en: "Luxury, elegance" } },
  { name: "DM Serif Display", category: "serif", note: { fr: "Classique et chaleureuse", en: "Classic and warm" } },
  { name: "Fraunces", category: "serif", note: { fr: "Artisanale, gourmande", en: "Crafted, gourmet" } },
  { name: "Lora", category: "serif", note: { fr: "Texte long, presse", en: "Long reads, editorial" } },
];

export const designThemes: DesignTheme[] = [
  { id: "savane", name: "Savane", mood: { fr: "Chaleureux · restaurants, artisanat, tourisme", en: "Warm · restaurants, crafts, tourism" },
    colors: { background: "#FBF6EE", surface: "#FFFFFF", text: "#2B1D12", muted: "#7A6553", primary: "#C2410C", accent: "#EAB308" }, heading: "Fraunces", body: "Manrope", radius: "soft" },
  { id: "lagune", name: "Lagune", mood: { fr: "Frais et rassurant · santé, services, éducation", en: "Fresh and reassuring · health, services, education" },
    colors: { background: "#F3FAFB", surface: "#FFFFFF", text: "#0B2530", muted: "#4B6B76", primary: "#0E7490", accent: "#22D3EE" }, heading: "Outfit", body: "Inter", radius: "round" },
  { id: "nuit-tech", name: "Nuit Tech", mood: { fr: "Sombre et premium · SaaS, startups, développeurs", en: "Dark and premium · SaaS, startups, developers" },
    colors: { background: "#0B0F19", surface: "#121826", text: "#E6EAF2", muted: "#8A94A8", primary: "#6366F1", accent: "#22D3EE" }, heading: "Space Grotesk", body: "Inter", radius: "soft" },
  { id: "kente", name: "Kente", mood: { fr: "Audacieux et festif · événements, culture, mode", en: "Bold and festive · events, culture, fashion" },
    colors: { background: "#FFFDF5", surface: "#FFFFFF", text: "#1A1A1A", muted: "#5C5C5C", primary: "#15803D", accent: "#F59E0B" }, heading: "Bricolage Grotesque", body: "Plus Jakarta Sans", radius: "sharp" },
  { id: "elegance", name: "Élégance", mood: { fr: "Raffiné · beauté, hôtellerie, bijoux", en: "Refined · beauty, hospitality, jewellery" },
    colors: { background: "#F7F5F2", surface: "#FFFFFF", text: "#1C1917", muted: "#78716C", primary: "#1C1917", accent: "#B08D57" }, heading: "Playfair Display", body: "Lora", radius: "sharp" },
  { id: "minimal", name: "Minimal", mood: { fr: "Épuré · portfolios, agences, consultants", en: "Clean · portfolios, agencies, consultants" },
    colors: { background: "#FFFFFF", surface: "#F5F5F5", text: "#111111", muted: "#6B6B6B", primary: "#111111", accent: "#2563EB" }, heading: "Inter", body: "Inter", radius: "soft" },
  { id: "baobab", name: "Baobab", mood: { fr: "Naturel · agriculture, ONG, produits bio", en: "Natural · agriculture, NGOs, organic products" },
    colors: { background: "#F4F7F2", surface: "#FFFFFF", text: "#1E2B1F", muted: "#5E6E5F", primary: "#3F6212", accent: "#CA8A04" }, heading: "DM Serif Display", body: "Nunito", radius: "round" },
  { id: "neon", name: "Néon", mood: { fr: "Joyeux et jeune · musique, apps, influenceurs", en: "Playful and young · music, apps, creators" },
    colors: { background: "#FFF7FB", surface: "#FFFFFF", text: "#1F1033", muted: "#6B5B7A", primary: "#DB2777", accent: "#7C3AED" }, heading: "Poppins", body: "Poppins", radius: "round" },
];

export const designSections: DesignSection[] = [
  { id: "hero", name: { fr: "Hero", en: "Hero" }, summary: { fr: "Grand titre, phrase d'accroche, bouton principal et visuel.", en: "Big headline, tagline, main button and visual." },
    blueprint: "Hero: large headline stating the offer, one-sentence subtitle, primary call-to-action button plus a secondary link, and a large image or illustration beside or behind the text." },
  { id: "features", name: { fr: "Avantages", en: "Benefits" }, summary: { fr: "3 à 6 cartes avec icône, titre court et explication.", en: "3–6 cards with icon, short title and explanation." },
    blueprint: "Benefits: grid of 3 to 6 cards, each with a simple icon, a short title and one or two sentences." },
  { id: "steps", name: { fr: "Comment ça marche", en: "How it works" }, summary: { fr: "3 ou 4 étapes numérotées.", en: "3 or 4 numbered steps." },
    blueprint: "How it works: 3 or 4 numbered steps in a row (stacked on mobile) with a title and a short description each." },
  { id: "products", name: { fr: "Produits / boutique", en: "Products / shop" }, summary: { fr: "Grille de produits avec photo, prix et bouton.", en: "Product grid with photo, price and button." },
    blueprint: "Products: responsive grid of product cards with photo, name, price in FCFA and an order button (WhatsApp or contact link)." },
  { id: "menu", name: { fr: "Menu (restaurant)", en: "Menu (restaurant)" }, summary: { fr: "Catégories de plats avec prix.", en: "Dish categories with prices." },
    blueprint: "Menu: dishes grouped by category (starters, mains, drinks…) with name, short description and price, laid out like a printed menu." },
  { id: "gallery", name: { fr: "Galerie", en: "Gallery" }, summary: { fr: "Mosaïque de photos ou de réalisations.", en: "Photo or portfolio mosaic." },
    blueprint: "Gallery: masonry or uniform grid of images with optional captions; opens larger on click if possible." },
  { id: "pricing", name: { fr: "Tarifs", en: "Pricing" }, summary: { fr: "2 à 4 offres comparées, une mise en avant.", en: "2–4 compared plans, one highlighted." },
    blueprint: "Pricing: 2 to 4 plan cards side by side with name, price, list of what is included and a button; highlight the recommended plan. Use only prices supplied by the user." },
  { id: "stats", name: { fr: "Chiffres clés", en: "Key figures" }, summary: { fr: "3 ou 4 chiffres marquants.", en: "3 or 4 striking numbers." },
    blueprint: "Key figures: band with 3 or 4 large numbers and labels. Use only figures supplied by the user; otherwise omit this section." },
  { id: "team", name: { fr: "Équipe", en: "Team" }, summary: { fr: "Portraits, noms et rôles.", en: "Portraits, names and roles." },
    blueprint: "Team: cards with portrait placeholder, name and role. Use only people supplied by the user." },
  { id: "reviews", name: { fr: "Avis clients", en: "Customer reviews" }, summary: { fr: "Uniquement avec de vrais avis fournis.", en: "Only with real reviews provided." },
    blueprint: "Customer reviews: quotes with name and context, ONLY if the user supplied real reviews; otherwise replace with an honest trust/values section." },
  { id: "faq", name: { fr: "FAQ", en: "FAQ" }, summary: { fr: "Questions fréquentes en accordéon.", en: "Frequently asked questions as an accordion." },
    blueprint: "FAQ: 4 to 8 questions in an accordion that opens one answer at a time." },
  { id: "cta", name: { fr: "Bandeau d'action", en: "Call-to-action band" }, summary: { fr: "Rappel fort avant le pied de page.", en: "Strong reminder before the footer." },
    blueprint: "Call-to-action band: full-width coloured band with a short persuasive line and one button." },
  { id: "contact", name: { fr: "Contact", en: "Contact" }, summary: { fr: "Formulaire, WhatsApp, adresse et horaires.", en: "Form, WhatsApp, address and hours." },
    blueprint: "Contact: simple form (mailto or local confirmation), WhatsApp button, address, opening hours and phone number when supplied." },
  { id: "footer", name: { fr: "Pied de page", en: "Footer" }, summary: { fr: "Liens, réseaux sociaux, mentions.", en: "Links, social networks, legal." },
    blueprint: "Footer: logo or name, short tagline, navigation links, social links supplied by the user and copyright line." },
];

export const defaultSections = ["hero", "features", "steps", "cta", "contact", "footer"];

export const googleFontsHref = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${[...new Set(families)].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`).join("&")}&display=swap`;

const radiusText = { sharp: "small corner radius (2–4px)", soft: "medium rounded corners (10–14px)", round: "very rounded corners and pill buttons" };

/** Plain-text brief appended to a Studio request. Kept in English for the model; the site language follows the request. */
export function designBrief(theme: DesignTheme, sectionIds: string[], fonts?: { heading?: string; body?: string }) {
  const heading = fonts?.heading || theme.heading;
  const body = fonts?.body || theme.body;
  const c = theme.colors;
  const sections = sectionIds.map((id) => designSections.find((s) => s.id === id)).filter((s): s is DesignSection => Boolean(s));
  return [
    `[TechNova Design Library — theme "${theme.name}"]`,
    `Colors: background ${c.background}, surfaces ${c.surface}, text ${c.text}, secondary text ${c.muted}, primary ${c.primary}, accent ${c.accent}.`,
    `Fonts (Google Fonts, load from fonts.googleapis.com): headings "${heading}", body "${body}". Style: ${radiusText[theme.radius]}.`,
    sections.length ? `Sections, in this order:\n${sections.map((s, i) => `${i + 1}. ${s.blueprint}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

export const DESIGN_DRAFT_KEY = "technova-composer-draft";
