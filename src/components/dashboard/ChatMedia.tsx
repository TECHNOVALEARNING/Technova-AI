import { Download, Film, Image as ImageIcon, Play, AlertCircle } from "lucide-react";

export type ChatMediaData = {
  id: string;
  kind: "image" | "video";
  model?: string;
  prompt: string;
  status: string;
  progress?: number | null;
  urls: string[];
  error: string | null;
};

const dots = Array.from({ length: 19 * 11 }, (_, index) => {
  const x = index % 19;
  const y = Math.floor(index / 19);
  const center = Math.exp(-(((x - 9) / 6.8) ** 2 + ((y - 5) / 3.9) ** 2));
  const ripple = (Math.sin(x * .84 + y * .7) + 1) / 2;
  return Math.max(.13, Math.min(1, center * (.5 + ripple * .5)));
});

function GenerationStage({ data, lang }: { data: ChatMediaData; lang: "fr" | "en" }) {
  const isVideo = data.kind === "video";
  const progress = typeof data.progress === "number" && Number.isFinite(data.progress) && data.progress >= 0 && data.progress <= 100 ? data.progress : null;
  const step = data.status === "waiting" || data.status === "queuing" ? (lang === "fr" ? "En attente de démarrage" : "Waiting to start") :
    isVideo ? (lang === "fr" ? "Composition de la séquence" : "Composing your scene") : (lang === "fr" ? "Création de votre image" : "Creating your image");
  return <div className="media-generation" role="status" aria-label={`${step}${progress == null ? "" : ` — ${progress}%`}`}>
    <div className="media-generation-top">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="media-generation-icon">{isVideo ? <Film className="size-4" /> : <ImageIcon className="size-4" />}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">{isVideo ? (lang === "fr" ? "Génération vidéo" : "Video generation") : (lang === "fr" ? "Génération d’image" : "Image generation")}</p>
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
        <span className="font-medium text-foreground">{isVideo ? (lang === "fr" ? "Votre vidéo prend forme" : "Your video is taking shape") : (lang === "fr" ? "Votre image prend forme" : "Your image is taking shape")}</span>
        {progress !== null && <span className="tabular-nums font-semibold text-chat-glow">{progress}%</span>}
      </div>
      <div className={`media-generation-track ${progress === null ? "media-generation-track-indeterminate" : ""}`} role={progress === null ? undefined : "progressbar"} aria-valuenow={progress ?? undefined} aria-valuemin={progress === null ? undefined : 0} aria-valuemax={progress === null ? undefined : 100} aria-label={lang === "fr" ? "Progression" : "Progress"}>
        <span style={progress === null ? undefined : { width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{progress === null ? (lang === "fr" ? "Le temps de création varie selon la demande · progression non communiquée" : "Creation time varies · progress not reported") : (lang === "fr" ? "Progression communiquée par le service de génération" : "Progress reported by the generation service")}</p>
    </div>
  </div>;
}

export function ChatMedia({ data, lang }: { data: ChatMediaData; lang: "fr" | "en" }) {
  const urls = Array.isArray(data.urls) ? data.urls.filter((url) => typeof url === "string" && url.startsWith("https://")) : [];
  const isVideo = data.kind === "video";
  const pending = !["success", "fail"].includes(data.status);
  return <div className="my-2 w-full max-w-[490px] overflow-hidden rounded-md border border-border bg-card shadow-soft">
    {pending ? <GenerationStage data={data} lang={lang} /> : <>
    <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium">
      {data.status === "fail" ? <AlertCircle className="size-4 text-destructive" /> : isVideo ? <Film className="size-4 text-chat-glow" /> : <ImageIcon className="size-4 text-chat-glow" />}
      {isVideo ? (lang === "fr" ? "Vidéo" : "Video") : "Image"}
    </div>
    {data.status === "success" && urls.length ? <div className="grid gap-2 p-2 sm:grid-cols-2">
      {urls.map((url, index) => <div key={url} className={urls.length === 1 ? "sm:col-span-2" : ""}>
        {isVideo ? <video src={url} controls playsInline preload="metadata" className="aspect-video w-full rounded-sm bg-secondary object-contain" /> : <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`${data.prompt} ${index + 1}`} className="max-h-[520px] w-full rounded-sm bg-secondary object-contain" /></a>}
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 px-1 text-xs text-foreground underline underline-offset-2"><Download className="size-3.5" />{lang === "fr" ? "Ouvrir le fichier" : "Open file"}</a>
      </div>)}
    </div> : <div className="flex min-h-28 items-center justify-center bg-secondary/60 p-5 text-center text-sm text-muted-foreground">
      {data.status === "fail" ? (data.error || (lang === "fr" ? "La création a échoué." : "Generation failed.")) : (lang === "fr" ? "Aucun fichier n’a été renvoyé." : "No file was returned.")}
    </div>}
    </>}
    <p className="line-clamp-3 px-4 py-3 text-xs text-muted-foreground">{data.prompt}</p>
  </div>;
}