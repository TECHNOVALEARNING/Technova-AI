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
    // /credits needs a management key; the chat needs a regular key (a management key cannot generate).
    get("https://openrouter.ai/api/v1/credits", process.env["OPENROUTER_MANAGEMENT_KEY"] ?? process.env["OPENROUTER_API_KEY"]) as Promise<{ data?: { total_credits?: number; total_usage?: number } } | null>,
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
    const [revenue, credits, balances, engineUsage, presence] = await Promise.all([
      supabaseAdmin.rpc("admin_revenue"),
      supabaseAdmin.rpc("admin_credit_totals"),
      providerBalances(),
      supabaseAdmin.rpc("admin_engine_usage", { _days: 30 }),
      supabaseAdmin.rpc("admin_online_users", { _minutes: 5 }),
    ]);
    const p = presence.error ? null : presence.data?.[0];
    const r = revenue.data?.[0]; const c = credits.data?.[0];
    // Provider cost of consumed credits: prices are set at 1 200 credits per US dollar.
    const consumedUsd = c ? Math.round((c.consumed / 1200) * 100) / 100 : 0;
    return {
      revenue: { total: r?.revenue_total ?? 0, d30: r?.revenue_30d ?? 0, today: r?.revenue_today ?? 0, paid30: r?.paid_30d ?? 0, pending30: r?.pending_30d ?? 0, failed30: r?.failed_30d ?? 0, buyers: r?.buyers ?? 0 },
      credits: { distributed: c?.distributed ?? 0, consumed: c?.consumed ?? 0, purchased: c?.purchased ?? 0, granted: c?.granted ?? 0, consumedUsd },
      balances,
      // Signed-in accounts active in the dashboard (heartbeat every 2 minutes); null until migration 0042.
      online: p ? { now: Number(p.online), hour: Number(p.last_hour), today: Number(p.today) } : null,
      // Engine behind each chat mode with its real cost (null until migration 0039 is applied).
      engines: engineUsage.error ? null : (engineUsage.data ?? []).map((e) => ({ mode: e.mode, engine: e.engine, replies: Number(e.replies), input: Number(e.input_tokens), output: Number(e.output_tokens), reasoning: Number(e.reasoning_tokens), costUsd: Number(e.cost_usd), credits: Number(e.credits) })),
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

/** Suggestion box: newest first, with the summary (total, unread, average rating). */
export const adminListFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page: number }) => z.object({ page: z.number().int().min(1).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const size = 25;
    const [list, summary] = await Promise.all([
      supabaseAdmin.rpc("admin_feedback_list", { _limit: size, _offset: (data.page - 1) * size }),
      supabaseAdmin.rpc("admin_feedback_summary"),
    ]);
    if (list.error || summary.error) return { ready: false as const };
    const sm = summary.data?.[0];
    return {
      ready: true as const, size,
      summary: { total: Number(sm?.total ?? 0), unread: Number(sm?.unread ?? 0), rated: Number(sm?.rated ?? 0), average: sm?.average === null || sm?.average === undefined ? null : Number(sm.average) },
      items: list.data ?? [],
    };
  });

export const adminMarkFeedbackRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_feedback_mark_read", { _ids: data.ids });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ProviderDay = { date: string; openrouter: number; kie: number; models: { provider: "openrouter" | "kie"; model: string; usd: number; providerCredits: number | null; calls: number }[] };
export type ProviderRange = "7d" | "30d" | "90d" | "all";
const RANGE_DAYS: Record<ProviderRange, number> = { "7d": 7, "30d": 30, "90d": 90, all: 36500 };

/** kie.ai history: asks kie.ai the real credits of past creations that have none stored yet (newest first, a
 *  few per load). A task kie.ai cannot report is marked -1 so it is not asked again and counts as "not measured". */
async function backfillKieCosts(db: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"]) {
  const key = process.env["KIE_API_KEY"];
  if (!key) return;
  const { data: rows, error } = await db.from("media_generations").select("id,task_id")
    .is("provider_credits" as never, null).in("status", ["success", "fail"]).not("task_id", "is", null)
    .order("created_at", { ascending: false }).limit(40);
  if (error || !rows?.length) return; // column missing (migration 0046 not run) or nothing to fill
  const started = Date.now();
  for (let i = 0; i < rows.length && Date.now() - started < 12_000; i += 5) {
    await Promise.all(rows.slice(i, i + 5).map(async (row) => {
      let credits = -1;
      try {
        const r = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(row.task_id)}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6000) });
        const j = (await r.json().catch(() => null)) as { code?: number; data?: { creditsConsumed?: unknown } } | null;
        const n = Number(j?.data?.creditsConsumed);
        if (r.ok && j?.code === 200 && Number.isFinite(n) && n >= 0) credits = n;
        else if (r.status === 401 || r.status === 429 || r.status >= 500) return; // try again on a later load
      } catch { return; }
      await db.from("media_generations").update({ provider_credits: credits } as never).eq("id", row.id);
    }));
  }
}

/** Real provider spend per day (or per week for long periods) and per model, for the admin consumption chart.
 *  OpenRouter: its own activity report when OPENROUTER_MANAGEMENT_KEY is set (the last 30 finished days, every
 *  call: chat, API, Studio, files, help…), else and before that the replies logged in chat_engine_costs. kie.ai:
 *  the credits each task really consumed (migration 0046, past tasks filled from kie.ai), USD 0.005 per credit. */
