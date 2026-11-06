import { createFileRoute } from "@tanstack/react-router";
import { pageHead, appLd, breadcrumbLd } from "@/lib/seo";
import { Footer, Nav, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { PricingContent } from "@/components/site/PricingContent";
import { PlanComparison } from "@/components/site/PlanComparison";
import { tr } from "@/lib/i18n";

export const Route = createFileRoute("/tarifs")({
  head: () => pageHead({ path: "/tarifs", title: "Tarifs et crédits Technova — TechNova AI Hub", description: "Quatre packs de crédits TechNova, de 999 à 7 699 FCFA : Starter, Essential, Creator et Pro. Sans abonnement, crédits sans expiration, paiement Mobile Money ou carte.", ogDescription: "Quatre packs de crédits TechNova prépayés, sans abonnement.", jsonLd: [appLd, breadcrumbLd("Tarifs", "/tarifs")] }),
  component: PricingPage,
});

function PricingPage() {
  const [lang, setLang] = useSiteLang();
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground"><Nav lang={lang} setLang={setLang} />
    <PageHero tag={tr(lang, { fr: "Crédits Technova", en: "Technova credits", es: "Créditos Technova", pt: "Créditos Technova" })} title={tr(lang, { fr: "Tarifs TechNova AI Hub", en: "TechNova AI Hub pricing", es: "Precios de TechNova AI Hub", pt: "Preços da TechNova AI Hub" })} sub={tr(lang, { fr: "Quatre formules. Une même ambition : donner vie à vos idées.", en: "Four plans. One ambition: bring your ideas to life.", es: "Cuatro planes. Una misma ambición: dar vida a tus ideas.", pt: "Quatro planos. Uma só ambição: dar vida às suas ideias." })} />
    <PricingContent lang={lang} /><PlanComparison lang={lang} /><Footer lang={lang} />
  </div>;
}