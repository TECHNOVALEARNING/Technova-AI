import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Account deletion from Settings: the request starts a 30-day grace period (data kept, cancellable by
// signing in again); the daily purge then deletes files and the account (src/lib/account-deletion.server.ts).

export const ACCOUNT_GRACE_DAYS = 30;

/** The pending deletion of the signed-in account, if any. */
export const getAccountDeletion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("account_deletions").select("requested_at, purge_after").eq("user_id", context.userId).maybeSingle();
    return data ?? null;
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const purgeAfter = new Date(Date.now() + ACCOUNT_GRACE_DAYS * 86_400_000).toISOString();
    // A repeated request keeps the first date.
    const { data: existing } = await supabaseAdmin.from("account_deletions").select("purge_after").eq("user_id", context.userId).maybeSingle();
    if (existing) return { purgeAfter: existing.purge_after };
    const { error } = await supabaseAdmin.from("account_deletions").insert({ user_id: context.userId, purge_after: purgeAfter });
    if (error) throw new Error("La demande n’a pas pu être enregistrée. Réessayez.");
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "account_deletion_requested", "info", { purge_after: purgeAfter });
    return { purgeAfter };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("account_deletions").delete().eq("user_id", context.userId);
    if (error) throw new Error("L’annulation n’a pas pu être enregistrée. Réessayez.");
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "account_deletion_cancelled", "info");
    return { ok: true };
  });
