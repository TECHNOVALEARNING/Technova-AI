// Search and social metadata for public pages: one canonical URL per page (www.technovaihub.com),
// matching Open Graph / X tags, optional noindex, and JSON-LD structured data built from the site's
// real content (packs, FAQ). Root defaults (og:image, site name, icons) live in __root.tsx.
import { content } from "@/lib/i18n";
import { fallbackPacks } from "@/lib/public-pricing";

export const SITE_URL = "https://www.technovaihub.com";
const LOGO = `${SITE_URL}/icons/icon-512.png`;

type PageSeo = {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
  jsonLd?: object[];
  /** First-screen image to fetch early (Largest Contentful Paint). */
  preloadImage?: string;
};

export function pageHead({ path, title, description, ogTitle, ogDescription, noindex, jsonLd, preloadImage }: PageSeo) {
  const url = SITE_URL + path;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: ogTitle ?? title },
      { property: "og:description", content: ogDescription ?? description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle ?? title },
      { name: "twitter:description", content: ogDescription ?? description },
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      ...(noindex ? [] : [{ rel: "canonical", href: url }]),
      ...(preloadImage ? [{ rel: "preload", as: "image", href: preloadImage, fetchPriority: "high" as const }] : []),
    ],
    scripts: (jsonLd ?? []).map((data) => ({ type: "application/ld+json", children: JSON.stringify(data) })),
  };
}

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "TechNova AI Hub",
  url: SITE_URL,
  logo: LOGO,
  email: "support@technovaihub.com",
  sameAs: [
    "https://www.facebook.com/share/18GYGMg9o8/",
    "https://www.instagram.com/technova.learning",
    "https://www.linkedin.com/company/130533963",
    "https://www.youtube.com/@Technova_learning",
    "https://www.tiktok.com/@technova.learning",
  ],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "TechNova AI Hub",
  url: SITE_URL,
  inLanguage: "fr",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

/** The app with its four credit packs (prices in FCFA, as charged). */
export const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TechNova AI Hub",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  inLanguage: ["fr", "en", "es", "pt"],
  publisher: { "@id": `${SITE_URL}/#organization` },
  offers: fallbackPacks.map((p) => ({
    "@type": "Offer",
    name: `Pack ${p.name} — ${p.credits.toLocaleString("fr-FR")} crédits`,
    price: p.price_xof,
    priceCurrency: "XOF",
    url: `${SITE_URL}/tarifs`,
    availability: "https://schema.org/InStock",
  })),
};

/** FAQ exactly as shown on the home page (French). */
export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: content.fr.faq.items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export const breadcrumbLd = (name: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
    { "@type": "ListItem", position: 2, name, item: SITE_URL + path },
  ],
});
