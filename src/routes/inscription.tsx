import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/inscription")({
  head: () => pageHead({ path: "/inscription", title: "Inscription | TechNova AI Hub", description: "Créez votre compte TechNova AI Hub et utilisez les meilleurs modèles d'IA pour discuter, coder et créer, payés en crédits sans abonnement.", ogDescription: "Créez votre compte TechNova AI Hub : les meilleurs modèles d'IA, payés en crédits sans abonnement." }),
  component: () => <AuthPage mode="signup" />,
});