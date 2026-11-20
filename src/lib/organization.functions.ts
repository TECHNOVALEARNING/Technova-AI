// Company plans (TechNova Team / Entreprise, migration 0057): the administrator's dashboard and the sub-accounts'
// membership. Tables are service_role only: every function here re-checks who the caller is in the company.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOrgFeature, type OrgFeature } from "@/lib/org-features";

type Org = { id: string; owner_id: string; name: string; plan_slug: "team" | "entreprise"; seats: number; disabled_features: string[]; created_at: string };
type Member = { org_id: string; user_id: string; email: string; role: "admin" | "member"; status: "invited" | "active"; invited_at: string; joined_at: string | null };

async function db(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function period(d: SupabaseClient, ownerId: string) {
  const { data } = await d.from("monthly_periods").select("pack_slug, credits, starts_at, ends_at, closed_at")
    .eq("owner_id", ownerId).in("pack_slug", ["team", "entreprise"]).order("starts_at", { ascending: false }).limit(1).maybeSingle();
  const p = data as { pack_slug: string; credits: number; starts_at: string; ends_at: string; closed_at: string | null } | null;
  return p ? { ...p, active: !p.closed_at && new Date(p.ends_at).getTime() > Date.now() } : null;
}

/** The company the caller administers (owner), or an error. */
async function adminOrg(userId: string) {
  const d = await db();
  const { data } = await d.from("organizations").select("*").eq("owner_id", userId).maybeSingle();
  if (!data) throw new Error("Réservé à l'administrateur de l'entreprise. / Company administrators only.");
  return { d, org: data as Org };
}

async function logEvent(d: SupabaseClient, orgId: string, actorId: string, action: string, detail: Record<string, unknown> = {}) {
  await d.from("organization_events").insert({ org_id: orgId, actor_id: actorId, action, detail });
}

/** What the dashboard needs to know about the caller: company role, plan state, unticked features, invitations. */
export const getMyOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const d = await db();
    const { data: rows, error } = await d.from("organization_members").select("*").eq("user_id", context.userId);
    if (error) return { membership: null, invitations: [] }; // migration 0057 not run yet
    const mine = (rows ?? []) as Member[];
    const active = mine.find((m) => m.status === "active");
    const invitedIds = mine.filter((m) => m.status === "invited").map((m) => m.org_id);
    const { data: invOrgs } = invitedIds.length ? await d.from("organizations").select("id, name, plan_slug").in("id", invitedIds) : { data: [] };
    const invitations = ((invOrgs ?? []) as Pick<Org, "id" | "name" | "plan_slug">[]).map((o) => ({ orgId: o.id, name: o.name, plan: o.plan_slug }));
    if (!active) return { membership: null, invitations };
    const { data: o } = await d.from("organizations").select("*").eq("id", active.org_id).maybeSingle();
    if (!o) return { membership: null, invitations };
    const org = o as Org;
    const p = await period(d, org.owner_id);
    return {
      membership: {
        role: active.role, orgId: org.id, name: org.name, plan: org.plan_slug, seats: org.seats,
        disabledFeatures: org.disabled_features.filter(isOrgFeature) as OrgFeature[],
        active: !!p?.active, endsAt: p?.ends_at ?? null,
      },
      invitations,
    };
  });

