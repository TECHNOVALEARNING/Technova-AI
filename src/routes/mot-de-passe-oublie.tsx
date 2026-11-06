import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => pageHead({ path: "/mot-de-passe-oublie", title: "Mot de passe oublié | TechNova AI Hub", description: "Recevez un lien pour retrouver votre compte TechNova AI Hub.", ogTitle: "Retrouver votre accès | TechNova AI Hub", ogDescription: "Réinitialisez votre mot de passe TechNova AI Hub.", noindex: true }),
  component: () => <AuthPage mode="forgot" />,
});