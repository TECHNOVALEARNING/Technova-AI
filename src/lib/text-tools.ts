// "Humaniser un texte" and "Résumé d'audio" journeys (chips under the chat box). Client-safe: options, prices
// and the prompts the server builds from them. The server re-checks every value and bills the fixed price.

type Lang = "fr" | "en";
type Opt = { id: string; fr: string; en: string; rule: string };

// ---------------------------------------------------------------- Humanize

export const humanizeTones: Opt[] = [
  { id: "natural", fr: "Naturel", en: "Natural", rule: "a natural, fluid voice, like a skilled person writing it themselves" },
  { id: "teaching", fr: "Pédagogique", en: "Teaching", rule: "a clear teaching voice: simple words, one idea per sentence, short examples where useful" },
  { id: "casual", fr: "Familier", en: "Casual", rule: "a relaxed, friendly everyday voice (tutoiement in French when it fits), contractions allowed, no slang overload" },
  { id: "professional", fr: "Professionnel", en: "Professional", rule: "a professional, confident and courteous business voice" },
  { id: "academic", fr: "Académique", en: "Academic", rule: "a careful academic voice: precise, nuanced, no hype, keeps every source and figure" },
  { id: "persuasive", fr: "Persuasif", en: "Persuasive", rule: "a persuasive voice: concrete benefits, direct address, a clear call to action, never false claims" },
  { id: "warm", fr: "Chaleureux", en: "Warm", rule: "a warm, empathetic and human voice" },
];
export const humanizeFormats: Opt[] = [
  { id: "keep", fr: "Garder la structure", en: "Keep the structure", rule: "keep the original structure (headings, lists, paragraphs)" },
  { id: "prose", fr: "Paragraphes fluides", en: "Flowing paragraphs", rule: "flowing paragraphs, lists turned into connected sentences" },
  { id: "email", fr: "E-mail", en: "E-mail", rule: "an e-mail: subject line, greeting, body, sign-off placeholder [Votre nom]" },
  { id: "social", fr: "Post réseaux sociaux", en: "Social post", rule: "a social media post (LinkedIn/Facebook): strong first line, short paragraphs, at most 3 relevant hashtags" },
  { id: "blog", fr: "Article de blog", en: "Blog article", rule: "a blog article: title, short intro, sections with subheadings, conclusion" },
  { id: "whatsapp", fr: "Message WhatsApp", en: "WhatsApp message", rule: "a short conversational chat message, a few lines, no headings" },
];
export const humanizeLengths: Opt[] = [
  { id: "same", fr: "Même longueur", en: "Same length", rule: "about the same length as the original" },
  { id: "shorter", fr: "Plus court", en: "Shorter", rule: "about 30-40% shorter, keeping every key point" },
  { id: "longer", fr: "Plus développé", en: "Longer", rule: "about 30-50% longer, adding explanation, never invented facts" },
];

export const HUMANIZE_MIN_CHARS = 40;
export const HUMANIZE_MAX_CHARS = 30_000;
export const wordCount = (text: string) => (text.trim().match(/\S+/g) ?? []).length;
/** Fixed price: 4 credits up to 1 500 words, 8 above (the real cost is billed if it is ever higher). */
export const humanizeCredits = (words: number) => (words <= 1500 ? 4 : 8);

export type HumanizeTask = { kind: "humanize"; tone: string; format: string; length: string; audience?: string };

const pick = (list: Opt[], id: string) => list.find((o) => o.id === id) ?? list[0]!;
export const optLabel = (list: Opt[], id: string, lang: Lang) => pick(list, id)[lang];

