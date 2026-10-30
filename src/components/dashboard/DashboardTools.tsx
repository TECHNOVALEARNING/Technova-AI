import { PENDING_PACK_KEY } from "@/lib/public-pricing";
import { confirmDialog } from "@/components/ConfirmHost";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Check, Coins, Copy, Database, Gauge, KeyRound, MessageSquare, Plus, Sparkles, Trash2, Unlink, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { createApiKey } from "@/lib/api-keys.functions";
import {
  completeSupabaseConnect,
  disconnectSupabase,
  getSupabaseConnection,
  listSupabaseProjects,
  selectSupabaseProject,
  startSupabaseConnect,
} from "@/lib/supabase-oauth.functions";
import { modelCatalog } from "@/lib/model-pricing";
import { upgradeFeatureOf, upgradeSentence } from "@/lib/plans";
import { usePlanTier } from "@/lib/plan-client";
import { savePref } from "@/lib/consent";
import { formatFromXof, rateFor, useGeoPrice } from "@/lib/geo-price-client";
import { checkPayment, getPaymentMode, startCheckout } from "@/lib/payments.functions";
import { useDashboard } from "./dashboard-context";
import { PaymentSuccess } from "./PaymentSuccess";
import supabaseLogo from "@/assets/supabase-logo.svg";

