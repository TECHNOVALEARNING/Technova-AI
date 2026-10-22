import { createFileRoute } from "@tanstack/react-router";
import { PendingPage } from "@/components/dashboard/DashboardPages";

export const Route = createFileRoute("/_authenticated/dashboard/docs")({
  head: () => ({ meta: [
    { title: "Documentation | TechNova AI Hub" },
    { name: "description", content: "Guides et documentation TechNova." },
    { property: "og:title", content: "Documentation | TechNova AI Hub" },
    { property: "og:description", content: "Guides et documentation TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <PendingPage section="docs" />,
});
