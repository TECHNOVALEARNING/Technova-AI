import { createFileRoute } from "@tanstack/react-router";
import { ModelsPage } from "@/components/dashboard/DashboardTools";

export const Route = createFileRoute("/_authenticated/dashboard/models")({
  head: () => ({ meta: [
    { title: "Modèles | TechNova AI Hub" },
    { name: "description", content: "Catalogue de modèles TechNova." },
    { property: "og:title", content: "Modèles | TechNova AI Hub" },
    { property: "og:description", content: "Catalogue de modèles TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ModelsPage,
});
