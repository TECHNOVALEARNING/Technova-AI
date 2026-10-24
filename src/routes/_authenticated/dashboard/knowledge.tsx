import { createFileRoute } from "@tanstack/react-router";
import { KnowledgePage } from "@/components/dashboard/KnowledgePage";

export const Route = createFileRoute("/_authenticated/dashboard/knowledge")({
  head: () => ({ meta: [
    { title: "Bases de connaissances | TechNova AI Hub" },
    { name: "description", content: "Indexez vos documents pour que le chat et vos agents répondent à partir de leur contenu." },
    { property: "og:title", content: "Bases de connaissances | TechNova AI Hub" },
    { property: "og:description", content: "Indexez vos documents pour que le chat et vos agents répondent à partir de leur contenu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: KnowledgePage,
});
