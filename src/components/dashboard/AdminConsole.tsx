import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Coins, Loader2, RefreshCw, Search, ShieldCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminListPacks, adminListPayments, adminListPublicRegistry, adminListUsers, adminSetAdminRole, adminSetUserSuspension,
  adminUnpublishRegistryItem, adminUpdatePack, getAdminOverview,
} from "@/lib/admin-console.functions";
import { getAdminStats } from "@/lib/admin.functions";

const card = "rounded-2xl border border-border bg-card/90 p-4";
const th = "p-3 text-left text-xs font-medium text-muted-foreground";
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^FORBIDDEN$/, "Accès refusé") : "Erreur");

function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return <div className="mt-3 flex items-center justify-end gap-3 text-xs">
    <Button variant="outline" size="icon" className="size-8 rounded-full" aria-label="Page précédente" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-4" /></Button>
    <span className="tabular-nums">{page} / {pages}</span>
    <Button variant="outline" size="icon" className="size-8 rounded-full" aria-label="Page suivante" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight className="size-4" /></Button>
  </div>;
}

// ---------- Overview ----------
type Overview = Awaited<ReturnType<typeof getAdminOverview>>;
type Stats = Exclude<Awaited<ReturnType<typeof getAdminStats>>, { admin: false }>;

export function AdminOverview({ fr }: { fr: boolean }) {
  const loc = fr ? "fr-FR" : "en-US"; const n = (v: number) => v.toLocaleString(loc);
  const [o, setO] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const load = useCallback(() => {
    setO(null);
    getAdminOverview().then(setO).catch((e) => toast.error(errText(e)));
    getAdminStats().then((s) => setStats(s.admin ? s : null)).catch(() => setStats(null));
  }, []);
  useEffect(load, [load]);
  if (!o) return <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></p>;
  const low = (v: number | null, min: number) => v !== null && v < min;
  const balance = (v: number | null) => (v === null ? "—" : `${v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`);
  const margin = o.revenue.total > 0 ? Math.round(((o.revenue.total - o.credits.consumedUsd * 600) / o.revenue.total) * 100) : null;
  return <div className="space-y-5">
    <div className="flex justify-end"><Button variant="outline" size="sm" className="rounded-full" onClick={load}><RefreshCw className="size-3.5" />{fr ? "Actualiser" : "Refresh"}</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { icon: TrendingUp, label: fr ? "Chiffre d'affaires total" : "Total revenue", value: `${n(o.revenue.total)} FCFA`, sub: fr ? `${n(o.revenue.buyers)} clients payants` : `${n(o.revenue.buyers)} paying customers` },
        { icon: TrendingUp, label: fr ? "30 derniers jours" : "Last 30 days", value: `${n(o.revenue.d30)} FCFA`, sub: fr ? `${n(o.revenue.paid30)} paiements réussis` : `${n(o.revenue.paid30)} successful payments` },
        { icon: TrendingUp, label: fr ? "Aujourd'hui" : "Today", value: `${n(o.revenue.today)} FCFA`, sub: fr ? `${n(o.revenue.pending30)} en attente · ${n(o.revenue.failed30)} échoués (30 j)` : `${n(o.revenue.pending30)} pending · ${n(o.revenue.failed30)} failed (30d)` },
        { icon: Users, label: fr ? "Comptes" : "Accounts", value: stats ? n(stats.users) : "…", sub: fr ? "inscrits au total" : "registered in total" },
      ].map((c) => <div key={c.label} className={card}><c.icon className="size-4 text-muted-foreground" /><p className="mt-2 font-display text-xl font-semibold tabular-nums">{c.value}</p><p className="text-xs text-muted-foreground">{c.label}</p><p className="mt-1 text-[11px] text-muted-foreground">{c.sub}</p></div>)}
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <div className={card}>
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="size-4" />{fr ? "Soldes chez les fournisseurs" : "Provider balances"}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className={`rounded-xl p-3 ${low(o.balances.textUsd, 5) ? "bg-destructive/10" : "bg-secondary/60"}`}><dt className="text-xs text-muted-foreground">{fr ? "Modèles de texte" : "Text models"}</dt><dd className="mt-1 font-display text-lg font-semibold">{balance(o.balances.textUsd)}</dd></div>
          <div className={`rounded-xl p-3 ${low(o.balances.mediaUsd, 5) ? "bg-destructive/10" : "bg-secondary/60"}`}><dt className="text-xs text-muted-foreground">{fr ? "Images, vidéos, musique" : "Images, video, music"}</dt><dd className="mt-1 font-display text-lg font-semibold">{balance(o.balances.mediaUsd)}</dd>{o.balances.mediaCredits !== null && <dd className="text-[11px] text-muted-foreground">{n(o.balances.mediaCredits)} {fr ? "crédits fournisseur" : "provider credits"}</dd>}</div>
        </dl>
        {(low(o.balances.textUsd, 5) || low(o.balances.mediaUsd, 5)) && <p className="mt-3 flex items-start gap-2 text-xs text-destructive"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{fr ? "Solde bas : rechargez le fournisseur, sinon les générations échoueront (elles ne sont alors pas facturées)." : "Low balance: top up the provider or generations will fail (they are then not charged)."}</p>}
      </div>
      <div className={card}>
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Coins className="size-4" />{fr ? "Crédits Technova" : "Technova credits"}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">{fr ? "Achetés" : "Purchased"}</dt><dd className="font-semibold tabular-nums">{n(o.credits.purchased)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{fr ? "Offerts ou remboursés" : "Granted or refunded"}</dt><dd className="font-semibold tabular-nums">{n(o.credits.granted)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{fr ? "Consommés" : "Consumed"}</dt><dd className="font-semibold tabular-nums">{n(o.credits.consumed)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{fr ? "Coût fournisseur estimé" : "Estimated provider cost"}</dt><dd className="font-semibold tabular-nums">≈ {o.credits.consumedUsd.toLocaleString(loc)} $</dd></div>
        </dl>
        {margin !== null && <p className="mt-3 text-xs text-muted-foreground">{fr ? `Marge brute estimée sur le chiffre d'affaires : ≈ ${margin} % (coût calculé à 1 200 crédits par dollar, 1 $ ≈ 600 FCFA).` : `Estimated gross margin on revenue: ≈ ${margin}% (cost at 1,200 credits per dollar, $1 ≈ 600 FCFA).`}</p>}
      </div>
    </div>

    {stats && <div className={card}>
      <h3 className="text-sm font-semibold">{fr ? "Consommation par modèle (30 jours)" : "Usage by model (30 days)"}</h3>
      <div className="mt-2 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>{fr ? "Modèle" : "Model"}</th><th className={th}>{fr ? "Appels" : "Calls"}</th><th className={th}>Tokens</th><th className={th}>{fr ? "Crédits" : "Credits"}</th></tr></thead>
        <tbody>{stats.models.length === 0 ? <tr><td colSpan={4} className="p-3 text-muted-foreground">{fr ? "Aucun usage." : "No usage."}</td></tr> : stats.models.map((m) => <tr key={m.model} className="border-t border-border"><td className="p-3">{m.model}</td><td className="p-3 tabular-nums">{n(m.calls)}</td><td className="p-3 tabular-nums">{n(m.tokens)}</td><td className="p-3 tabular-nums">{n(m.credits)}</td></tr>)}</tbody></table></div>
      <p className="mt-2 text-xs text-muted-foreground">{fr ? `Médias (30 j) : ${stats.media.images} images, ${stats.media.videos} vidéos, ${stats.media.failed} échecs, ${n(stats.media.charged)} crédits facturés.` : `Media (30d): ${stats.media.images} images, ${stats.media.videos} videos, ${stats.media.failed} failures, ${n(stats.media.charged)} credits charged.`}</p>
    </div>}
  </div>;
}

