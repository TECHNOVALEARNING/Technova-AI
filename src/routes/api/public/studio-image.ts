import { createFileRoute } from "@tanstack/react-router";
import { imageInfo } from "@/lib/studio-images.server";

export const Route = createFileRoute("/api/public/studio-image")({
  server: { handlers: { GET: async ({ request }) => {
    const title = new URL(request.url).searchParams.get("file") ?? "";
    if (!/^File:[^<>]{5,180}\.(?:jpe?g|png|webp)$/i.test(title)) return new Response("Not found", { status: 404 });
    const info = await imageInfo(title).catch(() => null);
    if (!info) return new Response("Not found", { status: 404 });
    const photo = await fetch(info.url);
    if (!photo.ok || !photo.headers.get("content-type")?.startsWith("image/")) return new Response("Image unavailable", { status: 502 });
    return new Response(photo.body, { headers: { "Content-Type": photo.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } } },
});