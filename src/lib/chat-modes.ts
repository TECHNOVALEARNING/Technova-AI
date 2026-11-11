// The three chat modes shown in the composer (docs/prompt-v6.3.md §3). Client-safe: the model behind each
// mode is chosen on the server (src/routes/api/chat.ts) and is never shown in the interface.

export type ChatTier = "eclair" | "equilibre" | "expert";
export const chatTierIds: readonly ChatTier[] = ["eclair", "equilibre", "expert"];
/** What the composer sends: one of the three modes, or TechNova Smart, which picks the mode for each message. */
export type ChatChoice = ChatTier | "smart";
export const defaultChatChoice: ChatChoice = "eclair";
export const smartChoice = { fr: "TechNova Smart", en: "TechNova Smart", hintFr: "Choisit le bon mode pour chaque demande", hintEn: "Picks the right mode for each request" };

export const chatTiers: Record<ChatTier, { emoji: string; fr: string; en: string; hintFr: string; hintEn: string }> = {
  eclair: { emoji: "⚡", fr: "Éclair", en: "Flash", hintFr: "Réponse rapide", hintEn: "Quick answer" },
  equilibre: { emoji: "⚖️", fr: "Équilibré", en: "Balanced", hintFr: "Réponses polyvalentes", hintEn: "Versatile answers" },
  expert: { emoji: "🧠", fr: "Expert", en: "Expert", hintFr: "Réflexion plus profonde pour de meilleures réponses", hintEn: "Deeper thinking for better answers" },
};

/** Starter and Essential use Éclair and Équilibré; Expert opens from Creator, and Pro gets a stronger engine behind the same button. */
export const EXPERT_MIN_TIER = 2;
export const PRO_TIER = 3;

/** Credits for one message: without / with an attached file. */
export function chatTierCredits(tier: ChatTier, hasFile: boolean, planTier: number): number {
  if (tier === "eclair") return hasFile ? 2 : 1;
  if (tier === "equilibre") return hasFile ? 4 : 3;
  return planTier >= PRO_TIER ? (hasFile ? 65 : 60) : (hasFile ? 26 : 25);
}

export const isChatTier = (value: unknown): value is ChatTier => typeof value === "string" && (chatTierIds as readonly string[]).includes(value);
export const isChatChoice = (value: unknown): value is ChatChoice => value === "smart" || isChatTier(value);

// TechNova Smart reads the request with whole words only (accents ignored): "ui" no longer matches "oui",
// nor "api" "rapide". Everyday words ("paiement", "mobile money", "plateforme") never raise the price.
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const CODE = ["code", "coder", "bug", "bugs", "debug", "debugger", "erreur", "error", "exception", "sql", "api", "react", "angular", "nextjs", "node", "nodejs", "python", "php", "laravel", "django", "javascript", "typescript", "java", "kotlin", "swift", "html", "css", "tailwind", "fonction", "function", "script", "regex", "json", "backend", "frontend", "supabase", "firebase", "docker", "git", "github", "algorithme", "algorithm", "compile", "deploy"];
const ANALYSIS = ["analyse", "analyser", "analyze", "analysis", "resume", "resumer", "summarize", "summary", "compare", "comparer", "rapport", "report", "tableau", "excel", "pdf", "document", "contrat", "dissertation", "memoire", "business plan", "strategie", "strategy", "landing page", "site web", "website"];
const HEAVY = ["architecture", "application complete", "app complete", "full app", "full stack", "fullstack", "systeme complet", "full system", "saas", "microservices", "refactor", "refactoriser", "migration", "base de donnees complete"];

/** Whole-word signals of a message, shared by the chat modes and the Smart agents. */
export function textSignals(text: string) {
  const t = ` ${fold(text).replace(/[^a-z0-9+#]+/g, " ")} `;
  const count = (list: string[]) => list.filter((w) => t.includes(` ${w} `)).length;
  const code = count(CODE), analysis = count(ANALYSIS), heavyWords = count(HEAVY);
  const length = text.length;
  // Heavy: a really big job — very long, or long and clearly technical with a project-scale word.
  const heavy = length > 4000 || (length > 1500 && heavyWords > 0 && code > 0) || (length > 2500 && code >= 3);
  return { code: code > 0, analysis: analysis > 0, heavy, long: length > 700 };
}

/** TechNova Smart: Éclair for everyday questions, Équilibré for code, analysis, files or long messages,
 *  Expert only for a really heavy job and only when the plan includes it. */
export function smartTier(text: string, hasFile: boolean, planTier: number): ChatTier {
  const s = textSignals(text);
  if (s.heavy && planTier >= EXPERT_MIN_TIER) return "expert";
  if (s.heavy || hasFile || s.long || s.code || s.analysis) return "equilibre";
  return "eclair";
}
