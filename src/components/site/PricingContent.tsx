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
  fr: { title: "Des forfaits simples et flexibles", sub: "Quatre packs de crédits Technova prépayés, payables en Mobile Money ou par carte.", once: "Paiement unique", terms: "Paiement unique • crédits prépayés • aucun renouvellement automatique", choose: "Choisir", popular: "LE PLUS POPULAIRE", credits: "crédits Technova", allFeatures: "Création de sites web (TechNova Studio) : à partir du pack Essential. Génération vidéo : packs Creator et Pro. Le chat, les images, la musique et la recherche sont inclus dans tous les packs.", validity: "Validité des crédits : vos crédits Technova n'expirent pas.", refund: "Échec de génération : si une génération échoue pour une raison technique, les crédits réservés sont restitués sur votre solde. Il ne s'agit pas d'un remboursement en argent." },
  en: { title: "Simple, flexible plans", sub: "Four prepaid Technova credit packs, payable by Mobile Money or card.", once: "One-time payment", terms: "One-time payment • prepaid credits • no automatic renewal", choose: "Choose", popular: "MOST POPULAR", credits: "Technova credits", allFeatures: "Website creation (TechNova Studio): from the Essential pack. Video generation: Creator and Pro packs. Chat, images, music and research are included in every pack.", validity: "Credit validity: your Technova credits do not expire.", refund: "Failed generation: if a generation fails for a technical reason, reserved credits are returned to your balance. This is not a cash refund." },
  es: { title: "Planes sencillos y flexibles", sub: "Cuatro packs de créditos Technova prepagados, pagaderos con Mobile Money o tarjeta.", once: "Pago único", terms: "Pago único • créditos prepagados • sin renovación automática", choose: "Elegir", popular: "EL MÁS POPULAR", credits: "créditos Technova", allFeatures: "Creación de sitios web (TechNova Studio): desde el pack Essential. Generación de vídeo: packs Creator y Pro. El chat, las imágenes, la música y la búsqueda están incluidos en todos los packs.", validity: "Validez de los créditos: tus créditos Technova no caducan.", refund: "Generación fallida: si una generación falla por un motivo técnico, los créditos reservados se devuelven a tu saldo. No se trata de un reembolso en dinero." },
  pt: { title: "Planos simples e flexíveis", sub: "Quatro pacotes de créditos Technova pré-pagos, pagáveis com Mobile Money ou cartão.", once: "Pagamento único", terms: "Pagamento único • créditos pré-pagos • sem renovação automática", choose: "Escolher", popular: "O MAIS POPULAR", credits: "créditos Technova", allFeatures: "Criação de sites (TechNova Studio): a partir do pacote Essential. Geração de vídeo: pacotes Creator e Pro. Chat, imagens, música e pesquisa estão incluídos em todos os pacotes.", validity: "Validade dos créditos: seus créditos Technova não expiram.", refund: "Falha na geração: se uma geração falhar por motivo técnico, os créditos reservados voltam ao seu saldo. Não se trata de um reembolso em dinheiro." },
};

const geoText = {
  fr: { billed: "Facturé", approx: "Conversion indicative, taux du jour", rates: "Taux de change : ExchangeRate-API" },
  en: { billed: "Billed", approx: "Indicative conversion, today's rate", rates: "Exchange rates: ExchangeRate-API" },
  es: { billed: "Se factura", approx: "Conversión indicativa, tipo del día", rates: "Tipos de cambio: ExchangeRate-API" },
  pt: { billed: "Cobrado", approx: "Conversão indicativa, câmbio do dia", rates: "Câmbio: ExchangeRate-API" },
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

      <div className="mt-6 space-y-2 text-xs text-muted-foreground"><p>{t.allFeatures}</p><p>{t.validity}</p><p>{t.refund}</p>{local && geo.approx && <p>{g.approx}. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{g.rates}</a></p>}</div>
    </div>
  </section>;
}
