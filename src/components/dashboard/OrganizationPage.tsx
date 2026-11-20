import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Building2, CalendarClock, Check, Coins, Crown, LogOut, Mail, Pencil, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmDialog } from "@/components/ConfirmHost";
import { OrgPlanCards } from "@/components/site/OrgPlans";
import { NoCommitment } from "@/components/site/NoCommitment";
import { getOrganizationDashboard, inviteOrganizationMember, leaveOrganization, removeOrganizationMember, respondOrganizationInvitation, updateOrganization } from "@/lib/organization.functions";
import { loadMyOrganization, useMyOrganization } from "@/lib/org-client";
import { orgFeatureGroups, orgFeatures, orgPlans, type OrgFeature } from "@/lib/org-features";
import { PENDING_PACK_KEY } from "@/lib/public-pricing";
import { useNavigate } from "@tanstack/react-router";
import { useDashboard } from "./DashboardLayout";

// « Entreprise » (TechNova Team / Entreprise, migration 0057): the administrator's dashboard (credits, members,
// allowed features, usage, activity), the sub-account's view of its company, and the plans for everyone else.

const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";
const eyebrow = "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
type Dash = Awaited<ReturnType<typeof getOrganizationDashboard>>;

const featureLabel = (key: string, fr: boolean) => {
  if (key === "chat") return fr ? "Chat IA" : "AI chat";
  for (const g of orgFeatureGroups) for (const i of g.items) if (i.key === key) return fr ? i.fr : i.en;
  return key;
};
const errorText = (e: unknown, fr: boolean) => {
  const m = e instanceof Error ? e.message : String(e);
  const map: Record<string, [string, string]> = {
    ORG_SEATS_FULL: ["Tous les comptes du forfait sont utilisés : retirez un membre ou passez à TechNova Entreprise.", "Every seat is used: remove a member or move to TechNova Entreprise."],
    ORG_MEMBER_ELSEWHERE: ["Ce compte fait déjà partie d'une autre entreprise.", "This account already belongs to another company."],
    ORG_ALREADY_MEMBER: ["Ce compte fait déjà partie de votre entreprise.", "This account is already in your company."],
    ORG_SELF: ["Vous êtes déjà l'administrateur.", "You are already the administrator."],
    ORG_INACTIVE: ["Le forfait n'est pas actif : renouvelez-le pour ajouter des comptes.", "The plan is not active: renew it to add accounts."],
    ORG_INVITE_FAILED: ["L'invitation n'a pas pu être envoyée. Vérifiez l'adresse et réessayez.", "The invitation could not be sent. Check the address and try again."],
    RATE_LIMITED: ["Trop d'invitations d'un coup : réessayez dans quelques minutes.", "Too many invitations at once: try again in a few minutes."],
  };
  for (const [k, v] of Object.entries(map)) if (m.includes(k)) return v[fr ? 0 : 1];
  return fr ? "Action impossible. Réessayez." : "Action failed. Try again.";
};

export function OrganizationPage() {
  const { lang } = useDashboard(); const fr = lang !== "en";
  const org = useMyOrganization();
  if (!org) return <p className="text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>;
  const m = org.membership;
  return <div className="mx-auto max-w-[1180px] space-y-4">
    {org.invitations.length > 0 && <Invitations fr={fr} invitations={org.invitations} />}
    {m?.role === "admin" ? <AdminDashboard fr={fr} /> : m ? <MemberView fr={fr} m={m} /> : <PlansView fr={fr} />}
  </div>;
}