export function humanizePrompt(t: HumanizeTask): string {
  return [
    "You are TechNova's text humanizer. The user's message starts with ONE line summarising their settings, then a blank line, then the text to rewrite (usually written by an AI).",
    "Rewrite ONLY that text so it reads as if a thoughtful person wrote it:",
    "- vary sentence length and rhythm; prefer concrete words; use natural transitions;",
    "- remove AI tics: stock openers and closers (\"In today's world\", \"Dans un monde en constante évolution\", \"En conclusion\", \"N'hésitez pas\"), empty superlatives, hedging filler, the systematic rule of three, excessive bold, emoji and em dashes;",
    "- keep the meaning, every fact, figure, name, date, quote and link exactly; never invent facts, sources or experiences;",
    "- write in the same language as the text unless it is clearly mixed.",
    `Voice: ${pick(humanizeTones, t.tone).rule}.`,
    `Format: ${pick(humanizeFormats, t.format).rule}.`,
    `Length: ${pick(humanizeLengths, t.length).rule}.`,
    t.audience ? `Intended reader: ${t.audience.slice(0, 200)} (adapt vocabulary to them).` : "",
    "Reply with the rewritten text only — no preamble, no notes, no list of changes, no quotation marks around it. Never claim the result is undetectable by AI detectors.",
  ].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------- Audio summary

export const audioSummaryTypes: (Opt & { hintFr: string; hintEn: string })[] = [
  { id: "meeting", fr: "Compte rendu de réunion", en: "Meeting minutes", hintFr: "Contexte, sujets, décisions, actions", hintEn: "Context, topics, decisions, actions",
    rule: "formal meeting minutes: title and date if mentioned, participants (as heard; 'Intervenant 1/2' when names are unknown), agenda/topics discussed with the key points of each, decisions taken, action items as a Markdown table (Action | Responsable | Échéance — 'à préciser' when not said), open questions" },
  { id: "key_points", fr: "Points clés", en: "Key points", hintFr: "L'essentiel en puces", hintEn: "The essentials as bullets",
    rule: "a one-paragraph overview followed by the key points as bullets grouped under short headings" },
  { id: "actions", fr: "Décisions et actions", en: "Decisions and actions", hintFr: "Qui fait quoi, et quand", hintEn: "Who does what, and when",
    rule: "only what was decided and what must be done: a list of decisions, then a Markdown table of action items (Action | Responsable | Échéance | Priorité), then pending questions" },
  { id: "short", fr: "Résumé court", en: "Short summary", hintFr: "5 à 8 lignes", hintEn: "5 to 8 lines",
    rule: "a short summary of 5 to 8 lines in plain paragraphs, nothing else" },
  { id: "lecture", fr: "Notes de cours", en: "Lecture notes", hintFr: "Pour réviser ou former", hintEn: "To study or train",
    rule: "structured study notes: main concepts with definitions, explanations, examples given, key terms in bold, then 5 review questions with short answers" },
  { id: "transcript", fr: "Transcription complète", en: "Full transcript", hintFr: "Tout le texte, nettoyé", hintEn: "Every word, cleaned up",
    rule: "the full transcript, cleaned of hesitations and repetitions, split into paragraphs with speaker labels ('Intervenant 1:' when names are unknown) and [mm:ss] timestamps every few minutes" },
];
export const audioDetails: Opt[] = [
  { id: "brief", fr: "Bref", en: "Brief", rule: "be concise" },
  { id: "standard", fr: "Standard", en: "Standard", rule: "a normal level of detail" },
  { id: "detailed", fr: "Détaillé", en: "Detailed", rule: "be thorough: keep figures, arguments and nuances" },
];
export const audioLanguages: Opt[] = [
  { id: "fr", fr: "Français", en: "French", rule: "French" },
  { id: "en", fr: "Anglais", en: "English", rule: "English" },
  { id: "source", fr: "Langue de l'audio", en: "Audio's language", rule: "the main language spoken in the audio" },
];

/** Fixed price: 4 credits per started minute, 10 credits minimum. */
export const AUDIO_CREDITS_PER_MINUTE = 4;
export const AUDIO_MIN_CREDITS = 10;
export const AUDIO_MAX_MINUTES = 120;
/** Browser-side conversion: mono 16 kHz MP3 at 32 kb/s, cut in pieces of this many minutes. */
export const AUDIO_CHUNK_MINUTES = 15;
/** Owner folder of the uploaded pieces in the private user-files bucket (deleted after the summary). */
export const AUDIO_FOLDER = "audio-summary";
export const audioCredits = (seconds: number) => Math.max(AUDIO_MIN_CREDITS, Math.ceil(seconds / 60) * AUDIO_CREDITS_PER_MINUTE);

export type AudioTask = { type: string; detail: string; language: string; context?: string; filename: string; seconds: number; paths: string[] };

export const audioRules = (t: Pick<AudioTask, "type" | "detail" | "language">) => ({
  summary: pick(audioSummaryTypes, t.type).rule,
  detail: pick(audioDetails, t.detail).rule,
  language: pick(audioLanguages, t.language).rule,
  transcript: pick(audioSummaryTypes, t.type).id === "transcript",
});
