import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutInput = z.object({
  slug: z.string().min(1).max(40),
  /** Omitted by older pages: Nyole's hosted checkout, as before. */
  method: z.enum(["card", "momo"]).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  network: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(80).optional(),
});

/**
 * Orchestration (src/lib/payment-routing.ts): cards → FeexPay; Mobile Money → FeexPay when it serves the country and
 * operator, else Nyole; any FeexPay failure falls back to Nyole's hosted checkout so the customer can still pay.
 * Returns a page to open, or a pending payment the customer confirms on the phone.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkoutInput.parse(d))
  .handler(async ({ data, context }): Promise<{ url: string } | { pendingId: string; provider: "feexpay" }> => {
    const { createCheckout, isLiveKey } = await import("./nyole.server");
    const feex = await import("./feexpay.server");
    const { feexpayNetwork, internationalPhone, routePayment } = await import("./payment-routing");
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "payment"))) throw new Error("Trop de tentatives de paiement. Patientez quelques minutes. / Too many payment attempts.");
    const { data: pack } = await context.supabase.from("credit_packs").select("slug,name,price_xof,credits").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (!pack) throw new Error("Pack introuvable");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("display_name").eq("id", context.userId).maybeSingle();
    const email = (context.claims as { email?: string }).email;
    const [firstName = "Client", ...rest] = (profile?.display_name || email?.split("@")[0] || "Client TechNova").trim().split(/\s+/);
    const customer = { firstName, lastName: rest.join(" ") || "TechNova", email };

    // Decide: FeexPay only when configured, and in sandbox only for networks its sandbox supports.
    const method = data.method;
    const network = method === "momo" ? feexpayNetwork(data.country, data.network) : null;
    // Mobile Money needs a number of the chosen country; a card holder may be from anywhere.
    const cardPhone = data.phone?.replace(/[^\d+]/g, "") ?? "";
    const phone = method === "card" ? (cardPhone.replace(/\D/g, "").length >= 8 ? cardPhone : null)
      : data.country && data.phone ? internationalPhone(data.country, data.phone) : null;
    let provider: "feexpay" | "nyole" = method && feex.feexpayConfigured() ? routePayment(method, data.country, data.network) : "nyole";
    if (provider === "feexpay" && method === "momo" && (!network || !phone || (!feex.feexpayLive() && !network.sandbox))) provider = "nyole";
    if (provider === "feexpay" && method === "card" && (!phone || !data.city || !data.country)) provider = "nyole";

    const { data: pay, error } = await supabaseAdmin.from("payments").insert({
      owner_id: context.userId, pack_slug: pack.slug, amount_xof: pack.price_xof, credits: pack.credits,
      provider, livemode: provider === "feexpay" ? feex.feexpayLive() : isLiveKey(),
    }).select("id").single();
    if (error || !pay) throw new Error("Paiement impossible");
    const origin = process.env["TECHNOVA_APP_URL"]?.trim().replace(/\/+$/, "") || new URL(getRequest().url).origin;
    const back = `${origin}/dashboard/credits?payment=${pay.id}`;
    const description = `TechNova · ${pack.name} · ${pack.credits} crédits Technova`;

    if (provider === "feexpay") {
      try {
        if (method === "card") {
          const c = await feex.createCardCheckout({ amount: pack.price_xof, paymentId: pay.id, description, customer, phone: phone!, city: data.city!, country: data.country!, returnUrl: back, cancelUrl: `${back}&cancelled=1` });
          await supabaseAdmin.from("payments").update({ session_id: c.reference, checkout_url: c.url }).eq("id", pay.id);
          return { url: c.url };
        }
        const m = await feex.requestMobileMoney({ network: network!.id, phone: phone!, amount: pack.price_xof, paymentId: pay.id, description, customer, returnUrl: back, cancelUrl: `${back}&cancelled=1` });
        await supabaseAdmin.from("payments").update({ session_id: m.reference, checkout_url: m.paymentUrl }).eq("id", pay.id);
        return m.paymentUrl ? { url: m.paymentUrl } : { pendingId: pay.id, provider: "feexpay" };
      } catch (e) {
        // FeexPay unavailable or refused: the same payment continues on Nyole.
        await logSecurityEvent(context.userId, "payment_fallback_nyole", "info", { payment_id: pay.id, method, network: data.network ?? null, reason: String((e as Error)?.message ?? e).slice(0, 200) });
        await supabaseAdmin.from("payments").update({ provider: "nyole", livemode: isLiveKey(), session_id: null, checkout_url: null }).eq("id", pay.id);
      }
    }
    try {
      const s = await createCheckout({
        idempotencyKey: pay.id, amount: pack.price_xof, description, email, successUrl: back, cancelUrl: `${back}&cancelled=1`,
        metadata: { payment_id: pay.id, owner_id: context.userId, pack: pack.slug },
      });
      await supabaseAdmin.from("payments").update({ session_id: s.id, checkout_url: s.url }).eq("id", pay.id);
      return { url: s.url };
    } catch (e) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", pay.id);
      throw e;
    }
  });

export const checkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "payment_check"))) throw new Error("Trop de vérifications. Réessayez dans une minute.");
    const { data: p } = await context.supabase.from("payments").select("id,pack_slug,credits").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Paiement introuvable");
    const { reconcilePayment } = await import("./payments.server");
    // Pack and credits feed the "payment successful" animation.
    return { status: (await reconcilePayment(p.id)) ?? "unknown", pack: p.pack_slug, credits: p.credits };
  });

/** Whether the billing page should show the "test mode" notice (no secret is exposed). */
export const getPaymentMode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { isLiveKey } = await import("./nyole.server");
    const { feexpayConfigured, feexpayLive } = await import("./feexpay.server");
    let nyoleLive = false;
    try { nyoleLive = isLiveKey(); } catch { /* not configured */ }
    // The notice shows while any configured provider still uses test keys.
    return { live: nyoleLive && (!feexpayConfigured() || feexpayLive()), feexpay: feexpayConfigured() };
  });
