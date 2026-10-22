// Authenticates scheduler calls: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`,
// Supabase pg_cron sends `x-worker-token` from studio_worker_config.
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** Returns null when the request is authorized, otherwise the response to send. */
export async function authenticateCronRequest(request: Request): Promise<Response | null> {
  const bearer = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const cronSecret = process.env["CRON_SECRET"];
  if (bearer && cronSecret && same(bearer, cronSecret)) return null;

  const workerToken = request.headers.get("x-worker-token");
  if (workerToken) {
    try {
      const { supabaseAdmin } = await import("./client.server");
      const { data } = await supabaseAdmin.from("studio_worker_config").select("token").eq("id", 1).maybeSingle();
      if (data?.token && same(workerToken, data.token)) return null;
    } catch (e) {
      console.error("cron auth", e);
      return new Response("Server configuration error", { status: 503 });
    }
  }
  return new Response("Unauthorized", { status: 401 });
}
