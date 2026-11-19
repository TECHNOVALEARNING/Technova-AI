// TechNova Design (Registry → « Présentation et Canva »): the formats a user can create, their real size, how
// they print, and the price of the AI writing help. Client-safe; the templates themselves are original TechNova
// layouts drawn in code (src/components/design/designs.tsx), never copied from Canva, SlidesCarnival or others.

export type DesignFormatId =
  | "presentation" | "document" | "cv" | "invoice" | "brochure" | "flyer" | "instagram_post" | "story"
  | "facebook_post" | "youtube_thumb" | "logo" | "bio" | "business_card" | "invitation" | "email" | "whiteboard";

export type DesignFormat = {
  id: DesignFormatId;
  fr: string; en: string;
  /** Design size in CSS pixels (the page is drawn at this size, then scaled on screen). */
  w: number; h: number;
  /** Print / PDF page size. */
  print: string;
  /** Short size label shown on the cards. */
  size: string;
  group: "slides" | "print" | "social" | "brand" | "web";
};

export const DESIGN_FORMATS: DesignFormat[] = [
  { id: "presentation", fr: "Présentation", en: "Presentation", w: 1280, h: 720, print: "1280px 720px", size: "16:9", group: "slides" },
  { id: "document", fr: "Document", en: "Document", w: 794, h: 1123, print: "A4", size: "A4", group: "print" },
  { id: "cv", fr: "CV", en: "Résumé", w: 794, h: 1123, print: "A4", size: "A4", group: "print" },
  { id: "invoice", fr: "Facture", en: "Invoice", w: 794, h: 1123, print: "A4", size: "A4", group: "print" },
  { id: "brochure", fr: "Brochure", en: "Brochure", w: 1123, h: 794, print: "A4 landscape", size: "A4 · 3 volets", group: "print" },
  { id: "flyer", fr: "Flyer", en: "Flyer", w: 559, h: 794, print: "A5", size: "A5", group: "print" },
  { id: "invitation", fr: "Invitation", en: "Invitation", w: 559, h: 794, print: "A5", size: "A5", group: "print" },
  { id: "business_card", fr: "Carte de visite", en: "Business card", w: 1004, h: 650, print: "85mm 55mm", size: "85 × 55 mm", group: "brand" },
  { id: "logo", fr: "Logo", en: "Logo", w: 800, h: 800, print: "800px 800px", size: "800 × 800", group: "brand" },
  { id: "instagram_post", fr: "Publication Instagram", en: "Instagram post", w: 1080, h: 1080, print: "1080px 1080px", size: "1080 × 1080", group: "social" },
  { id: "story", fr: "Story", en: "Story", w: 1080, h: 1920, print: "1080px 1920px", size: "1080 × 1920", group: "social" },
  { id: "facebook_post", fr: "Publication Facebook", en: "Facebook post", w: 1200, h: 630, print: "1200px 630px", size: "1200 × 630", group: "social" },
  { id: "youtube_thumb", fr: "Miniature YouTube", en: "YouTube thumbnail", w: 1280, h: 720, print: "1280px 720px", size: "1280 × 720", group: "social" },
  { id: "bio", fr: "Bio", en: "Bio", w: 1080, h: 1350, print: "1080px 1350px", size: "1080 × 1350", group: "social" },
  { id: "email", fr: "E-mail", en: "E-mail", w: 640, h: 1000, print: "640px 1000px", size: "640 px", group: "web" },
  { id: "whiteboard", fr: "Tableau blanc", en: "Whiteboard", w: 1600, h: 1000, print: "1600px 1000px", size: "1600 × 1000", group: "web" },
];

export const formatById = (id: string) => DESIGN_FORMATS.find((f) => f.id === id) ?? DESIGN_FORMATS[0]!;

export type FieldKind = "text" | "long" | "image";
export type DesignField = { key: string; label: string; kind: FieldKind; value: string; max?: number };

/** AI writing help (« Rédiger avec l'IA »): fills every text field of the chosen design from a short brief.
 *  Fixed price, charged only when the text comes back; templates, editing and export are free. */
export const DESIGN_AI_CREDITS = 4;
/** A whole presentation (five slides of text) costs a little more. */
export const DESIGN_AI_CREDITS_PRESENTATION = 6;
export const designAiCredits = (format: DesignFormatId) => (format === "presentation" ? DESIGN_AI_CREDITS_PRESENTATION : DESIGN_AI_CREDITS);
