import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Building2, Check, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { orgPlans, type OrgPlanSlug } from "@/lib/org-features";
import { PENDING_PACK_KEY } from "@/lib/public-pricing";
import type { SiteLang } from "@/lib/i18n";
import { formatLocalPrice, isCfa } from "@/lib/geo-pricing";
import { useGeoPrice } from "@/lib/geo-price-client";
import { NoCommitment } from "./NoCommitment";

// Company plans (« Détails » under the pricing packs): TechNova Team and TechNova Entreprise, monthly, with an
// administrator account, sub-accounts sharing the credits, features ticked by the administrator and a dashboard.
type PlanCopy = { tagline: string; lead?: string; perks: string[] };
const copy: Record<SiteLang, {
  title: string; sub: string; perMonth: string; credits: string; accounts: string; choose: string; billed: string;
  how: { t: string; d: string }[]; plans: Record<OrgPlanSlug, PlanCopy>;
}> = {
  fr: {
    title: "Forfaits entreprise", sub: "Un compte administrateur, des sous-comptes pour votre équipe et un seul solde de crédits partagé.",
    perMonth: "par mois", credits: "crédits partagés chaque mois", accounts: "comptes", choose: "Choisir", billed: "Facturé",
    how: [
      { t: "Un compte administrateur", d: "Celui qui achète le forfait gère l'équipe : il ajoute ou retire des comptes par e-mail." },
      { t: "Des fonctions au choix", d: "Tout est coché au départ : l'administrateur décoche ce dont l'entreprise n'a pas besoin (musique, vidéo, Créativité…)." },
      { t: "Un tableau de bord", d: "Crédits restants, consommation par membre et par fonction, évolution jour par jour, journal d'activité." },
    ],
    plans: {
      team: { tagline: "Pour les petites équipes et les associations", perks: ["Jusqu'à 5 comptes, administrateur compris", "Toutes les fonctions du forfait Pro pour chaque compte", "Un solde de crédits commun à toute l'équipe", "Fonctions autorisées au choix (cases à cocher)", "Tableau de bord : consommation par membre et par fonction"] },
      entreprise: { tagline: "Pour les entreprises, écoles et administrations", lead: "Tout TechNova Team, plus :", perks: ["Jusqu'à 25 comptes, administrateur compris", "Le meilleur prix au crédit des forfaits entreprise", "Journal d'activité de l'équipe (ajouts, retraits, réglages)"] },
    },
  },
  en: {
    title: "Company plans", sub: "One administrator account, sub-accounts for your team and one shared credit balance.",
    perMonth: "per month", credits: "shared credits every month", accounts: "accounts", choose: "Choose", billed: "Billed",
    how: [
      { t: "One administrator account", d: "Whoever buys the plan manages the team: they add or remove accounts by e-mail." },
      { t: "Features of your choice", d: "Everything is ticked at first: the administrator unticks what the company does not need (music, video, Creativity…)." },
      { t: "A dashboard", d: "Credits left, usage per member and per feature, day-by-day trend, activity log." },
    ],
    plans: {
      team: { tagline: "For small teams and associations", perks: ["Up to 5 accounts, administrator included", "Every Pro feature for every account", "One credit balance shared by the whole team", "Features allowed of your choice (checkboxes)", "Dashboard: usage per member and per feature"] },
      entreprise: { tagline: "For companies, schools and public bodies", lead: "Everything in TechNova Team, plus:", perks: ["Up to 25 accounts, administrator included", "The best price per credit of the company plans", "Team activity log (additions, removals, settings)"] },
    },
  },
  es: {
    title: "Planes para empresas", sub: "Una cuenta de administrador, subcuentas para su equipo y un solo saldo de créditos compartido.",
    perMonth: "al mes", credits: "créditos compartidos cada mes", accounts: "cuentas", choose: "Elegir", billed: "Se factura",
    how: [
      { t: "Una cuenta de administrador", d: "Quien compra el plan gestiona el equipo: añade o quita cuentas por e-mail." },
      { t: "Funciones a elegir", d: "Todo viene marcado: el administrador desmarca lo que la empresa no necesita (música, vídeo, Creatividad…)." },
      { t: "Un panel", d: "Créditos restantes, consumo por miembro y por función, evolución diaria, registro de actividad." },
    ],
    plans: {
      team: { tagline: "Para equipos pequeños y asociaciones", perks: ["Hasta 5 cuentas, administrador incluido", "Todas las funciones del plan Pro para cada cuenta", "Un saldo de créditos común para todo el equipo", "Funciones permitidas a elegir (casillas)", "Panel: consumo por miembro y por función"] },
      entreprise: { tagline: "Para empresas, escuelas y administraciones", lead: "Todo TechNova Team, más:", perks: ["Hasta 25 cuentas, administrador incluido", "El mejor precio por crédito de los planes para empresas", "Registro de actividad del equipo (altas, bajas, ajustes)"] },
    },
  },
  pt: {
    title: "Planos para empresas", sub: "Uma conta de administrador, subcontas para a sua equipe e um único saldo de créditos compartilhado.",
    perMonth: "por mês", credits: "créditos compartilhados por mês", accounts: "contas", choose: "Escolher", billed: "Cobrado",
    how: [
      { t: "Uma conta de administrador", d: "Quem compra o plano gerencia a equipe: adiciona ou remove contas por e-mail." },
      { t: "Funções à escolha", d: "Tudo vem marcado: o administrador desmarca o que a empresa não precisa (música, vídeo, Criatividade…)." },
      { t: "Um painel", d: "Créditos restantes, consumo por membro e por função, evolução diária, registro de atividade." },
    ],
    plans: {
      team: { tagline: "Para pequenas equipes e associações", perks: ["Até 5 contas, administrador incluído", "Todas as funções do plano Pro para cada conta", "Um saldo de créditos comum a toda a equipe", "Funções permitidas à escolha (caixas)", "Painel: consumo por membro e por função"] },
      entreprise: { tagline: "Para empresas, escolas e órgãos públicos", lead: "Tudo do TechNova Team, mais:", perks: ["Até 25 contas, administrador incluído", "O melhor preço por crédito dos planos para empresas", "Registro de atividade da equipe (entradas, saídas, ajustes)"] },
    },
  },
};
const locales: Record<SiteLang, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" };
const howIcons = [ShieldCheck, Check, LayoutDashboard];