export const adminProviderCosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { range?: ProviderRange } | undefined) => z.object({ range: z.enum(["7d", "30d", "90d", "all"]).default("30d") }).parse(input ?? {}))
  .handler(async ({ data: input, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await backfillKieCosts(supabaseAdmin).catch(() => undefined);
    const span = RANGE_DAYS[input.range];
    const since = new Date(Date.now() - span * 86_400_000).toISOString();
    const days = new Map<string, ProviderDay>();
    const dayKey = (d: string) => d.slice(0, 10);
    const lagosDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
    const get = (date: string) => { let x = days.get(date); if (!x) { x = { date, openrouter: 0, kie: 0, models: [] }; days.set(date, x); } return x; };
    const add = (date: string, provider: "openrouter" | "kie", model: string, usd: number, providerCredits: number | null, calls: number) => {
      const d = get(date);
      d[provider] += usd;
      const m = d.models.find((x) => x.provider === provider && x.model === model);
      if (m) { m.usd += usd; m.calls += calls; if (providerCredits != null) m.providerCredits = (m.providerCredits ?? 0) + providerCredits; }
      else d.models.push({ provider, model, usd, providerCredits, calls });
    };
    let openrouterSource: "activity" | "logged" = "logged";
    // The activity report covers the last finished days only: today and older days come from the logged replies.
    const activityDays = new Set<string>();
    const mk = process.env["OPENROUTER_MANAGEMENT_KEY"];
    if (mk) {
      try {
        const r = await fetch("https://openrouter.ai/api/v1/activity", { headers: { Authorization: `Bearer ${mk}` }, signal: AbortSignal.timeout(8000) });
        const j = r.ok ? (await r.json()) as { data?: { date: string; model: string; usage: number; requests: number }[] } : null;
        if (j?.data) {
          openrouterSource = "activity";
          for (const row of j.data) {
            if (dayKey(row.date) < dayKey(since)) continue;
            activityDays.add(dayKey(row.date));
            add(dayKey(row.date), "openrouter", row.model, Number(row.usage) || 0, null, Number(row.requests) || 0);
          }
        }
      } catch { /* fall back to the logged replies */ }
    }
    const { data, error } = await supabaseAdmin.rpc("admin_provider_costs", { _days: span });
    for (const row of error ? [] : data ?? []) {
      if (row.provider !== "openrouter" || activityDays.has(dayKey(String(row.day)))) continue;
      add(dayKey(String(row.day)), "openrouter", row.model, Number(row.cost_usd) || 0, null, Number(row.calls) || 0);
    }
    // Safety net: what OpenRouter really billed each day (readings of the account, migration 0048). Whatever the
    // logged replies do not explain shows as « Autres appels » (help chat, tests, another key, older days…).
    const { recordOpenRouterUsage, openRouterDailySpend } = await import("@/lib/provider-usage.server");
    await recordOpenRouterUsage(supabaseAdmin).catch(() => undefined);
    const real = await openRouterDailySpend(supabaseAdmin, since).catch(() => new Map<string, number>());
    for (const [day, spend] of real) {
      const gap = spend - (days.get(day)?.openrouter ?? 0);
      if (gap > 0.001) add(day, "openrouter", "Autres appels (sans détail)", gap, null, 0);
    }
    // kie.ai straight from the creations (only measured costs, never the -1 "not measured" marks).
    let kieUnmeasured = 0;
    const kie = await supabaseAdmin.from("media_generations").select("created_at,model,status,provider_credits" as never)
      .gte("created_at", since).in("status", ["success", "fail"]).limit(20000);
    for (const row of (kie.error ? [] : kie.data ?? []) as unknown as { created_at: string; model: string; status: string; provider_credits: number | string | null }[]) {
      const n = row.provider_credits == null ? NaN : Number(row.provider_credits);
      if (!(n >= 0)) { if (row.status === "success") kieUnmeasured++; continue; }
      add(lagosDay(row.created_at), "kie", row.model, n * 0.005, n, 1);
    }
    // Points: every day of the window (quiet days at zero); weeks once "since the beginning" spans over 120 days.
    const known = [...days.keys()].sort();
    const today = lagosDay(new Date().toISOString());
    const first = input.range === "all" ? (known[0] ?? today) : lagosDay(since);
    const totalDays = Math.max(1, Math.round((Date.parse(today) - Date.parse(first)) / 86_400_000) + 1);
    const weekly = input.range === "all" && totalDays > 120;
    const out: ProviderDay[] = [];
    const round = (n: number) => Math.round(n * 1e4) / 1e4;
    for (let i = 0; i < totalDays; i += weekly ? 7 : 1) {
      const start = new Date(Date.parse(first) + i * 86_400_000).toISOString().slice(0, 10);
      const bucket: ProviderDay = { date: start, openrouter: 0, kie: 0, models: [] };
      for (let k = 0; k < (weekly ? 7 : 1); k++) {
        const d = days.get(new Date(Date.parse(start) + k * 86_400_000).toISOString().slice(0, 10));
        if (!d) continue;
        bucket.openrouter += d.openrouter; bucket.kie += d.kie;
        for (const m of d.models) {
          const b = bucket.models.find((x) => x.provider === m.provider && x.model === m.model);
          if (b) { b.usd += m.usd; b.calls += m.calls; if (m.providerCredits != null) b.providerCredits = (b.providerCredits ?? 0) + m.providerCredits; }
          else bucket.models.push({ ...m });
        }
      }
      bucket.models.sort((a, b) => b.usd - a.usd);
      out.push({ ...bucket, openrouter: round(bucket.openrouter), kie: round(bucket.kie) });
    }
    return { ready: !error, range: input.range, weekly, openrouterSource, kieUnmeasured, kieConfigured: Boolean(process.env["KIE_API_KEY"]), days: out };
  });
