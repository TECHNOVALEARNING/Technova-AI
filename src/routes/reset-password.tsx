import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nouveau mot de passe | TechNova AI Hub" },
    { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte TechNova AI Hub." },
    { property: "og:title", content: "Nouveau mot de passe | TechNova AI Hub" },
    { property: "og:description", content: "Retrouvez votre accès à TechNova AI Hub." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AuthPage mode="reset" />,
});