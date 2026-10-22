import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "@/components/dashboard/ConnectionsPage";

export const Route = createFileRoute("/_authenticated/dashboard/connexions")({
  head: () => ({ meta: [
    { title: "Connexions | TechNova AI Hub" },
    { name: "description", content: "Reliez GitHub, Drive, Notion et gérez vos sites publiés." },
    { property: "og:title", content: "Connexions | TechNova AI Hub" },
    { property: "og:description", content: "Reliez vos comptes et gérez vos sites publiés." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConnectionsPage,
});
