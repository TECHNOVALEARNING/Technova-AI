import { createFileRoute } from "@tanstack/react-router";

/** Called daily by the scheduler: deletes archived media older than 14 days, saved creations 14 days after their last save, accounts past their 30-day deletion delay, and re-checks unpaid checkouts. */
async function run(request: Request) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { purgeExpiredMedia } = await import("@/lib/media-archive.server");
  const purged = await purgeExpiredMedia();
  // Saved presentations and spreadsheets (Projects) 14 days after their last save.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const creations = await supabaseAdmin.from("user_creations").delete({ count: "exact" }).lt("expires_at", new Date().toISOString())
    .then((r) => r.count ?? 0, (e) => { console.error("creations purge", e); return null; });
  // Accounts whose 30-day deletion grace period has ended.
  const { purgeDeletedAccounts } = await import("@/lib/account-deletion.server");
  const accounts = await purgeDeletedAccounts().catch((e) => { console.error("account purge", e); return null; });
  // Daily safety net: credit payments whose webhook never arrived.
  const { reconcilePendingPayments } = await import("@/lib/payments.server");
  const payments = await reconcilePendingPayments().catch((e) => { console.error("reconcile pending", e); return null; });
  return Response.json({ purged, creations, payments, accounts });
}

export const Route = createFileRoute("/api/public/media-purge")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