/** Plan cards of the company plans (dialog on the pricing pages, company page of the dashboard). */
export function OrgPlanCards({ lang, onChoose }: { lang: SiteLang; onChoose?: (slug: OrgPlanSlug) => void }) {
  const t = copy[lang] ?? copy.fr; const loc = locales[lang]; const geo = useGeoPrice(); const navigate = useNavigate();
  async function choose(slug: OrgPlanSlug) {
    if (onChoose) { onChoose(slug); return; }
    try { localStorage.setItem(PENDING_PACK_KEY, slug); } catch { /* storage blocked */ }
    const { data } = await supabase.auth.getSession();
    void navigate({ to: data.session ? "/dashboard/credits" : "/inscription" });
  }
  return <div className="grid gap-4 md:grid-cols-2">{orgPlans.map((p) => {
    const c = t.plans[p.slug]; const dark = p.slug === "entreprise";
    return <article key={p.slug} className={`flex flex-col rounded-2xl border p-6 ${dark ? "tn-black border-white/10 shadow-lift" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2.5"><span className={`grid size-9 place-items-center rounded-xl ${dark ? "bg-white/15" : "bg-secondary"}`}>{dark ? <Building2 className="size-4.5" /> : <Users className="size-4.5" />}</span><h3 className="font-display text-xl font-semibold">{p.name}</h3></div>
      <p className={`mt-2 text-sm ${dark ? "text-white/75" : "text-muted-foreground"}`}>{c.tagline}</p>
      <p className="mt-5 font-display text-3xl font-semibold">{!isCfa(geo.currency) ? <>{geo.approx && <span className="mr-1 text-lg font-normal opacity-60">≈</span>}{formatLocalPrice(p.price, geo, loc)}</> : <>{p.price.toLocaleString(loc)} <span className="text-sm font-normal opacity-70">FCFA</span></>}<span className="ml-1 text-sm font-normal opacity-70">/ {t.perMonth}</span></p>
      {!isCfa(geo.currency) && <p className={`text-xs ${dark ? "text-white/60" : "text-muted-foreground"}`}>{t.billed} {p.price.toLocaleString(loc)} FCFA</p>}
      <p className="mt-2 text-sm font-semibold">{p.credits.toLocaleString(loc)} {t.credits} · {p.seats} {t.accounts}</p>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {c.lead && <li className="font-semibold">{c.lead}</li>}
        {c.perks.map((perk) => <li key={perk} className="flex items-start gap-2.5"><Check className={`mt-0.5 size-4 shrink-0 ${dark ? "text-sky-300" : "text-emerald-600"}`} /><span>{perk}</span></li>)}
      </ul>
      <button type="button" onClick={() => void choose(p.slug)} className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition hover:opacity-90 ${dark ? "bg-white text-[#0b0b0d]" : "bg-foreground text-background"}`}>{t.choose} {p.name}<ArrowUpRight className="size-3.5" /></button>
    </article>;
  })}</div>;
}

/** « Détails » dialog: how the company plans work, the two plans and the no-commitment terms. */
export function OrgPlansDialog({ lang, open, onOpenChange }: { lang: SiteLang; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = copy[lang] ?? copy.fr;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92svh] w-[min(980px,96vw)] max-w-none overflow-y-auto rounded-3xl p-5 sm:p-7">
      <DialogTitle className="font-display text-2xl font-semibold">{t.title}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">{t.sub}</DialogDescription>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">{t.how.map((h, i) => { const Icon = howIcons[i] ?? Check; return <div key={h.t} className="rounded-2xl border border-border bg-secondary/40 p-4"><Icon className="size-5 text-foreground" /><p className="mt-2 text-sm font-semibold">{h.t}</p><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{h.d}</p></div>; })}</div>
      <div className="mt-2"><OrgPlanCards lang={lang} /></div>
      <div className="mt-2"><NoCommitment lang={lang} compact /></div>
    </DialogContent>
  </Dialog>;
}
