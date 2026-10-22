import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fallbackPacks, packCopy, PENDING_PACK_KEY, type PublicPack } from "@/lib/public-pricing";
import type { Lang } from "@/lib/i18n";

const text = {
  fr: { title: "Des forfaits simples et flexibles", sub: "Quatre packs de crédits Technova prépayés, payables en Mobile Money ou par carte.", once: "Paiement unique", terms: "Paiement unique • crédits prépayés • aucun renouvellement automatique", choose: "Choisir", popular: "LE PLUS POPULAIRE", credits: "crédits Technova", allFeatures: "Toutes les fonctionnalités sont accessibles avec chaque pack : ils se distinguent par leur volume de crédits.", validity: "Validité des crédits : vos crédits Technova n'expirent pas.", refund: "Échec de génération : si une génération échoue pour une raison technique, les crédits réservés sont restitués sur votre solde. Il ne s'agit pas d'un remboursement en argent." },
  en: { title: "Simple, flexible plans", sub: "Four prepaid Technova credit packs, payable by Mobile Money or card.", once: "One-time payment", terms: "One-time payment • prepaid credits • no automatic renewal", choose: "Choose", popular: "MOST POPULAR", credits: "Technova credits", allFeatures: "Every feature is available with every pack: they differ by credit volume.", validity: "Credit validity: your Technova credits do not expire.", refund: "Failed generation: if a generation fails for a technical reason, reserved credits are returned to your balance. This is not a cash refund." },
};

export function PricingContent({ lang }: { lang: Lang }) {
  const t = text[lang]; const loc = lang === "fr" ? "fr-FR" : "en-US"; const navigate = useNavigate();
  const [packs, setPacks] = useState<PublicPack[]>(fallbackPacks);
  useEffect(() => {
    void supabase.from("credit_packs").select("slug,name,price_xof,credits,featured").eq("active", true).order("display_order").then(({ data }) => {
      // Only packs with card copy are sold publicly (Starter, Essential, Creator, Pro).
      const sold = (data ?? []).filter((p) => packCopy[p.slug]);
      if (sold.length) setPacks(sold);
    });
  }, []);
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
          <p className="mt-5 font-display text-3xl font-semibold">{p.price_xof.toLocaleString(loc)} <span className="text-sm font-normal opacity-70">FCFA</span></p>
          <p className="text-xs text-muted-foreground">{t.once}</p>
          <p className="mt-2 text-sm font-semibold">{p.credits.toLocaleString(loc)} {t.credits}</p>
          {copy && <ul className="mt-5 flex-1 space-y-2.5 text-sm">{copy.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul>}
          <Button variant="pill" size="pill" onClick={() => void choose(p.slug)} aria-label={`${t.choose} ${p.name}`} className={`action-pill mt-6 w-full justify-center px-3 py-2.5 text-sm ${p.featured ? "action-pill-light" : "action-pill-dark"}`}>{t.choose} {p.name}<ArrowUpRight className="size-3.5" /></Button>
        </article>;
      })}</div>

      <div className="mt-6 space-y-2 text-xs text-muted-foreground"><p>{t.allFeatures}</p><p>{t.validity}</p><p>{t.refund}</p></div>
    </div>
  </section>;
}
