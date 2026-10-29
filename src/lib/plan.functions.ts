import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in account's plan tier, for display only: every gated action re-checks on the server. */
export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getTier } = await import("@/lib/plan.server");
    return { tier: await getTier(context.userId) };
  });
