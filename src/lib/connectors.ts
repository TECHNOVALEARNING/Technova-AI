// Browser-safe connector catalog (no secrets).
export type ConnectorId = "github" | "google_drive" | "notion";
export type CatalogEntry = { id: string; name: string; fr: string; en: string; kind: "oauth" | "soon" };

export const CONNECTOR_CATALOG: CatalogEntry[] = [
  { id: "github", name: "GitHub", fr: "Envoyez vos sites générés dans vos dépôts.", en: "Push generated sites to your repositories.", kind: "oauth" },
  { id: "google_drive", name: "Google Drive", fr: "Importez documents et images dans le chat.", en: "Import documents and images into chat.", kind: "oauth" },
  { id: "notion", name: "Notion", fr: "Utilisez vos pages comme contexte.", en: "Use your pages as context.", kind: "oauth" },
  { id: "vercel", name: "Vercel", fr: "Déployez vos sites sur votre compte Vercel.", en: "Deploy sites to your Vercel account.", kind: "soon" },
  { id: "netlify", name: "Netlify", fr: "Déployez vos sites sur votre compte Netlify.", en: "Deploy sites to your Netlify account.", kind: "soon" },
  { id: "stripe", name: "Stripe", fr: "Ajoutez des paiements à vos sites générés.", en: "Add payments to generated sites.", kind: "soon" },
];

export const SITE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export function toSlug(input: string) {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