function Invitations({ fr, invitations }: { fr: boolean; invitations: { orgId: string; name: string; plan: string }[] }) {
  const respond = useServerFn(respondOrganizationInvitation);
  async function answer(orgId: string, accept: boolean) {
    try { await respond({ data: { orgId, accept } }); toast.success(accept ? (fr ? "Vous avez rejoint l'entreprise." : "You joined the company.") : (fr ? "Invitation refusée." : "Invitation declined.")); await loadMyOrganization(true); window.location.reload(); }
    catch (e) { toast.error(errorText(e, fr)); }
  }
  return <div className={`${card} border-sky-500/40 ring-1 ring-sky-500/20`}>
    <p className={eyebrow}>{fr ? "Invitations" : "Invitations"}</p>
    {invitations.map((i) => <div key={i.orgId} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{i.name}</span> {fr ? "vous invite à rejoindre son espace entreprise : vous utiliserez ses crédits partagés et les fonctions qu'il autorise." : "invites you to its company space: you will use its shared credits and the features it allows."}</p>
      <div className="flex gap-2"><Button className="h-9 rounded-full" onClick={() => void answer(i.orgId, true)}>{fr ? "Rejoindre" : "Join"}</Button><Button variant="ghost" className="h-9 rounded-full" onClick={() => void answer(i.orgId, false)}>{fr ? "Refuser" : "Decline"}</Button></div>
    </div>)}
  </div>;
}

function PlansView({ fr }: { fr: boolean }) {
  return <>
    <Hero fr={fr} title={fr ? "TechNova pour les entreprises" : "TechNova for companies"} sub={fr ? "Un compte administrateur, des sous-comptes pour votre équipe, un solde de crédits partagé, des fonctions choisies et un tableau de bord de la consommation." : "One administrator account, sub-accounts for your team, a shared credit balance, chosen features and a usage dashboard."} />
    <OrgPlanCards lang={fr ? "fr" : "en"} />
    <NoCommitment lang={fr ? "fr" : "en"} />
  </>;
}

function Hero({ fr, title, sub, right }: { fr: boolean; title: string; sub: string; right?: React.ReactNode }) {
  return <div className="overflow-hidden rounded-3xl border border-border bg-card">
    <div className="tn-black flex flex-col gap-4 px-6 py-7 text-white sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80"><Building2 className="size-3.5" />{fr ? "Entreprise" : "Company"}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/80">{sub}</p>
      </div>
      {right}
    </div>
  </div>;
}

