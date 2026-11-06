import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead({ path: "/reset-password", title: "Nouveau mot de passe | TechNova AI Hub", description: "Choisissez un nouveau mot de passe pour votre compte TechNova AI Hub.", ogDescription: "Retrouvez votre accès à TechNova AI Hub.", noindex: true }),
  component: () => <AuthPage mode="reset" />,
});