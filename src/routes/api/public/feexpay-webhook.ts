import { createFileRoute } from "@tanstack/react-router";

// FeexPay announces each transaction here with "Authorization: Bearer <FEEXPAY_WEBHOOK_SECRET>". The announcement is
// only a trigger: the status is re-read from FeexPay's API and credits are granted once (src/lib/payments.server.ts).
export const Route = createFileRoute("/api/public/feexpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { webhookAuthorized } = await import("@/lib/feexpay.server");
        if (!webhookAuthorized(request.headers.get("authorization"))) {
          const { logSecurityEvent } = await import("@/lib/security.server");
          await logSecurityEvent(null, "payment_webhook_invalid_signature", "warning", { provider: "feexpay" });
          return new Response("unauthorized", { status: 401 });
        }
        let evt: { reference?: unknown; type?: unknown };
        try { evt = (await request.json()) as typeof evt; } catch { return new Response("bad json", { status: 400 }); }
        if (evt.type === "Payout") return new Response("ignored");
        const reference = typeof evt.reference === "string" ? evt.reference.slice(0, 120) : "";
        if (!reference) return new Response("bad payload", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: p } = await supabaseAdmin.from("payments").select("id").eq("provider", "feexpay").eq("session_id", reference).maybeSingle();
        if (!p) return new Response("unknown reference");
        const { reconcilePayment } = await import("@/lib/payments.server");
        try {
          const status = await reconcilePayment(p.id);
          // Still pending at FeexPay: a 5xx asks FeexPay to retry; the cron reconcile is the safety net.
          return status === "pending" ? new Response("pending", { status: 503 }) : new Response("ok");
        } catch (e) {
          console.error("feexpay reconcile", e);
          return new Response("retry", { status: 500 });
        }
      },
    },
  },
});
