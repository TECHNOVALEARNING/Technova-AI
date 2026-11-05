// The three chat modes shown in the composer (docs/prompt-v6.3.md §3). Client-safe: the model behind each
// mode is chosen on the server (src/routes/api/chat.ts) and is never shown in the interface.

export type ChatTier = "eclair" | "equilibre" | "expert";
export const chatTierIds: readonly ChatTier[] = ["eclair", "equilibre", "expert"];
/** What the composer sends: one of the three modes, or TechNova Smart, which picks the mode for each message. */
export type ChatChoice = ChatTier | "smart";
export const defaultChatChoice: ChatChoice = "smart";
export const smartChoice = { fr: "TechNova Smart", en: "TechNova Smart", hintFr: "Choisit le bon mode pour chaque demande", hintEn: "Picks the right mode for each request" };

export const chatTiers: Record<ChatTier, { emoji: string; fr: string; en: string; hintFr: string; hintEn: string }> = {
  eclair: { emoji: "⚡", fr: "Éclair", en: "Flash", hintFr: "Question rapide, idée, reformulation", hintEn: "Quick question, idea, rewording" },
  equilibre: { emoji: "⚖️", fr: "Équilibré", en: "Balanced", hintFr: "Coder une page, analyser un PDF, corriger un bug", hintEn: "Code a page, analyse a PDF, fix a bug" },
  expert: { emoji: "🧠", fr: "Expert", en: "Expert", hintFr: "App complète avec connexion, paiement MoMo, admin", hintEn: "Full app with sign-in, MoMo payment, admin" },
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

/** TechNova Smart: the cheapest mode that fits the request (Expert only when the plan includes it). */
export function smartTier(text: string, hasFile: boolean, planTier: number): ChatTier {
  const t = text.toLowerCase();
  const has = (words: string[]) => words.some((w) => t.includes(w));
  const big = t.length > 1500 || has(["application complète", "app complète", "full app", "architecture", "système complet", "full system", "saas", "plateforme", "authentification", "paiement", "momo", "mobile money", "tableau de bord", "dashboard admin"]);
  if (big && planTier >= EXPERT_MIN_TIER) return "expert";
  if (big || hasFile || t.length > 400 || has(["code", "bug", "erreur", "error", "sql", "api", "react", "python", "php", "javascript", "typescript", "html", "css", "fonction", "function", "script", "analyse", "analyze", "pdf", "page", "site", "landing"])) return "equilibre";
  return "eclair";
}
