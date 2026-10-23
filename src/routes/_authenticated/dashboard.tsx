import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { needsOnboarding } from "@/lib/onboarding-guard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  // New accounts answer the welcome questions (steps 2–4 of sign-up) before the dashboard.
  beforeLoad: async ({ context }) => {
    if (await needsOnboarding(context.user.id)) throw redirect({ to: "/bienvenue" });
  },
  component: () => <DashboardLayout><Outlet /></DashboardLayout>,
});
