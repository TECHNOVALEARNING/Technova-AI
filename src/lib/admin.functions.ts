import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: data === true };
  });

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS lets only admins read this table; non-admins get an empty list.
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin !== true) return { admin: false, events: [] };
    const { data, error } = await context.supabase.from("security_events").select("id,user_id,kind,severity,detail,created_at").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return { admin: true, events: data ?? [] };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin !== true) return { admin: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [profiles, credits, usage, media] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("credit_transactions").select("amount,kind"),
      supabaseAdmin.from("usage_logs").select("model,input_tokens,output_tokens,credits").gte("created_at", since),
      supabaseAdmin.from("media_generations").select("kind,status,charged_credits").gte("created_at", since),
    ]);
    const ledger = credits.data ?? [];
    const distributed = ledger.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const consumed = ledger.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);
    const byModel = new Map<string, { calls: number; credits: number; tokens: number }>();
    for (const row of usage.data ?? []) {
      const entry = byModel.get(row.model) ?? { calls: 0, credits: 0, tokens: 0 };
      entry.calls += 1;
      entry.credits += row.credits;
      entry.tokens += row.input_tokens + row.output_tokens;
      byModel.set(row.model, entry);
    }
    const models = [...byModel.entries()].map(([model, s]) => ({ model, ...s })).sort((a, b) => b.credits - a.credits);
    const mediaRows = media.data ?? [];
    return {
      admin: true as const,
      users: profiles.count ?? 0,
      creditsDistributed: distributed,
      creditsConsumed: consumed,
      models,
      media: {
        total: mediaRows.length,
        images: mediaRows.filter((r) => r.kind === "image").length,
        videos: mediaRows.filter((r) => r.kind === "video").length,
        failed: mediaRows.filter((r) => r.status === "fail").length,
        charged: mediaRows.reduce((s, r) => s + (r.charged_credits ?? 0), 0),
      },
    };
  });
