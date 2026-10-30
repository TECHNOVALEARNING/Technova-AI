import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyPlan } from "@/lib/plan.functions";
import type { Tier } from "@/lib/plans";

export type PlanKey = "free" | "starter" | "essential" | "creator" | "pro";
export const planLabels: Record<PlanKey, { fr: string; en: string }> = {
  free: { fr: "Gratuit", en: "Free" }, starter: { fr: "Starter", en: "Starter" }, essential: { fr: "Essential", en: "Essential" },
  creator: { fr: "Creator", en: "Creator" }, pro: { fr: "Pro", en: "Pro" },
};
/** The badge shown for a tier; tier 0 is Starter only once a pack has been paid. */
export const planKeyOf = (tier: Tier, paid: boolean): PlanKey => (["starter", "essential", "creator", "pro"] as const)[tier] === "starter" && !paid ? "free" : (["starter", "essential", "creator", "pro"] as const)[tier];

/** The account's plan, or null while loading (pages then show nothing locked). */
export function usePlan() {
  const load = useServerFn(getMyPlan);
  const [plan, setPlan] = useState<{ tier: Tier; paid: boolean } | null>(null);
  useEffect(() => { let live = true; load().then((r) => { if (live) setPlan(r); }).catch(() => {}); return () => { live = false; }; }, [load]);
  return plan;
}

/** The account's plan tier, or null while loading. */
export function usePlanTier() {
  return usePlan()?.tier ?? null;
}
