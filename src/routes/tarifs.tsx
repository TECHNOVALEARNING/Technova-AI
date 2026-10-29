import { createFileRoute } from "@tanstack/react-router";
import { Footer, Nav, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { PricingContent } from "@/components/site/PricingContent";
import { PlanComparison } from "@/components/site/PlanComparison";
import { tr } from "@/lib/i18n";

export const Route = createFileRoute("/tarifs")({
  head: () => ({ meta: [
    { title: "Tarifs et crédits Technova — TechNova AI Hub" },
    { name: "description", content: "Les quatre packs de crédits TechNova : Starter, Essential, Creator et Pro, payables en Mobile Money ou par carte." },
    { property: "og:title", content: "Tarifs et crédits Technova — TechNova AI Hub" },
    { property: "og:description", content: "Quatre packs de crédits TechNova prépayés, sans abonnement." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PricingPage,
});

function PricingPage() {
  const [lang, setLang] = useSiteLang();
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground"><Nav lang={lang} setLang={setLang} />
    <PageHero tag={tr(lang, { fr: "Crédits Technova", en: "Technova credits", es: "Créditos Technova", pt: "Créditos Technova" })} title={tr(lang, { fr: "Tarifs TechNova AI Hub", en: "TechNova AI Hub pricing", es: "Precios de TechNova AI Hub", pt: "Preços da TechNova AI Hub" })} sub={tr(lang, { fr: "Quatre formules. Une même ambition : donner vie à vos idées.", en: "Four plans. One ambition: bring your ideas to life.", es: "Cuatro planes. Una misma ambición: dar vida a tus ideas.", pt: "Quatro planos. Uma só ambição: dar vida às suas ideias." })} />
    <PricingContent lang={lang} /><PlanComparison lang={lang} /><Footer lang={lang} />
  </div>;
}