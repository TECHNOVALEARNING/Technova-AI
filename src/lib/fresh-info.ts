// Fresh information in the chat. Models only know the world up to their training cutoff, so /api/chat
// (1) tells every model today's date and (2) adds a live web search (OpenRouter web plugin) to the messages
// that ask about current events. Whole words only, accents folded, like textSignals in chat-modes.ts.

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Words that point to something happening now: news, dates, sports, politics, religion, markets, weather.
const NOW = [
  "actualite", "actualites", "actu", "actus", "news", "info", "infos", "nouvelles",
  "aujourd hui", "today", "hier", "yesterday", "demain", "tomorrow", "ce soir", "tonight", "ce matin",
  "cette semaine", "ce week end", "ce mois", "cette annee", "this week", "this month", "this year",
  "en ce moment", "actuellement", "actuel", "actuelle", "actuels", "actuelles", "currently", "right now",
  "dernier", "derniere", "derniers", "dernieres", "latest", "recent", "recente", "recents", "recentes", "recemment", "recently",
  "breaking", "a jour", "up to date", "en direct",
  // sports
  "match", "matchs", "score", "scores", "resultat", "resultats", "classement", "standings", "mercato", "transfert", "transfer",
  "ballon d or", "ligue des champions", "champions league", "premier league", "ligue 1", "liga", "serie a", "bundesliga",
  "coupe du monde", "world cup", "coupe d afrique", "afcon", "jeux olympiques", "olympics", "champion", "vainqueur", "qui a gagne", "who won",
  // politics, institutions, religion
  "election", "elections", "president", "presidente", "premier ministre", "prime minister", "gouvernement", "government", "ministre",
  "pape", "pope", "vatican", "conclave", "archeveque", "eveque",
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

/** Results fetched per web search: each costs about USD 0.004 (≈ 5 credits). */
export const WEB_RESULTS = 3;
/** Worst-case credits added by one web search (results + the pages they put in the prompt). */
export const WEB_SEARCH_CREDITS = Math.ceil(WEB_RESULTS * 0.004 * 1200);

/** System-prompt paragraph with today's date (West Africa Time) and how to treat recent facts. */
export function dateRule(lang: "fr" | "en", now = new Date(), withWeb = false): string {
  const day = now.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const iso = now.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  return `\n\nTODAY'S DATE: ${day} (${iso}). Your training data stops before this date, so you do not know recent events by yourself: never present older facts as current (sports seasons and results, office holders, popes, prices, software versions, laws).`
    + (withWeb
      ? " Live web search results are attached to this request: base anything recent on them, prefer the most recent sources, give dates, and cite the sources as Markdown links. If the results do not answer, say so instead of guessing."
      : " If the user asks about recent or current events, say clearly that your information may be outdated and suggest switching on « Recherche approfondie » (web search with sources) for up-to-date facts.");
}
