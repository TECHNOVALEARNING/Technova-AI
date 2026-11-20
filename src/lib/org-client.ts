import { useEffect, useState } from "react";
import { getMyOrganization } from "@/lib/organization.functions";
import type { OrgFeature } from "@/lib/org-features";

// Browser view of the caller's company (TechNova Team / Entreprise): read once per page load and shared, so the
// sidebar and the chat can hide what the administrator unticked. Display only: the server re-checks everything.
export type MyOrganization = Awaited<ReturnType<typeof getMyOrganization>>;

let cache: Promise<MyOrganization> | null = null;
const listeners = new Set<(o: MyOrganization) => void>();

export function loadMyOrganization(force = false): Promise<MyOrganization> {
  if (!cache || force) {
    cache = getMyOrganization().catch(() => ({ membership: null, invitations: [] }) as MyOrganization);
    void cache.then((o) => listeners.forEach((l) => l(o)));
  }
  return cache;
}

export function useMyOrganization() {
  const [org, setOrg] = useState<MyOrganization | null>(null);
  useEffect(() => {
    let alive = true;
    const set = (o: MyOrganization) => { if (alive) setOrg(o); };
    listeners.add(set);
    void loadMyOrganization().then(set);
    return () => { alive = false; listeners.delete(set); };
  }, []);
  return org;
}

/** Features unticked for the caller (sub-accounts of an active company only; administrators keep everything). */
export function useOrgDisabled(): Set<OrgFeature> {
  const org = useMyOrganization();
  const m = org?.membership;
  return new Set(m && m.role === "member" && m.active ? m.disabledFeatures : []);
}
