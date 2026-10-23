import { createFileRoute } from "@tanstack/react-router";
import { ArenaPage } from "@/components/dashboard/ArenaPage";

export const Route = createFileRoute("/_authenticated/dashboard/arena")({
  head: () => ({ meta: [
    { title: "Arena | TechNova AI Hub" },
    { name: "description", content: "Comparez deux modèles d'IA sur la même question et votez pour la meilleure réponse." },
    { property: "og:title", content: "Arena | TechNova AI Hub" },
    { property: "og:description", content: "Comparez deux modèles d'IA sur la même question et votez pour la meilleure réponse." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ArenaPage,
});
