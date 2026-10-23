import { createFileRoute } from "@tanstack/react-router";
import { reconcilePayment, verifyWebhook } from "@/lib/nyole.server";

export const Route = createFileRoute("/api/public/nyole-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const ok = await verifyWebhook(raw, request.headers.get("x-afriflow-timestamp"), request.headers.get("x-afriflow-signature"));
        if (!ok) {
          const { logSecurityEvent } = await import("@/lib/security.server");
          await logSecurityEvent(null, "payment_webhook_invalid_signature", "warning", {});
          return new Response("invalid signature", { status: 400 });
        }
        let evt: { data?: { metadata?: { payment_id?: string } } };
        try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
        const id = evt.data?.metadata?.payment_id;
        // The signed event only triggers a server-side status check; credits are granted once.
        if (id && /^[0-9a-f-]{36}$/i.test(id)) {
          try { await reconcilePayment(id); } catch (e) { console.error("nyole reconcile", e); return new Response("retry", { status: 500 }); }
        }
        return new Response("ok");
      },
    },
  },
});
