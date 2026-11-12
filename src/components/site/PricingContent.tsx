import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Building2, Code2 } from "lucide-react";
import "@/lib/fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fallbackPacks, packCopy, PENDING_PACK_KEY, type PublicPack } from "@/lib/public-pricing";
import type { SiteLang } from "@/lib/i18n";
import { formatLocalPrice, isCfa } from "@/lib/geo-pricing";
import { useGeoPrice } from "@/lib/geo-price-client";

const text = {
  fr: { title: "Des forfaits simples et flexibles", sub: "Quatre packs de crédits Technova prépayés, sans abonnement, pour discuter, créer et développer.", once: "Paiement unique", terms: "Paiement unique • crédits prépayés • aucun renouvellement automatique", choose: "Choisir", popular: "LE PLUS POPULAIRE", credits: "crédits Technova" },
  en: { title: "Simple, flexible plans", sub: "Four prepaid Technova credit packs, no subscription, to chat, create and build.", once: "One-time payment", terms: "One-time payment • prepaid credits • no automatic renewal", choose: "Choose", popular: "MOST POPULAR", credits: "Technova credits" },
  es: { title: "Planes sencillos y flexibles", sub: "Cuatro packs de créditos Technova prepagados, sin suscripción, para conversar, crear y desarrollar.", once: "Pago único", terms: "Pago único • créditos prepagados • sin renovación automática", choose: "Elegir", popular: "EL MÁS POPULAR", credits: "créditos Technova" },
  pt: { title: "Planos simples e flexíveis", sub: "Quatro pacotes de créditos Technova pré-pagos, sem assinatura, para conversar, criar e desenvolver.", once: "Pagamento único", terms: "Pagamento único • créditos pré-pagos • sem renovação automática", choose: "Escolher", popular: "O MAIS POPULAR", credits: "créditos Technova" },
};

const geoText = {
  fr: { billed: "Facturé" },
  en: { billed: "Billed" },
  es: { billed: "Se factura" },
  pt: { billed: "Cobrado" },
} satisfies Record<SiteLang, unknown>;
// Bar under the packs: the API for developers, custom terms for companies (no extra pack or modal).
const barText = {
  fr: { api: "Connectez-vous et utilisez notre API", apiSub: "Une clé, tous les modèles, facturés en crédits.", apiCta: "Utiliser l'API", pro: "Entreprise ?", proSub: "Contactez-nous pour des tarifs adaptés à votre volume.", proCta: "Nous contacter", subject: "Tarifs entreprise" },
  en: { api: "Sign in and use our API", apiSub: "One key, every model, billed in credits.", apiCta: "Use the API", pro: "A company?", proSub: "Contact us for pricing that fits your volume.", proCta: "Contact us", subject: "Enterprise pricing" },
  es: { api: "Inicia sesión y usa nuestra API", apiSub: "Una clave, todos los modelos, facturados en créditos.", apiCta: "Usar la API", pro: "¿Empresa?", proSub: "Contáctanos para precios adaptados a tu volumen.", proCta: "Contactar", subject: "Precios para empresas" },
  pt: { api: "Entre e use a nossa API", apiSub: "Uma chave, todos os modelos, cobrados em créditos.", apiCta: "Usar a API", pro: "Empresa?", proSub: "Fale conosco para preços adaptados ao seu volume.", proCta: "Fale conosco", subject: "Preços para empresas" },
} satisfies Record<SiteLang, unknown>;
const locales: Record<SiteLang, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" };

