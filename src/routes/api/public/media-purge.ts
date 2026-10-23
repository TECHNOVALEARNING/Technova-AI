import { createFileRoute } from "@tanstack/react-router";

/** Called daily by the scheduler: deletes archived media older than 14 days and re-checks unpaid checkouts. */
async function run(request: Request) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { purgeExpiredMedia } = await import("@/lib/media-archive.server");
  const purged = await purgeExpiredMedia();
  // Daily safety net: credit payments whose webhook never arrived.
  const { reconcilePendingPayments } = await import("@/lib/nyole.server");
  const payments = await reconcilePendingPayments().catch((e) => { console.error("reconcile pending", e); return null; });
  return Response.json({ purged, payments });
}

export const Route = createFileRoute("/api/public/media-purge")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
