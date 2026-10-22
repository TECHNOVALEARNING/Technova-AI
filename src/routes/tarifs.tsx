import { createFileRoute } from "@tanstack/react-router";
import { Footer, Nav, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { PricingContent } from "@/components/site/PricingContent";

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
    <PageHero tag={lang === "fr" ? "Crédits Technova" : "Technova credits"} title={lang === "fr" ? "Tarifs TechNova AI Hub" : "TechNova AI Hub pricing"} sub={lang === "fr" ? "Quatre formules. Une même ambition : donner vie à vos idées." : "Four plans. One ambition: bring your ideas to life."} />
    <PricingContent lang={lang} /><Footer lang={lang} />
  </div>;
}