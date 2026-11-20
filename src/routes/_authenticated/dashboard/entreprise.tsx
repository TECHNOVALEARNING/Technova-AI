import { createFileRoute } from "@tanstack/react-router";
import { OrganizationPage } from "@/components/dashboard/OrganizationPage";

export const Route = createFileRoute("/_authenticated/dashboard/entreprise")({
  head: () => ({ meta: [
    { title: "Entreprise | TechNova AI Hub" },
    { name: "description", content: "TechNova Team et TechNova Entreprise : sous-comptes, crédits partagés, fonctions autorisées et tableau de bord." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: OrganizationPage,
});
