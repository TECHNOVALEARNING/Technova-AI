import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in account's plan tier, for display only: every gated action re-checks on the server. */
export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getTier } = await import("@/lib/plan.server");
    // Tier 0 covers both a bought Starter pack and no purchase at all; the badge tells them apart.
    const [tier, paid] = await Promise.all([
      getTier(context.userId),
      context.supabase.from("payments").select("id", { count: "exact", head: true }).eq("owner_id", context.userId).eq("credited", true).then((r) => (r.count ?? 0) > 0),
    ]);
    return { tier, paid };
  });
