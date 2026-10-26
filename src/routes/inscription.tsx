import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/inscription")({
  head: () => ({ meta: [
    { title: "Inscription | TechNova AI Hub" },
    { name: "description", content: "Découvrez l'espace d'inscription TechNova AI Hub pour explorer plus de 60 modèles d'intelligence artificielle." },
    { property: "og:title", content: "Inscription | TechNova AI Hub" },
    { property: "og:description", content: "Découvrez l'espace TechNova AI Hub pour explorer plus de 60 modèles d'intelligence artificielle." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <AuthPage mode="signup" />,
});