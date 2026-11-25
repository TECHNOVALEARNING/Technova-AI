// E-mail reminders (migration 0059), sent once a day by /api/public/media-purge through Resend:
// monthly formula / company plan ending within 3 days, low balance for paying customers, unused credits after
// 14 days without activity. Every e-mail has a one-click unsubscribe link (signed, no sign-in needed).
import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = "https://www.technovaihub.com";
type Candidate = { owner_id: string; email: string; display_name: string; kind: "monthly_ending" | "low_balance" | "unused_credits"; ref: string; balance: number | null; pack_slug: string | null; ends_at: string | null };

function unsubKey() {
  const raw = process.env["TECHNOVA_CONN_CRYPTO_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!raw) throw new Error("No signing key for unsubscribe links");
  return createHmac("sha256", raw).update("email-unsubscribe-v1").digest();
}
export const unsubscribeToken = (userId: string) => createHmac("sha256", unsubKey()).update(userId).digest("base64url");
export function verifyUnsubscribe(userId: string, token: string) {
  try {
    const a = Buffer.from(unsubscribeToken(userId)), b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}
const unsubscribeUrl = (userId: string) => `${SITE}/api/public/email-unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}`;

const planName: Record<string, string> = { "mensuel-plus": "Mensuel Plus", "mensuel-pro": "Mensuel Pro", team: "TechNova Team", entreprise: "TechNova Entreprise" };
const n = (v: number) => v.toLocaleString("fr-FR");

/** Subject and plain-text body of one reminder (French, with a short English line). */
function render(c: Candidate) {
  const hello = c.display_name ? `Bonjour ${c.display_name},` : "Bonjour,";
  const foot = `\n\n— L'équipe TechNova AI Hub\n${SITE}\n\nVous recevez ce rappel parce que vous avez un compte TechNova. Ne plus recevoir de rappels : ${unsubscribeUrl(c.owner_id)}`;
  if (c.kind === "monthly_ending") {
    const end = c.ends_at ? new Date(c.ends_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "bientôt";
    const name = planName[c.pack_slug ?? ""] ?? "Votre formule";
    return {
      subject: `${name} se termine ${c.ends_at ? `le ${end}` : "bientôt"}`,
      text: `${hello}\n\nVotre formule ${name} se termine le ${end}. Les crédits du mois que vous n'avez pas utilisés repartiront à zéro à cette date : c'est le moment de terminer vos créations.\n\nRien n'est prélevé automatiquement. Pour continuer, renouvelez par Mobile Money ou carte : ${SITE}/dashboard/credits\n\n(EN) Your ${name} plan ends on ${end}; renew from Pricing & credits to keep going.${foot}`,
    };
  }
  if (c.kind === "low_balance") {
    return {
      subject: `Il vous reste ${n(Math.max(0, c.balance ?? 0))} crédits TechNova`,
      text: `${hello}\n\nVotre solde passe sous les 100 crédits (${n(Math.max(0, c.balance ?? 0))} restants). Rechargez en quelques secondes par Mobile Money ou carte pour continuer à discuter, créer des images, des vidéos ou des sites sans interruption : ${SITE}/dashboard/credits\n\nAstuce : la formule mensuelle donne le crédit le moins cher pour un usage régulier.\n\n(EN) Your balance is below 100 credits; top up from Pricing & credits.${foot}`,
    };
  }
  return {
    subject: `Vos ${n(c.balance ?? 0)} crédits TechNova vous attendent`,
    text: `${hello}\n\nVous avez encore ${n(c.balance ?? 0)} crédits sur votre compte TechNova. Quelques idées pour les utiliser :\n• une présentation ou un CV avec Créativité ;\n• un tableau de budget avec le Tableur ;\n• une chanson, une vidéo ou un site web, directement depuis le chat.\n\nReprendre là où vous en étiez : ${SITE}/dashboard/chat\n\n(EN) You still have ${n(c.balance ?? 0)} credits waiting for you on TechNova.${foot}`,
  };
}

/** Sends today's reminders; returns how many went out (0 when Resend or the sender is not configured). */
export async function sendReminders(): Promise<{ sent: number; skipped?: string; error?: string }> {
  const key = process.env["RESEND_API_KEY"]?.trim();
  const from = (process.env["REMINDER_MAIL_FROM"] || process.env["INCIDENT_MAIL_FROM"])?.trim();
  if (!key || !from) return { sent: 0, skipped: "resend_not_configured" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("reminder_candidates" as never, { _limit: 200 } as never);
  if (error) return { sent: 0, error: error.message };
  const rows = (data ?? []) as Candidate[];
  let sent = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map((c) => {
          const m = render(c);
          return { from, to: [c.email], reply_to: "support@technovaihub.com", subject: m.subject, text: m.text,
            headers: { "List-Unsubscribe": `<${unsubscribeUrl(c.owner_id)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
        })),
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) return { sent, error: `${r.status} ${(await r.text()).slice(0, 200)}` };
      await supabaseAdmin.from("email_reminders_sent" as never).insert(chunk.map((c) => ({ owner_id: c.owner_id, kind: c.kind, ref: c.ref })) as never);
      sent += chunk.length;
    } catch (e) { return { sent, error: (e as Error).message }; }
  }
  return { sent };
}
