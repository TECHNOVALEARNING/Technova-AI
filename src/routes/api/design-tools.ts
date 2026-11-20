import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BG_REMOVE_CREDITS } from "@/lib/design-formats";

// Créativité Pro → « Supprimer l'arrière-plan » (Pro plan, design_pro). The picture (PNG / JPEG / WebP data URL,
// 5 MB at most) is uploaded to a private temporary file, read by kie.ai's recraft/remove-background through a
// 10-minute signed URL, and the transparent PNG comes back to the browser; the temporary file is always deleted.
// Price: BG_REMOVE_CREDITS (8), or the real kie.ai cost when higher (creditsConsumed × USD 0.005 × 1 200), twice
// reserved first and released when it fails. The call is recorded in media_generations (provider_credits) so the
// admin provider chart counts it, and in usage_logs for the Usage page.

const MODEL = "recraft/remove-background";
const body = z.object({ lang: z.enum(["fr", "en"]).default("fr"), image: z.string().max(7_200_000).regex(/^data:image\/(png|jpeg|webp);base64,/) });

async function kie(path: string, init?: RequestInit) {
  const key = process.env["KIE_API_KEY"];
  if (!key) throw new Error("KIE_NOT_CONFIGURED");
  const res = await fetch(`https://api.kie.ai/api/v1/jobs/${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000) });
  const json = await res.json().catch(() => null) as { code?: number; msg?: string; data?: Record<string, unknown> } | null;
  if (!res.ok || !json || json.code !== 200) throw new Error(json?.msg || `kie.ai ${res.status}`);
  return json.data ?? {};
}

export const Route = createFileRoute("/api/design-tools")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userIdFromRequest } = await import("@/lib/auth.server");
        const userId = await userIdFromRequest(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Image invalide (PNG, JPEG ou WebP, 5 Mo au plus). / Invalid image.", { status: 400 });
        const { lang, image } = parsed.data;
        const fr = lang === "fr";
        const [, mime, b64] = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(image)!;
        const bytes = Buffer.from(b64!, "base64");
        if (bytes.byteLength > 5 * 1024 * 1024) return new Response(fr ? "Image trop lourde (5 Mo au plus)." : "Image too large (5 MB max).", { status: 413 });
        const { getTier, allows, planResponse } = await import("@/lib/plan.server");
        if (!allows(await getTier(userId), "design_pro")) return planResponse(userId, "design_pro");
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "design_ai"))) return new Response(rateLimitMessage(lang, "design_ai"), { status: 429 });
        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        let reservation: string | null;
        try { reservation = await reserveCredits(userId, BG_REMOVE_CREDITS * 2, "Créativité Pro · arrière-plan"); }
        catch { return new Response(fr ? "Compte suspendu." : "Account suspended.", { status: 403 }); }
        if (!reservation) return new Response(fr ? `Crédits insuffisants : la suppression d'arrière-plan coûte ${BG_REMOVE_CREDITS} crédits.` : `Not enough credits: background removal costs ${BG_REMOVE_CREDITS} credits.`, { status: 402 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `${userId}/design-tools/${crypto.randomUUID()}.${mime === "jpeg" ? "jpg" : mime}`;
        const startedAt = Date.now();
        try {
          const up = await supabaseAdmin.storage.from("user-files").upload(path, bytes, { contentType: `image/${mime}`, upsert: false });
          if (up.error) throw new Error("UPLOAD");
          const signed = await supabaseAdmin.storage.from("user-files").createSignedUrl(path, 600);
          if (signed.error || !signed.data) throw new Error("SIGN");
          const task = await kie("createTask", { method: "POST", body: JSON.stringify({ model: MODEL, input: { image: signed.data.signedUrl } }) });
          const taskId = String(task["taskId"] ?? "");
          if (!taskId) throw new Error("NO_TASK");
          // Poll up to ~75 s (the job usually takes a few seconds).
          let info: Record<string, unknown> = {};
          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 3000));
            info = await kie(`recordInfo?taskId=${encodeURIComponent(taskId)}`);
            if (info["state"] === "success" || info["state"] === "fail") break;
          }
          if (info["state"] !== "success") throw new Error("FAILED");
          const resultJson = typeof info["resultJson"] === "string" ? JSON.parse(info["resultJson"] as string) as { resultUrls?: string[] } : {};
          const url = resultJson.resultUrls?.[0];
          if (!url || !/^https:\/\//.test(url)) throw new Error("NO_RESULT");
          const out = await fetch(url, { signal: AbortSignal.timeout(30_000) });
          const buf = Buffer.from(await out.arrayBuffer());
          if (!out.ok || buf.byteLength < 100 || buf.byteLength > 20 * 1024 * 1024) throw new Error("DOWNLOAD");
          const kieCredits = Number(info["creditsConsumed"] ?? 1) || 1;
          const credits = Math.min(BG_REMOVE_CREDITS * 2, Math.max(BG_REMOVE_CREDITS, Math.ceil(kieCredits * 0.005 * 1200)));
          await settleCredits(reservation, credits);
          await supabaseAdmin.from("media_generations").insert({ owner_id: userId, task_id: taskId, kind: "image", model: MODEL, prompt: "Créativité Pro · suppression d'arrière-plan", aspect_ratio: "auto", status: "success", reserved_credits: BG_REMOVE_CREDITS * 2, charged_credits: credits, settled: true, provider_credits: kieCredits } as never);
          await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: "Créativité Pro · arrière-plan", input_tokens: 0, output_tokens: 0, credits, latency_ms: Date.now() - startedAt });
          const type = out.headers.get("content-type")?.startsWith("image/") ? out.headers.get("content-type")! : "image/png";
          return Response.json({ image: `data:${type};base64,${buf.toString("base64")}`, credits });
        } catch (e) {
          await releaseCredits(reservation);
          console.error("design-tools remove-bg", e instanceof Error ? e.message : e);
          return new Response(fr ? "L'arrière-plan n'a pas pu être supprimé. Réessayez : aucun crédit n'a été prélevé." : "The background could not be removed. Try again: no credit was charged.", { status: 502 });
        } finally {
          await supabaseAdmin.storage.from("user-files").remove([path]).catch(() => undefined);
        }
      },
    },
  },
});