// ---------- Users ----------
type UserRow = Awaited<ReturnType<typeof adminListUsers>>["users"][number];

export function AdminUsers({ fr, onCredit }: { fr: boolean; onCredit: (email: string) => void }) {
  const loc = fr ? "fr-FR" : "en-US"; const n = (v: number) => Number(v).toLocaleString(loc);
  const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ users: UserRow[]; total: number; pageSize: number; me: string } | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => { adminListUsers({ data: { search: query, page } }).then(setData).catch((e) => toast.error(errText(e))); }, [query, page]);
  useEffect(load, [load]);
  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errText(e)); }
    setBusy("");
  }
  return <div className="space-y-3">
    <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }} className="flex gap-2">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher par e-mail ou nom" : "Search by e-mail or name"} className="pl-9" /></div>
      <Button type="submit" variant="outline">{fr ? "Rechercher" : "Search"}</Button>
    </form>
    {!data ? <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /> : <>
      <p className="text-xs text-muted-foreground">{n(data.total)} {fr ? "comptes" : "accounts"}</p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card/90"><table className="w-full min-w-[860px] text-sm">
        <thead><tr><th className={th}>{fr ? "Compte" : "Account"}</th><th className={th}>{fr ? "Inscrit" : "Joined"}</th><th className={th}>{fr ? "Solde" : "Balance"}</th><th className={th}>{fr ? "Conso. 30 j" : "Usage 30d"}</th><th className={th}>{fr ? "Payé" : "Paid"}</th><th className={th}>{fr ? "Statut" : "Status"}</th><th className={th}>{fr ? "Actions" : "Actions"}</th></tr></thead>
        <tbody>{data.users.map((u) => <tr key={u.id} className="border-t border-border align-top">
          <td className="p-3"><span className="block font-medium">{u.display_name || "—"}</span><span className="block text-xs text-muted-foreground">{u.email}</span></td>
          <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString(loc)}{u.last_sign_in_at && <span className="block">{fr ? "vu le" : "seen"} {new Date(u.last_sign_in_at).toLocaleDateString(loc)}</span>}</td>
          <td className="p-3 tabular-nums">{n(u.balance)}</td>
          <td className="p-3 tabular-nums">{n(u.credits_30d)}<span className="block text-xs text-muted-foreground">{n(u.requests_30d)} {fr ? "requêtes" : "requests"}</span></td>
          <td className="p-3 tabular-nums">{n(u.paid_xof)} FCFA</td>
          <td className="p-3"><div className="flex flex-wrap gap-1">{u.is_admin && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">Admin</span>}{u.suspended ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">{fr ? "Suspendu" : "Suspended"}</span> : <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{fr ? "Actif" : "Active"}</span>}</div></td>
          <td className="p-3"><div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={u.suspended} onClick={() => onCredit(u.email)}>{fr ? "Créditer" : "Credit"}</Button>
            {u.id !== data.me && <Button size="sm" variant="outline" className={`h-7 rounded-full text-xs ${u.suspended ? "" : "text-destructive"}`} disabled={busy === u.id || u.is_admin}
              onClick={() => { const reason = u.suspended ? "" : window.prompt(fr ? `Suspendre ${u.email} ? Motif :` : `Suspend ${u.email}? Reason:`); if (reason === null) return; void act(u.id, () => adminSetUserSuspension({ data: { userId: u.id, suspend: !u.suspended, reason: reason ?? "" } }), u.suspended ? (fr ? "Compte rétabli" : "Account reinstated") : (fr ? "Compte suspendu" : "Account suspended")); }}>
              {u.suspended ? (fr ? "Rétablir" : "Reinstate") : (fr ? "Suspendre" : "Suspend")}</Button>}
            {u.id !== data.me && <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" disabled={busy === u.id || u.suspended}
              onClick={() => { if (!window.confirm(u.is_admin ? (fr ? `Retirer le rôle administrateur de ${u.email} ?` : `Remove admin role from ${u.email}?`) : (fr ? `Nommer ${u.email} administrateur ? Il aura accès à toute cette console.` : `Make ${u.email} an admin? They will access this whole console.`))) return; void act(u.id, () => adminSetAdminRole({ data: { userId: u.id, admin: !u.is_admin } }), fr ? "Rôle mis à jour" : "Role updated"); }}>
              <ShieldCheck className="size-3.5" />{u.is_admin ? (fr ? "Retirer admin" : "Remove admin") : (fr ? "Nommer admin" : "Make admin")}</Button>}
          </div></td>
        </tr>)}</tbody>
      </table></div>
      <Pager page={page} total={data.total} size={data.pageSize} onPage={setPage} />
    </>}
  </div>;
}

