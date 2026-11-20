import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { buildMediaInput, defaultImageModel, defaultMusicModel, defaultVideoModel, findMediaModel, mediaLabel, mediaReserve, imageEditModel, MEDIA_VIDEO_SECONDS, clampVideoSeconds } from "@/lib/media-models";

const createInput = z.object({
  kind: z.enum(["image", "video", "music"]),
  prompt: z.string().trim().min(3).max(5000),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  /** Video length in seconds (4-15); 5 when absent. */
  duration: z.union([z.string().regex(/^\d{1,2}$/), z.number().int()]).optional(),
  model: z.string().max(80).optional(),
  threadId: z.string().uuid(),
  /** A finished image of this account to edit; the edit model then receives it as its source. */
  sourceId: z.string().uuid().optional(),
  /** Music creation journey: own lyrics, title, style, voice, exclusions, instrumental. */
  music: z.object({
    title: z.string().trim().max(80).optional(),
    lyrics: z.string().trim().max(5000).optional(),
    style: z.string().trim().max(1000).optional(),
    exclude: z.string().trim().max(300).optional(),
    vocal: z.enum(["m", "f"]).optional(),
    instrumental: z.boolean().optional(),
  }).optional(),
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

/**
 * Lyrics for a song described in a few words: a title, a short style line for the music engine and full lyrics
 * (verses, chorus, bridge with Suno section tags) in the language of the description, French by default.
 * One small OpenRouter call (data_collection "deny"), its real cost logged in chat_engine_costs (mode "music_lyrics").
 */
async function writeSongLyrics(ownerId: string, prompt: string, o: { style?: string | undefined; vocal?: "m" | "f" | undefined; title?: string | undefined } | undefined): Promise<{ title: string; style: string; lyrics: string } | null> {
  const { orComplete } = await import("@/lib/openrouter.server");
  const r = await orComplete({
    model: "google/gemini-2.5-flash", maxTokens: 1800, temperature: 0.9, timeoutMs: 40_000,
    messages: [
      { role: "system", content: "You are a professional songwriter. From the user's description, write an original, singable song. Reply ONLY with JSON: {\"title\": string (max 60 chars), \"style\": string (genre, mood, instruments, tempo, voice, in English, max 200 chars), \"lyrics\": string}. Lyrics: in the language of the description (French when unclear), 2 verses, a catchy chorus repeated twice, a short bridge, then the chorus; mark sections with [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]; short lines that rhyme, concrete images from the description, no hashtags, no emoji, between 900 and 2000 characters. Never copy existing songs." },
      { role: "user", content: `Description: ${prompt.slice(0, 2000)}${o?.style?.trim() ? `\nStyle wanted: ${o.style.trim().slice(0, 300)}` : ""}${o?.vocal ? `\nVoice: ${o.vocal === "f" ? "female" : "male"}` : ""}${o?.title?.trim() ? `\nTitle: ${o.title.trim().slice(0, 80)}` : ""}` },
    ],
  });
  const start = r.content.indexOf("{"), end = r.content.lastIndexOf("}");
  const json = JSON.parse(r.content.slice(start, end + 1)) as { title?: unknown; style?: unknown; lyrics?: unknown };
  const lyrics = typeof json.lyrics === "string" ? json.lyrics.trim() : "";
  if (lyrics.length < 200) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("chat_engine_costs").insert({ owner_id: ownerId, mode: "music_lyrics", engine: "google/gemini-2.5-flash", input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.costUsd || null, credits: 0 });
  } catch { /* cost log only */ }
  return {
    title: (typeof json.title === "string" && json.title.trim() ? json.title.trim() : "TechNova").slice(0, 80),
    style: (typeof json.style === "string" ? json.style.trim() : "").slice(0, 300) || prompt.slice(0, 300),
    lyrics: lyrics.slice(0, 4800),
  };
}

/** Saved details of a song (title, lyrics, tags, duration, whether the lyrics are the user's); null before migration 0054. */
export type MusicMeta = { title?: string | null; lyrics?: string | null; tags?: string | null; duration?: number | null; ownLyrics?: boolean; instrumental?: boolean };
async function musicMeta(id: string): Promise<MusicMeta | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("media_generations").select("result_meta" as never).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const m = (data as { result_meta?: unknown }).result_meta;
  return m && typeof m === "object" ? m as MusicMeta : null;
}

