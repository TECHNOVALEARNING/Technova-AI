// Fresh information in the chat. Models only know the world up to their training cutoff, so /api/chat
// (1) tells every model today's date and (2) adds a live web search (OpenRouter web plugin) to the messages
// that ask about current events. Whole words only, accents folded, like textSignals in chat-modes.ts.

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Words that point to something happening now: news, dates, sports, politics, religion, markets, weather.
// Everyday words that also mean something timeless ("dernier", "actuel", "résultat", "info", "récent", "score",
// "champion") are left out on purpose: a web search adds a fee, so it runs only for clear current-events questions.
const NOW = [
  "actualite", "actualites", "actu", "actus", "news", "nouvelles", "dernieres nouvelles",
  "aujourd hui", "today", "hier", "yesterday", "ce soir", "tonight", "ce matin",
  "cette semaine", "ce week end", "ce mois ci", "cette annee", "this week", "this month", "this year",
  "en ce moment", "actuellement", "currently", "right now", "latest news", "recemment", "recently",
  "breaking", "en direct",
  // sports
  "match", "matchs", "classement", "standings", "mercato", "transfert", "transfer",
  "ballon d or", "ligue des champions", "champions league", "premier league", "ligue 1", "liga", "serie a", "bundesliga",
  "coupe du monde", "world cup", "coupe d afrique", "afcon", "jeux olympiques", "olympics", "qui a gagne", "who won",
  // politics, institutions, religion
  "election", "elections", "president", "presidente", "premier ministre", "prime minister", "gouvernement", "government",
  "pape", "pope", "vatican", "conclave",
  // markets and daily life
  "bourse", "cours du", "prix du", "taux de change", "exchange rate", "bitcoin", "inflation", "meteo", "weather",
];

/** True when the message asks about current events (or a year from 2025 on), so a web search is worth it. */
export function needsFreshInfo(text: string): boolean {
  if (!text.trim()) return false;
  const t = ` ${fold(text).replace(/[^a-z0-9]+/g, " ")} `;
  if (/ 20(2[5-9]|[3-9]\d) /.test(t)) return true;
  return NOW.some((w) => t.includes(` ${w} `));
}

/** Results fetched per web search (the search costs TechNova about USD 0.007, ≈ 9 credits, measured 2026-11-16). */
export const WEB_RESULTS = 3;
/** What a web search adds to the message price: a small fixed fee, TechNova absorbs the rest of the search cost. */
export const WEB_SEARCH_FEE = 2;

/** System-prompt paragraph with today's date (West Africa Time) and how to treat recent facts. */
export function dateRule(lang: "fr" | "en", now = new Date(), withWeb = false): string {
  const day = now.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const iso = now.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  return `\n\nTODAY'S DATE: ${day} (${iso}). Your training data stops before this date, so you do not know recent events by yourself: never present older facts as current (sports seasons and results, office holders, popes, prices, software versions, laws).`
    + (withWeb
      ? " Live web search results are attached to this request: base anything recent on them, prefer the most recent sources, give dates, and cite the sources as Markdown links. If the results do not answer, say so instead of guessing."
      : " If the user asks about recent or current events, say clearly that your information may be outdated and suggest switching on « Recherche approfondie » (web search with sources) for up-to-date facts.");
}
