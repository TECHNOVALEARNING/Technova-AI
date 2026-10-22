import { createFileRoute } from "@tanstack/react-router";
import { SettingsToolsPage } from "@/components/dashboard/DashboardTools";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [
    { title: "Paramètres | TechNova AI Hub" },
    { name: "description", content: "Personnalisez votre espace TechNova." },
    { property: "og:title", content: "Paramètres | TechNova AI Hub" },
    { property: "og:description", content: "Personnalisez votre espace TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsToolsPage,
});