function MemberView({ fr, m }: { fr: boolean; m: NonNullable<NonNullable<ReturnType<typeof useMyOrganization>>["membership"]> }) {
  const leave = useServerFn(leaveOrganization);
  const disabled = new Set(m.disabledFeatures);
  async function quit() {
    if (!(await confirmDialog({ title: fr ? "Quitter l'entreprise ?" : "Leave the company?", description: fr ? "Vous n'utiliserez plus les crédits partagés de l'entreprise. Vos conversations et créations restent à vous." : "You will no longer use the company's shared credits. Your conversations and creations stay yours.", confirmLabel: fr ? "Quitter" : "Leave", tone: "danger" }))) return;
    await leave(); await loadMyOrganization(true); window.location.reload();
  }
  return <>
    <Hero fr={fr} title={m.name} sub={fr ? `Vous utilisez le forfait ${m.plan === "team" ? "TechNova Team" : "TechNova Entreprise"} de votre entreprise : ses crédits partagés et les fonctions autorisées par l'administrateur.` : `You use your company's ${m.plan === "team" ? "TechNova Team" : "TechNova Entreprise"} plan: its shared credits and the features its administrator allows.`} />
    {!m.active && <p className={`${card} border-amber-500/50 text-sm`}>{fr ? "Le forfait de l'entreprise n'est pas actif pour le moment : vous utilisez votre propre solde jusqu'à son renouvellement." : "The company plan is not active right now: you use your own balance until it is renewed."}</p>}
    <div className={card}>
      <p className={eyebrow}>{fr ? "Fonctions de votre entreprise" : "Your company's features"}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{orgFeatures.map((f) => <p key={f} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] ${disabled.has(f) ? "border-border text-muted-foreground line-through" : "border-emerald-600/25 bg-emerald-500/[0.05]"}`}>{disabled.has(f) ? <span className="size-4" /> : <Check className="size-4 text-emerald-600" />}{featureLabel(f, fr)}</p>)}</div>
    </div>
    <div className="flex justify-end"><Button variant="outline" className="h-9 rounded-full" onClick={() => void quit()}><LogOut className="size-4" />{fr ? "Quitter l'entreprise" : "Leave the company"}</Button></div>
  </>;
}

function Kpi({ icon: Icon, label, value, sub, bar }: { icon: typeof Coins; label: string; value: string; sub?: string | undefined; bar?: number | undefined }) {
  return <div className={card}>
    <p className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground"><Icon className="size-4" />{label}</p>
    <p className="mt-2 font-display text-[26px] font-semibold tabular-nums">{value}</p>
    {bar !== undefined && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#1d4ed8]" style={{ width: `${Math.max(0, Math.min(100, bar * 100))}%` }} /></div>}
    {sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{sub}</p>}
  </div>;
}

function AdminDashboard({ fr }: { fr: boolean }) {
  const load = useServerFn(getOrganizationDashboard);
  const save = useServerFn(updateOrganization);
  const invite = useServerFn(inviteOrganizationMember);
  const remove = useServerFn(removeOrganizationMember);
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Dash | null>(null);
  const [failed, setFailed] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState<Set<OrgFeature>>(new Set(orgFeatures));
  const [dirty, setDirty] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const loc = fr ? "fr-FR" : "en-US";
  const n = (v: number) => v.toLocaleString(loc);

  const refresh = useCallback(async () => {
    try { const r = await load({ data: { days } }); setD(r); setFailed(false); setAllowed(new Set(orgFeatures.filter((f) => !r.org.disabledFeatures.includes(f)))); setDirty(false); setName(r.org.name); }
    catch { setFailed(true); }
  }, [load, days]);
  useEffect(() => { void refresh(); }, [refresh]);

  const totals = useMemo(() => {
    const used = d?.members.reduce((s, m) => s + m.credits, 0) ?? 0;
    const max = Math.max(1, ...(d?.byFeature.map((f) => f.credits) ?? [1]));
    return { used, max };
  }, [d]);
  if (failed) return <p className={`${card} text-sm`}>{fr ? "Impossible de charger le tableau de bord de l'entreprise." : "Could not load the company dashboard."} <button type="button" className="underline" onClick={() => void refresh()}>{fr ? "Réessayer" : "Retry"}</button></p>;
  if (!d) return <p className="text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>;

  const plan = orgPlans.find((p) => p.slug === d.org.plan)!;
  const activeMembers = d.members.filter((m) => m.status === "active").length;
  const daysLeft = d.period ? Math.max(0, Math.ceil((new Date(d.period.endsAt).getTime() - Date.now()) / 86_400_000)) : 0;
  const endDate = d.period ? new Date(d.period.endsAt).toLocaleDateString(loc, { day: "numeric", month: "long" }) : "";
  const renew = () => { try { localStorage.setItem(PENDING_PACK_KEY, d.org.plan); } catch { /* storage blocked */ } void navigate({ to: "/dashboard/credits" }); };

  async function addMember(e: React.FormEvent) {
    e.preventDefault(); if (!email.trim()) return;
    setBusy(true);
    try { const r = await invite({ data: { email: email.trim() } }); setEmail(""); toast.success(r.status === "active" ? (fr ? "Compte créé : une invitation par e-mail a été envoyée." : "Account created: an e-mail invitation was sent.") : (fr ? "Invitation envoyée : elle apparaîtra dans le tableau de bord de ce compte." : "Invitation sent: it will show in that account's dashboard.")); await refresh(); }
    catch (err) { toast.error(errorText(err, fr)); }
    finally { setBusy(false); }
  }
  async function dropMember(userId: string, label: string) {
    if (!(await confirmDialog({ title: fr ? "Retirer ce compte ?" : "Remove this account?", description: fr ? `${label} n'utilisera plus les crédits de l'entreprise. Son compte et ses créations restent les siens.` : `${label} will no longer use the company's credits. Their account and creations stay theirs.`, confirmLabel: fr ? "Retirer" : "Remove", tone: "danger" }))) return;
    try { await remove({ data: { userId } }); await refresh(); } catch (err) { toast.error(errorText(err, fr)); }
  }
  async function saveFeatures() {
    try { await save({ data: { disabledFeatures: orgFeatures.filter((f) => !allowed.has(f)) } }); toast.success(fr ? "Fonctions enregistrées pour toute l'équipe." : "Features saved for the whole team."); await refresh(); }
    catch { toast.error(fr ? "Enregistrement impossible." : "Could not save."); }
  }
  async function saveName() {
    if (name.trim().length < 2) return;
    try { await save({ data: { name: name.trim() } }); setEditingName(false); await refresh(); } catch { toast.error(fr ? "Enregistrement impossible." : "Could not save."); }
  }
  const eventText = (e: Dash["events"][number]) => {
    const who = e.email;
    const t: Record<string, [string, string]> = {
      plan_paid: ["Forfait payé", "Plan paid"], member_invited: [`${who} ajouté(e)`, `${who} added`], member_removed: [`${who} retiré(e)`, `${who} removed`],
      member_joined: [`${who} a rejoint l'entreprise`, `${who} joined`], member_left: [`${who} a quitté l'entreprise`, `${who} left`],
      invitation_declined: [`${who} a refusé l'invitation`, `${who} declined`], features: ["Fonctions autorisées modifiées", "Allowed features changed"], renamed: ["Entreprise renommée", "Company renamed"],
    };
    return (t[e.action] ?? [e.action, e.action])[fr ? 0 : 1];
  };

  return <>
    <Hero fr={fr}
      title={d.org.name}
      sub={`${plan.name} · ${d.period?.active ? (fr ? `actif jusqu'au ${endDate}` : `active until ${endDate}`) : (fr ? "forfait à renouveler" : "plan to renew")} · ${activeMembers}/${d.org.seats} ${fr ? "comptes" : "accounts"}`}
      right={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="h-9 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => setEditingName(true)}><Pencil className="size-4" />{fr ? "Renommer" : "Rename"}</Button>
        <Button className="h-9 rounded-full bg-white text-[#0b0b0d] hover:bg-white/90" onClick={renew}><Crown className="size-4" />{fr ? "Renouveler" : "Renew"}</Button>
      </div>} />
    {editingName && <form className={`${card} flex flex-col gap-2 sm:flex-row`} onSubmit={(e) => { e.preventDefault(); void saveName(); }}><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label={fr ? "Nom de l'entreprise" : "Company name"} /><Button type="submit" className="rounded-full">{fr ? "Enregistrer" : "Save"}</Button><Button type="button" variant="ghost" className="rounded-full" onClick={() => setEditingName(false)}>{fr ? "Annuler" : "Cancel"}</Button></form>}
    {!d.period?.active && <p className={`${card} border-amber-500/50 text-sm`}>{fr ? "Le forfait n'est pas actif : les comptes de l'équipe utilisent leur propre solde et ne peuvent plus être ajoutés. Renouvelez pour reprendre." : "The plan is not active: team accounts use their own balance and no account can be added. Renew to resume."}</p>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={Coins} label={fr ? "Crédits disponibles" : "Credits available"} value={n(Math.max(0, d.pool.available))} sub={d.pool.reserved > 0 ? `${n(d.pool.reserved)} ${fr ? "en cours d'utilisation" : "in use"}` : (fr ? "Solde partagé par l'équipe" : "Shared by the team")} />
      <Kpi icon={Activity} label={fr ? "Utilisés ce mois" : "Used this month"} value={n(d.period?.spent ?? 0)} sub={d.period ? `${fr ? "sur" : "of"} ${n(d.period.credits)} ${fr ? "crédits du mois" : "monthly credits"}` : undefined} bar={d.period ? d.period.spent / Math.max(1, d.period.credits) : undefined} />
      <Kpi icon={Users} label={fr ? "Comptes" : "Accounts"} value={`${activeMembers} / ${d.org.seats}`} sub={`${d.members.filter((m) => m.status === "invited").length} ${fr ? "invitation(s) en attente" : "pending invitation(s)"}`} bar={activeMembers / d.org.seats} />
      <Kpi icon={CalendarClock} label={fr ? "Jours restants" : "Days left"} value={String(daysLeft)} sub={fr ? "Les crédits du mois repartent à zéro à la fin" : "This month's credits reset at the end"} bar={daysLeft / 30} />
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={eyebrow}>{fr ? "Consommation de l'équipe" : "Team usage"}</p>
          <div className="inline-flex rounded-full border border-border p-0.5">{[7, 30, 90].map((v) => <button key={v} type="button" onClick={() => setDays(v)} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${days === v ? "bg-foreground text-background" : "text-muted-foreground"}`}>{v} {fr ? "j" : "d"}</button>)}</div>
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{n(totals.used)} {fr ? `crédits sur ${days} jours` : `credits over ${days} days`}</p>
        <div className="mt-3 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.daily} margin={{ left: -18, right: 6, top: 6 }}>
              <defs><linearGradient id="orgArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} /><stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis dataKey="date" tickFormatter={(v: string) => new Date(v).toLocaleDateString(loc, { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v: number) => [`${n(v)} ${fr ? "crédits" : "credits"}`, ""]} labelFormatter={(v: string) => new Date(v).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })} />
              <Area type="monotone" dataKey="credits" stroke="#1d4ed8" strokeWidth={2} fill="url(#orgArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={card}>
        <p className={eyebrow}>{fr ? "Par fonction" : "By feature"}</p>
        {d.byFeature.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{fr ? "Aucune consommation sur la période." : "No usage in this period."}</p>
          : <ul className="mt-3 space-y-2.5">{d.byFeature.slice(0, 9).map((f) => <li key={f.key}>
            <div className="flex justify-between text-[12.5px]"><span>{featureLabel(f.key, fr)}</span><span className="tabular-nums text-muted-foreground">{n(f.credits)}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#1d4ed8]" style={{ width: `${(f.credits / totals.max) * 100}%` }} /></div>
          </li>)}</ul>}
      </div>
    </div>

    <div className={card}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><p className={eyebrow}>{fr ? "Membres" : "Members"}</p><p className="mt-1 text-[12.5px] text-muted-foreground">{fr ? "Ajoutez un compte par son adresse e-mail : un compte TechNova existant reçoit une invitation dans son tableau de bord, une nouvelle adresse reçoit un e-mail pour créer son mot de passe." : "Add an account by e-mail: an existing TechNova account gets an invitation in its dashboard, a new address gets an e-mail to set its password."}</p></div>
        <form onSubmit={(e) => void addMember(e)} className="flex w-full gap-2 sm:w-auto"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@entreprise.com" className="sm:w-64" aria-label={fr ? "Adresse e-mail du membre" : "Member e-mail"} /><Button type="submit" disabled={busy || activeMembers >= d.org.seats} className="shrink-0 rounded-full"><UserPlus className="size-4" />{fr ? "Ajouter" : "Add"}</Button></form>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-[11.5px] text-muted-foreground"><tr><th className="py-2 font-medium">{fr ? "Compte" : "Account"}</th><th className="font-medium">{fr ? "Rôle" : "Role"}</th><th className="text-right font-medium">{fr ? `Crédits (${days} j)` : `Credits (${days} d)`}</th><th className="text-right font-medium">{fr ? "Requêtes" : "Requests"}</th><th className="font-medium pl-4">{fr ? "Dernière activité" : "Last activity"}</th><th /></tr></thead>
          <tbody>{d.members.map((m) => <tr key={m.userId} className="border-t border-border">
            <td className="py-2.5"><p className="font-medium">{m.name || m.email}</p>{m.name && <p className="text-[11.5px] text-muted-foreground">{m.email}</p>}</td>
            <td>{m.role === "admin" ? <span className="inline-flex items-center gap-1 rounded-full bg-[#1d4ed8]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[#1d4ed8] dark:text-sky-300"><ShieldCheck className="size-3" />{fr ? "Administrateur" : "Administrator"}</span> : m.status === "invited" ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700 dark:text-amber-300"><Mail className="size-3" />{fr ? "Invité" : "Invited"}</span> : <span className="text-[12px] text-muted-foreground">{fr ? "Membre" : "Member"}</span>}</td>
            <td className="text-right tabular-nums">{n(m.credits)}</td>
            <td className="text-right tabular-nums">{n(m.requests)}</td>
            <td className="pl-4 text-muted-foreground">{m.lastAt ? new Date(m.lastAt).toLocaleDateString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
            <td className="text-right">{m.role !== "admin" && <Button variant="ghost" size="icon-sm" aria-label={fr ? `Retirer ${m.email}` : `Remove ${m.email}`} onClick={() => void dropMember(m.userId, m.name || m.email)}><Trash2 className="size-4" /></Button>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>

    <div className={card}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><p className={eyebrow}>{fr ? "Fonctions autorisées" : "Allowed features"}</p><p className="mt-1 text-[12.5px] text-muted-foreground">{fr ? "Tout est coché par défaut. Décochez ce dont votre entreprise n'a pas besoin : les membres ne le verront plus et le serveur le refusera. Le chat reste toujours disponible ; vous, l'administrateur, gardez tout." : "Everything is ticked by default. Untick what your company does not need: members no longer see it and the server refuses it. The chat always stays available; you, the administrator, keep everything."}</p></div>
        <Button disabled={!dirty} className="rounded-full" onClick={() => void saveFeatures()}>{fr ? "Enregistrer" : "Save"}</Button>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">{orgFeatureGroups.map((g) => <div key={g.fr}>
        <p className="text-[12.5px] font-semibold">{fr ? g.fr : g.en}</p>
        <ul className="mt-2 space-y-1.5">{g.items.map((i) => { const on = allowed.has(i.key); return <li key={i.key}>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${on ? "border-[#1d4ed8]/30 bg-[#1d4ed8]/[0.04]" : "border-border opacity-70"}`}>
            <input type="checkbox" checked={on} onChange={(e) => { const next = new Set(allowed); if (e.target.checked) next.add(i.key); else next.delete(i.key); setAllowed(next); setDirty(true); }} className="mt-0.5 size-4 accent-[#1d4ed8]" />
            <span className="min-w-0"><span className="block text-[13px] font-medium">{fr ? i.fr : i.en}</span><span className="block text-[11.5px] text-muted-foreground">{fr ? i.dFr : i.dEn}</span></span>
          </label>
        </li>; })}</ul>
      </div>)}</div>
    </div>

    <div className={card}>
      <p className={eyebrow}>{fr ? "Activité récente" : "Recent activity"}</p>
      {d.events.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{fr ? "Rien pour le moment." : "Nothing yet."}</p>
        : <ul className="mt-3 divide-y divide-border">{d.events.map((e, i) => <li key={i} className="flex items-center justify-between gap-3 py-2 text-[13px]"><span>{eventText(e)}</span><span className="shrink-0 text-[11.5px] text-muted-foreground">{new Date(e.at).toLocaleString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></li>)}</ul>}
    </div>
    <p className="text-center text-[12px] text-muted-foreground">{fr ? "Besoin d'un autre forfait ?" : "Need another plan?"} <Link to="/dashboard/credits" className="underline">{fr ? "Tarifs et crédits" : "Pricing & credits"}</Link></p>
  </>;
}
