import { createFileRoute } from "@tanstack/react-router";
import { SITE_SLUG_RE } from "@/lib/connectors";

// Public read-only: returns only the published files for one slug.
export const Route = createFileRoute("/api/public/site/$slug")({
  server: { handlers: { GET: async ({ params }) => {
    if (!SITE_SLUG_RE.test(params.slug)) return new Response("Not found", { status: 404 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("published_sites").select("title,files").eq("slug", params.slug).maybeSingle();
    if (!data) return new Response("Not found", { status: 404 });
    return Response.json({ title: data.title, files: data.files }, { headers: { "Cache-Control": "public, max-age=30" } });
  } } },
});
