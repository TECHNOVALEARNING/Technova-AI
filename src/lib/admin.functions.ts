import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
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

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("FORBIDDEN");
}

/** Exact e-mail lookup for the credit transfer form. */
export const adminFindUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => z.object({ email: z.string().trim().email().max(320) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("admin_find_user", { _email: data.email });
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

/** Creates credits for a user (D6: not deducted from the admin, 1 000 max per transfer). */
export const adminTransferCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { toUserId: string; amount: number; reason: string; idempotencyKey: string }) => z.object({
    toUserId: z.string().uuid(),
    amount: z.number().int().min(1).max(1000),
    reason: z.string().trim().min(3).max(300),
    idempotencyKey: z.string().min(8).max(100),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "admin_transfer"))) throw new Error("Trop de transferts. Patientez une minute. / Too many transfers.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("admin_transfer_credits", {
      _admin: context.userId, _to: data.toUserId, _amount: data.amount, _reason: data.reason, _key: data.idempotencyKey,
    });
    if (error) {
      await logSecurityEvent(context.userId, "credit_transfer_failed", "warning", { to_user: data.toUserId, amount: data.amount, error: error.message });
      throw new Error(error.message.includes("USER_NOT_FOUND") ? "Utilisateur introuvable. / User not found." : "Le transfert a échoué. / Transfer failed.");
    }
    const r = result as { status: string; transfer_id: string; new_balance?: number };
    if (r.status === "success") await logSecurityEvent(context.userId, "credit_transfer", "info", { to_user: data.toUserId, amount: data.amount, reason: data.reason, transfer_id: r.transfer_id });
    return r;
  });

export const listCreditTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("credit_transfers").select("id,to_user_id,amount,reason,created_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Published sites with reports or a suspension, newest first, for moderation. */
export const adminListSiteReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: reports }, { data: suspended }] = await Promise.all([
      supabaseAdmin.from("site_reports").select("site_id,reason,details,created_at").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("published_sites").select("id").not("disabled_at", "is", null).limit(200),
    ]);
    const ids = [...new Set([...(reports ?? []).map((r) => r.site_id), ...(suspended ?? []).map((s) => s.id)])];
    if (!ids.length) return [];
    const { data: sites } = await supabaseAdmin.from("published_sites").select("id,slug,title,owner_id,disabled_at,disabled_reason,updated_at").in("id", ids);
    return (sites ?? []).map((s) => {
      const mine = (reports ?? []).filter((r) => r.site_id === s.id);
      return { ...s, reports: mine.length, reasons: [...new Set(mine.map((r) => r.reason))], lastDetails: mine.find((r) => r.details)?.details ?? "", lastReport: mine[0]?.created_at ?? null };
    }).sort((a, b) => (b.lastReport ?? "").localeCompare(a.lastReport ?? ""));
  });

export const adminSetSiteSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; suspend: boolean; reason: string }) => z.object({ slug: z.string().min(3).max(40), suspend: z.boolean(), reason: z.string().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "admin_moderation"))) throw new Error("Trop d'actions. Patientez une minute.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_set_site_suspension", { _admin: context.userId, _slug: data.slug, _suspend: data.suspend, _reason: data.reason || "admin" });
    if (error) throw new Error(error.message);
    await logSecurityEvent(context.userId, data.suspend ? "site_suspended_by_admin" : "site_reinstated_by_admin", "info", { slug: data.slug });
    return { ok: true };
  });
