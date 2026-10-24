import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkFile } from "@/lib/file-types";

// Files and knowledge bases: the browser never writes these tables; every change goes through here.

async function limited(userId: string, bucket: "files" | "knowledge") {
  const { hitRateLimit } = await import("@/lib/security.server");
  if (!(await hitRateLimit(userId, bucket))) throw new Error("rate_limited");
}

/** Step 1 (UPLOAD): registers the file and returns a one-time signed upload URL for the private bucket. */
export const createFileUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    filename: z.string().trim().min(1).max(255),
    size: z.number().int().positive(),
    mime: z.string().max(120).default(""),
    origin: z.enum(["chat", "knowledge"]),
    knowledgeBaseId: z.string().uuid().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    await limited(context.userId, "files");
    const check = checkFile(data.filename, data.size);
    if (!check.ok) throw new Error(`file_${check.reason}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { FILES_BUCKET } = await import("@/lib/files.server");
    if (data.knowledgeBaseId) {
      const { data: kb } = await supabaseAdmin.from("knowledge_bases").select("id").eq("id", data.knowledgeBaseId).eq("owner_id", context.userId).maybeSingle();
      if (!kb) throw new Error("not_found");
    }
    const id = crypto.randomUUID();
    const safeName = data.filename.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(-120);
    const path = `${context.userId}/${id}/${safeName}`;
    const { error } = await supabaseAdmin.from("files").insert({
      id, owner_id: context.userId, storage_path: path, filename: data.filename, ext: check.ext, mime: data.mime || "application/octet-stream",
      size_bytes: data.size, kind: check.kind, origin: data.origin,
    });
    if (error) throw new Error("could_not_register");
    await supabaseAdmin.from("file_processing_jobs").insert({ file_id: id, owner_id: context.userId, stage: "upload", status: "queued" });
    if (data.knowledgeBaseId) await supabaseAdmin.from("knowledge_sources").insert({ knowledge_base_id: data.knowledgeBaseId, file_id: id, owner_id: context.userId });
    const { data: signed, error: signError } = await supabaseAdmin.storage.from(FILES_BUCKET).createSignedUploadUrl(path);
    if (signError || !signed) throw new Error("could_not_sign");
    return { fileId: id, path, token: signed.token, kind: check.kind };
  });

/** Steps 2–7: validate, scan, extract, chunk, embed and index. Safe to call again on a failed file. */
export const processUploadedFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ fileId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { processFile } = await import("@/lib/files.server");
    const result = await processFile(context.userId, data.fileId);
    if (!result) throw new Error("not_found");
    return { id: result.id, status: result.status, error: result.error };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ fileId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { FILES_BUCKET } = await import("@/lib/files.server");
    const { data: file } = await supabaseAdmin.from("files").select("id, storage_path").eq("id", data.fileId).eq("owner_id", context.userId).maybeSingle();
    if (!file) return { ok: true };
    await supabaseAdmin.storage.from(FILES_BUCKET).remove([file.storage_path]);
    await supabaseAdmin.from("files").delete().eq("id", file.id).eq("owner_id", context.userId);
    return { ok: true };
  });

export const createKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(500).default("") }).parse(data))
  .handler(async ({ data, context }) => {
    await limited(context.userId, "knowledge");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("knowledge_bases").select("id", { count: "exact", head: true }).eq("owner_id", context.userId);
    if ((count ?? 0) >= 50) throw new Error("too_many");
    const { data: kb, error } = await supabaseAdmin.from("knowledge_bases").insert({ owner_id: context.userId, name: data.name, description: data.description }).select("id").single();
    if (error || !kb) throw new Error("could_not_create");
    return { id: kb.id };
  });

export const updateKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80), description: z.string().trim().max(500).default("") }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("knowledge_bases").update({ name: data.name, description: data.description, updated_at: new Date().toISOString() }).eq("id", data.id).eq("owner_id", context.userId);
    return { ok: true };
  });

/** Deletes the base; its files are deleted too unless another base (or a chat) still uses them. */
export const deleteKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { FILES_BUCKET } = await import("@/lib/files.server");
    const { data: sources } = await supabaseAdmin.from("knowledge_sources").select("file_id").eq("knowledge_base_id", data.id).eq("owner_id", context.userId);
    await supabaseAdmin.from("knowledge_bases").delete().eq("id", data.id).eq("owner_id", context.userId);
    const ids = (sources ?? []).map((s) => s.file_id);
    if (ids.length) {
      const { data: stillUsed } = await supabaseAdmin.from("knowledge_sources").select("file_id").in("file_id", ids);
      const orphans = ids.filter((id) => !(stillUsed ?? []).some((s) => s.file_id === id));
      const { data: files } = orphans.length ? await supabaseAdmin.from("files").select("id, storage_path").eq("owner_id", context.userId).eq("origin", "knowledge").in("id", orphans) : { data: [] };
      if (files?.length) {
        await supabaseAdmin.storage.from(FILES_BUCKET).remove(files.map((f) => f.storage_path));
        await supabaseAdmin.from("files").delete().eq("owner_id", context.userId).in("id", files.map((f) => f.id));
      }
    }
    return { ok: true };
  });

/** Adds already-indexed files (for example chat files) to a base. */
export const addFilesToKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ knowledgeBaseId: z.string().uuid(), fileIds: z.array(z.string().uuid()).min(1).max(50) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: kb } = await supabaseAdmin.from("knowledge_bases").select("id").eq("id", data.knowledgeBaseId).eq("owner_id", context.userId).maybeSingle();
    if (!kb) throw new Error("not_found");
    const { data: files } = await supabaseAdmin.from("files").select("id").eq("owner_id", context.userId).in("id", data.fileIds);
    if (files?.length) await supabaseAdmin.from("knowledge_sources").upsert(files.map((f) => ({ knowledge_base_id: kb.id, file_id: f.id, owner_id: context.userId })), { onConflict: "knowledge_base_id,file_id", ignoreDuplicates: true });
    return { added: files?.length ?? 0 };
  });

export const removeKnowledgeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ knowledgeBaseId: z.string().uuid(), fileId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { FILES_BUCKET } = await import("@/lib/files.server");
    await supabaseAdmin.from("knowledge_sources").delete().eq("knowledge_base_id", data.knowledgeBaseId).eq("file_id", data.fileId).eq("owner_id", context.userId);
    const { count } = await supabaseAdmin.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("file_id", data.fileId);
    if (!count) {
      const { data: file } = await supabaseAdmin.from("files").select("id, storage_path").eq("id", data.fileId).eq("owner_id", context.userId).eq("origin", "knowledge").maybeSingle();
      if (file) { await supabaseAdmin.storage.from(FILES_BUCKET).remove([file.storage_path]); await supabaseAdmin.from("files").delete().eq("id", file.id); }
    }
    return { ok: true };
  });

/** "Rechercher": semantic search inside the user's bases, returned with scores. */
export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ query: z.string().trim().min(2).max(500), knowledgeBaseIds: z.array(z.string().uuid()).min(1).max(5) }).parse(data))
  .handler(async ({ data, context }) => {
    await limited(context.userId, "knowledge");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: kbs } = await supabaseAdmin.from("knowledge_bases").select("id").eq("owner_id", context.userId).in("id", data.knowledgeBaseIds);
    const { retrieve } = await import("@/lib/files.server");
    const hits = await retrieve({ ownerId: context.userId, query: data.query, kbIds: (kbs ?? []).map((k) => k.id), fileIds: [], k: 8, context: "search" });
    return hits.map((h) => ({ fileId: h.file_id, filename: h.filename, chunk: h.chunk_index + 1, score: Math.round(h.score * 100), excerpt: h.content.slice(0, 600) }));
  });
