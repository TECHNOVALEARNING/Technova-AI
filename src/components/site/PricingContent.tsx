import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
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
const locales: Record<SiteLang, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-BR" };

export function PricingContent({ lang }: { lang: SiteLang }) {
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
    <div className="mx-auto max-w-7xl">
      <h2 className="font-display text-3xl font-semibold md:text-4xl">{t.title}</h2>
      <p className="mt-3 text-muted-foreground">{t.sub}</p>
      <p className="mt-2 text-sm font-medium">{t.terms}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{packs.map((p) => {
        const copy = packCopy[p.slug]?.[lang];
        return <article key={p.slug} className={`flex flex-col rounded-2xl border p-6 ${p.featured ? "border-supabase/50 bg-supabase/5 shadow-lift" : "border-border bg-card"}`}>
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
          {copy && <ul className="mt-5 flex-1 space-y-3 text-sm">{copy.perks.map((perk) => <li key={perk.text} className="flex items-start gap-3">
            <FontAwesomeIcon icon={perk.icon} fixedWidth aria-hidden className={`mt-0.5 size-4 shrink-0 ${p.featured ? "text-supabase" : "text-chat-glow"}`} />
            <span>{perk.text}</span>
          </li>)}</ul>}
          <Button variant="pill" size="pill" onClick={() => void choose(p.slug)} aria-label={`${t.choose} ${p.name}`} className={`action-pill mt-6 w-full justify-center px-3 py-2.5 text-sm ${p.featured ? "action-pill-light" : "action-pill-dark"}`}>{t.choose} {p.name}<ArrowUpRight className="size-3.5" /></Button>
        </article>;
      })}</div>

    </div>
  </section>;
}
