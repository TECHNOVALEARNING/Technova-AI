// Server-only: archives kie.ai results into private storage for 14 days,
// serves them through short-lived signed URLs, and purges expired files.

const BUCKET = "media-files";
const KEEP_DAYS = 14;

function extFrom(url: string, contentType: string | null): string {
  const fromUrl = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (fromUrl && /^[a-z0-9]{2,5}$/.test(fromUrl)) return fromUrl;
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("mp4")) return "mp4";
  if (contentType?.includes("webm")) return "webm";
  return "jpg";
}

/** Downloads each result URL and stores it under media-files/<owner>/<id>/. Returns storage paths. */
export async function archiveMedia(ownerId: string, rowId: string, urls: string[]): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paths: string[] = [];
  for (const [index, url] of urls.entries()) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > 100 * 1024 * 1024) continue;
      const path = `${ownerId}/${rowId}/${index}.${extFrom(url, contentType)}`;
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
        contentType: contentType ?? "application/octet-stream",
        upsert: true,
      });
      if (!error) paths.push(path);
    } catch {
      // A source that cannot be fetched is simply not archived.
    }
  }
  if (paths.length) {
    const expires = new Date(Date.now() + KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("media_generations").update({ archived_paths: paths, expires_at: expires }).eq("id", rowId);
  }
  return paths;
}

/** Returns fresh signed URLs for archived files, or null when nothing is archived. Purges expired files lazily. */
export async function signedMediaUrls(row: { id: string; archived_paths: unknown; expires_at: string | null }): Promise<string[] | null> {
  const paths = Array.isArray(row.archived_paths) ? (row.archived_paths as unknown[]).filter((p): p is string => typeof p === "string") : [];
  if (!paths.length) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.storage.from(BUCKET).remove(paths);
    await supabaseAdmin.from("media_generations").update({ archived_paths: [] }).eq("id", row.id);
    return [];
  }
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, 3600);
  const urls = (data ?? []).map((entry) => entry.signedUrl).filter((u): u is string => typeof u === "string" && u.length > 0);
  return urls.length ? urls : null;
}

/** Deletes archived files whose retention period has ended. */
export async function purgeExpiredMedia(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin.from("media_generations")
    .select("id,archived_paths")
    .lt("expires_at", new Date().toISOString())
    .neq("archived_paths", "[]")
    .limit(200);
  let purged = 0;
  for (const row of rows ?? []) {
    const paths = Array.isArray(row.archived_paths) ? (row.archived_paths as unknown[]).filter((p): p is string => typeof p === "string") : [];
    if (paths.length) await supabaseAdmin.storage.from(BUCKET).remove(paths);
    await supabaseAdmin.from("media_generations").update({ archived_paths: [] }).eq("id", row.id);
    purged += 1;
  }
  return purged;
}