/** Administrator dashboard: pool, month, members with their usage, usage by feature and by day, recent activity. */
export const getOrganizationDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days: number }) => z.object({ days: z.number().int().min(7).max(90) }).parse(input))
  .handler(async ({ data, context }) => {
    const { d, org } = await adminOrg(context.userId);
    await d.rpc("close_monthly_periods", { _owner: org.owner_id });
    const p = await period(d, org.owner_id);
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const [{ data: mem }, { data: ledger }, { data: holds }, { data: events }] = await Promise.all([
      d.from("organization_members").select("*").eq("org_id", org.id).order("invited_at"),
      d.from("credit_transactions").select("amount").eq("owner_id", org.owner_id),
      d.from("credit_reservations").select("amount").eq("owner_id", org.owner_id).eq("status", "pending"),
      d.from("organization_events").select("action, detail, created_at, actor_id").eq("org_id", org.id).order("created_at", { ascending: false }).limit(25),
    ]);
    const members = (mem ?? []) as Member[];
    const activeIds = members.filter((m) => m.status === "active").map((m) => m.user_id);
    const balance = ((ledger ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
    const reserved = ((holds ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
    const [{ data: usage }, { data: profiles }, { data: logs }, { data: engine }, { data: medias }] = await Promise.all([
      d.rpc("org_usage", { _org: org.id, _since: since }),
      activeIds.length ? d.from("profiles").select("id, display_name").in("id", activeIds) : Promise.resolve({ data: [] }),
      activeIds.length ? d.from("usage_logs").select("owner_id, credits, created_at").in("owner_id", activeIds).gte("created_at", since).limit(20000) : Promise.resolve({ data: [] }),
      activeIds.length ? d.from("chat_engine_costs").select("mode, credits").in("owner_id", activeIds).gte("created_at", since).limit(20000) : Promise.resolve({ data: [] }),
      activeIds.length ? d.from("media_generations").select("kind, charged_credits").in("owner_id", activeIds).gte("created_at", since).limit(5000) : Promise.resolve({ data: [] }),
    ]);
    const names = new Map(((profiles ?? []) as { id: string; display_name: string | null }[]).map((r) => [r.id, r.display_name ?? ""]));
    const use = new Map(((usage ?? []) as { user_id: string; credits: number; requests: number; last_at: string | null }[]).map((r) => [r.user_id, r]));
    // Usage by feature: chat modes and Studio stages from chat_engine_costs, media from media_generations.
    const feature = (mode: string) =>
      mode.startsWith("studio") ? "studio" : mode === "design" ? "design" : mode === "sheet" ? "sheet" : mode === "research" ? "research"
        : mode === "api" ? "api" : mode === "files" ? "files" : mode.startsWith("audio") ? "audio" : mode === "music_lyrics" ? null : "chat";
    const byFeature = new Map<string, number>();
    for (const r of (engine ?? []) as { mode: string; credits: number }[]) { const k = feature(r.mode); if (k) byFeature.set(k, (byFeature.get(k) ?? 0) + (r.credits ?? 0)); }
    for (const r of (medias ?? []) as { kind: string; charged_credits: number | null }[]) { const k = r.kind === "image" ? "images" : r.kind; byFeature.set(k, (byFeature.get(k) ?? 0) + (r.charged_credits ?? 0)); }
    const daily = new Map<string, number>();
    for (let i = data.days - 1; i >= 0; i--) daily.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
    for (const r of (logs ?? []) as { credits: number; created_at: string }[]) { const k = r.created_at.slice(0, 10); if (daily.has(k)) daily.set(k, (daily.get(k) ?? 0) + (r.credits ?? 0)); }
    // Spent this month: the same net count as close_monthly_period (charges, usage, media holds, minus refunds).
    const { data: monthTx } = p ? await d.from("credit_transactions").select("amount").eq("owner_id", org.owner_id).gte("created_at", p.starts_at).in("kind", ["charge", "usage", "reserve", "refund"]) : { data: [] };
    const spentInPeriod = Math.max(0, -((monthTx ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0));
    return {
      org: { id: org.id, name: org.name, plan: org.plan_slug, seats: org.seats, disabledFeatures: org.disabled_features.filter(isOrgFeature) as OrgFeature[], createdAt: org.created_at },
      period: p ? { credits: p.credits, startsAt: p.starts_at, endsAt: p.ends_at, active: p.active, spent: spentInPeriod } : null,
      pool: { balance, reserved, available: balance - reserved },
      members: members.map((m) => ({
        userId: m.user_id, email: m.email, name: names.get(m.user_id) ?? "", role: m.role, status: m.status, invitedAt: m.invited_at, joinedAt: m.joined_at,
        credits: Number(use.get(m.user_id)?.credits ?? 0), requests: Number(use.get(m.user_id)?.requests ?? 0), lastAt: use.get(m.user_id)?.last_at ?? null,
      })),
      byFeature: [...byFeature.entries()].map(([key, credits]) => ({ key, credits })).filter((r) => r.credits > 0).sort((a, b) => b.credits - a.credits),
      daily: [...daily.entries()].map(([date, credits]) => ({ date, credits })),
      events: ((events ?? []) as { action: string; detail: Record<string, unknown> | null; created_at: string }[]).map((e) => ({ action: e.action, email: typeof e.detail?.["email"] === "string" ? (e.detail["email"] as string) : "", at: e.created_at })),
    };
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string; disabledFeatures?: string[] }) => z.object({
    name: z.string().trim().min(2).max(80).optional(),
    disabledFeatures: z.array(z.string()).max(40).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { d, org } = await adminOrg(context.userId);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name) patch["name"] = data.name;
    if (data.disabledFeatures) patch["disabled_features"] = [...new Set(data.disabledFeatures.filter(isOrgFeature))];
    const { error } = await d.from("organizations").update(patch).eq("id", org.id);
    if (error) throw new Error("Enregistrement impossible. / Could not save.");
    if (data.disabledFeatures) await logEvent(d, org.id, context.userId, "features", { disabled: patch["disabled_features"] });
    if (data.name && data.name !== org.name) await logEvent(d, org.id, context.userId, "renamed", { name: data.name });
    return { ok: true };
  });

/** Adds a sub-account by e-mail: an existing TechNova account is invited (it accepts from its dashboard), a new
    address receives a Supabase invitation e-mail and joins at once. Seats count the administrator. */
export const inviteOrganizationMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { d, org } = await adminOrg(context.userId);
    const p = await period(d, org.owner_id);
    if (!p?.active) throw new Error("ORG_INACTIVE");
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "connect"))) throw new Error("RATE_LIMITED");
    const { count } = await d.from("organization_members").select("user_id", { count: "exact", head: true }).eq("org_id", org.id);
    if ((count ?? 0) >= org.seats) throw new Error("ORG_SEATS_FULL");
    const { data: existing } = await d.rpc("user_id_by_email", { _email: data.email });
    let userId = typeof existing === "string" ? existing : null;
    let status: "invited" | "active" = "invited";
    if (userId) {
      if (userId === context.userId) throw new Error("ORG_SELF");
      const { data: busy } = await d.from("organization_members").select("org_id").eq("user_id", userId).eq("status", "active").maybeSingle();
      if (busy && (busy as { org_id: string }).org_id !== org.id) throw new Error("ORG_MEMBER_ELSEWHERE");
      if (busy) throw new Error("ORG_ALREADY_MEMBER");
    } else {
      const { appOrigin } = await import("@/lib/connections.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${appOrigin(getRequest())}/dashboard/entreprise` });
      if (error || !invited.user) throw new Error("ORG_INVITE_FAILED");
      userId = invited.user.id; status = "active";
    }
    const { error } = await d.from("organization_members").upsert({ org_id: org.id, user_id: userId, email: data.email, role: "member", status, invited_at: new Date().toISOString(), joined_at: status === "active" ? new Date().toISOString() : null });
    if (error) throw new Error("ORG_INVITE_FAILED");
    await logEvent(d, org.id, context.userId, "member_invited", { email: data.email, status });
    return { ok: true, status };
  });

