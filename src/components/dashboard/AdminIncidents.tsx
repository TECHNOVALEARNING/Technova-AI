import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, Download, Loader2, Mail, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmDialog } from "@/components/ConfirmHost";
import { createIncident, listIncidents, notifyIncidentUsers, updateIncident } from "@/lib/incidents.functions";
import { authorityText, hoursLeft, userEmailText, type IncidentRisk, type IncidentStatus } from "@/lib/incident-texts";

// Admin console → Incidents: the breach register promised by the privacy policy (section 9). Incidents open
// themselves from the security log; the admin qualifies them, sees the 72-hour window, copies the declaration for
// the authority and e-mails the people concerned.

type Data = Awaited<ReturnType<typeof listIncidents>>;
type Incident = Extract<Data, { ready: true }>["items"][number];

const card = "rounded-2xl border border-border bg-card/90 p-4";
const area = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^FORBIDDEN$/, "Accès refusé") : "Erreur");
const statusLabel: Record<IncidentStatus, string> = { open: "À qualifier", not_reportable: "Non déclaré (sans risque)", reported: "Déclaré", closed: "Clos" };
const statusTone: Record<IncidentStatus, string> = {
  open: "bg-destructive/15 text-destructive", not_reportable: "bg-secondary text-muted-foreground",
  reported: "bg-amber-500/15 text-amber-700 dark:text-amber-300", closed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};
const riskLabel: Record<IncidentRisk, string> = { unknown: "Pas encore évalué", none: "Aucun risque pour les personnes", low: "Risque faible", high: "Risque élevé" };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—");

async function copy(text: string, what: string) {
  try { await navigator.clipboard.writeText(text); toast.success(`${what} copié.`); } catch { toast.error("Copie impossible : sélectionnez le texte à la main."); }
}

/** Remaining time to inform the authority, shown while the incident is not qualified or not yet declared. */
function Deadline({ i }: { i: Incident }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const pending = i.status === "open" || (i.status === "reported" && !i.authority_notified_at);
  if (!pending) return null;
  const h = hoursLeft(i.detected_at, now);
  if (h < 0) return <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">Délai de 72 h dépassé de {Math.ceil(-h)} h</span>;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${h < 24 ? "bg-destructive text-destructive-foreground" : "bg-destructive/15 text-destructive"}`}>Il reste {Math.floor(h)} h pour prévenir l'autorité</span>;
}

