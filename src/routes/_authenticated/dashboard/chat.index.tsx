import { createFileRoute } from "@tanstack/react-router";
import { ChatListPage } from "@/components/dashboard/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/dashboard/chat/")({
  head: () => ({ meta: [
    { title: "Conversations | TechNova AI Hub" },
    { name: "description", content: "Retrouvez toutes vos conversations TechNova." },
    { property: "og:title", content: "Conversations | TechNova AI Hub" },
    { property: "og:description", content: "Retrouvez toutes vos conversations TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChatListPage,
});
