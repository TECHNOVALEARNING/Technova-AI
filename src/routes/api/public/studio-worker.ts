import { createFileRoute } from "@tanstack/react-router";

/** Called every minute by the scheduler: resumes up to two interrupted site generations. */
async function run(request: Request) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { pendingStudioJobs, runStudioJob } = await import("@/lib/studio-job.server");
  const ids = await pendingStudioJobs(2);
  for (const id of ids) await runStudioJob(id);
  // Stops the minute-by-minute check once no generation is running.
  await supabaseAdmin.rpc("studio_worker_disarm");
  return Response.json({ resumed: ids.length });
}

export const Route = createFileRoute("/api/public/studio-worker")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
