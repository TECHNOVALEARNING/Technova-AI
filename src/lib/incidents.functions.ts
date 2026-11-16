import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Incident register (admin console → Incidents, migration 0044). Incidents open automatically from the security
// log or by hand; the admin qualifies them (report or not), the 72-hour window is shown, and the people concerned
// are e-mailed through Resend (RESEND_API_KEY + INCIDENT_MAIL_FROM) or, without it, given as a list to copy.
// Every function re-checks the admin role before using service_role.

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function isAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return data === true;
}
async function requireAdmin(context: Ctx) {
  if (!(await isAdmin(context))) throw new Error("FORBIDDEN");
  const { hitRateLimit } = await import("@/lib/security.server");
  if (!(await hitRateLimit(context.userId, "admin_moderation"))) throw new Error("Trop d'actions. Patientez une minute. / Too many actions.");
}
const mailConfigured = () => Boolean(process.env["RESEND_API_KEY"] && process.env["INCIDENT_MAIL_FROM"]);

const COLUMNS = "id,title,source,kind,event_count,detected_at,status,risk,affected_users,all_users,data_categories,description,measures,decision_note,decided_at,authority_notified_at,users_notified_at,users_notified_count,closed_at,created_at,updated_at";

/** Open incidents for the red banner on every dashboard page; null for non-admins (no extra query for them). */
export const getIncidentAlert = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("security_incidents").select("id,detected_at").eq("status", "open").order("detected_at", { ascending: true }).limit(50);
    if (error) return null;
    return { open: data?.length ?? 0, oldest: data?.[0]?.detected_at ?? null };
  });

export const listIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("security_incidents").select(COLUMNS).order("detected_at", { ascending: false }).limit(200);
    if (error) return { ready: false as const, mail: mailConfigured() };
    // E-mails of the accounts concerned (first 50 per incident) so the admin sees who they are.
    const ids = [...new Set((data ?? []).flatMap((i) => i.affected_users.slice(0, 50)))];
    const emails = new Map<string, string>();
    if (ids.length) {
      const { data: rows } = await supabaseAdmin.rpc("admin_user_emails", { _ids: ids });
      for (const r of rows ?? []) emails.set(r.id, r.email);
    }
    return {
      ready: true as const, mail: mailConfigured(),
      items: (data ?? []).map((i) => ({ ...i, affected_count: i.affected_users.length, affected_emails: i.affected_users.slice(0, 50).map((u) => emails.get(u) ?? u), affected_users: undefined })),
    };
  });

export const createIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; description: string; detectedAt?: string }) => z.object({
    title: z.string().trim().min(3).max(200), description: z.string().max(8000), detectedAt: z.string().datetime().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const detected = data.detectedAt && new Date(data.detectedAt).getTime() <= Date.now() ? data.detectedAt : new Date().toISOString();
    const { data: row, error } = await supabaseAdmin.from("security_incidents").insert({ title: data.title, description: data.description, source: "manual", detected_at: detected }).select("id").single();
    if (error) throw new Error(error.message);
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "incident_opened", "info", { incident: row.id });
    return { id: row.id };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "not_reportable", "reported", "closed"]).optional(),
  risk: z.enum(["unknown", "none", "low", "high"]).optional(),
  title: z.string().trim().min(3).max(200).optional(),
  data_categories: z.string().max(1000).optional(),
  description: z.string().max(8000).optional(),
  measures: z.string().max(8000).optional(),
  decision_note: z.string().max(4000).optional(),
  all_users: z.boolean().optional(),
  authority_notified: z.boolean().optional(),
  /** Accounts concerned, by e-mail (one per line); replaces the manual part of the list. */
  add_emails: z.array(z.string().trim().email()).max(200).optional(),
});

