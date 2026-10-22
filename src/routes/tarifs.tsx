import { createFileRoute } from "@tanstack/react-router";
import { Footer, Nav, PageHero, useSiteLang } from "@/components/site/SiteChrome";
import { PricingContent } from "@/components/site/PricingContent";

export const Route = createFileRoute("/tarifs")({
  head: () => ({ meta: [
    { title: "Tarifs et crédits Technova — TechNova AI Hub" },
    { name: "description", content: "Comparez les six formules TechNova : Starter, Essential, Creator, Pro, Expert et Business, et leurs possibilités de création." },
    { property: "og:title", content: "Tarifs et crédits Technova — TechNova AI Hub" },
    { property: "og:description", content: "Les formules TechNova et leur tableau comparatif de fonctionnalités." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PricingPage,
});

function PricingPage() {
  const [lang, setLang] = useSiteLang();
  return <div className="min-h-screen overflow-x-clip bg-background text-foreground"><Nav lang={lang} setLang={setLang} />
    <PageHero tag={lang === "fr" ? "Crédits Technova" : "Technova credits"} title={lang === "fr" ? "Tarifs TechNova AI Hub" : "TechNova AI Hub pricing"} sub={lang === "fr" ? "Six formules. Une même ambition : donner vie à vos idées." : "Six plans. One ambition: bring your ideas to life."} />
    <PricingContent lang={lang} /><Footer lang={lang} />
  </div>;
}