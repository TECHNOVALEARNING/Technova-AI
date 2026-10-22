import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { buildMediaInput, defaultImageModel, defaultVideoModel, findMediaModel, KIE_TO_TECHNOVA, mediaReserve } from "@/lib/media-models";

const createInput = z.object({
  kind: z.enum(["image", "video"]),
  prompt: z.string().trim().min(3).max(5000),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  duration: z.enum(["5", "10"]).optional(),
  model: z.string().max(80).optional(),
  threadId: z.string().uuid(),
});

async function kie(path: string, init?: RequestInit) {
  const key = process.env["KIE_API_KEY"];
  if (!key) throw new Error("Kie.ai n’est pas configuré.");
  const response = await fetch(`https://api.kie.ai/api/v1/jobs/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  const payload = await response.json().catch(() => null) as { code?: number; msg?: string; data?: Record<string, unknown> } | null;
  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(payload?.msg || `kie.ai (${response.status})`);
  }
  return payload.data ?? {};
}

export const createMediaGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "media"))) throw new Error("Trop de créations récentes. Patientez quelques minutes.");
    const { data: thread, error: threadError } = await context.supabase.from("chat_threads")
      .select("id").eq("id", data.threadId).eq("owner_id", context.userId).maybeSingle();
    if (threadError || !thread) throw new Error("Conversation introuvable.");
    const spec = (data.model && findMediaModel(data.model)) || findMediaModel(data.kind === "image" ? defaultImageModel : defaultVideoModel)!;
    if (spec.kind !== data.kind) throw new Error("Ce modèle ne correspond pas au type demandé.");
    const model = spec.id;
    const built = buildMediaInput(spec, data.prompt, data.aspectRatio, Number(data.duration ?? "5"));
    const aspectRatio = built.ratio;
    const reserve = mediaReserve(spec, built.duration ?? 5);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error: reserveError } = await supabaseAdmin.rpc("reserve_credits", { _owner: context.userId, _amount: reserve, _label: spec.label });
    if (reserveError) throw new Error(reserveError.message);
    if (!ok) throw new Error(`Crédits insuffisants : cette création demande jusqu’à ${reserve} crédits. / Not enough credits (${reserve} needed).`);
    const refund = (label: string) => supabaseAdmin.from("credit_transactions").insert({ owner_id: context.userId, amount: reserve, kind: "refund", label });
    let taskId: unknown;
    try {
      const result = await kie("createTask", { method: "POST", body: JSON.stringify({ model, input: built.input }) });
      taskId = result["taskId"];
      if (typeof taskId !== "string") throw new Error("kie.ai n’a pas renvoyé d’identifiant de tâche.");
    } catch (e) {
      await refund(`${spec.label} (remboursé)`);
      throw e;
    }
    const { data: row, error } = await supabaseAdmin.from("media_generations").insert({
      owner_id: context.userId, task_id: taskId as string, kind: data.kind, model, prompt: data.prompt,
      aspect_ratio: aspectRatio, duration: built.duration === null ? null : String(built.duration), reserved_credits: reserve,
    }).select("id").single();
    if (error || !row) throw new Error(`La création a démarré, mais son suivi n’a pas pu être enregistré : ${error?.message ?? "unknown"}`);
    const part = { type: "data-media", data: { id: row.id, kind: data.kind, model: spec.label, prompt: data.prompt, status: "waiting", progress: null, urls: [], error: null } };
    const { error: messageError } = await context.supabase.from("chat_messages").insert({
      thread_id: data.threadId, sdk_id: row.id, role: "assistant", parts: [part],
    });
    if (messageError) throw new Error(`La création a démarré, mais son message n’a pas pu être enregistré : ${messageError.message}`);
    return row.id;
  });

export const refreshMediaGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid(), threadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: message, error: messageError } = await context.supabase.from("chat_messages")
      .select("sdk_id").eq("thread_id", data.threadId).eq("sdk_id", data.id).eq("role", "assistant").maybeSingle();
    if (messageError || !message) throw new Error("Création introuvable dans cette conversation.");
    const { data: row, error } = await context.supabase.from("media_generations")
      .select("id,task_id,status,kind,model,prompt,result_urls,error,archived_paths,expires_at").eq("id", data.id).eq("owner_id", context.userId).single();
    if (error || !row) throw new Error("Création introuvable.");
    if (["success", "fail"].includes(row.status)) {
      // Serve archived copies (14-day retention) through short-lived signed URLs when available.
      const { signedMediaUrls } = await import("@/lib/media-archive.server");
      const archived = await signedMediaUrls(row);
      const urls = archived ?? (row.status === "success" ? row.result_urls : []);
      return { id: row.id, kind: row.kind, model: findMediaModel(row.model)?.label ?? row.model, prompt: row.prompt, status: row.status, urls, error: row.error };
    }
    const result = await kie(`recordInfo?taskId=${encodeURIComponent(row.task_id)}`);
    const state = result["state"];
    if (typeof state !== "string" || !["waiting", "queuing", "generating", "success", "fail"].includes(state)) throw new Error("État de création inconnu.");
    const reportedProgress = result["progress"];
    // kie.ai only reports a percentage for some models; never invent one for models without it.
    const progress = typeof reportedProgress === "number" && Number.isFinite(reportedProgress) && reportedProgress >= 0 && reportedProgress <= 100
      ? Math.round(reportedProgress) : null;
    let urls: string[] = [];
    if (state === "success" && typeof result["resultJson"] === "string") {
      try {
        const parsed = JSON.parse(result["resultJson"]) as { resultUrls?: unknown };
        if (Array.isArray(parsed.resultUrls)) urls = parsed.resultUrls.filter((url): url is string =>
          typeof url === "string" && /^https:\/\//i.test(url));
      } catch { /* no usable media returned */ }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.from("media_generations").update({
      status: state,
      result_urls: urls,
      error: state === "fail" ? String(result["failMsg"] || "La création a échoué.") : null,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("owner_id", context.userId);
    if (updateError) throw new Error(updateError.message);
    if (state === "success" || state === "fail") {
      // Settle once: the conditional update guarantees a single refund even with concurrent polls.
      const { data: claimed } = await supabaseAdmin.from("media_generations").update({ settled: true })
        .eq("id", row.id).eq("settled", false).select("reserved_credits");
      const reserved = claimed?.[0]?.reserved_credits ?? 0;
      if (claimed?.length && reserved > 0) {
        const consumed = Number(result["creditsConsumed"]);
        const charged = state === "fail" ? 0
          : Number.isFinite(consumed) && consumed > 0 ? Math.min(reserved, Math.ceil(consumed * KIE_TO_TECHNOVA)) : reserved;
        await supabaseAdmin.from("media_generations").update({ charged_credits: charged }).eq("id", row.id);
        if (reserved - charged > 0) await supabaseAdmin.from("credit_transactions").insert({
          owner_id: context.userId, amount: reserved - charged, kind: "refund",
          label: `${findMediaModel(row.model)?.label ?? row.model} (${state === "fail" ? "échec remboursé" : "ajustement"})`,
        });
      }
    }
    // Archive kie.ai results into private storage right away: source links expire.
    if (state === "success" && urls.length) {
      const { archiveMedia, signedMediaUrls } = await import("@/lib/media-archive.server");
      const paths = await archiveMedia(context.userId, row.id, urls);
      if (paths.length) {
        const signed = await signedMediaUrls({ id: row.id, archived_paths: paths, expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() });
        if (signed?.length) urls = signed;
      }
    }
    const media = { id: row.id, kind: row.kind, model: findMediaModel(row.model)?.label ?? row.model, prompt: row.prompt, status: state, progress, urls, error: state === "fail" ? String(result["failMsg"] || "La création a échoué.") : null };
    const { error: partError } = await context.supabase.from("chat_messages").update({ parts: [{ type: "data-media", data: media }] })
      .eq("thread_id", data.threadId).eq("sdk_id", row.id);
    if (partError) throw new Error(partError.message);
    return media;
  });