const copy = {
  fr: {
    modelsTitle: "Modèles", modelsSub: "Prix affichés en crédits TechNova par million de tokens.", input: "Entrée", output: "Sortie", chat: "Discuter", soon: "Bientôt disponible", free: "Gratuit",
    creditsTitle: "Crédits", creditsSub: "Rechargez et suivez votre solde de crédits.", balance: "Solde", credits: "crédits Technova", remaining: "de votre solde restant", currency: "Devise", buy: "Acheter des crédits", popular: "Populaire", bonus: "bonus", activity: "Activité récente", noActivity: "Aucune activité pour le moment.", included: "Offert à l'inscription",
    payNotice: "Paiement sécurisé par Technova PAY : Mobile Money (Orange, Wave, MTN, Moov) et carte bancaire.", testMode: "Mode test actif : aucun paiement réel n'est encaissé.", testBlocked: "Paiement de test refusé : le site est en production. Aucun crédit n'a été ajouté.",
    redirecting: "Redirection…", paySuccess: "Paiement confirmé : vos crédits Technova sont ajoutés.", payPending: "Paiement en attente de confirmation. Vos crédits seront ajoutés dès validation.", payCancelled: "Paiement annulé.", payError: "Le paiement n'a pas pu démarrer. Réessayez.",
    apiTitle: "Clés API", apiSub: "Créez et gérez les clés utilisées pour appeler l'API TechNova.", keyName: "Nom de la clé", newKey: "Nouvelle clé", keysActive: "Vos clés sont actives : chaque appel API débite votre solde de crédits TechNova.", noKeys: "Aucune clé API pour l'instant.", created: "Créée le", revoke: "Révoquer", revokeConfirm: "Révoquer cette clé ? Les applications qui l'utilisent cesseront de fonctionner.", copyOnce: "Copiez cette clé maintenant : elle ne sera plus jamais affichée.", copied: "Copié", done: "J'ai copié la clé",
    usageTitle: "Utilisation & consommation", usageSub: "Suivez vos tokens, crédits et coûts par modèle.", tokens: "Tokens utilisés", requests: "requêtes IA", charged: "Crédits débités", chargedSub: "crédits TechNova utilisés", cost: "Coût équivalent", costSub: "valeur consommée", latency: "Latence moyenne", latencySub: "temps de réponse moyen", daily: "Activité quotidienne (tokens)", byModel: "Utilisation par modèle", log: "Journal détaillé des requêtes", noUsage: "Aucune consommation enregistrée.", model: "Modèle", date: "Date",
    billingTitle: "Facturation", billingSub: "Moyens de paiement et historique de votre compte.", payWay: "Payez comme vous voulez",
    settingsTitle: "Paramètres", fullName: "Nom complet", save: "Enregistrer", saved: "Profil enregistré", choosePlan: "Choisir une formule", language: "Langue", theme: "Thème", light: "Clair", dark: "Sombre",
    welcome: "Bonus de bienvenue", purchase: "Achat de crédits", usage: "Utilisation",
    supaTitle: "Supabase", supaSub: "Votre compte de base de données externe.",
    supaConnect: "Connecter Supabase", supaWait: "En attente de votre autorisation…", supaConnected: "Compte connecté", supaProject: "Projet sélectionné", supaNoProject: "Aucun projet sélectionné", supaLoad: "Choisir un projet", supaDisconnect: "Déconnecter",
    supaConfirm: "Déconnecter Supabase ? Le Studio ne pourra plus exécuter de SQL chez vous.", supaNotReady: "La connexion Supabase n'est pas encore activée sur ce serveur.", supaPopup: "Autorisez les fenêtres pop-up pour connecter Supabase.", supaFailed: "La connexion a échoué. Réessayez.", supaDone: "Supabase est connecté.",
    supaNote: "La connexion est sécurisée. Le SQL du Studio n'est pas encore envoyé automatiquement : vous pouvez l'examiner et le copier après génération.",
    confirmPack: "Confirmez votre achat", oneTime: "Paiement unique, sans abonnement.", confirmPay: "Payer maintenant", cancel: "Annuler",
  },
  en: {
    modelsTitle: "Models", modelsSub: "Prices shown in TechNova credits per million tokens.", input: "Input", output: "Output", chat: "Chat", soon: "Coming soon", free: "Free",
    creditsTitle: "Credits", creditsSub: "Top up and track your credit balance.", balance: "Balance", credits: "Technova credits", remaining: "of your credit balance remaining", currency: "Currency", buy: "Buy credits", popular: "Popular", bonus: "bonus", activity: "Recent activity", noActivity: "No activity yet.", included: "Included at sign-up",
    payNotice: "Secure payment by Technova PAY: Mobile Money (Orange, Wave, MTN, Moov) and card.", testMode: "Test mode: no real payment is collected.", testBlocked: "Test payment refused: the site is in production. No credits were added.",
    redirecting: "Redirecting…", paySuccess: "Payment confirmed: your Technova credits were added.", payPending: "Payment awaiting confirmation. Credits will be added once validated.", payCancelled: "Payment cancelled.", payError: "Payment could not start. Please try again.",
    apiTitle: "API Keys", apiSub: "Create and manage the keys used to call the TechNova API.", keyName: "Key name", newKey: "New key", keysActive: "Your keys are active: every API call debits your TechNova credit balance.", noKeys: "No API keys yet.", created: "Created", revoke: "Revoke", revokeConfirm: "Revoke this key? Apps using it will stop working.", copyOnce: "Copy this key now: it will never be shown again.", copied: "Copied", done: "I copied the key",
    usageTitle: "AI Usage & Consumption", usageSub: "Monitor your tokens, credits and costs per model.", tokens: "Total tokens used", requests: "AI requests", charged: "Credits charged", chargedSub: "TechNova credits used", cost: "Equivalent cost", costSub: "consumed value", latency: "Average latency", latencySub: "avg response time", daily: "Daily activity (tokens)", byModel: "Usage by AI model", log: "Detailed AI request log", noUsage: "No consumption logged yet.", model: "Model", date: "Date",
    billingTitle: "Billing", billingSub: "Payment methods and account history.", payWay: "Pay your way",
    settingsTitle: "Settings", fullName: "Full name", save: "Save", saved: "Profile saved", choosePlan: "Choose plan", language: "Language", theme: "Theme", light: "Light", dark: "Dark",
    welcome: "Welcome bonus", purchase: "Credit purchase", usage: "Usage",
    supaTitle: "Supabase", supaSub: "Your external database account.",
    supaConnect: "Connect Supabase", supaWait: "Waiting for your authorisation…", supaConnected: "Account connected", supaProject: "Selected project", supaNoProject: "No project selected", supaLoad: "Choose a project", supaDisconnect: "Disconnect",
    supaConfirm: "Disconnect Supabase? The Studio will no longer be able to run SQL there.", supaNotReady: "Supabase sign-in is not enabled on this server yet.", supaPopup: "Allow pop-ups to connect Supabase.", supaFailed: "Connection failed. Please try again.", supaDone: "Supabase is connected.",
    supaNote: "Your connection is secure. Studio SQL is not sent automatically yet: you can review and copy it after generation.",
    confirmPack: "Confirm your purchase", oneTime: "One-time payment, no subscription.", confirmPay: "Pay now", cancel: "Cancel",
  },
};

