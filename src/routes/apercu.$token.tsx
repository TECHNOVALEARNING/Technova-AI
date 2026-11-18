import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { escapedPreviewPath, previewDoc, resolvePreviewPage, type StudioFile } from "@/lib/studio";

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
  const [error, setError] = useState("");
  useEffect(() => { let active = true; fetch(`/api/public/studio-preview/${encodeURIComponent(token)}`).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => { if (active) setProject(data); }).catch(() => { if (active) setError("Aperçu introuvable ou indisponible."); }); return () => { active = false; }; }, [token]);
  const doc = useMemo(() => project ? previewDoc(project.files, page) : null, [project, page]);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const escaped = event.data?.type === "technova-preview-escape";
      if (event.source !== document.querySelector<HTMLIFrameElement>('iframe[data-public-preview]')?.contentWindow || (event.data?.type !== "technova-preview-navigate" && !escaped) || !project) return;
      const next = resolvePreviewPage(project.files, page, escaped ? escapedPreviewPath(String(event.data.href ?? "")) : String(event.data.path ?? ""));
      if (escaped) setReload((n) => n + 1);
      if (next) { setPage(next); setError(""); } else setError("Cette page n’a pas été générée.");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [project, page]);
  // The person who receives the link sees the site alone, full screen, like a real website: no TechNova bar,
  // no conversation title, no device buttons (their own screen decides the layout).
  useEffect(() => { if (project?.title) document.title = project.title; }, [project?.title]);
  return <div className="h-svh w-full bg-background text-foreground">
    {doc ? <iframe key={`${page}-${reload}`} data-public-preview title={project?.title ?? "Aperçu"} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox" srcDoc={doc} className="h-full w-full border-0" />
      : <p className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">{error || "Chargement…"}</p>}
    {doc && error && <p role="alert" className="fixed inset-x-0 bottom-4 mx-auto w-fit max-w-[90vw] rounded-full bg-foreground px-4 py-2 text-center text-xs text-background shadow-lg">{error}</p>}
  </div>;
}