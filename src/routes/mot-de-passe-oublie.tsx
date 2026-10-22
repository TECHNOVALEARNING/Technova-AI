import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({ meta: [
    { title: "Mot de passe oublié | TechNova AI Hub" },
    { name: "description", content: "Recevez un lien pour retrouver votre compte TechNova AI Hub." },
    { property: "og:title", content: "Retrouver votre accès | TechNova AI Hub" },
    { property: "og:description", content: "Réinitialisez votre mot de passe TechNova AI Hub." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AuthPage mode="forgot" />,
});