function useCopy() { const { lang } = useDashboard(); return copy[lang]; }
const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";
const eyebrow = "text-[10.5px] font-semibold tracking-[0.16em] text-muted-foreground";

function PageHead({ title, sub }: { title: string; sub: string }) {
  return <div className="mb-6"><h1 className="font-display text-[26px] font-semibold leading-tight">{title}</h1><p className="mt-1 text-[13px] text-muted-foreground">{sub}</p></div>;
}

/**
 * Display currency: the visitor's own currency by default (geopricing), with FCFA, USD and EUR as alternatives.
 * Packs are always billed in FCFA; other currencies are indicative ("≈" for daily market rates).
 */
function useCurrency() {
  const geo = useGeoPrice();
  const [choice, setChoice] = useState<string | null>(null);
  useEffect(() => {
    try { const v = localStorage.getItem("technova-currency"); setChoice(v === "FCFA" ? "XOF" : v); } catch { /* storage blocked */ }
  }, []);
  const local = geo.currency === "XAF" ? "XOF" : geo.currency;
  const options = [...new Set([local, "XOF", "USD", "EUR"])].filter((code) => rateFor(geo, code));
  const currency = choice && options.includes(choice) ? choice : local;
  const rate = rateFor(geo, currency);
  const setCurrency = (v: string) => { setChoice(v); savePref("technova-currency", v); };
  const format = (xof: number) => formatFromXof(xof, currency, rate, "fr-FR");
  return { currency, setCurrency, options, format, approx: !!rate?.approx };
}

type Tx = Tables<"credit_transactions">;
function useLedger() {
  const [rows, setRows] = useState<Tx[]>([]); const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    await supabase.rpc("claim_welcome_bonus");
    const { data } = await supabase.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []); setLoaded(true);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const balance = rows.reduce((s, r) => s + r.amount, 0);
  const totalIn = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  return { rows, balance, totalIn, loaded };
}

