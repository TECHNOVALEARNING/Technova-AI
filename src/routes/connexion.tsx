import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/connexion")({
  head: () => pageHead({ path: "/connexion", title: "Connexion | TechNova AI Hub", description: "Retrouvez votre espace TechNova AI Hub et accédez à vos outils d'intelligence artificielle.", ogDescription: "Retrouvez votre espace TechNova AI Hub et vos outils d'intelligence artificielle." }),
  component: () => <AuthPage mode="login" />,
});