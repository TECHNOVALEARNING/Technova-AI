// Server-only plan checks. The browser never decides access: every gated action re-checks here.

/** Error code returned when website generation needs an Essential, Creator or Pro purchase. */
export const STUDIO_UPGRADE_REQUIRED = "STUDIO_UPGRADE_REQUIRED";

export async function hasSiteAccess(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_site_access", { _user: userId });
  if (error) throw new Error("Vérification du forfait impossible. Réessayez. / Plan check failed.");
  return data === true;
}

/** 403 response for a Studio request without website access (logged for the admin). */
export async function studioUpgradeResponse(userId: string, stage: string) {
  const { logSecurityEvent } = await import("@/lib/security.server");
  await logSecurityEvent(userId, "site_blocked_insufficient_plan", "info", { stage });
  return new Response(STUDIO_UPGRADE_REQUIRED, { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