/** Error code the chat turns into the upgrade message (video requires a Creator or Pro purchase). */
export const VIDEO_UPGRADE_REQUIRED = "VIDEO_UPGRADE_REQUIRED";

async function hasVideoAccess(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_video_access", { _user: userId });
  if (error) throw new Error("Vérification du forfait impossible. Réessayez. / Plan check failed.");
  return data === true;
}

/** What the chat shows before a video request; the server re-checks on every creation. */
export const getVideoAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ledger } = await context.supabase.from("credit_transactions").select("amount").eq("owner_id", context.userId);
    return { allowed: await hasVideoAccess(context.userId), balance: (ledger ?? []).reduce((sum, row) => sum + row.amount, 0) };
  });

export const createMediaGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "media"))) throw new Error("Trop de créations récentes. Patientez quelques minutes.");
    const { data: thread, error: threadError } = await context.supabase.from("chat_threads")
      .select("id").eq("id", data.threadId).eq("owner_id", context.userId).maybeSingle();
    if (threadError || !thread) throw new Error("Conversation introuvable.");
    const editing = data.kind === "image" && !!data.sourceId;
    const spec = editing ? imageEditModel : (data.model && findMediaModel(data.model)) || findMediaModel(data.kind === "image" ? defaultImageModel : data.kind === "music" ? defaultMusicModel : defaultVideoModel)!;
    if (spec.kind !== data.kind) throw new Error("Ce modèle ne correspond pas au type demandé.");
    if (spec.kind === "video" && !(await hasVideoAccess(context.userId))) {
      const { logSecurityEvent } = await import("@/lib/security.server");
      await logSecurityEvent(context.userId, "video_blocked_insufficient_plan", "info", { model: spec.id });
      throw new Error(VIDEO_UPGRADE_REQUIRED);
    }
    // Starter plan: a rolling 24-hour image quota (failed images are refunded and not counted).
    if (spec.kind === "image") {
      const { getTier, requirePlan } = await import("@/lib/plan.server");
      const { STARTER_DAILY_IMAGES } = await import("@/lib/plans");
      const tier = await getTier(context.userId);
      if (tier < 1) {
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { count } = await admin.from("media_generations").select("id", { count: "exact", head: true })
          .eq("owner_id", context.userId).eq("kind", "image").neq("status", "fail").gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
        if ((count ?? 0) >= STARTER_DAILY_IMAGES) await requirePlan(context.userId, "image_quota", tier);
      }
    }
    const model = spec.id;
    // A song described in a few words (no lyrics given, not instrumental): write real lyrics first, so the music
    // engine sings a full song instead of a mostly wordless track (its simple mode). Included in the song's price.
    let music = spec.kind === "music" ? data.music : undefined;
    const ownLyrics = !!data.music?.lyrics?.trim();
    const wantsInstrumental = data.music?.instrumental ?? /\b(instrumental|sans paroles|sans voix|no vocals|without vocals)\b/i.test(data.prompt);
    let writtenLyrics: { title: string; style: string; lyrics: string } | null = null;
    if (spec.kind === "music" && !ownLyrics && !wantsInstrumental) {
      writtenLyrics = await writeSongLyrics(context.userId, data.prompt, data.music).catch(() => null);
      if (writtenLyrics) music = { ...data.music, lyrics: writtenLyrics.lyrics, title: data.music?.title?.trim() || writtenLyrics.title, style: data.music?.style?.trim() || writtenLyrics.style };
    }
    const built = buildMediaInput(spec, data.prompt, data.aspectRatio, data.duration === undefined ? MEDIA_VIDEO_SECONDS : clampVideoSeconds(data.duration), music);
    if (editing) {
      // The source must be a finished image of this account, still within its 14-day retention.
      const { data: source } = await context.supabase.from("media_generations")
        .select("id,kind,status,aspect_ratio,archived_paths,expires_at,result_urls").eq("id", data.sourceId!).eq("owner_id", context.userId).maybeSingle();
      if (!source || source.kind !== "image" || source.status !== "success") throw new Error("Image à modifier introuvable.");
      const { signedMediaUrls } = await import("@/lib/media-archive.server");
      const expired = !!source.expires_at && new Date(source.expires_at).getTime() < Date.now();
      const original = Array.isArray(source.result_urls) ? (source.result_urls as unknown[]).filter((u): u is string => typeof u === "string") : [];
      const urls = expired ? [] : (await signedMediaUrls(source)) ?? original;
      if (!urls.length) throw new Error("Cette image n’est plus disponible (conservation 14 jours).");
      built.input["image_urls"] = [urls[0]];
      built.input["output_format"] = "png";
      if (["1:1", "16:9", "9:16", "4:3", "3:4"].includes(source.aspect_ratio)) built.input["aspect_ratio"] = source.aspect_ratio;
    }
    const aspectRatio = built.ratio;
    const reserve = mediaReserve(spec, built.duration ?? 5);
    const { assertNotSuspended } = await import("@/lib/credits.server");
    await assertNotSuspended(context.userId);
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
    // Music: whether the lyrics come from the user (or there are none), for the album card (migration 0054).
    if (data.kind === "music") {
      const meta = { ownLyrics, instrumental: wantsInstrumental, title: music?.title?.trim() || null, ...(writtenLyrics ? { lyrics: writtenLyrics.lyrics, tags: writtenLyrics.style } : {}) };
      await supabaseAdmin.from("media_generations").update({ result_meta: meta } as never).eq("id", row.id).then(() => undefined, () => undefined);
    }
    const part = { type: "data-media", data: { id: row.id, kind: data.kind, model: spec.label, prompt: data.prompt, ratio: aspectRatio, status: "waiting", progress: null, urls: [], error: null } };
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
      .select("id,task_id,status,kind,model,prompt,aspect_ratio,result_urls,error,archived_paths,expires_at").eq("id", data.id).eq("owner_id", context.userId).single();
    if (error || !row) throw new Error("Création introuvable.");
    if (["success", "fail"].includes(row.status)) {
      // Serve archived copies (14-day retention) through short-lived signed URLs when available.
      const { signedMediaUrls } = await import("@/lib/media-archive.server");
      const archived = await signedMediaUrls(row);
      // Past the 14-day retention the files are gone: say so instead of serving dead provider links.
      const expired = row.status === "success" && !!row.expires_at && new Date(row.expires_at).getTime() < Date.now();
      const urls = expired ? [] : archived ?? (row.status === "success" ? row.result_urls : []);
      const meta = row.kind === "music" ? await musicMeta(row.id) : null;
      const done = { id: row.id, kind: row.kind, model: mediaLabel(row.model, row.kind), prompt: row.prompt, ratio: row.aspect_ratio, status: row.status, urls, error: row.error, expired, ...(meta ? { meta } : {}) };
      if (archived?.length || expired) {
        await context.supabase.from("chat_messages").update({ parts: [{ type: "data-media", data: done }] })
          .eq("thread_id", data.threadId).eq("sdk_id", row.id);
      }
      return done;
    }
    const result = await kie(`recordInfo?taskId=${encodeURIComponent(row.task_id)}`);
    const state = result["state"];
    if (typeof state !== "string" || !["waiting", "queuing", "generating", "success", "fail"].includes(state)) throw new Error("État de création inconnu.");
    const reportedProgress = result["progress"];
    // kie.ai only reports a percentage for some models; never invent one for models without it.
    const progress = typeof reportedProgress === "number" && Number.isFinite(reportedProgress) && reportedProgress >= 0 && reportedProgress <= 100
      ? Math.round(reportedProgress) : null;
    let urls: string[] = [];
    let musicFound: MusicMeta | null = null;
    if (state === "success" && typeof result["resultJson"] === "string") {
      try {
        // Images/videos: { resultUrls: [...] }; music (Suno): { data: [{ audio_url, ... }] }.
        const parsed = JSON.parse(result["resultJson"]) as { resultUrls?: unknown; data?: Record<string, unknown>[] };
        const found = Array.isArray(parsed.resultUrls) ? parsed.resultUrls : Array.isArray(parsed.data) ? parsed.data.map((track) => track?.["audio_url"]) : [];
        urls = found.filter((url): url is string => typeof url === "string" && /^https:\/\//i.test(url));
        // Suno always returns two takes for the price of one request; TechNova keeps a single song, with its cover.
        if (row.kind === "music") {
          urls = urls.slice(0, 1);
          const take = Array.isArray(parsed.data) ? parsed.data[0] : undefined;
          const cover = take?.["image_url"] ?? take?.["imageUrl"];
          if (urls.length && typeof cover === "string" && /^https:\/\//i.test(cover)) urls.push(cover);
          if (take) musicFound = {
            title: typeof take["title"] === "string" ? take["title"].slice(0, 120) : null,
            lyrics: typeof take["prompt"] === "string" ? take["prompt"].slice(0, 6000) : null,
            tags: typeof take["tags"] === "string" ? take["tags"].slice(0, 200) : null,
            duration: typeof take["duration"] === "number" ? Math.round(take["duration"]) : null,
          };
        }
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
    // Real provider cost of the task (kie.ai credits, USD 0.005 each) for the admin consumption chart; the column
    // comes with migration 0046, so a failure here is ignored.
    const consumed = Number(result["creditsConsumed"]);
    if ((state === "success" || state === "fail") && Number.isFinite(consumed) && consumed >= 0) {
      await supabaseAdmin.from("media_generations").update({ provider_credits: consumed } as never).eq("id", row.id);
    }
    if (state === "success" || state === "fail") {
      // Settle once: the conditional update guarantees a single refund even with concurrent polls.
      const { data: claimed } = await supabaseAdmin.from("media_generations").update({ settled: true })
        .eq("id", row.id).eq("settled", false).select("reserved_credits");
      const reserved = claimed?.[0]?.reserved_credits ?? 0;
      if (claimed?.length && reserved > 0) {
        // Fixed price: a success costs what was reserved, a failure is fully refunded.
        const charged = state === "fail" ? 0 : reserved;
        await supabaseAdmin.from("media_generations").update({ charged_credits: charged }).eq("id", row.id);
        if (charged > 0) await supabaseAdmin.from("usage_logs").insert({ owner_id: context.userId, model: `Média · ${mediaLabel(row.model, row.kind)}`, input_tokens: 0, output_tokens: 0, credits: charged, latency_ms: 0 });
        if (reserved - charged > 0) await supabaseAdmin.from("credit_transactions").insert({
          owner_id: context.userId, amount: reserved - charged, kind: "refund",
          label: `${mediaLabel(row.model, row.kind)} (${state === "fail" ? "échec remboursé" : "ajustement"})`,
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
    let meta: MusicMeta | null = null;
    if (row.kind === "music" && state === "success") {
      meta = { ...(await musicMeta(row.id) ?? {}), ...(musicFound ?? {}) };
      if (musicFound) await supabaseAdmin.from("media_generations").update({ result_meta: meta } as never).eq("id", row.id).then(() => undefined, () => undefined);
    }
    const media = { id: row.id, kind: row.kind, model: mediaLabel(row.model, row.kind), prompt: row.prompt, ratio: row.aspect_ratio, status: state, progress, urls, error: state === "fail" ? String(result["failMsg"] || "La création a échoué.") : null, ...(meta ? { meta } : {}) };
    const { error: partError } = await context.supabase.from("chat_messages").update({ parts: [{ type: "data-media", data: media }] })
      .eq("thread_id", data.threadId).eq("sdk_id", row.id);
    if (partError) throw new Error(partError.message);
    return media;
  });