function CurrencySwitch({ currency, setCurrency, options }: ReturnType<typeof useCurrency>) {
  return <div className="inline-flex flex-wrap rounded-full border border-border bg-background p-1">{options.map(c => <button key={c} type="button" onClick={() => setCurrency(c)} className={`h-8 rounded-full px-4 text-[12px] font-semibold transition-colors ${currency === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{c === "XOF" ? "FCFA" : c}</button>)}</div>;
}

function ActivityList({ rows }: { rows: Tx[] }) {
  const c = useCopy();
  const label = (r: Tx) => r.kind === "welcome" ? c.welcome : r.kind === "purchase" ? c.purchase : r.kind === "admin_transfer" ? r.label : `${c.usage} · ${r.label}`;
  return <div className={card}><p className={eyebrow}>{c.activity.toUpperCase()}</p><div className="mt-3 divide-y divide-border">{rows.slice(0, 12).map(r => <div key={r.id} className="flex items-center justify-between py-3"><div><p className="text-[13px] font-medium">{label(r)}</p><p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></div><span className={`font-mono text-[12px] ${r.amount > 0 ? "text-primary" : "text-muted-foreground"}`}>{r.amount > 0 ? "+" : ""}{r.amount.toLocaleString()}</span></div>)}{rows.length === 0 && <p className="py-6 text-center text-[12px] text-muted-foreground">{c.noActivity}</p>}</div></div>;
}

function BalanceCard({ balance, totalIn, children }: { balance: number; totalIn: number; children?: React.ReactNode }) {
  const c = useCopy(); const pct = totalIn > 0 ? Math.max(0, Math.min(100, Math.round((balance / totalIn) * 100))) : 0;
  return <div className={card}><p className={eyebrow}>{c.balance.toUpperCase()}</p><p className="mt-2 font-display text-[32px] font-semibold leading-none">{balance.toLocaleString()} <span className="text-[14px] font-normal text-muted-foreground">{c.credits}</span></p>{children ?? <><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} /></div><p className="mt-2 text-[11.5px] text-muted-foreground">{pct}% {c.remaining}</p></>}</div>;
}

export function ModelsPage() {
  const c = useCopy(); const navigate = useNavigate();
  function open(name: string) { localStorage.setItem("technova-workspace-model", name); localStorage.setItem("technova-workspace-mode", "chat"); void navigate({ to: "/dashboard/chat" }); }
  return <div><PageHead title={c.modelsTitle} sub={c.modelsSub} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modelCatalog.map(m => <div key={m.name} className={`${card} flex flex-col`}>
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-secondary text-[11px] font-bold text-primary">{m.provider.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-[14px] font-semibold">{m.name}</p><p className="text-[11.5px] text-muted-foreground">{m.provider}</p></div>{m.input === 0 && m.kind === "chat" && <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">{c.free}</span>}</div>
      <div className="mt-4 grid grid-cols-2 border-t border-border pt-4 text-[12px]"><div><p className="text-muted-foreground">{c.input}</p><p className="mt-0.5 font-medium">{m.input.toLocaleString()} cr./M</p></div><div><p className="text-muted-foreground">{c.output}</p><p className="mt-0.5 font-medium">{m.output.toLocaleString()} cr./M</p></div></div>
      {m.kind === "chat" ? <Button variant="outline" className="mt-4 h-9 w-full rounded-full text-[12.5px]" onClick={() => open(m.name)}><MessageSquare className="size-4" />{c.chat}</Button> : <Button variant="outline" disabled className="mt-4 h-9 w-full rounded-full text-[12.5px]"><Sparkles className="size-4" />{c.soon}</Button>}
    </div>)}</div></div>;
}

function Packs({ cur }: { cur: ReturnType<typeof useCurrency> }) {
  const c = useCopy(); const { lang } = useDashboard(); const start = useServerFn(startCheckout); const check = useServerFn(checkPayment);
  const [packs, setPacks] = useState<Tables<"credit_packs">[]>([]); const [busy, setBusy] = useState("");
  // Confirmed payment: celebrate, then reload so the balance and plan badge show the new pack.
  const [paid, setPaid] = useState<{ pack: string | null; credits: number | null } | null>(null);
  useEffect(() => { void supabase.from("credit_packs").select("*").eq("active", true).order("display_order").then(({ data }) => setPacks(data ?? [])); }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const id = q.get("payment"); if (!id) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (q.get("cancelled")) { toast(c.payCancelled); return; }
    void check({ data: { id } }).then(r => { if (r.status === "success") setPaid({ pack: r.pack, credits: r.credits }); else if (r.status === "test_blocked") toast.error(c.testBlocked); else toast(c.payPending); }).catch(() => toast.error(c.payError));
  }, [check, c]);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { const s = localStorage.getItem(PENDING_PACK_KEY); if (s) { localStorage.removeItem(PENDING_PACK_KEY); setPending(s); } }, []);
  const pendingPack = packs.find(p => p.slug === pending);
  async function buy(slug: string) {
    setBusy(slug);
    try { const r = await start({ data: { slug } }); window.location.href = r.url; }
    catch { toast.error(c.payError); setBusy(""); }
  }
  return <div className="space-y-4"><PaymentSuccess open={!!paid} pack={paid?.pack ?? null} credits={paid?.credits ?? null} lang={lang === "en" ? "en" : "fr"} onClose={() => { setPaid(null); window.location.reload(); }} />{pendingPack && <div className={`${card} border-primary/60 ring-1 ring-primary/30`} role="region" aria-label={pendingPack.name}>
    <p className="text-[13.5px] font-semibold">{c.confirmPack}</p>
    <p className="mt-1 text-[13px]">{pendingPack.name} · {pendingPack.price_xof.toLocaleString("fr-FR")} FCFA → {pendingPack.credits.toLocaleString()} {c.credits}</p>
    <p className="mt-1 text-[11.5px] text-muted-foreground">{c.oneTime}</p>
    <div className="mt-3 flex gap-2"><Button disabled={!!busy} className="h-9 rounded-full text-[12.5px]" onClick={() => void buy(pendingPack.slug)}>{busy === pendingPack.slug ? c.redirecting : c.confirmPay}</Button><Button variant="ghost" className="h-9 rounded-full text-[12.5px]" onClick={() => setPending(null)}>{c.cancel}</Button></div>
  </div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{packs.map(p => <div key={p.id} className={`${card} ${p.featured ? "border-primary/60 ring-1 ring-primary/30" : ""}`}>
    <div className="flex items-center justify-between"><p className="text-[13.5px] font-semibold">{p.name}</p>{p.featured && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{c.popular}</span>}</div>
    <p className="mt-2 font-display text-[24px] font-semibold">{cur.format(p.price_xof)}</p>
    {cur.currency !== "XOF" && <p className="text-[11px] text-muted-foreground">{lang === "fr" ? "Facturé" : "Billed"} {p.price_xof.toLocaleString("fr-FR")} FCFA</p>}
    <p className="text-[12px] text-muted-foreground">{p.credits.toLocaleString()} {c.credits}</p>
    <Button variant={p.featured ? "default" : "outline"} disabled={!!busy} className="mt-4 h-9 w-full rounded-full text-[12.5px]" onClick={() => void buy(p.slug)}>{busy === p.slug ? c.redirecting : c.buy}</Button>
  </div>)}</div></div>;
}

export function CreditsPage() {
  const c = useCopy(); const cur = useCurrency(); const { rows, balance, totalIn } = useLedger();
  return <div className="space-y-4"><PageHead title={c.creditsTitle} sub={c.creditsSub} />
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><BalanceCard balance={balance} totalIn={totalIn} /><div className={card}><p className={eyebrow}>{c.currency.toUpperCase()}</p><div className="mt-4"><CurrencySwitch {...cur} /></div></div></div>
    <Packs cur={cur} /><ActivityList rows={rows} /></div>;
}

export function BillingPage() {
  const c = useCopy(); const { email } = useDashboard(); const cur = useCurrency(); const { rows, balance, totalIn } = useLedger();
  const [live, setLive] = useState(true);
  useEffect(() => { getPaymentMode().then((m) => setLive(m.live)).catch(() => setLive(true)); }, []);
  const methods = ["MTN MoMo", "Moov Money", "Orange Money", "Wave", "Visa", "Mastercard"];
  return <div className="space-y-4"><PageHead title={c.billingTitle} sub={c.billingSub} />
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><BalanceCard balance={balance} totalIn={totalIn}><p className="mt-3 text-[12px] text-muted-foreground">{email}</p></BalanceCard><div className={card}><p className={eyebrow}>{c.currency.toUpperCase()}</p><div className="mt-4"><CurrencySwitch {...cur} /></div></div></div>
    <div className={card}><p className={eyebrow}>{c.payWay.toUpperCase()}</p><div className="mt-4 flex flex-wrap gap-2">{methods.map(m => <span key={m} className="rounded-full border border-border px-3.5 py-1.5 text-[12px] text-muted-foreground">{m}</span>)}</div><p className="mt-4 text-[11.5px] text-muted-foreground">{c.payNotice}{!live && <strong className="block text-amber-600 dark:text-amber-400">{c.testMode}</strong>}</p><Button asChild className="mt-4 h-9 rounded-full text-[12.5px]"><Link to="/dashboard/credits"><Plus className="size-4" />{c.buy}</Link></Button></div>
    <ActivityList rows={rows} /></div>;
}

export function ApiKeysPage() {
  const c = useCopy(); const create = useServerFn(createApiKey); const { lang } = useDashboard(); const tier = usePlanTier(); const locked = tier !== null && tier < 3;
  const [keys, setKeys] = useState<Tables<"api_keys">[]>([]); const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [secret, setSecret] = useState(""); const [copied, setCopied] = useState(false);
  const load = useCallback(async () => { const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false }); setKeys(data ?? []); }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!name.trim()) return; setBusy(true); try { const r = await create({ data: { name } }); setSecret(r.secret); setName(""); setCopied(false); await load(); } catch (e) { const f = upgradeFeatureOf(e instanceof Error ? e.message : ""); toast.error(f ? upgradeSentence(f, lang !== "en") : "Error"); } finally { setBusy(false); } }
  async function revoke(id: string) { if (!(await confirmDialog({ title: c.revokeConfirm, tone: "danger", confirmLabel: c.revoke }))) return; await supabase.from("api_keys").delete().eq("id", id); await load(); }
  return <div className="space-y-4"><PageHead title={c.apiTitle} sub={c.apiSub} />
    {locked && <p className="rounded-xl border border-border bg-card px-4 py-3 text-[13px]">{upgradeSentence("api", lang !== "en")} <Link to="/dashboard/credits" className="font-medium text-primary hover:underline">{lang === "en" ? "See packs" : "Voir les packs"}</Link></p>}
    <div className={card}><form onSubmit={submit} className="flex gap-2"><Input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={c.keyName} aria-label={c.keyName} className="h-10 rounded-full bg-background px-4" /><Button type="submit" disabled={busy || locked || !name.trim()} className="h-10 shrink-0 rounded-full px-5"><Plus className="size-4" />{c.newKey}</Button></form>
      {secret ? <div className="mt-4 rounded-xl border border-primary/40 bg-secondary/60 p-4"><p className="text-[12px] font-medium">{c.copyOnce}</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-[12px]">{secret}</code><Button size="sm" variant="outline" className="rounded-full" onClick={() => { void navigator.clipboard.writeText(secret); setCopied(true); }}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? c.copied : ""}</Button></div><Button size="sm" variant="ghost" className="mt-2 rounded-full text-[12px]" onClick={() => setSecret("")}>{c.done}</Button></div>
      : <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-[12.5px] text-muted-foreground"><Check className="size-4 text-primary" />{c.keysActive}</div>}</div>
    {keys.length === 0 ? <p className="text-[12.5px] text-muted-foreground">{c.noKeys}</p> : <div className={`${card} divide-y divide-border p-0`}>{keys.map(k => <div key={k.id} className="flex items-center gap-3 px-5 py-4"><KeyRound className="size-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{k.name}</p><p className="font-mono text-[11px] text-muted-foreground">{k.prefix}••••••••</p></div><span className="hidden text-[11px] text-muted-foreground sm:block">{c.created} {new Date(k.created_at).toLocaleDateString()}</span><Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => void revoke(k.id)}><Trash2 className="size-4" />{c.revoke}</Button></div>)}</div>}
  </div>;
}

type SupaProject = { ref: string; name: string };

function SupabaseCard() {
  const c = useCopy();
  const { lang } = useDashboard();
  const start = useServerFn(startSupabaseConnect);
  const complete = useServerFn(completeSupabaseConnect);
  const status = useServerFn(getSupabaseConnection);
  const loadProjects = useServerFn(listSupabaseProjects);
  const choose = useServerFn(selectSupabaseProject);
  const drop = useServerFn(disconnectSupabase);
  const [row, setRow] = useState({ connected: false, projectRef: "", projectName: "" });
  const [projects, setProjects] = useState<SupaProject[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await status({ data: {} });
      setRow({ connected: r.connected, projectRef: r.projectRef, projectName: r.projectName });
    } catch {
      /* signed out */
    }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  function wait(popup: Window) {
    return new Promise<{ ok: boolean; code?: string; error?: string }>(resolve => {
      const done = (v: { ok: boolean; code?: string; error?: string }) => {
        window.removeEventListener("message", onMsg);
        clearInterval(tick);
        clearTimeout(bomb);
        resolve(v);
      };
      const onMsg = (e: MessageEvent) => {
        if (e.origin !== window.location.origin || e.data?.type !== "technova-supabase-oauth") return;
        done({ ok: Boolean(e.data.ok), code: typeof e.data.code === "string" ? e.data.code : undefined, error: typeof e.data.error === "string" ? e.data.error : undefined });
      };
      const tick = setInterval(() => { if (popup.closed) done({ ok: false, error: "closed" }); }, 700);
      const bomb = setTimeout(() => done({ ok: false, error: "timeout" }), 300000);
      window.addEventListener("message", onMsg);
    });
  }

  async function connect() {
    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem("technova-supabase-oauth-state", state);
    const popup = window.open("about:blank", "technova-supabase-oauth", "width=520,height=760");
    if (!popup) { localStorage.removeItem("technova-supabase-oauth-state"); toast.error(c.supaPopup); return; }
    setBusy(true);
    try {
      const r = await start({ data: { state } });
      if (!r.configured) { popup.close(); toast.error(c.supaNotReady); return; }
      popup.location.href = r.url;
      const res = await wait(popup);
      if (!res.ok || !res.code) { if (res.error !== "closed") toast.error(c.supaFailed); return; }
      const done = await complete({ data: { code: res.code } });
      setRow({ connected: true, projectRef: done.projectRef, projectName: done.projectName });
      setProjects(done.projects);
      toast.success(c.supaDone);
    } catch (e) {
      if (!popup.closed) popup.close();
      const feature = upgradeFeatureOf(e instanceof Error ? e.message : "");
      toast.error(feature ? upgradeSentence(feature, lang !== "en") : c.supaFailed);
    } finally {
      setBusy(false);
      localStorage.removeItem("technova-supabase-oauth-state");
    }
  }

  async function selectProject(ref: string) {
    setBusy(true);
    try {
      const r = await choose({ data: { ref } });
      setRow(v => ({ ...v, projectRef: r.projectRef, projectName: r.projectName }));
    } catch {
      toast.error(c.supaFailed);
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    setBusy(true);
    try {
      const r = await loadProjects({ data: {} });
      setProjects(r.projects);
      const first = r.projects[0];
      if (!r.projects.length) toast.error(c.supaNoProject);
      else if (!row.projectRef && r.projects.length === 1 && first) await selectProject(first.ref);
    } catch {
      toast.error(c.supaFailed);
    } finally {
      setBusy(false);
    }
  }

  async function forget() {
    if (!(await confirmDialog({ title: lang === "en" ? "Disconnect Supabase?" : "Déconnecter Supabase ?", description: c.supaConfirm.slice(c.supaConfirm.indexOf("?") + 1).trim(), tone: "danger", confirmLabel: lang === "en" ? "Disconnect" : "Déconnecter" }))) return;
    setBusy(true);
    try {
      await drop({ data: {} });
      setRow({ connected: false, projectRef: "", projectName: "" });
      setProjects(null);
    } catch {
      toast.error(c.supaFailed);
    } finally {
      setBusy(false);
    }
  }

  return <section className={`${card} p-5 sm:p-6`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-background"><img src={supabaseLogo} alt="" className="size-6" /></span><div><h2 className="font-display text-base font-semibold">Supabase</h2><p className="text-xs text-muted-foreground">{c.supaSub}</p></div></div>
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${row.connected ? "border-supabase/30 bg-supabase/10 text-supabase" : "border-border text-muted-foreground"}`}><span className={`size-1.5 rounded-full ${row.connected ? "bg-supabase" : "bg-muted-foreground"}`} />{row.connected ? c.supaConnected : c.supaConnect}</span>
    </div>
    {row.connected ? <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0"><label htmlFor="supa-project" className="text-xs font-semibold text-muted-foreground">{c.supaProject}</label>
        {projects && projects.length > 1 ? <select id="supa-project" value={row.projectRef} disabled={busy} onChange={e => { if (e.target.value) void selectProject(e.target.value); }} className="mt-2 h-10 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm"><option value="">{c.supaNoProject}</option>{projects.map(p => <option key={p.ref} value={p.ref}>{p.name} · {p.ref}</option>)}</select>
          : <p className="mt-2 truncate text-sm font-medium">{row.projectName || c.supaNoProject}{row.projectRef && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{row.projectRef}</span>}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{projects === null && <Button size="sm" variant="outline" disabled={busy} onClick={() => void pick()}>{c.supaLoad}</Button>}
        <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => void forget()}><Unlink className="size-4" />{c.supaDisconnect}</Button></div>
    </div> : <div className="mt-6 border-t border-border pt-5"><Button className="h-9 px-5" disabled={busy} onClick={() => void connect()}>{busy ? c.supaWait : c.supaConnect}</Button></div>}
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{c.supaNote}</p>
  </section>;
}

export function SettingsToolsPage() {
  const c = useCopy(); const { name, email, lang, setLang, theme, setTheme } = useDashboard(); const cur = useCurrency();
  const [value, setValue] = useState(name); const [busy, setBusy] = useState(false);
  useEffect(() => setValue(name), [name]);
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); const { data } = await supabase.auth.getUser(); if (data.user) { const { error } = await supabase.from("profiles").upsert({ id: data.user.id, display_name: value.trim().slice(0, 80) }); if (error) toast.error("Error"); else toast.success(c.saved); } setBusy(false); }
  const pill = (active: boolean) => `h-9 rounded-full px-4 text-[12px] font-semibold transition-colors ${active ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`;
  return <div className="space-y-4"><PageHead title={c.settingsTitle} sub={email} />
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={save} className={card}><p className={eyebrow}>{c.fullName.toUpperCase()}</p><Input value={value} onChange={e => setValue(e.target.value)} maxLength={80} className="mt-3 h-10 rounded-full bg-background px-4" aria-label={c.fullName} /><p className="mt-2 text-[11.5px] text-muted-foreground">{email}</p><div className="mt-4 flex flex-wrap gap-2"><Button type="submit" disabled={busy} className="h-9 rounded-full px-5">{c.save}</Button><Button asChild variant="outline" className="h-9 rounded-full px-5"><Link to="/dashboard/credits">{c.choosePlan}</Link></Button></div></form>
      <div className={`${card} space-y-5`}>
        <div><p className={eyebrow}>{c.currency.toUpperCase()}</p><div className="mt-3"><CurrencySwitch {...cur} /></div></div>
        <div><p className={eyebrow}>{c.language.toUpperCase()}</p><div className="mt-3 flex gap-2"><button type="button" className={pill(lang === "fr")} onClick={() => setLang("fr")}>FR</button><button type="button" className={pill(lang === "en")} onClick={() => setLang("en")}>EN</button></div></div>
        <div><p className={eyebrow}>{c.theme.toUpperCase()}</p><div className="mt-3 flex gap-2"><button type="button" className={pill(theme === "light")} onClick={() => setTheme("light")}>{c.light}</button><button type="button" className={pill(theme === "dark")} onClick={() => setTheme("dark")}>{c.dark}</button></div></div>
      </div>
    </div>
    <SupabaseCard /></div>;
}
