import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openRouterModelIds } from "@/lib/chat-models";
import { creditCost, estimateTokens } from "@/lib/model-pricing";

// Public developer API: `Authorization: Bearer tn_live_…` (keys are created in the
// dashboard and stored hashed). Only models activated for TechNova chat are accepted,
// and every reply is debited from the key owner's credit ledger.
const bodySchema = z.object({
  model: z.string().max(120),
  messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(40_000) })).min(1).max(60),
  max_tokens: z.number().int().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  idempotency_key: z.string().min(8).max(100).optional(),
});

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

async function ownerForKey(request: Request) {
  const secret = /^Bearer (tn_live_[a-f0-9]{48})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!secret) return null;
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(secret).digest("hex");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("api_keys").select("id,owner_id").eq("key_hash", hash).maybeSingle();
  if (!data) return null;
  // Suspended accounts lose API access immediately (keys never expire on their own).
  const { data: suspended } = await supabaseAdmin.from("account_suspensions").select("user_id").eq("user_id", data.owner_id).maybeSingle();
  if (suspended) return null;
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.owner_id;
}

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ownerId = await ownerForKey(request);
        if (!ownerId) return fail(401, "invalid_api_key", "Missing or invalid API key.");
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(ownerId, "api"))) return fail(429, "rate_limited", rateLimitMessage("en", "api"));
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return fail(400, "invalid_request", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
        const d = parsed.data;

        const name = Object.entries(openRouterModelIds).find(([n, id]) => id === d.model || n === d.model)?.[0];
        if (!name) return fail(400, "model_not_available", `Model not available. Use one of: ${Object.values(openRouterModelIds).join(", ")}`);
        const apiKey = process.env["OPENROUTER_API_KEY"];
        if (!apiKey) return fail(503, "not_configured", "The model provider is not configured.");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (d.idempotency_key) {
          const { data: seen } = await supabaseAdmin.from("api_idempotency").select("response").eq("owner_id", ownerId).eq("key", d.idempotency_key).maybeSingle();
          if (seen) return json(seen.response);
        }
        const maxTokens = d.max_tokens ?? 1024;
        const estimatedIn = estimateTokens(d.messages.map((m) => m.content).join(" "));
        const { data: ledger } = await supabaseAdmin.from("credit_transactions").select("amount").eq("owner_id", ownerId);
        const balance = (ledger ?? []).reduce((sum, row) => sum + row.amount, 0);
        const worst = creditCost(name, estimatedIn, maxTokens);
        if (worst > 0 && balance < worst) return fail(402, "insufficient_credits", "Not enough credits for this request.");

        const startedAt = Date.now();
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]),
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "TechNova AI Hub API" },
          body: JSON.stringify({ model: openRouterModelIds[name], messages: d.messages, max_tokens: maxTokens, ...(d.temperature !== undefined ? { temperature: d.temperature } : {}) }),
        }).catch(() => null);
        if (!upstream?.ok) {
          console.error("OpenRouter API error", upstream?.status, (await upstream?.text().catch(() => ""))?.slice(0, 300));
          return fail(502, "upstream_error", "The model could not answer. Try again.");
        }
        const out = (await upstream.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        const content = out.choices?.[0]?.message?.content ?? "";
        const inputTokens = out.usage?.prompt_tokens ?? estimatedIn;
        const outputTokens = out.usage?.completion_tokens ?? estimateTokens(content);
        const credits = creditCost(name, inputTokens, outputTokens);
        await supabaseAdmin.from("usage_logs").insert({ owner_id: ownerId, model: name, input_tokens: inputTokens, output_tokens: outputTokens, credits, latency_ms: Date.now() - startedAt });
        if (credits > 0) await supabaseAdmin.from("credit_transactions").insert({ owner_id: ownerId, amount: -credits, kind: "usage", label: `API · ${name}` });

        const response = {
          id: `tn_${crypto.randomUUID()}`,
          object: "chat.completion",
          model: openRouterModelIds[name],
          choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: out.choices?.[0]?.finish_reason ?? "stop" }],
          usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens, credits },
        };
        if (d.idempotency_key) await supabaseAdmin.from("api_idempotency").insert({ owner_id: ownerId, key: d.idempotency_key, response: response as never });
        return json(response);
      },
    },
  },
});
