import { createFileRoute } from "@tanstack/react-router";
import { DesignLibraryPage } from "@/components/dashboard/DesignLibraryPage";

export const Route = createFileRoute("/_authenticated/dashboard/design")({
  head: () => ({ meta: [
    { title: "Design Library | TechNova AI Hub" },
    { name: "description", content: "Thèmes, sections et polices libres à appliquer à vos sites générés avec TechNova Studio." },
    { property: "og:title", content: "Design Library | TechNova AI Hub" },
    { property: "og:description", content: "Thèmes, sections et polices libres à appliquer à vos sites générés avec TechNova Studio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DesignLibraryPage,
});
