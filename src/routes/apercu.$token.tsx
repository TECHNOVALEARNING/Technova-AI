import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { previewDoc, resolvePreviewPage, type StudioFile } from "@/lib/studio";

export const Route = createFileRoute("/apercu/$token")({
  head: () => ({ meta: [
    { title: "Aperçu de projet | TechNova AI Hub" },
    { name: "description", content: "Consultez un site partagé depuis TechNova Studio." },
    { property: "og:title", content: "Aperçu de projet | TechNova AI Hub" },
    { property: "og:description", content: "Un site créé avec TechNova Studio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PublicPreview,
});

function PublicPreview() {
  const { token } = Route.useParams();
  const [project, setProject] = useState<{ title: string; files: StudioFile[] } | null>(null);
  const [page, setPage] = useState("index.html");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [error, setError] = useState("");
  useEffect(() => { let active = true; fetch(`/api/public/studio-preview/${encodeURIComponent(token)}`).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => { if (active) setProject(data); }).catch(() => { if (active) setError("Aperçu introuvable ou indisponible."); }); return () => { active = false; }; }, [token]);
  const doc = useMemo(() => project ? previewDoc(project.files, page) : null, [project, page]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== document.querySelector<HTMLIFrameElement>('iframe[data-public-preview]')?.contentWindow || event.data?.type !== "technova-preview-navigate" || !project) return;
      const next = resolvePreviewPage(project.files, page, String(event.data.path ?? ""));
      if (next) { setPage(next); setError(""); } else setError("Cette page n’a pas été générée.");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [project, page]);
  return <div className="flex h-svh flex-col bg-background text-foreground">
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-5"><Button asChild variant="ghost" size="icon-sm"><Link to="/" aria-label="TechNova"><ArrowLeft className="size-4" /></Link></Button><span className="min-w-0 truncate text-sm font-medium">{project?.title ?? "TechNova Studio"} · {page}</span><div className="flex gap-0.5">{(["desktop", "tablet", "mobile"] as const).map((mode) => { const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone; return <Button key={mode} size="icon-sm" variant={device === mode ? "secondary" : "ghost"} aria-label={mode === "desktop" ? "PC" : mode === "tablet" ? "Tablette" : "Mobile"} aria-pressed={device === mode} onClick={() => setDevice(mode)}><Icon className="size-4" /></Button>; })}</div></header>
    {error && <p role="alert" className="border-b border-border px-4 py-2 text-center text-sm text-destructive">{error}</p>}
     <main className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/40">{doc ? <iframe key={page} data-public-preview title={project?.title ?? "Aperçu"} sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={doc} className={`h-full shrink-0 border-0 bg-background ${device === "mobile" ? "w-[390px]" : device === "tablet" ? "w-[768px]" : "w-full"}`} /> : !error && <p className="pt-12 text-sm text-muted-foreground">Chargement…</p>}</main>
  </div>;
}