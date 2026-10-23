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

const REASONS = [
  ["phishing", "Hameçonnage (vol d'identifiants)"],
  ["scam", "Arnaque / fausse boutique"],
  ["malware", "Logiciel malveillant"],
  ["illegal", "Contenu illégal ou choquant"],
  ["other", "Autre"],
] as const;

/** Public report form: 3 distinct reports suspend the site until an admin reviews it. */
function ReportButton({ slug, startOpen }: { slug: string; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("phishing");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  async function send() {
    setState("sending");
    const r = await fetch("/api/public/report-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, reason, details }) }).catch(() => null);
    setState(r?.ok ? "done" : "error");
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur hover:text-foreground">Signaler</button>;
  return <div role="dialog" aria-label="Signaler ce site" className="w-[min(320px,calc(100vw-24px))] rounded-2xl border border-border bg-card p-4 text-left text-sm text-foreground shadow-xl">
    {state === "done" ? <p>Merci, votre signalement a été transmis à l'équipe TechNova.</p> : <>
      <p className="font-semibold">Signaler ce site</p>
      <p className="mt-1 text-xs text-muted-foreground">Ce site a été créé par un utilisateur de TechNova. Ne saisissez jamais vos mots de passe ou codes sur un site dont vous doutez.</p>
      <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="mt-3 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" aria-label="Motif">
        {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="Détails (facultatif)" className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" />
      {state === "error" && <p className="mt-1 text-xs text-destructive">Envoi impossible. Réessayez plus tard.</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
        <button type="button" disabled={state === "sending"} onClick={() => void send()} className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-60">Envoyer</button>
      </div>
    </>}
  </div>;
}

function PublishedSite() {
  const { slug } = Route.useParams();
  const [site, setSite] = useState<{ title: string; files: StudioFile[] } | null>(null);
  const [page, setPage] = useState("index.html");
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "suspended">("loading");
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => { setReportOpen(new URLSearchParams(window.location.search).has("report")); }, []);
  useEffect(() => {
    let on = true;
    fetch(`/api/public/site/${encodeURIComponent(slug)}`)
      .then(async (r) => { if (r.status === 410) return on && setStatus("suspended"); if (!r.ok) throw new Error(); const d = await r.json(); if (on) { setSite(d); setStatus("ok"); } })
      .catch(() => on && setStatus("missing"));
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
  if (status === "missing") return <main className="grid h-svh place-items-center bg-background p-6 text-center text-foreground"><div><h1 className="font-display text-2xl font-semibold">Site introuvable</h1><p className="mt-2 text-sm text-muted-foreground">Ce site n’existe pas ou a été dépublié.</p></div></main>;
  if (status === "suspended") return <main className="grid h-svh place-items-center bg-background p-6 text-center text-foreground"><div><h1 className="font-display text-2xl font-semibold">Site suspendu</h1><p className="mt-2 max-w-md text-sm text-muted-foreground">Ce site a été signalé et suspendu par mesure de sécurité, le temps d’une vérification par l’équipe TechNova.</p></div></main>;
  return <div className="h-svh w-full bg-background">
    {doc ? <iframe key={page} data-site title={site?.title || slug} sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={doc} className="h-full w-full border-0" /> : <p className="pt-12 text-center text-sm text-muted-foreground">Chargement…</p>}
    <div className="fixed bottom-3 right-3 flex flex-col items-end gap-2">
      <ReportButton key={String(reportOpen)} slug={slug} startOpen={reportOpen} />
      <a href="/" className="rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur hover:text-foreground">Créé avec TECHNOVA</a>
    </div>
  </div>;
}
