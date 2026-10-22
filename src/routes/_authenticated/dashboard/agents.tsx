import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/components/dashboard/AgentsPage";

export const Route = createFileRoute("/_authenticated/dashboard/agents")({
  head: () => ({ meta: [
    { title: "Agents IA | TechNova AI Hub" },
    { name: "description", content: "Créez vos propres assistants IA avec consignes, mémoire et budget." },
    { property: "og:title", content: "Agents IA | TechNova AI Hub" },
    { property: "og:description", content: "Créez vos propres assistants IA avec consignes, mémoire et budget." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AgentsPage,
});
