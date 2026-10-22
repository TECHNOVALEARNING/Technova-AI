import { createFileRoute } from "@tanstack/react-router";
import { CreditsPage } from "@/components/dashboard/DashboardTools";

export const Route = createFileRoute("/_authenticated/dashboard/credits")({
  head: () => ({ meta: [
    { title: "Crédits | TechNova AI Hub" },
    { name: "description", content: "Crédits et solde TechNova." },
    { property: "og:title", content: "Crédits | TechNova AI Hub" },
    { property: "og:description", content: "Crédits et solde TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CreditsPage,
});