// ---------- Payments ----------
type Pay = Awaited<ReturnType<typeof adminListPayments>>["payments"][number];
const statusLabel = (s: string, fr: boolean) => ({ success: fr ? "Réussi" : "Paid", pending: fr ? "En attente" : "Pending", failed: fr ? "Échoué" : "Failed", test_blocked: fr ? "Test bloqué" : "Test blocked" }[s] ?? s);

export function AdminPayments({ fr }: { fr: boolean }) {
  const loc = fr ? "fr-FR" : "en-US";
  const [status, setStatus] = useState<"all" | "success" | "pending" | "failed">("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ payments: Pay[]; total: number; pageSize: number } | null>(null);
  useEffect(() => { setData(null); adminListPayments({ data: { status, page } }).then(setData).catch((e) => toast.error(errText(e))); }, [status, page]);
  const tabs = [["all", fr ? "Tous" : "All"], ["success", fr ? "Réussis" : "Paid"], ["pending", fr ? "En attente" : "Pending"], ["failed", fr ? "Échoués" : "Failed"]] as const;
  return <div className="space-y-3">
    <div className="inline-flex rounded-full bg-secondary p-1">{tabs.map(([k, l]) => <button key={k} type="button" onClick={() => { setStatus(k); setPage(1); }} className={`h-8 rounded-full px-3 text-xs font-medium ${status === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{l}</button>)}</div>
    {!data ? <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /> : <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card/90"><table className="w-full min-w-[720px] text-sm">
        <thead><tr><th className={th}>Date</th><th className={th}>{fr ? "Client" : "Customer"}</th><th className={th}>Pack</th><th className={th}>{fr ? "Montant" : "Amount"}</th><th className={th}>{fr ? "Crédits" : "Credits"}</th><th className={th}>{fr ? "Statut" : "Status"}</th></tr></thead>
        <tbody>{data.payments.length === 0 ? <tr><td colSpan={6} className="p-3 text-muted-foreground">{fr ? "Aucun paiement." : "No payments."}</td></tr> : data.payments.map((p) => <tr key={p.id} className="border-t border-border">
          <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString(loc, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
          <td className="p-3 text-xs">{p.email || p.owner_id.slice(0, 8)}</td>
          <td className="p-3 capitalize">{p.pack_slug}</td>
          <td className="p-3 tabular-nums">{p.amount_xof.toLocaleString(loc)} FCFA</td>
          <td className="p-3 tabular-nums">{p.credits.toLocaleString(loc)}{p.credited && " ✓"}</td>
          <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[11px] ${p.status === "success" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : p.status === "pending" ? "bg-secondary" : "bg-destructive/15 text-destructive"}`}>{statusLabel(p.status, fr)}</span>{!p.livemode && <span className="ml-1 text-[11px] text-muted-foreground">test</span>}</td>
        </tr>)}</tbody>
      </table></div>
      <Pager page={page} total={data.total} size={data.pageSize} onPage={setPage} />
    </>}
  </div>;
}

