// The three chat modes shown in the composer (docs/prompt-v6.3.md §3). Client-safe: the model behind each
// mode is chosen on the server (src/routes/api/chat.ts) and is never shown in the interface.

export type ChatTier = "eclair" | "equilibre" | "expert";
export const chatTierIds: readonly ChatTier[] = ["eclair", "equilibre", "expert"];
export const defaultChatTier: ChatTier = "equilibre";

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
