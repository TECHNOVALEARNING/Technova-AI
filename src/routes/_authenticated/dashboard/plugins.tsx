import { createFileRoute } from "@tanstack/react-router";
import { PluginsPage } from "@/components/dashboard/PluginsPage";

export const Route = createFileRoute("/_authenticated/dashboard/plugins")({
  head: () => ({ meta: [
    { title: "Plugins | TechNova AI Hub" },
    { name: "description", content: "Installez des métiers prêts à l'emploi : agents spécialisés et commandes « / » dans le chat." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PluginsPage,
});