// ---------- Packs ----------
type Pack = Awaited<ReturnType<typeof adminListPacks>>[number];

export function AdminPacks({ fr }: { fr: boolean }) {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [saving, setSaving] = useState("");
  const load = useCallback(() => { adminListPacks().then(setPacks).catch((e) => toast.error(errText(e))); }, []);
  useEffect(load, [load]);
  const set = (slug: string, patch: Partial<Pack>) => setPacks((all) => all?.map((p) => (p.slug === slug ? { ...p, ...patch } : p)) ?? null);
  async function save(p: Pack) {
    if (!window.confirm(fr ? `Enregistrer « ${p.name} » à ${p.price_xof.toLocaleString("fr-FR")} FCFA pour ${p.credits.toLocaleString("fr-FR")} crédits ? Les prochains achats utiliseront ces valeurs.` : `Save "${p.name}" at ${p.price_xof} FCFA for ${p.credits} credits?`)) return;
    setSaving(p.slug);
    try { await adminUpdatePack({ data: { slug: p.slug, name: p.name, price_xof: p.price_xof, credits: p.credits, active: p.active, featured: p.featured } }); toast.success(fr ? "Pack enregistré" : "Pack saved"); load(); }
    catch (e) { toast.error(errText(e)); }
    setSaving("");
  }
  if (!packs) return <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />;
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">{fr ? "Les modifications s'appliquent aux prochains achats ; les paiements passés ne changent pas. Un seul pack peut être mis en avant." : "Changes apply to future purchases; past payments are unchanged. Only one pack can be featured."}</p>
    <div className="grid gap-3 md:grid-cols-2">{packs.map((p) => <div key={p.slug} className={card}>
      <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{p.slug}</span><span className="text-xs text-muted-foreground">{p.credits > 0 ? `${(p.price_xof / p.credits).toLocaleString(fr ? "fr-FR" : "en-US", { maximumFractionDigits: 2 })} FCFA / ${fr ? "crédit" : "credit"}` : ""}</span></div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="col-span-3 text-xs">{fr ? "Nom" : "Name"}<Input value={p.name} maxLength={40} onChange={(e) => set(p.slug, { name: e.target.value })} className="mt-1" /></label>
        <label className="text-xs">{fr ? "Prix (FCFA)" : "Price (FCFA)"}<Input type="number" min={100} value={p.price_xof} onChange={(e) => set(p.slug, { price_xof: Math.max(0, Number(e.target.value) || 0) })} className="mt-1" /></label>
        <label className="text-xs">{fr ? "Crédits" : "Credits"}<Input type="number" min={1} value={p.credits} onChange={(e) => set(p.slug, { credits: Math.max(0, Number(e.target.value) || 0) })} className="mt-1" /></label>
        <div className="flex flex-col justify-end gap-1 text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.active} onChange={(e) => set(p.slug, { active: e.target.checked })} />{fr ? "En vente" : "On sale"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.featured} onChange={(e) => set(p.slug, { featured: e.target.checked })} />{fr ? "Mis en avant" : "Featured"}</label>
        </div>
      </div>
      <Button size="sm" className="mt-3 rounded-full" disabled={saving === p.slug || p.price_xof < 100 || p.credits < 1} onClick={() => void save(p)}>{saving === p.slug ? <Loader2 className="size-3.5 animate-spin" /> : null}{fr ? "Enregistrer" : "Save"}</Button>
    </div>)}</div>
  </div>;
}

