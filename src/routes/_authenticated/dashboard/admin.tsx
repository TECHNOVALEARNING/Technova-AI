import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/dashboard/AdminPage";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  head: () => ({ meta: [
    { title: "Administration | TechNova AI Hub" },
    { name: "description", content: "Journal de sécurité de la plateforme." },
    { property: "og:title", content: "Administration | TechNova AI Hub" },
    { property: "og:description", content: "Journal de sécurité de la plateforme." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminPage,
});
