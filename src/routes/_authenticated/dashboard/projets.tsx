import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "@/components/projects/ProjectsPage";

export const Route = createFileRoute("/_authenticated/dashboard/projets")({
  head: () => ({ meta: [
    { title: "Projets | TechNova AI Hub" },
    { name: "description", content: "Vos conversations, présentations et tableaux, rangés par projet." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ProjectsPage,
});
