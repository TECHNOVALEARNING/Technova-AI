import { createFileRoute } from "@tanstack/react-router";

/** Called every evening by the scheduler (23:55 UTC): records what OpenRouter really billed today, so the admin
 *  consumption chart keeps each day's true total even when nobody opened it that day. */
async function run(request: Request) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { recordOpenRouterUsage } = await import("@/lib/provider-usage.server");
  await recordOpenRouterUsage(supabaseAdmin, true).catch((e) => console.error("usage snapshot", e));
  return Response.json({ ok: true });
}

export const Route = createFileRoute("/api/public/usage-snapshot")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
