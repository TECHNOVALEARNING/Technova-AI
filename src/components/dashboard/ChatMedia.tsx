import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ThinkingLine } from "./ThinkingSpinner";
import { AlertCircle, Download, Loader2, Pencil, X } from "lucide-react";

export type ChatMediaData = {
  id: string;
  kind: "image" | "video" | "music";
  model?: string;
  prompt: string;
  /** Requested aspect ratio ("16:9", "9:16", "1:1"…): the frame in progress takes the shape of the coming image. */
  ratio?: string | null;
  status: string;
  progress?: number | null;
  urls: string[];
  error: string | null;
  /** True once the 14-day retention has ended and the files were deleted. */
  expired?: boolean;
};

const copyFor = (kind: ChatMediaData["kind"], fr: boolean) => ({
  image: { creating: fr ? "Création de l’image" : "Creating image", label: "Image" },
  video: { creating: fr ? "Création de la vidéo" : "Creating video", label: fr ? "Vidéo" : "Video" },
  music: { creating: fr ? "Création de la musique" : "Creating music", label: fr ? "Musique" : "Music" },
})[kind];

/** Even field of blue dots with a slow wave of light running through it (canvas, follows light/dark). */
function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (time: number) => {
      const t = time / 1000;
      const dark = document.documentElement.classList.contains("dark");
      ctx.clearRect(0, 0, w, h);
      const gap = 15, pad = 12;
      const cx = w * (0.5 + 0.3 * Math.sin(t * 0.32)), cy = h * (0.5 + 0.25 * Math.cos(t * 0.27)), r = Math.min(w, h) * 0.35;
      for (let gy = pad; gy <= h - pad; gy += gap) {
        for (let gx = pad; gx <= w - pad; gx += gap) {
          // Each dot sways on a slow wave, so the whole field visibly moves.
          const x = gx + 2.6 * Math.sin(t * 1.1 + gy * 0.045 + gx * 0.012);
          const y = gy + 2.6 * Math.cos(t * 0.9 + gx * 0.045 - gy * 0.01);
          const glow = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (r * r)) * (0.8 + 0.2 * Math.sin(t * 2 + x * 0.3 + y * 0.4));
          const alpha = (dark ? 0.32 : 0.5) + (dark ? 0.55 : 0.45) * glow;
          ctx.fillStyle = dark ? `rgba(${110 + 40 * glow},${140 + 50 * glow},255,${alpha})` : `rgba(${100 - 40 * glow},${135 - 35 * glow},${215 + 30 * glow},${alpha})`;
          ctx.beginPath(); ctx.arc(x, y, 1.35 + 0.5 * glow, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (!still) frame = requestAnimationFrame(draw);
    };
    resize();
    const observer = new ResizeObserver(() => { resize(); if (still) draw(0); });
    observer.observe(canvas);
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function GenerationStage({ data, lang }: { data: ChatMediaData; lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const text = copyFor(data.kind, fr);
  const progress = typeof data.progress === "number" && Number.isFinite(data.progress) && data.progress >= 0 && data.progress <= 100 ? Math.round(data.progress) : null;
  // Real progress when the service reports it; otherwise the time spent so far (never an invented percentage).
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const start = Date.now(); const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000); return () => window.clearInterval(id); }, []);
  const badge = progress !== null ? `${progress} %` : elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min ${String(elapsed % 60).padStart(2, "0")}`;
  // Same frame as the coming image or video: its requested ratio, up to 520 px wide and 520 px high.
  const [rw, rh] = data.kind === "music" ? [16, 7] : (/^(\d+):(\d+)$/.exec(data.ratio ?? "") ?? ["", data.kind === "video" ? "16" : "1", data.kind === "video" ? "9" : "1"]).slice(1).map(Number) as [number, number];
  const frameWidth = Math.min(520, Math.round((520 * rw) / rh));
  return <div className="flex w-full flex-col gap-3" style={{ maxWidth: frameWidth }}>
    <ThinkingLine fr={fr} />
    <div role="img" aria-label={`${text.creating}${progress === null ? "" : ` — ${progress} %`}`} className="relative w-full overflow-hidden rounded-2xl bg-[#f7f7f8] dark:bg-[#0a0a0c]" style={{ aspectRatio: `${rw} / ${rh}` }}>
      <DotField />
      <span className="absolute bottom-3 right-3 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[15px] font-medium tabular-nums text-[#1f5fbf] shadow-md dark:border-white/10 dark:bg-white/10 dark:text-[#7aa7ff]">{badge}</span>
    </div>
  </div>;
}

/** Saves the file under a readable name; falls back to opening it when the host refuses a direct download. */
async function downloadFile(url: string, kind: ChatMediaData["kind"], id: string, index: number) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg").replace("mpeg", "mp3").split(";")[0] || (kind === "video" ? "mp4" : kind === "music" ? "mp3" : "png");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `technova-${kind}-${id.slice(0, 8)}${index ? `-${index + 1}` : ""}.${ext}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label}
    className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
    {children}
  </button>;
}

