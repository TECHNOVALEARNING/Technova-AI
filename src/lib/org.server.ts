// Server-only company checks (TechNova Team / Entreprise, migration 0057): a sub-account cannot use a feature its
// administrator unticked. The browser only hides those features; every billable route calls these.
import { orgDisabledMessage, type OrgFeature } from "@/lib/org-features";

export async function orgFeatureAllowed(userId: string, feature: OrgFeature): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("org_feature_allowed" as never, { _user: userId, _feature: feature } as never);
  // Before migration 0057 runs the function does not exist: nothing is restricted.
  if (error) return true;
  return data !== false;
}

/** For server functions: throws the readable "disabled by your company administrator" message. */
export async function requireOrgFeature(userId: string, feature: OrgFeature) {
  if (!(await orgFeatureAllowed(userId, feature))) throw new Error(orgDisabledMessage(feature));
}

/** For API routes: a 403 carrying the same message, or null when allowed. */
export async function orgFeatureResponse(userId: string, feature: OrgFeature): Promise<Response | null> {
  if (await orgFeatureAllowed(userId, feature)) return null;
  return new Response(orgDisabledMessage(feature), { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

/** Whose ledger a user spends: the company administrator for an active sub-account, else the user. */
export async function billingOwner(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("billing_owner" as never, { _user: userId } as never);
  return !error && typeof data === "string" ? data : userId;
}
