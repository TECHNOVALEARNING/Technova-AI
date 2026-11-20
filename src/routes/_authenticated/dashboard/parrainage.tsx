import { createFileRoute } from "@tanstack/react-router";
import { ReferralPage } from "@/components/dashboard/ReferralPage";

export const Route = createFileRoute("/_authenticated/dashboard/parrainage")({
  head: () => ({ meta: [
    { title: "Parrainage | TechNova AI Hub" },
    { name: "description", content: "Invitez vos amis : 5 crédits pour vous, 5 crédits pour eux." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ReferralPage,
});
