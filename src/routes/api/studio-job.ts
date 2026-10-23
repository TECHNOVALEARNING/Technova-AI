import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const body = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().min(1).max(100),
  lang: z.enum(["fr", "en"]).optional(),
  request: z.string().min(1).max(20000),
  answers: z.string().max(10000).default(""),
  plan: z.record(z.string(), z.unknown()),
});

async function verifyUser(request: Request) {
  const auth = request.headers.get("authorization");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!auth?.startsWith("Bearer ") || !url || !key) return null;
  const token = auth.slice(7);
  if (token.split(".").length !== 3) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

/** Starts a server-side build job; it keeps running (and is resumed by the worker) even if the page closes. */
export const Route = createFileRoute("/api/studio-job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await verifyUser(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const d = parsed.data;
        const { hasSiteAccess, studioUpgradeResponse } = await import("@/lib/access.server");
        if (!(await hasSiteAccess(userId))) return studioUpgradeResponse(userId, "build");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runStudioJob, BUILD_COST } = await import("@/lib/studio-job.server");
        const { data: thread } = await supabaseAdmin.from("chat_threads").select("id").eq("id", d.threadId).eq("owner_id", userId).maybeSingle();
        if (!thread) return new Response("Not found", { status: 404 });
        // The build cost stays reserved until the job finishes (charged) or fails (released).
        const { reserveCredits, releaseCredits } = await import("@/lib/credits.server");
        const reservation = await reserveCredits(userId, BUILD_COST, "TechNova Studio · build");
        if (!reservation) return new Response("Crédits insuffisants — rechargez votre solde dans Crédits. / Not enough credits.", { status: 402 });
        const { data: job, error } = await supabaseAdmin.from("studio_jobs").insert({
          owner_id: userId, thread_id: d.threadId, message_id: d.messageId, request: d.request,
          answers: d.answers, plan: d.plan as never, lang: d.lang ?? "fr", reservation_id: reservation,
        }).select("id").single();
        if (error || !job) {
          await releaseCredits(reservation);
          return new Response("Impossible de lancer la génération. / Could not start.", { status: 500 });
        }
        const enc = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(enc.encode(JSON.stringify({ jobId: job.id }) + "\n"));
            const ping = setInterval(() => { try { controller.enqueue(enc.encode(" ")); } catch { /* closed */ } }, 10000);
            try { await runStudioJob(job.id); } finally { clearInterval(ping); try { controller.close(); } catch { /* closed */ } }
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      },
    },
  },
});
