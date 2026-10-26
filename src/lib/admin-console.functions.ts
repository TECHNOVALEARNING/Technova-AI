import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin console: revenue, provider balances, users (suspend, admin role), payments, credit packs and
// public Registry moderation. Every function checks the admin role server-side before using service_role.

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function requireAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("FORBIDDEN");
}
async function moderationLimit(userId: string) {
  const { hitRateLimit } = await import("@/lib/security.server");
  if (!(await hitRateLimit(userId, "admin_moderation"))) throw new Error("Trop d'actions. Patientez une minute. / Too many actions.");
}

/** Provider balances: what is left to pay the AI providers (USD for OpenRouter, kie.ai credits for media). */
async function providerBalances() {
  const get = async (url: string, key: string | undefined) => {
    if (!key) return null;
    try { const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6000) }); return r.ok ? await r.json() : null; } catch { return null; }
  };
  const [or, kie] = await Promise.all([
    get("https://openrouter.ai/api/v1/credits", process.env["OPENROUTER_API_KEY"]) as Promise<{ data?: { total_credits?: number; total_usage?: number } } | null>,
    get("https://api.kie.ai/api/v1/chat/credit", process.env["KIE_API_KEY"]) as Promise<{ data?: number } | null>,
  ]);
  return {
    textUsd: or?.data ? Math.round(((or.data.total_credits ?? 0) - (or.data.total_usage ?? 0)) * 100) / 100 : null,
    // kie.ai credits cost $0.005 each.
    mediaUsd: typeof kie?.data === "number" ? Math.round(kie.data * 0.005 * 100) / 100 : null,
    mediaCredits: typeof kie?.data === "number" ? kie.data : null,
  };
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [revenue, credits, balances] = await Promise.all([
      supabaseAdmin.rpc("admin_revenue"),
      supabaseAdmin.rpc("admin_credit_totals"),
      providerBalances(),
    ]);
    const r = revenue.data?.[0]; const c = credits.data?.[0];
    // Provider cost of consumed credits: prices are set at 1 200 credits per US dollar.
    const consumedUsd = c ? Math.round((c.consumed / 1200) * 100) / 100 : 0;
    return {
      revenue: { total: r?.revenue_total ?? 0, d30: r?.revenue_30d ?? 0, today: r?.revenue_today ?? 0, paid30: r?.paid_30d ?? 0, pending30: r?.pending_30d ?? 0, failed30: r?.failed_30d ?? 0, buyers: r?.buyers ?? 0 },
      credits: { distributed: c?.distributed ?? 0, consumed: c?.consumed ?? 0, purchased: c?.purchased ?? 0, granted: c?.granted ?? 0, consumedUsd },
      balances,
    };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ search: z.string().trim().max(120).default(""), page: z.number().int().min(1).max(10_000).default(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const size = 25;
    const search = data.search.replace(/[%_]/g, "");
    const [{ data: rows, error }, { data: total }] = await Promise.all([
      supabaseAdmin.rpc("admin_list_users", { _search: search, _limit: size, _offset: (data.page - 1) * size }),
      supabaseAdmin.rpc("admin_count_users", { _search: search }),
    ]);
    if (error) throw new Error(error.message);
    return { users: rows ?? [], total: total ?? 0, pageSize: size, me: context.userId };
  });

/** Suspends or reinstates an account: sign-in is blocked (auth ban) and API keys stop working. */
export const adminSetUserSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), suspend: z.boolean(), reason: z.string().trim().max(300).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await moderationLimit(context.userId);
    if (data.userId === context.userId) throw new Error("Vous ne pouvez pas suspendre votre propre compte. / You cannot suspend yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", data.userId).eq("role", "admin").maybeSingle();
    if (target && data.suspend) throw new Error("Retirez d'abord le rôle administrateur. / Remove the admin role first.");
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.suspend ? "876000h" : "none" });
    if (banError) throw new Error(banError.message);
    if (data.suspend) await supabaseAdmin.from("account_suspensions").upsert({ user_id: data.userId, reason: data.reason, suspended_by: context.userId });
    else await supabaseAdmin.from("account_suspensions").delete().eq("user_id", data.userId);
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, data.suspend ? "account_suspended" : "account_reinstated", "warning", { user: data.userId, reason: data.reason });
    return { ok: true };
  });

export const adminSetAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await moderationLimit(context.userId);
    if (data.userId === context.userId && !data.admin) throw new Error("Vous ne pouvez pas retirer votre propre rôle. / You cannot remove your own role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { data: suspended } = await supabaseAdmin.from("account_suspensions").select("user_id").eq("user_id", data.userId).maybeSingle();
      if (suspended) throw new Error("Ce compte est suspendu. / This account is suspended.");
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, data.admin ? "admin_role_granted" : "admin_role_revoked", "warning", { user: data.userId });
    return { ok: true };
  });

export const adminListPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["all", "success", "pending", "failed"]).default("all"), page: z.number().int().min(1).max(10_000).default(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const size = 25;
    let q = supabaseAdmin.from("payments").select("id,owner_id,pack_slug,amount_xof,credits,status,livemode,credited,created_at", { count: "exact" }).order("created_at", { ascending: false });
    if (data.status === "failed") q = q.not("status", "in", "(success,pending)");
    else if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count, error } = await q.range((data.page - 1) * size, data.page * size - 1);
    if (error) throw new Error(error.message);
    const owners = [...new Set((rows ?? []).map((r) => r.owner_id))];
    const emails = new Map<string, string>();
    await Promise.all(owners.map(async (id) => { const { data: u } = await supabaseAdmin.auth.admin.getUserById(id); if (u.user?.email) emails.set(id, u.user.email); }));
    return { payments: (rows ?? []).map((r) => ({ ...r, email: emails.get(r.owner_id) ?? "" })), total: count ?? 0, pageSize: size };
  });

export const adminListPacks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("credit_packs").select("slug,name,price_xof,credits,active,featured,display_order").order("display_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Price, credits and visibility of a pack. New checkouts use the new values; past payments are unchanged. */
export const adminUpdatePack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: z.string().min(1).max(40), name: z.string().trim().min(2).max(40),
    price_xof: z.number().int().min(100).max(10_000_000), credits: z.number().int().min(1).max(10_000_000),
    active: z.boolean(), featured: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await moderationLimit(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.featured) await supabaseAdmin.from("credit_packs").update({ featured: false }).neq("slug", data.slug);
    const { error } = await supabaseAdmin.from("credit_packs").update({ name: data.name, price_xof: data.price_xof, credits: data.credits, active: data.active, featured: data.featured, updated_at: new Date().toISOString() }).eq("slug", data.slug);
    if (error) throw new Error(error.message);
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "credit_pack_updated", "info", { slug: data.slug, price_xof: data.price_xof, credits: data.credits, active: data.active });
    return { ok: true };
  });

/** Public resources published by users (official items are excluded). */
export const adminListPublicRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("registry_items").select("id,title,category,owner_id,downloads,created_at").eq("visibility", "public").not("owner_id", "is", null).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUnpublishRegistryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await moderationLimit(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("registry_items").update({ visibility: "private" }).eq("id", data.id).not("owner_id", "is", null);
    if (error) throw new Error(error.message);
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "registry_item_unpublished", "info", { item: data.id });
    return { ok: true };
  });
