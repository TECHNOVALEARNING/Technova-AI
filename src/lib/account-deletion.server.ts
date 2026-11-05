// Server-only: deletes accounts whose 30-day grace period has ended (called by the daily purge).
// Stored files are removed first (storage is not cleaned by the database cascade), then the auth user,
// which cascades to profiles, conversations, credits and every other owner-scoped table.

export async function purgeDeletedAccounts(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: due } = await supabaseAdmin.from("account_deletions")
    .select("user_id").lt("purge_after", new Date().toISOString()).limit(20);
  let purged = 0;
  for (const { user_id: userId } of due ?? []) {
    try {
      const { data: files } = await supabaseAdmin.from("files").select("storage_path").eq("owner_id", userId);
      const filePaths = (files ?? []).map((f) => f.storage_path).filter((p): p is string => typeof p === "string" && p.length > 0);
      for (let i = 0; i < filePaths.length; i += 100) await supabaseAdmin.storage.from("user-files").remove(filePaths.slice(i, i + 100));
      const { data: media } = await supabaseAdmin.from("media_generations").select("archived_paths").eq("owner_id", userId);
      const mediaPaths = (media ?? []).flatMap((m) => (Array.isArray(m.archived_paths) ? m.archived_paths : [])).filter((p): p is string => typeof p === "string");
      for (let i = 0; i < mediaPaths.length; i += 100) await supabaseAdmin.storage.from("media-files").remove(mediaPaths.slice(i, i + 100));
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) { console.error("account purge", userId, error.message); continue; }
      purged += 1;
    } catch (e) {
      console.error("account purge", userId, e instanceof Error ? e.message : e);
    }
  }
  return purged;
}
