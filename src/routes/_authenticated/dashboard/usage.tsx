import { createFileRoute } from "@tanstack/react-router";
import { UsagePage } from "@/components/dashboard/UsagePage";

export const Route = createFileRoute("/_authenticated/dashboard/usage")({
  head: () => ({ meta: [
    { title: "Utilisation | TechNova AI Hub" },
    { name: "description", content: "Suivi d’utilisation TechNova." },
    { property: "og:title", content: "Utilisation | TechNova AI Hub" },
    { property: "og:description", content: "Suivi d’utilisation TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: UsagePage,
});
