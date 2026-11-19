import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// TechNova Design → « Rédiger avec l'IA »: fills every text field of a design from a short brief, in the user's
// language, keeping each field short enough for its box. Fixed price (designAiCredits), reserved first and charged
// only when usable text comes back; the real provider cost is logged for the admin consumption chart.

const MODEL = "google/gemini-2.5-flash";

const body = z.object({
  format: z.string().max(40),
  design: z.string().max(120),
  brief: z.string().trim().min(5).max(2000),
  lang: z.enum(["fr", "en"]).default("fr"),
  fields: z.array(z.object({ key: z.string().max(40), label: z.string().max(120), max: z.number().int().min(10).max(3000), current: z.string().max(3000) })).min(1).max(30),
});

export const Route = createFileRoute("/api/design-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userIdFromRequest } = await import("@/lib/auth.server");
        const userId = await userIdFromRequest(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const d = parsed.data;
        const fr = d.lang === "fr";
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "design_ai"))) return new Response(rateLimitMessage(d.lang, "design_ai"), { status: 429 });
        const { designAiCredits } = await import("@/lib/design-formats");
        const price = designAiCredits(d.format as never);
        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        const reservation = await reserveCredits(userId, price, "TechNova Design · rédaction IA");
        if (!reservation) return new Response(fr ? `Crédits insuffisants : la rédaction IA coûte ${price} crédits.` : `Not enough credits: AI writing costs ${price} credits.`, { status: 402 });
        const { orComplete, providerMessage, OpenRouterError } = await import("@/lib/openrouter.server");
        const startedAt = Date.now();
        try {
          const spec = d.fields.map((x) => `- "${x.key}" (${x.label}, ${x.max} caractères max) — exemple actuel : ${JSON.stringify(x.current.slice(0, 300))}`).join("\n");
          const r = await orComplete({
            model: MODEL, maxTokens: 3000, temperature: 0.6, signal: request.signal,
            messages: [
              { role: "system", content: `You write the text of a ${d.format} design ("${d.design}") for a TechNova user. Use only facts from the brief; when a detail is missing (phone, address, prices, names), keep a short neutral placeholder in brackets such as [téléphone] instead of inventing it. Never invent testimonials, awards or figures. Respect each field's maximum length, keep the same line structure as the example (one item per line where the example has lines), no Markdown, no emoji. Write in ${fr ? "French" : "English"} unless the brief is clearly written in another language. Reply ONLY with a JSON object mapping each field key to its new text.` },
              { role: "user", content: `Brief:\n${d.brief}\n\nFields:\n${spec}` },
            ],
          });
          const start = r.content.indexOf("{"), end = r.content.lastIndexOf("}");
          const json = JSON.parse(r.content.slice(start, end + 1)) as Record<string, unknown>;
          const out: Record<string, string> = {};
          for (const x of d.fields) { const t = json[x.key]; if (typeof t === "string" && t.trim()) out[x.key] = t.trim().slice(0, x.max); }
          if (!Object.keys(out).length) throw new Error("empty");
          await settleCredits(reservation, price);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: "TechNova Design", input_tokens: r.inputTokens, output_tokens: r.outputTokens, credits: price, latency_ms: Date.now() - startedAt });
          await supabaseAdmin.from("chat_engine_costs").insert({ owner_id: userId, mode: "design", engine: MODEL, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.costUsd || null, credits: price });
          return Response.json({ fields: out, credits: price });
        } catch (e) {
          await releaseCredits(reservation);
          if (e instanceof OpenRouterError) return new Response(providerMessage(e.status), { status: 502 });
          return new Response(fr ? "L'IA n'a pas pu rédiger ce modèle. Réessayez : aucun crédit n'a été prélevé." : "The AI could not write this design. Try again: no credit was charged.", { status: 502 });
        }
      },
    },
  },
});
