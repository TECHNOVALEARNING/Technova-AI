import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AUDIO_CHUNK_MINUTES, AUDIO_FOLDER, AUDIO_MAX_MINUTES } from "@/lib/text-tools";

// "Résumé d'audio": the browser converts the recording to light MP3 pieces and uploads them here (private
// user-files bucket, owner folder). /api/audio-summary reads them once and deletes them.

const MAX_PIECES = Math.ceil(AUDIO_MAX_MINUTES / AUDIO_CHUNK_MINUTES);

/** One-time signed upload URLs for the pieces of one recording. */
export const createAudioUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pieces: z.number().int().min(1).max(MAX_PIECES), seconds: z.number().positive().max(AUDIO_MAX_MINUTES * 60 + 60) }).parse(d))
  .handler(async ({ data, context }) => {
    await (await import("@/lib/org.server")).requireOrgFeature(context.userId, "audio");
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "files"))) throw new Error("rate_limited");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { FILES_BUCKET } = await import("@/lib/files.server");
    const id = crypto.randomUUID();
    const uploads: { path: string; token: string }[] = [];
    for (let i = 0; i < data.pieces; i++) {
      const path = `${context.userId}/${AUDIO_FOLDER}/${id}/${i}.mp3`;
      const { data: signed, error } = await supabaseAdmin.storage.from(FILES_BUCKET).createSignedUploadUrl(path);
      if (error || !signed) throw new Error("could_not_sign");
      uploads.push({ path, token: signed.token });
    }
    return { uploads };
  });
