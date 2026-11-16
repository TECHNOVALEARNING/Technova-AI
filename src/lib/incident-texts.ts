// Ready-made texts for a data breach (admin console → Incidents): the e-mail to the people concerned and the
// declaration to the authority (APDP in Benin, the national authority for people in the EU). Built from the
// incident's own fields so the admin only checks and sends. Matches the privacy policy's commitment (section 9).

export type IncidentStatus = "open" | "not_reportable" | "reported" | "closed";
export type IncidentRisk = "unknown" | "none" | "low" | "high";

export type IncidentForText = {
  title: string;
  detected_at: string;
  data_categories: string;
  description: string;
  measures: string;
  affected_count: number;
  all_users: boolean;
};

/** Hours left in the 72-hour window to inform the authority (negative once it has passed). */
export const DEADLINE_HOURS = 72;
export function hoursLeft(detectedAt: string, now = Date.now()) {
  return DEADLINE_HOURS - (now - new Date(detectedAt).getTime()) / 3_600_000;
}

const day = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Lagos" }) + " (heure du Bénin)";
const orDash = (s: string) => s.trim() || "[à compléter]";

export function userEmailText(i: IncidentForText) {
  const subject = "TechNova AI Hub — information importante sur la sécurité de vos données";
  const body = [
    "Bonjour,",
    "",
    `Nous vous informons qu'un incident de sécurité, découvert le ${day(i.detected_at)}, concerne des données de votre compte TechNova AI Hub.`,
    "",
    "Ce qui s'est passé :",
    orDash(i.description),
    "",
    "Données concernées :",
    orDash(i.data_categories),
    "",
    "Ce que nous avons fait :",
    orDash(i.measures),
    "",
    "Ce que nous vous conseillons :",
    "- changez votre mot de passe TechNova AI Hub, et partout où vous utilisiez le même ;",
    "- si vous utilisez l'API, supprimez vos clés dans Paramètres → API et créez-en de nouvelles ;",
    "- méfiez-vous des messages qui se feraient passer pour TechNova et vous demanderaient un mot de passe ou un paiement.",
    "",
    "Pour toute question, répondez à cet e-mail ou écrivez à notre délégué à la protection des données : support@technovaihub.com.",
    "Vous pouvez aussi saisir l'APDP (Bénin) ou, si vous résidez dans l'Union européenne, l'autorité de protection des données de votre pays.",
    "",
    "Nous vous prions de nous excuser pour ce désagrément.",
    "L'équipe TechNova AI Hub",
  ].join("\n");
  return { subject, body };
}

export function authorityText(i: IncidentForText) {
  return [
    "Objet : notification d'une violation de données à caractère personnel",
    "",
    "Responsable du traitement : Dolapo ECOM LLC (TechNova AI Hub), 1209 Mountain Rd PL NE, Ste R, Albuquerque, NM 87110, USA",
    "Délégué à la protection des données : Cédric Toudonou — support@technovaihub.com",
    "",
    `Date et heure de découverte : ${day(i.detected_at)}`,
    `Intitulé : ${i.title}`,
    "",
    "Nature de la violation :",
    orDash(i.description),
    "",
    "Catégories de données concernées :",
    orDash(i.data_categories),
    "",
    `Nombre approximatif de personnes concernées : ${i.all_users ? "l'ensemble des utilisateurs" : i.affected_count || "[à compléter]"}`,
    "",
    "Conséquences probables :",
    "[à compléter]",
    "",
    "Mesures prises ou envisagées pour remédier à la violation et en limiter les effets :",
    orDash(i.measures),
    "",
    "Information des personnes concernées : [envoyée le … / non nécessaire car …]",
  ].join("\n");
}
