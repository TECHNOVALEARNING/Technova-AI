import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/auth/OnboardingPage";

export const Route = createFileRoute("/_authenticated/bienvenue")({
  head: () => ({ meta: [
    { title: "Bienvenue | TechNova AI Hub" },
    { name: "description", content: "Finalisez votre inscription à TechNova AI Hub." },
    { property: "og:title", content: "Bienvenue | TechNova AI Hub" },
    { property: "og:description", content: "Finalisez votre inscription à TechNova AI Hub." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: OnboardingPage,
});
