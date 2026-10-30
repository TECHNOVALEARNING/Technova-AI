import { useRef, useState, type ReactNode } from "react";
import { AlertCircle, Download, Film, Image as ImageIcon, Loader2, Music, Pencil, Play } from "lucide-react";

export type ChatMediaData = {
  id: string;
  kind: "image" | "video" | "music";
  model?: string;
  prompt: string;
  status: string;
  progress?: number | null;
  urls: string[];
  error: string | null;
  /** True once the 14-day retention has ended and the files were deleted. */
  expired?: boolean;
};

const dots = Array.from({ length: 19 * 11 }, (_, index) => {
  const x = index % 19;
  const y = Math.floor(index / 19);
  const center = Math.exp(-(((x - 9) / 6.8) ** 2 + ((y - 5) / 3.9) ** 2));
  const ripple = (Math.sin(x * .84 + y * .7) + 1) / 2;
  return Math.max(.13, Math.min(1, center * (.5 + ripple * .5)));
});

const copyFor = (kind: ChatMediaData["kind"], fr: boolean) => ({
  image: { title: fr ? "Génération d’image" : "Image generation", step: fr ? "Création de votre image" : "Creating your image", shaping: fr ? "Votre image prend forme" : "Your image is taking shape", label: "Image" },
  video: { title: fr ? "Génération vidéo" : "Video generation", step: fr ? "Composition de la séquence" : "Composing your scene", shaping: fr ? "Votre vidéo prend forme" : "Your video is taking shape", label: fr ? "Vidéo" : "Video" },
  music: { title: fr ? "Génération musicale" : "Music generation", step: fr ? "Composition de votre morceau" : "Composing your track", shaping: fr ? "Votre morceau prend forme (environ 1 min)" : "Your track is taking shape (about 1 min)", label: fr ? "Musique" : "Music" },
})[kind];

function KindIcon({ kind, className }: { kind: ChatMediaData["kind"]; className: string }) {
  return kind === "video" ? <Film className={className} /> : kind === "music" ? <Music className={className} /> : <ImageIcon className={className} />;
}

function GenerationStage({ data, lang }: { data: ChatMediaData; lang: "fr" | "en" }) {
  const isVideo = data.kind === "video";
  const text = copyFor(data.kind, lang === "fr");
  const progress = typeof data.progress === "number" && Number.isFinite(data.progress) && data.progress >= 0 && data.progress <= 100 ? data.progress : null;
  const step = data.status === "waiting" || data.status === "queuing" ? (lang === "fr" ? "En attente de démarrage" : "Waiting to start") :
    text.step;
  return <div className="media-generation" role="status" aria-label={`${step}${progress == null ? "" : ` — ${progress}%`}`}>
    <div className="media-generation-top">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="media-generation-icon"><KindIcon kind={data.kind} className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">{text.title}</p>
          <p className="text-[10px] text-muted-foreground">{data.model ? `${data.model} · ` : ""}{step}</p>
        </div>
      </div>
      <span className="media-generation-live"><span className="media-generation-live-dot" />{lang === "fr" ? "EN COURS" : "IN PROGRESS"}</span>
    </div>
    <div className={`media-generation-canvas ${isVideo ? "media-generation-video" : "media-generation-image"}`} aria-hidden="true">
      {isVideo ? <>
        <div className="media-generation-video-frame">
          <span className="media-generation-corner media-generation-corner-tl" /><span className="media-generation-corner media-generation-corner-tr" />
          <span className="media-generation-corner media-generation-corner-bl" /><span className="media-generation-corner media-generation-corner-br" />
          <div className="media-generation-video-orbit"><Play className="size-6 fill-current" /></div>
          <div className="media-generation-video-scan" />
        </div>
        <div className="media-generation-filmstrip">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 130}ms` }} />)}</div>
      </> : <div className="media-generation-dots">{dots.map((strength, i) => <span key={i} style={{ opacity: strength, transform: `scale(${.4 + strength * .6})`, animationDelay: `${(i % 19) * 28 + Math.floor(i / 19) * 38}ms` }} />)}</div>}
    </div>
    <div className="media-generation-bottom">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{text.shaping}</span>
        {progress !== null && <span className="tabular-nums font-semibold text-chat-glow">{progress}%</span>}
      </div>
      <div className={`media-generation-track ${progress === null ? "media-generation-track-indeterminate" : ""}`} role={progress === null ? undefined : "progressbar"} aria-valuenow={progress ?? undefined} aria-valuemin={progress === null ? undefined : 0} aria-valuemax={progress === null ? undefined : 100} aria-label={lang === "fr" ? "Progression" : "Progress"}>
        <span style={progress === null ? undefined : { width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{progress === null ? (lang === "fr" ? "Le temps de création varie selon la demande · progression non communiquée" : "Creation time varies · progress not reported") : (lang === "fr" ? "Progression communiquée par le service de génération" : "Progress reported by the generation service")}</p>
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
  const urls = Array.isArray(data.urls) ? data.urls.filter((url) => typeof url === "string" && url.startsWith("https://")) : [];
  const pending = !["success", "fail"].includes(data.status);
  if (pending) return <div className="my-2 w-full max-w-[490px] overflow-hidden rounded-md border border-border bg-card shadow-soft"><GenerationStage data={data} lang={lang} /></div>;
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
          : <img src={url} alt={`${label} ${index + 1}`} className="max-h-[520px] w-auto max-w-full rounded-2xl" onError={() => broken(url)} />}
      <figcaption className="mt-1.5 flex items-center gap-0.5">
        <IconAction label={fr ? "Télécharger" : "Download"} onClick={() => { setSaving(url); void downloadFile(url, data.kind, data.id, index).finally(() => setSaving(null)); }}>
          {saving === url ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{fr ? "Télécharger" : "Download"}
        </IconAction>
        {data.kind === "image" && onEdit && <IconAction label={fr ? "Modifier l’image" : "Edit image"} onClick={() => onEdit(data, url)}>
          <Pencil className="size-4" />{fr ? "Modifier" : "Edit"}
        </IconAction>}
      </figcaption>
    </figure>)}
  </div>;
}
