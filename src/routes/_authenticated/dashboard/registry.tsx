import { createFileRoute } from "@tanstack/react-router";
import { RegistryPage } from "@/components/dashboard/RegistryPage";

export const Route = createFileRoute("/_authenticated/dashboard/registry")({
  head: () => ({ meta: [
    { title: "Registry | TechNova AI Hub" },
    { name: "description", content: "Bibliothèque de ressources : landing pages, animations, polices, prompts, modèles, composants et workflows." },
    { property: "og:title", content: "Registry | TechNova AI Hub" },
    { property: "og:description", content: "Ressources réutilisables avec licences claires, favoris, téléchargement et remix." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RegistryPage,
});