export const removeOrganizationMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { d, org } = await adminOrg(context.userId);
    if (data.userId === org.owner_id) throw new Error("ORG_SELF");
    const { data: row } = await d.from("organization_members").delete().eq("org_id", org.id).eq("user_id", data.userId).select("email").maybeSingle();
    if (row) await logEvent(d, org.id, context.userId, "member_removed", { email: (row as { email: string }).email });
    return { ok: true };
  });

/** A sub-account accepts or declines an invitation (one company at a time). */
export const respondOrganizationInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; accept: boolean }) => z.object({ orgId: z.string().uuid(), accept: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const d = await db();
    const { data: inv } = await d.from("organization_members").select("*").eq("org_id", data.orgId).eq("user_id", context.userId).eq("status", "invited").maybeSingle();
    if (!inv) throw new Error("ORG_NO_INVITATION");
    if (!data.accept) {
      await d.from("organization_members").delete().eq("org_id", data.orgId).eq("user_id", context.userId);
      await logEvent(d, data.orgId, context.userId, "invitation_declined", { email: (inv as Member).email });
      return { ok: true };
    }
    const { data: busy } = await d.from("organization_members").select("org_id").eq("user_id", context.userId).eq("status", "active").maybeSingle();
    if (busy) throw new Error("ORG_MEMBER_ELSEWHERE");
    await d.from("organization_members").update({ status: "active", joined_at: new Date().toISOString() }).eq("org_id", data.orgId).eq("user_id", context.userId);
    await logEvent(d, data.orgId, context.userId, "member_joined", { email: (inv as Member).email });
    return { ok: true };
  });

/** A sub-account leaves its company (its own credits and creations stay its own). */
export const leaveOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const d = await db();
    const { data: row } = await d.from("organization_members").delete().eq("user_id", context.userId).eq("role", "member").eq("status", "active").select("org_id, email").maybeSingle();
    if (row) await logEvent(d, (row as Member).org_id, context.userId, "member_left", { email: (row as Member).email });
    return { ok: true };
  });
