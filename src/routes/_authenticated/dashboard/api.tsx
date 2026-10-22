import { createFileRoute } from "@tanstack/react-router";
import { ApiKeysPage } from "@/components/dashboard/DashboardTools";

export const Route = createFileRoute("/_authenticated/dashboard/api")({
  head: () => ({ meta: [
    { title: "API | TechNova AI Hub" },
    { name: "description", content: "Accès API TechNova." },
    { property: "og:title", content: "API | TechNova AI Hub" },
    { property: "og:description", content: "Accès API TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ApiKeysPage,
});