// ---------- Registry moderation ----------
type RegItem = Awaited<ReturnType<typeof adminListPublicRegistry>>[number];

export function AdminRegistryModeration({ fr }: { fr: boolean }) {
  const [items, setItems] = useState<RegItem[] | null>(null);
  const load = useCallback(() => { adminListPublicRegistry().then(setItems).catch((e) => toast.error(errText(e))); }, []);
  useEffect(load, [load]);
  async function unpublish(i: RegItem) {
    if (!window.confirm(fr ? `Rendre privée la ressource « ${i.title} » ?` : `Make "${i.title}" private?`)) return;
    try { await adminUnpublishRegistryItem({ data: { id: i.id } }); toast.success(fr ? "Ressource retirée du public" : "Resource unpublished"); load(); } catch (e) { toast.error(errText(e)); }
  }
  return <section className="mt-6">
    <h2 className="font-display text-lg font-semibold">{fr ? "Ressources publiques du Registry" : "Public Registry resources"}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{fr ? "Ressources rendues publiques par les utilisateurs (les ressources officielles ne sont pas listées)." : "Resources made public by users (official items are not listed)."}</p>
    <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-card/90"><table className="w-full text-sm">
      <thead><tr><th className={th}>{fr ? "Titre" : "Title"}</th><th className={th}>{fr ? "Catégorie" : "Category"}</th><th className={th}>{fr ? "Téléchargements" : "Downloads"}</th><th className={th}>Date</th><th className={th} /></tr></thead>
      <tbody>{!items ? <tr><td colSpan={5} className="p-3"><Loader2 className="size-4 animate-spin text-muted-foreground" /></td></tr> : items.length === 0 ? <tr><td colSpan={5} className="p-3 text-muted-foreground">{fr ? "Aucune ressource publique d'utilisateur." : "No public user resources."}</td></tr> : items.map((i) => <tr key={i.id} className="border-t border-border">
        <td className="p-3">{i.title}</td><td className="p-3 text-muted-foreground">{i.category}</td><td className="p-3 tabular-nums">{i.downloads}</td>
        <td className="p-3 text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
        <td className="p-3 text-right"><Button size="sm" variant="outline" className="h-7 rounded-full text-xs text-destructive" onClick={() => void unpublish(i)}>{fr ? "Retirer du public" : "Unpublish"}</Button></td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
