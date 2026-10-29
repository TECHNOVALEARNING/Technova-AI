import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyPlan } from "@/lib/plan.functions";
import type { Tier } from "@/lib/plans";

/** The account's plan tier, or null while loading (pages then show nothing locked). */
export function usePlanTier() {
  const load = useServerFn(getMyPlan);
  const [tier, setTier] = useState<Tier | null>(null);
  useEffect(() => { let live = true; load().then((r) => { if (live) setTier(r.tier); }).catch(() => {}); return () => { live = false; }; }, [load]);
  return tier;
}
