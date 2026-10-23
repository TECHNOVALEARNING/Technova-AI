import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { openRouterModelIds } from "@/lib/chat-models";

// Arena: one prompt, two models. "Random" pairs are blind (names revealed after the vote)
// and are the only ones counted in the public ranking. Both answers are billed like chat replies.

const ARENA_MAX_TOKENS = 1024;
const RANDOM = "random";
const models = Object.keys(openRouterModelIds);

export const runArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; modelA: string; modelB: string; lang: "fr" | "en" }) => z.object({
    prompt: z.string().trim().min(2).max(4000),
    modelA: z.string().refine((m) => m === RANDOM || models.includes(m)),
    modelB: z.string().refine((m) => m === RANDOM || models.includes(m)),
    lang: z.enum(["fr", "en"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const fr = data.lang === "fr";
    const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "arena"))) throw new Error(rateLimitMessage(data.lang, "arena"));
    const blind = data.modelA === RANDOM || data.modelB === RANDOM;
    const pool = [...models].sort(() => Math.random() - 0.5);
    const a = data.modelA === RANDOM ? pool.find((m) => m !== data.modelB)! : data.modelA;
    const b = data.modelB === RANDOM ? pool.find((m) => m !== a)! : data.modelB;
    if (a === b) throw new Error(fr ? "Choisissez deux modèles différents." : "Pick two different models.");

    const { creditCost, estimateTokens } = await import("@/lib/model-pricing");
    const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
    const { orComplete, providerMessage, OpenRouterError } = await import("@/lib/openrouter.server");
    const system = fr ? "Réponds en français, de façon claire et utile. Utilise le Markdown si utile." : "Answer in English, clearly and helpfully. Use Markdown when useful.";
    const inputTokens = estimateTokens(system + data.prompt);
    const worst = creditCost(a, inputTokens, ARENA_MAX_TOKENS) + creditCost(b, inputTokens, ARENA_MAX_TOKENS);
    const reservation = worst > 0 ? await reserveCredits(context.userId, worst, `Arena · ${a} vs ${b}`) : null;
    if (worst > 0 && !reservation) throw new Error(fr ? `Crédits insuffisants : ce duel demande jusqu'à ${worst} crédits.` : `Not enough credits: this battle needs up to ${worst} credits.`);

    const ask = (model: string) => orComplete({ model: openRouterModelIds[model]!, maxTokens: ARENA_MAX_TOKENS, messages: [{ role: "system", content: system }, { role: "user", content: data.prompt }] });
    const [ra, rb] = await Promise.allSettled([ask(a), ask(b)]);
    const cost = (model: string, r: PromiseSettledResult<{ inputTokens: number; outputTokens: number }>) =>
      r.status === "fulfilled" ? creditCost(model, r.value.inputTokens || inputTokens, r.value.outputTokens) : 0;
    const credits = cost(a, ra) + cost(b, rb);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (reservation) { if (credits > 0) await settleCredits(reservation, credits); else await releaseCredits(reservation); }
    if (ra.status === "rejected" || rb.status === "rejected") {
      const failed = (ra.status === "rejected" ? ra.reason : (rb as PromiseRejectedResult).reason) as unknown;
      throw new Error(providerMessage(failed instanceof OpenRouterError ? failed.status : 502));
    }
    await supabaseAdmin.from("usage_logs").insert([
      { owner_id: context.userId, model: a, input_tokens: ra.value.inputTokens, output_tokens: ra.value.outputTokens, credits: cost(a, ra), latency_ms: 0 },
      { owner_id: context.userId, model: b, input_tokens: rb.value.inputTokens, output_tokens: rb.value.outputTokens, credits: cost(b, rb), latency_ms: 0 },
    ]);
    const { data: battle, error } = await supabaseAdmin.from("arena_battles")
      .insert({ owner_id: context.userId, model_a: a, model_b: b, blind, credits }).select("id").single();
    if (error || !battle) throw new Error(fr ? "Le duel n'a pas pu être enregistré." : "The battle could not be saved.");
    return { battleId: battle.id, answerA: ra.value.content, answerB: rb.value.content, credits, models: blind ? null : { a, b } };
  });

export const voteArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { battleId: string; winner: "a" | "b" | "tie" }) => z.object({ battleId: z.string().uuid(), winner: z.enum(["a", "b", "tie"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // One vote per battle, only by its owner.
    const { data: row } = await supabaseAdmin.from("arena_battles").update({ winner: data.winner, voted_at: new Date().toISOString() })
      .eq("id", data.battleId).eq("owner_id", context.userId).is("winner", null).select("model_a,model_b").maybeSingle();
    if (!row) throw new Error("Vote déjà enregistré ou duel introuvable. / Already voted or battle not found.");
    return { a: row.model_a, b: row.model_b };
  });

export const getArenaLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("arena_leaderboard");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
