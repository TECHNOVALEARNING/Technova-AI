import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { createCheckout, isLiveKey } = await import("./nyole.server");
    const { data: pack } = await context.supabase.from("credit_packs").select("slug,name,price_xof,credits").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (!pack) throw new Error("Pack introuvable");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pay, error } = await supabaseAdmin.from("payments").insert({
      owner_id: context.userId, pack_slug: pack.slug, amount_xof: pack.price_xof, credits: pack.credits, livemode: isLiveKey(),
    }).select("id").single();
    if (error || !pay) throw new Error("Paiement impossible");
    const origin = process.env["TECHNOVA_APP_URL"]?.trim().replace(/\/+$/, "") || new URL(getRequest().url).origin;
    const back = `${origin}/dashboard/credits?payment=${pay.id}`;
    try {
      const s = await createCheckout({
        idempotencyKey: pay.id, amount: pack.price_xof, description: `TechNova · ${pack.name} · ${pack.credits} crédits Technova`,
        email: (context.claims as { email?: string }).email, successUrl: back, cancelUrl: `${back}&cancelled=1`,
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
    const { data: p } = await context.supabase.from("payments").select("id").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Paiement introuvable");
    const { reconcilePayment } = await import("./nyole.server");
    return { status: (await reconcilePayment(p.id)) ?? "unknown" };
  });
