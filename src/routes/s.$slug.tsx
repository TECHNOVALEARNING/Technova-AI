import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { previewDoc, resolvePreviewPage, type StudioFile } from "@/lib/studio";

export const Route = createFileRoute("/s/$slug")({
  head: ({ params }) => ({ meta: [
    { title: `${params.slug} | Créé avec TechNova` },
    { name: "description", content: "Site publié avec TechNova AI Hub." },
    { property: "og:title", content: `${params.slug} | Créé avec TechNova` },
    { property: "og:description", content: "Site publié avec TechNova AI Hub." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PublishedSite,
});

function PublishedSite() {
  const { slug } = Route.useParams();
  const [site, setSite] = useState<{ title: string; files: StudioFile[] } | null>(null);
  const [page, setPage] = useState("index.html");
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let on = true;
    fetch(`/api/public/site/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => on && setSite(d)).catch(() => on && setMissing(true));
    return () => { on = false; };
  }, [slug]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!site || e.data?.type !== "technova-preview-navigate") return;
      if (e.source !== document.querySelector<HTMLIFrameElement>("iframe[data-site]")?.contentWindow) return;
      const next = resolvePreviewPage(site.files, page, String(e.data.path ?? ""));
      if (next) setPage(next);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [site, page]);
  const doc = useMemo(() => (site ? previewDoc(site.files, page) : null), [site, page]);
  if (missing) return <main className="grid h-svh place-items-center bg-background p-6 text-center text-foreground"><div><h1 className="font-display text-2xl font-semibold">Site introuvable</h1><p className="mt-2 text-sm text-muted-foreground">Ce site n’existe pas ou a été dépublié.</p></div></main>;
  return <div className="h-svh w-full bg-background">
    {doc ? <iframe key={page} data-site title={site?.title || slug} sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={doc} className="h-full w-full border-0" /> : <p className="pt-12 text-center text-sm text-muted-foreground">Chargement…</p>}
    <a href="/" className="fixed bottom-3 right-3 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur hover:text-foreground">Créé avec TECHNOVA</a>
  </div>;
}