/** A generated image, video or song shown bare in the conversation, like a ChatGPT reply, with download and edit actions. */
export function ChatMedia({ data, lang, onBroken, onEdit }: { data: ChatMediaData; lang: "fr" | "en"; onBroken?: (id: string) => void; onEdit?: (media: ChatMediaData, url: string) => void }) {
  const fr = lang === "fr";
  // A link that stops loading (signed link expired) asks once for a fresh one.
  const retried = useRef(new Set<string>());
  const broken = (url: string) => { if (retried.current.has(url)) return; retried.current.add(url); onBroken?.(data.id); };
  const [saving, setSaving] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const urls = Array.isArray(data.urls) ? data.urls.filter((url) => typeof url === "string" && url.startsWith("https://")) : [];
  const pending = !["success", "fail"].includes(data.status);
  if (pending) return <div className="my-2 w-full"><GenerationStage data={data} lang={lang} /></div>;
  if (data.status !== "success" || !urls.length) {
    return <p className="my-2 flex items-start gap-2 text-sm text-muted-foreground">
      <AlertCircle className={`mt-0.5 size-4 shrink-0 ${data.status === "fail" ? "text-destructive" : ""}`} />
      {data.status === "fail" ? (data.error || (fr ? "La création a échoué." : "Generation failed."))
        : data.expired ? (fr ? "Ce fichier a été supprimé : les créations sont conservées 14 jours. Pensez à les télécharger." : "This file was deleted: creations are kept for 14 days. Remember to download them.")
        : (fr ? "Aucun fichier n’a été renvoyé." : "No file was returned.")}
    </p>;
  }
  const label = copyFor(data.kind, fr).label;
  return <div className="my-2 flex w-full max-w-[520px] flex-col gap-4">
    {urls.map((url, index) => <figure key={url} className="m-0">
      {data.kind === "music"
        ? <audio src={url} controls preload="metadata" className="w-full" onError={() => broken(url)} />
        : data.kind === "video"
          ? <video src={url} controls playsInline preload="metadata" className="max-h-[520px] w-full rounded-2xl bg-black object-contain" onError={() => broken(url)} />
          : <button type="button" onClick={() => setZoomed(url)} aria-label={fr ? "Agrandir l’image" : "Enlarge image"} className="block cursor-zoom-in rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <img src={url} alt={`${label} ${index + 1}`} className="max-h-[520px] w-auto max-w-full rounded-2xl" onError={() => broken(url)} />
            </button>}
      <figcaption className="mt-1.5 flex items-center gap-0.5">
        <IconAction label={fr ? "Télécharger" : "Download"} onClick={() => { setSaving(url); void downloadFile(url, data.kind, data.id, index).finally(() => setSaving(null)); }}>
          {saving === url ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{fr ? "Télécharger" : "Download"}
        </IconAction>
        {data.kind === "image" && onEdit && <IconAction label={fr ? "Modifier l’image" : "Edit image"} onClick={() => onEdit(data, url)}>
          <Pencil className="size-4" />{fr ? "Modifier" : "Edit"}
        </IconAction>}
      </figcaption>
    </figure>)}
    {zoomed && <ImageViewer url={zoomed} alt={label} fr={fr} onClose={() => setZoomed(null)} onDownload={() => void downloadFile(zoomed, data.kind, data.id, urls.indexOf(zoomed))} />}
  </div>;
}

/** Full-screen view of a generated image, like other AI apps: click outside or press Esc to close. */
function ImageViewer({ url, alt, fr, onClose, onDownload }: { url: string; alt: string; fr: boolean; onClose: () => void; onDownload: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);
  // Rendered on <body> so it covers the whole dashboard (sidebar included).
  return createPortal(<div role="dialog" aria-modal="true" aria-label={alt} onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
    <div className="absolute right-4 top-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onDownload} aria-label={fr ? "Télécharger" : "Download"} title={fr ? "Télécharger" : "Download"} className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"><Download className="size-5" /></button>
      <button type="button" onClick={onClose} autoFocus aria-label={fr ? "Fermer" : "Close"} title={fr ? "Fermer" : "Close"} className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"><X className="size-5" /></button>
    </div>
    <img src={url} alt={alt} onClick={(e) => e.stopPropagation()} className="max-h-[92svh] max-w-[94vw] cursor-default rounded-xl object-contain shadow-2xl" />
  </div>, document.body);
}
