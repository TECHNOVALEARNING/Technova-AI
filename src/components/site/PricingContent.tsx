import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Circle, Minus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fallbackPacks, estimateCategories, estimateFor, PENDING_PACK_KEY, type AccessLevel, type Estimate, type PlanFeature, type PublicPack } from "@/lib/public-pricing";
import type { Lang } from "@/lib/i18n";

const text = {
  fr: { title: "Comparez les forfaits Technova AI HUB", sub: "Six packs de crédits Technova prépayés.", once: "Paiement unique", terms: "Paiement unique • crédits prépayés • aucun renouvellement automatique", choose: "Choisir ce pack", popular: "LE PLUS POPULAIRE", credits: "crédits Technova", feature: "Fonctionnalité", included: "Inclus", limited: "Accès limité", unavailable: "Non inclus", soon: "Bientôt", creditsRow: "Crédits inclus à l'achat", estTitle: "Ce que vous pouvez faire environ", unavailableEst: "Estimation indisponible — tarif en cours de vérification", estNote: "Estimations indicatives : la consommation varie selon le modèle, la résolution, la durée, les paramètres et les coûts fournisseur. Les exemples sont des usages alternatifs d'un même solde, pas des quotas cumulables.", validity: "Validité des crédits : vos crédits Technova n'expirent pas.", refund: "Échec de génération : si une génération échoue pour une raison technique, les crédits réservés sont restitués sur votre solde. Il ne s'agit pas d'un remboursement en argent.", soonNote: "« Bientôt » : fonctionnalité annoncée, pas encore disponible.", ref: "Modèle de référence",
    cat: { chat: "conversations", code: "opérations de code / analyse", image_standard: "images standard", image_premium: "images premium", video_standard: "secondes de vidéo standard", video_pro: "secondes de vidéo pro" } },
  en: { title: "Compare Technova AI HUB plans", sub: "Six prepaid Technova credit packs.", once: "One-time payment", terms: "One-time payment • prepaid credits • no automatic renewal", choose: "Choose this pack", popular: "MOST POPULAR", credits: "Technova credits", feature: "Feature", included: "Included", limited: "Limited access", unavailable: "Not included", soon: "Soon", creditsRow: "Credits included", estTitle: "What you can roughly do", unavailableEst: "Estimate unavailable — price being verified", estNote: "Indicative estimates: usage varies with model, resolution, duration, settings and provider costs. Examples are alternative uses of the same balance, not cumulative quotas.", validity: "Credit validity: your Technova credits do not expire.", refund: "Failed generation: if a generation fails for a technical reason, reserved credits are returned to your balance. This is not a cash refund.", soonNote: "“Soon”: announced feature, not available yet.", ref: "Reference model",
    cat: { chat: "conversations", code: "code / analysis operations", image_standard: "standard images", image_premium: "premium images", video_standard: "seconds of standard video", video_pro: "seconds of pro video" } },
};

function Access({ value, lang }: { value: AccessLevel; lang: Lang }) {
  const label = text[lang][value];
  return <span role="img" aria-label={label} title={label} className="inline-flex items-center justify-center">
    {value === "included" ? <Check className="size-5 rounded bg-supabase/15 p-0.5 text-supabase" /> : value === "limited" ? <Circle className="size-4 fill-foreground/35 text-foreground" /> : <Minus className="size-4 text-muted-foreground/60" />}
  </span>;
}

