import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/connexion")({
  head: () => ({ meta: [
    { title: "Connexion | TechNova AI Hub" },
    { name: "description", content: "Retrouvez votre espace TechNova AI Hub et accédez à vos outils d'intelligence artificielle." },
    { property: "og:title", content: "Connexion | TechNova AI Hub" },
    { property: "og:description", content: "Retrouvez votre espace TechNova AI Hub et vos outils d'intelligence artificielle." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <AuthPage mode="login" />,
});