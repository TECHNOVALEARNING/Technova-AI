import { createFileRoute } from "@tanstack/react-router";
import { LearnPage } from "@/components/learn/LearnPage";

export const Route = createFileRoute("/_authenticated/dashboard/apprendre")({
  head: () => ({ meta: [
    { title: "Apprendre | TechNova AI Hub" },
    { name: "description", content: "Tuteur guidé, quiz, flashcards, plans de révision et outils pour enseignants." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: LearnPage,
});