export function PricingContent({ lang }: { lang: Lang }) {
  const t = text[lang]; const loc = lang === "fr" ? "fr-FR" : "en-US"; const navigate = useNavigate();
  const [packs, setPacks] = useState<PublicPack[]>(fallbackPacks);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  useEffect(() => {
    void supabase.from("credit_packs").select("slug,name,price_xof,credits,featured").eq("active", true).order("display_order").then(({ data }) => { if (data?.length) setPacks(data); });
    void supabase.from("plan_features").select("key,label_fr,label_en,access,status").eq("active", true).order("display_order").then(({ data }) => setFeatures(data ?? []));
    void supabase.rpc("get_pack_estimates").then(({ data }) => setEstimates(Array.isArray(data) ? (data as Estimate[]) : []));
  }, []);
  async function choose(slug: string) {
    localStorage.setItem(PENDING_PACK_KEY, slug);
    const { data } = await supabase.auth.getSession();
    void navigate({ to: data.session ? "/dashboard/credits" : "/inscription" });
  }
  const label = (f: PlanFeature) => lang === "fr" ? f.label_fr : f.label_en;
  const SoonTag = () => <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.soon}</span>;
  const head = (p: PublicPack) => <>
    {p.featured && <span className="mb-2 inline-block rounded-full bg-supabase px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">{t.popular}</span>}
    <p className="font-display text-lg font-semibold">{p.name}</p>
    <p className="mt-2 font-display text-2xl font-semibold">{p.price_xof.toLocaleString(loc)} <span className="text-sm font-normal opacity-70">FCFA</span></p>
    <p className="text-xs text-muted-foreground">{t.once}</p>
    <p className="mt-1 text-sm font-medium">{p.credits.toLocaleString(loc)} {t.credits}</p>
    <Button variant="pill" size="pill" onClick={() => void choose(p.slug)} aria-label={`${t.choose} ${p.name}`} className={`action-pill mt-4 w-full justify-center px-3 py-2 text-xs ${p.featured ? "action-pill-light" : "action-pill-dark"}`}>{t.choose}<ArrowUpRight className="size-3.5" /></Button>
  </>;
  const estimateList = (p: PublicPack) => <ul className="space-y-1.5 text-xs">
    {estimateCategories.map((c) => { const e = estimates.find((x) => x.category === c); const n = estimateFor(p.credits, e);
      return <li key={c} className="text-left">{n === null ? <span className="text-muted-foreground">{t.cat[c]} : {t.unavailableEst}</span> : <span title={`${t.ref} : ${e!.model} — ${e!.unit}`}><strong>≈ {n.toLocaleString(loc)}</strong> {t.cat[c]} <span className="text-muted-foreground">({e!.model})</span></span>}</li>; })}
  </ul>;

  return <section id="pricing" className="px-5 py-12 sm:py-16">
    <div className="mx-auto max-w-7xl">
      <h2 className="font-display text-3xl font-semibold md:text-4xl">{t.title}</h2>
      <p className="mt-3 text-muted-foreground">{t.sub}</p>
      <p className="mt-2 text-sm font-medium">{t.terms}</p>
      <div className="mt-5 flex flex-wrap gap-5 text-xs text-muted-foreground">{(["included", "limited", "unavailable"] as const).map((v) => <span key={v} className="flex items-center gap-2"><Access value={v} lang={lang} />{t[v]}</span>)}<span className="flex items-center"><SoonTag />{t.soonNote}</span></div>

      <div className="mt-8 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1000px] table-fixed text-sm">
          <caption className="sr-only">{t.title}</caption>
          <thead><tr className="border-b border-border align-top">
            <th scope="col" className="w-[22%] py-5 text-left font-medium text-muted-foreground">{t.feature}</th>
            {packs.map((p) => <th scope="col" key={p.slug} className={`px-3 py-5 text-center font-normal ${p.featured ? "rounded-t-lg bg-supabase/5" : ""}`}>{head(p)}</th>)}
          </tr></thead>
          <tbody>
            <tr className="border-b border-border/70"><th scope="row" className="py-4 text-left font-medium">{t.creditsRow}</th>{packs.map((p) => <td key={p.slug} className={`py-4 text-center font-semibold ${p.featured ? "bg-supabase/5" : ""}`}>{p.credits.toLocaleString(loc)}</td>)}</tr>
            {features.map((f) => <tr key={f.key} className="border-b border-border/70"><th scope="row" className="py-4 text-left font-medium">{label(f)}{f.status === "soon" && <SoonTag />}</th>{f.access.map((v, i) => <td key={i} className={`py-4 text-center ${packs[i]?.featured ? "bg-supabase/5" : ""}`}><Access value={v as AccessLevel} lang={lang} /></td>)}</tr>)}
            <tr className="align-top"><th scope="row" className="py-5 text-left font-medium">{t.estTitle}</th>{packs.map((p) => <td key={p.slug} className={`px-2 py-5 ${p.featured ? "rounded-b-lg bg-supabase/5" : ""}`}>{estimateList(p)}</td>)}</tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:hidden">{packs.map((p, i) => <article key={p.slug} className={`rounded-lg border p-5 ${p.featured ? "border-supabase/50 bg-supabase/5" : "border-border bg-card"}`}>
        {head(p)}
        <dl className="mt-5">{features.map((f) => <div key={f.key} className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-sm"><dt>{label(f)}{f.status === "soon" && <SoonTag />}</dt><dd><Access value={(f.access[i] ?? "unavailable") as AccessLevel} lang={lang} /></dd></div>)}</dl>
        <p className="mt-4 text-xs font-semibold">{t.estTitle}</p><div className="mt-2">{estimateList(p)}</div>
      </article>)}</div>

      <div className="mt-6 space-y-2 text-xs text-muted-foreground"><p>{t.estNote}</p><p>{t.validity}</p><p>{t.refund}</p></div>
    </div>
  </section>;
}
