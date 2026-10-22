import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/studio-preview/$token")({
  server: { handlers: { GET: async ({ params }) => {
    const token = z.string().uuid().safeParse(params.token);
    if (!token.success) return new Response("Not found", { status: 404 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("studio_previews").select("title,files").eq("token", token.data).maybeSingle();
    if (!data) return new Response("Not found", { status: 404 });
    return Response.json({ title: data.title, files: data.files }, { headers: { "Cache-Control": "no-store" } });
  } } },
});