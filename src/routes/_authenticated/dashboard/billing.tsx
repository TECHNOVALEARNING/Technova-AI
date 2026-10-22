import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/components/dashboard/DashboardTools";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({ meta: [
    { title: "Facturation | TechNova AI Hub" },
    { name: "description", content: "Facturation TechNova." },
    { property: "og:title", content: "Facturation | TechNova AI Hub" },
    { property: "og:description", content: "Facturation TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BillingPage,
});
