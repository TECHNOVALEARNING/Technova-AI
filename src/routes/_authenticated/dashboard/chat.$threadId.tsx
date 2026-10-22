import { createFileRoute } from "@tanstack/react-router";
import { ThreadPage } from "@/components/dashboard/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/dashboard/chat/$threadId")({
  head: () => ({ meta: [
    { title: "Conversation | TechNova AI Hub" },
    { name: "description", content: "Votre conversation privée TechNova." },
    { property: "og:title", content: "Conversation | TechNova AI Hub" },
    { property: "og:description", content: "Votre conversation privée TechNova." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConversationRoute,
});

function ConversationRoute() {
  const { threadId } = Route.useParams();
  return <ThreadPage key={threadId} threadId={threadId} />;
}
