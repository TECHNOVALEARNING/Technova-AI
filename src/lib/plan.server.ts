// Server-only plan checks: the browser never decides access, every gated action re-checks here.
import { featureMinTier, upgradeError, type PlanFeature, type Tier } from "@/lib/plans";

export async function getTier(userId: string): Promise<Tier> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("account_tier", { _user: userId });
  if (error) throw new Error("Vérification du forfait impossible. Réessayez. / Plan check failed.");
  return Math.max(0, Math.min(3, Number(data ?? 0))) as Tier;
}

export const allows = (tier: Tier, feature: PlanFeature) => tier >= featureMinTier[feature];

async function logBlocked(userId: string, feature: PlanFeature) {
  const { logSecurityEvent } = await import("@/lib/security.server");
  await logSecurityEvent(userId, "plan_limit_blocked", "info", { feature });
}

/** For server functions: throws PLAN_UPGRADE_REQUIRED:<feature> when the plan is too low. */
export async function requirePlan(userId: string, feature: PlanFeature, tier?: Tier) {
  const t = tier ?? (await getTier(userId));
  if (!allows(t, feature)) { await logBlocked(userId, feature); throw new Error(upgradeError(feature)); }
  return t;
}

/** For API routes: a 403 whose body carries PLAN_UPGRADE_REQUIRED:<feature>. */
export async function planResponse(userId: string, feature: PlanFeature) {
  await logBlocked(userId, feature);
  return new Response(upgradeError(feature), { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