/** `glass` (landing page): frosted-glass cards on the normal page background. */
export function PricingContent({ lang, glass = false }: { lang: SiteLang; glass?: boolean }) {
  const t = text[lang]; const g = geoText[lang]; const loc = locales[lang]; const navigate = useNavigate();
  const geo = useGeoPrice();
  const [packs, setPacks] = useState<PublicPack[]>(fallbackPacks);
  useEffect(() => {
    void supabase.from("credit_packs").select("slug,name,price_xof,credits,featured").eq("active", true).order("display_order").then(({ data }) => {
      // Only packs with card copy are sold publicly (Starter, Essential, Creator, Pro).
      const sold = (data ?? []).filter((p) => packCopy[p.slug]);
      if (sold.length) setPacks(sold);
    });
  }, []);
  const local = !isCfa(geo.currency);
  async function choose(slug: string) {
    localStorage.setItem(PENDING_PACK_KEY, slug);
    const { data } = await supabase.auth.getSession();
    void navigate({ to: data.session ? "/dashboard/credits" : "/inscription" });
  }

  return <section id="pricing" className="px-5 py-12 sm:py-16">
    <div className="relative mx-auto max-w-7xl">
      <h2 className="font-display text-3xl font-semibold md:text-4xl"><span className="title-shine-ink">{t.title}</span></h2>
      <p className="mt-3 text-muted-foreground">{t.sub}</p>
      <p className="mt-2 text-sm font-medium">{t.terms}</p>

      <div className={`${glass ? "glass-stage " : ""}relative mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4`}>{packs.map((p) => {
        const copy = packCopy[p.slug]?.[lang];
        return <article key={p.slug} className={`flex flex-col rounded-2xl border p-6 ${glass ? `glass-card${p.featured ? " glass-card-featured" : ""}` : p.featured ? "border-supabase/50 bg-supabase/5 shadow-lift" : "border-border bg-card"}`}>
          <span aria-hidden={!p.featured} className={`mb-3 self-start rounded-full bg-supabase px-2.5 py-1 text-[10px] font-bold tracking-wide text-white ${p.featured ? "" : "invisible"}`}>{t.popular}</span>
          <h3 className="font-display text-xl font-semibold">{p.name}</h3>
          {copy && <p className="mt-1 text-sm text-muted-foreground">{copy.tagline}</p>}
          {local
            ? <>
              <p className="mt-5 font-display text-3xl font-semibold">{geo.approx && <span className="mr-1 text-lg font-normal opacity-60">≈</span>}{formatLocalPrice(p.price_xof, geo, loc)}</p>
              <p className="text-xs text-muted-foreground">{t.once} · {g.billed} {p.price_xof.toLocaleString(loc)} FCFA</p>
            </>
            : <>
              <p className="mt-5 font-display text-3xl font-semibold">{p.price_xof.toLocaleString(loc)} <span className="text-sm font-normal opacity-70">FCFA</span></p>
              <p className="text-xs text-muted-foreground">{t.once}</p>
            </>}
          <p className="mt-2 text-sm font-semibold">{p.credits.toLocaleString(loc)} {t.credits}</p>
          {copy && <ul className="mt-5 flex-1 space-y-3 text-sm">{copy.perks.map((perk) => perk.lead
            ? <li key={perk.text} className="font-semibold">{perk.text}</li>
            : <li key={perk.text} className="flex items-start gap-3">
            <FontAwesomeIcon icon={perk.icon} fixedWidth aria-hidden className={`mt-0.5 size-4 shrink-0 ${p.featured ? "text-supabase" : "text-chat-glow"}`} />
            <span>{perk.text}</span>
          </li>)}</ul>}
          <Button variant="pill" size="pill" onClick={() => void choose(p.slug)} aria-label={`${t.choose} ${p.name}`} className={`action-pill mt-6 w-full justify-center px-3 py-2.5 text-sm ${p.featured ? "action-pill-light" : "action-pill-dark"}`}>{t.choose} {p.name}<ArrowUpRight className="size-3.5" /></Button>
        </article>;
      })}</div>

      <PricingBar lang={lang} glass={glass} />
    </div>
  </section>;
}

/** Bar under the packs: the API for developers and custom terms for companies (landing, Tarifs, dashboard). */
export function PricingBar({ lang, glass = false }: { lang: SiteLang; glass?: boolean }) {
  const b = barText[lang];
  return <div className={`mt-6 grid overflow-hidden rounded-2xl border md:grid-cols-2 ${glass ? "glass-card" : "border-border bg-card"}`}>
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-ink-foreground"><Code2 className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-display font-semibold">{b.api}</p><p className="text-sm text-muted-foreground">{b.apiSub}</p></div>
      <a href="/dashboard/api" className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90">{b.apiCta}<ArrowUpRight className="size-3.5" /></a>
    </div>
    <div className="flex flex-col gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:p-6 md:border-l md:border-t-0">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary"><Building2 className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-display font-semibold">{b.pro}</p><p className="text-sm text-muted-foreground">{b.proSub}</p></div>
      <a href={`mailto:support@technovaihub.com?subject=${encodeURIComponent(b.subject)}`} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-5 text-sm font-semibold transition hover:border-foreground/40">{b.proCta}<ArrowUpRight className="size-3.5" /></a>
    </div>
  </div>;
}
