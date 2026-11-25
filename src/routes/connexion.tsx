import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { seoFor } from "@/lib/seo-i18n";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/connexion")({
  head: ({ match }) => pageHead({ ...seoFor("/connexion", match.search) }),
  component: () => <AuthPage mode="login" />,
});