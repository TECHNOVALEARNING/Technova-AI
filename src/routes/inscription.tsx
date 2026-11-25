import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { seoFor } from "@/lib/seo-i18n";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/inscription")({
  head: ({ match }) => pageHead({ ...seoFor("/inscription", match.search) }),
  component: () => <AuthPage mode="signup" />,
});