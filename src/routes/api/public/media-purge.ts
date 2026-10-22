import { createFileRoute } from "@tanstack/react-router";

/** Called daily by the scheduler: deletes archived media files older than 14 days. */
async function run(request: Request) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { purgeExpiredMedia } = await import("@/lib/media-archive.server");
  const purged = await purgeExpiredMedia();
  return Response.json({ purged });
}

export const Route = createFileRoute("/api/public/media-purge")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
