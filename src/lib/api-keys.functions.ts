import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ name: z.string().trim().min(1).max(60) }).parse(data))
  .handler(async ({ data, context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const secret = "tn_live_" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_keys").insert({ owner_id: context.userId, name: data.name, prefix: secret.slice(0, 14), key_hash: hash });
    if (error) throw new Error("Could not create key");
    return { secret };
  });