function exportCsv(items: Incident[]) {
  const cols: [string, (i: Incident) => string | number][] = [
    ["Découvert le", (i) => i.detected_at], ["Intitulé", (i) => i.title], ["Origine", (i) => (i.source === "auto" ? "automatique" : "manuel")],
    ["Statut", (i) => statusLabel[i.status as IncidentStatus]], ["Risque", (i) => riskLabel[i.risk as IncidentRisk]],
    ["Personnes concernées", (i) => (i.all_users ? "tous les utilisateurs" : i.affected_count)], ["Données concernées", (i) => i.data_categories],
    ["Description", (i) => i.description], ["Mesures prises", (i) => i.measures], ["Motif de la décision", (i) => i.decision_note],
    ["Décidé le", (i) => i.decided_at ?? ""], ["Autorité prévenue le", (i) => i.authority_notified_at ?? ""],
    ["Utilisateurs prévenus le", (i) => i.users_notified_at ?? ""], ["E-mails envoyés", (i) => i.users_notified_count], ["Clos le", (i) => i.closed_at ?? ""],
  ];
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + [cols.map(([h]) => cell(h)).join(";"), ...items.map((i) => cols.map(([, f]) => cell(f(i))).join(";"))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `registre-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function IncidentCard({ i, mail, onChange }: { i: Incident; mail: boolean; onChange: () => void }) {
  const [open, setOpen] = useState(i.status === "open");
  const [f, setF] = useState({ title: i.title, description: i.description, data_categories: i.data_categories, measures: i.measures, decision_note: i.decision_note, risk: i.risk as IncidentRisk, all_users: i.all_users, emails: "" });
  const [busy, setBusy] = useState(false);
  const [mailDraft, setMailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [manual, setManual] = useState<string[] | null>(null);
  const textInput = { title: f.title, detected_at: i.detected_at, data_categories: f.data_categories, description: f.description, measures: f.measures, affected_count: i.affected_count, all_users: f.all_users };

  async function save(extra: { status?: IncidentStatus; authority_notified?: boolean } = {}, done?: string) {
    setBusy(true);
    try {
      const add_emails = f.emails.split(/[\s,;]+/).map((e) => e.trim()).filter((e) => e.includes("@"));
      await updateIncident({ data: { id: i.id, title: f.title, description: f.description, data_categories: f.data_categories, measures: f.measures, decision_note: f.decision_note, risk: f.risk, all_users: f.all_users, ...(add_emails.length ? { add_emails } : {}), ...extra } });
      toast.success(done ?? "Incident enregistré.");
      setF((v) => ({ ...v, emails: "" }));
      onChange();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  }
  async function noRisk() {
    if (!f.decision_note.trim()) { toast.error("Écrivez d'abord, dans « Motif de la décision », pourquoi il n'y a pas de risque pour les personnes."); return; }
    if (await confirmDialog({ title: "Classer sans déclaration ?", description: "L'incident reste dans le registre avec votre motif. Aucune déclaration à l'autorité ni e-mail aux utilisateurs.", confirmLabel: "Classer sans déclaration" })) await save({ status: "not_reportable" }, "Incident classé sans déclaration.");
  }
  async function send() {
    if (!mailDraft) return;
    const who = f.all_users ? "tous les utilisateurs" : `${i.affected_count} compte(s) concerné(s)`;
    if (!(await confirmDialog({ title: mail ? `Envoyer l'e-mail à ${who} ?` : "Préparer la liste des adresses ?", description: mail ? "Chaque personne reçoit un e-mail individuel (personne ne voit les autres adresses). L'envoi ne peut pas être annulé." : "L'envoi automatique n'est pas configuré : vous recevrez la liste des adresses à copier dans votre messagerie.", confirmLabel: mail ? "Envoyer" : "Afficher les adresses", tone: mail ? "danger" : "default" }))) return;
    setBusy(true);
    try {
      await save({}, "Incident enregistré.");
      const r = await notifyIncidentUsers({ data: { id: i.id, ...mailDraft } });
      if (r.sent) toast.success(`${r.sent} e-mail(s) envoyé(s) sur ${r.total}.`);
      if (r.manual.length) setManual(r.manual);
      if ("error" in r && r.error) toast.error(`Envoi interrompu : ${r.error}. Les adresses restantes sont affichées.`);
      onChange();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  }

  const st = i.status as IncidentStatus;
  return <li className={`${card} ${st === "open" ? "border-destructive/50" : ""}`}>
    <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone[st]}`}>{statusLabel[st]}</span>
      <Deadline i={i} />
      <span className="min-w-0 flex-1 truncate font-medium">{i.title}</span>
      <span className="text-xs text-muted-foreground">{i.source === "auto" ? "automatique" : "manuel"} · {when(i.detected_at)}</span>
      <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1"><span className="text-xs font-medium text-muted-foreground">Intitulé</span><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-xs font-medium text-muted-foreground">Risque pour les personnes</span>
          <select className={`${area} h-9 py-0`} value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value as IncidentRisk })}>{(Object.keys(riskLabel) as IncidentRisk[]).map((k) => <option key={k} value={k}>{riskLabel[k]}</option>)}</select></label>
      </div>
      <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">Ce qui s'est passé</span><textarea rows={3} className={area} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">Données concernées (ex. e-mails, conversations, fichiers)</span><textarea rows={2} className={area} value={f.data_categories} onChange={(e) => setF({ ...f, data_categories: e.target.value })} /></label>
        <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">Mesures prises</span><textarea rows={2} className={area} value={f.measures} onChange={(e) => setF({ ...f, measures: e.target.value })} /></label>
      </div>
      <div className="rounded-xl bg-secondary/60 p-3">
        <p className="text-xs font-medium">Personnes concernées : {f.all_users ? "tous les utilisateurs" : `${i.affected_count} compte(s)`}{i.users_notified_at && ` · ${i.users_notified_count} prévenu(s) le ${when(i.users_notified_at)}`}</p>
        {!f.all_users && i.affected_emails.length > 0 && <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">{i.affected_emails.join(", ")}{i.affected_count > i.affected_emails.length && ` … (+${i.affected_count - i.affected_emails.length})`}</p>}
        <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={f.all_users} onChange={(e) => setF({ ...f, all_users: e.target.checked })} />Tous les utilisateurs sont concernés (par exemple une fuite de la base)</label>
        {!f.all_users && <label className="mt-2 block space-y-1"><span className="text-xs text-muted-foreground">Ajouter des comptes concernés (e-mails, un par ligne)</span><textarea rows={2} className={area} value={f.emails} onChange={(e) => setF({ ...f, emails: e.target.value })} /></label>}
      </div>
      <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">Motif de la décision (obligatoire pour classer sans déclaration)</span><textarea rows={2} className={area} value={f.decision_note} onChange={(e) => setF({ ...f, decision_note: e.target.value })} placeholder="Ex. : tentative bloquée, aucune donnée n'a été lue ni modifiée." /></label>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void save()}><Check className="size-3.5" />Enregistrer</Button>
        {st === "open" && <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void noRisk()}><ShieldCheck className="size-3.5" />Pas de risque : ne pas déclarer</Button>}
        {st !== "closed" && st !== "open" && <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void save({ status: "closed" }, "Incident clos.")}>Clore l'incident</Button>}
      </div>

      {st !== "not_reportable" && st !== "closed" && <div className="space-y-3 rounded-xl border border-border p-3">
        <p className="font-medium">1. Déclarer à l'autorité (APDP au Bénin, autorité du pays pour l'UE) — sous 72 h</p>
        <textarea readOnly rows={8} className={`${area} font-mono text-[12px]`} value={authorityText(textInput)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void copy(authorityText(textInput), "Texte de déclaration")}><Copy className="size-3.5" />Copier la déclaration</Button>
          {i.authority_notified_at
            ? <span className="self-center text-xs text-muted-foreground">Autorité prévenue le {when(i.authority_notified_at)}</span>
            : <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void save({ authority_notified: true }, "Déclaration enregistrée.")}><Check className="size-3.5" />J'ai déclaré à l'autorité</Button>}
        </div>
        <p className="font-medium">2. Prévenir les personnes concernées (si le risque est élevé)</p>
        {!mailDraft ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setMailDraft(userEmailText(textInput))}><Mail className="size-3.5" />Préparer l'e-mail</Button>
          : <div className="space-y-2">
            <Input value={mailDraft.subject} onChange={(e) => setMailDraft({ ...mailDraft, subject: e.target.value })} aria-label="Objet" />
            <textarea rows={12} className={area} value={mailDraft.body} onChange={(e) => setMailDraft({ ...mailDraft, body: e.target.value })} aria-label="Message" />
            {mailDraft.body.includes("[à compléter]") && <p className="text-xs text-destructive">Remplacez les « [à compléter] » avant l'envoi (ou complétez la fiche puis préparez l'e-mail à nouveau).</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="rounded-full" disabled={busy || mailDraft.body.includes("[à compléter]")} onClick={() => void send()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}{mail ? "Envoyer l'e-mail" : "Obtenir la liste des adresses"}</Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void copy(`${mailDraft.subject}\n\n${mailDraft.body}`, "E-mail")}><Copy className="size-3.5" />Copier le texte</Button>
            </div>
          </div>}
        {manual && <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{manual.length} adresse(s) à prévenir à la main (mettez-les en copie cachée) :</p>
          <textarea readOnly rows={4} className={`${area} font-mono text-[11px]`} value={manual.join(", ")} />
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void copy(manual.join(", "), "Adresses")}><Copy className="size-3.5" />Copier les adresses</Button>
        </div>}
      </div>}
      <p className="text-[11px] text-muted-foreground">Découvert le {when(i.detected_at)}{i.event_count > 0 && ` · ${i.event_count} événement(s) « ${i.kind} » dans le journal`}{i.decided_at && ` · décision le ${when(i.decided_at)}`}{i.closed_at && ` · clos le ${when(i.closed_at)}`}</p>
    </div>}
  </li>;
}

export function AdminIncidents() {
  const [d, setD] = useState<Data | null>(null);
  const [form, setForm] = useState<{ title: string; description: string } | null>(null);
  const load = useCallback(() => { listIncidents().then(setD).catch((e) => toast.error(errText(e))); }, []);
  useEffect(load, [load]);
  async function create() {
    if (!form || form.title.trim().length < 3) return;
    try { await createIncident({ data: form }); setForm(null); toast.success("Incident ouvert : le délai de 72 h commence maintenant."); load(); } catch (e) { toast.error(errText(e)); }
  }
  if (!d) return <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></p>;
  if (!d.ready) return <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive">Lancez la migration 0044_security_incidents.sql dans Supabase pour activer le registre des incidents.</p>;
  const openCount = d.items.filter((i) => i.status === "open").length;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldAlert className="size-4" />Registre des incidents</h2>
        <p className="text-xs text-muted-foreground">Ouverts automatiquement depuis le journal de sécurité, ou à la main (avis d'un prestataire, clé publiée par erreur…). Vous n'avez qu'à décider.</p>
      </div>
      <div className="flex gap-2">
        {d.items.length > 0 && <Button size="sm" variant="outline" className="rounded-full" onClick={() => exportCsv(d.items)}><Download className="size-3.5" />Exporter (CSV)</Button>}
        <Button size="sm" className="rounded-full" onClick={() => setForm(form ? null : { title: "", description: "" })}><Plus className="size-3.5" />Ouvrir un incident</Button>
      </div>
    </div>
    {!d.mail && <p className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"><AlertTriangle className="size-4 shrink-0 text-amber-600" />Envoi automatique des e-mails non configuré : ajoutez RESEND_API_KEY et INCIDENT_MAIL_FROM dans Vercel. En attendant, la liste des adresses à prévenir vous est donnée à copier.</p>}
    {form && <div className={`${card} space-y-2`}>
      <Input placeholder="Intitulé (ex. clé secrète publiée sur GitHub)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea rows={3} className={area} placeholder="Ce qui s'est passé, comment vous l'avez appris" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Button size="sm" className="rounded-full" disabled={form.title.trim().length < 3} onClick={() => void create()}>Ouvrir l'incident</Button>
    </div>}
    {openCount > 0 && <p className="text-sm font-medium text-destructive">{openCount} incident(s) à qualifier.</p>}
    {d.items.length === 0 ? <p className={`${card} text-sm text-muted-foreground`}>Aucun incident enregistré.</p>
      : <ul className="space-y-2">{d.items.map((i) => <IncidentCard key={`${i.id}-${i.updated_at}`} i={i} mail={d.mail} onChange={load} />)}</ul>}
  </div>;
}
