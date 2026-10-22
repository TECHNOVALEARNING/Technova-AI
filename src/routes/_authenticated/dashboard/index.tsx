import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/dashboard/DashboardPages";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [
    { title: "Vue d’ensemble | TechNova AI Hub" },
    { name: "description", content: "Votre espace TechNova : conversations, crédits et outils." },
    { property: "og:title", content: "Vue d’ensemble | TechNova AI Hub" },
    { property: "og:description", content: "Votre espace TechNova : conversations, crédits et outils." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OverviewPage,
});