export const updateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof updateSchema>) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readError } = await supabaseAdmin.from("security_incidents").select("status,affected_users,authority_notified_at").eq("id", data.id).single();
    if (readError || !current) throw new Error("Incident introuvable. / Incident not found.");
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    for (const k of ["risk", "title", "data_categories", "description", "measures", "decision_note", "all_users"] as const) if (data[k] !== undefined) patch[k] = data[k];
    if (data.status && data.status !== current.status) {
      patch["status"] = data.status;
      patch["decided_by"] = context.userId;
      patch["decided_at"] = now;
      patch["closed_at"] = data.status === "closed" ? now : null;
      // A "not reportable" decision must say why (the register keeps the reasoning).
      if (data.status === "not_reportable" && !(data.decision_note ?? "").trim()) throw new Error("Indiquez pourquoi l'incident ne présente pas de risque. / Say why there is no risk.");
    }
    if (data.authority_notified !== undefined) patch["authority_notified_at"] = data.authority_notified ? current.authority_notified_at ?? now : null;
    if (data.authority_notified && !data.status && current.status === "open") { patch["status"] = "reported"; patch["decided_by"] = context.userId; patch["decided_at"] = now; }
    if (data.add_emails?.length) {
      const found: string[] = [];
      for (const email of [...new Set(data.add_emails.map((e) => e.toLowerCase()))]) {
        const { data: rows } = await supabaseAdmin.rpc("admin_find_user", { _email: email });
        const id = rows?.[0]?.id; if (id) found.push(id);
      }
      patch["affected_users"] = [...new Set([...current.affected_users, ...found])];
    }
    const { error } = await supabaseAdmin.from("security_incidents").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (patch["status"]) {
      const { logSecurityEvent } = await import("@/lib/security.server");
      await logSecurityEvent(context.userId, "incident_decided", "info", { incident: data.id, status: patch["status"] });
    }
    return { ok: true };
  });

/** E-mails the people concerned (or every user). Without Resend configured, returns the addresses to copy. */
export const notifyIncidentUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; subject: string; body: string }) => z.object({
    id: z.string().uuid(), subject: z.string().trim().min(5).max(200), body: z.string().trim().min(40).max(10000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inc, error } = await supabaseAdmin.from("security_incidents").select("affected_users,all_users,users_notified_count").eq("id", data.id).single();
    if (error || !inc) throw new Error("Incident introuvable. / Incident not found.");
    // Recipients: the accounts concerned, or the whole user base (read 1 000 at a time).
    let emails: string[] = [];
    if (inc.all_users) {
      for (let offset = 0; offset < 100_000; offset += 1000) {
        const { data: rows, error: e } = await supabaseAdmin.rpc("admin_all_user_emails", { _limit: 1000, _offset: offset });
        if (e) throw new Error(e.message);
        emails.push(...(rows ?? []).map((r) => r.email));
        if ((rows?.length ?? 0) < 1000) break;
      }
    } else if (inc.affected_users.length) {
      const { data: rows, error: e } = await supabaseAdmin.rpc("admin_user_emails", { _ids: inc.affected_users });
      if (e) throw new Error(e.message);
      emails = (rows ?? []).map((r) => r.email);
    }
    emails = [...new Set(emails.filter(Boolean))];
    if (!emails.length) throw new Error("Aucun compte concerné n'a d'adresse e-mail. Ajoutez les comptes concernés ou cochez « tous les utilisateurs ».");
    if (!mailConfigured()) return { sent: 0, total: emails.length, manual: emails };

    // Resend batch API: up to 100 messages per call, one recipient each (nobody sees the other addresses).
    const key = process.env["RESEND_API_KEY"]!, from = process.env["INCIDENT_MAIL_FROM"]!;
    let sent = 0, failure = "";
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      try {
        const r = await fetch("https://api.resend.com/emails/batch", {
          method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(chunk.map((to) => ({ from, to: [to], reply_to: "support@technovaihub.com", subject: data.subject, text: data.body }))),
          signal: AbortSignal.timeout(20_000),
        });
        if (!r.ok) { failure = `${r.status} ${(await r.text()).slice(0, 200)}`; break; }
        sent += chunk.length;
      } catch (e) { failure = (e as Error).message; break; }
    }
    if (sent) await supabaseAdmin.from("security_incidents").update({ users_notified_at: new Date().toISOString(), users_notified_count: inc.users_notified_count + sent, updated_at: new Date().toISOString() }).eq("id", data.id);
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "incident_users_notified", failure ? "warning" : "info", { incident: data.id, sent, total: emails.length, ...(failure ? { error: failure } : {}) });
    // What could not be sent is handed back so the admin can finish by hand.
    return { sent, total: emails.length, manual: sent < emails.length ? emails.slice(sent) : [], error: failure || undefined };
  });
