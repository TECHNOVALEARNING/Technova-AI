import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Music2, Pause, Play } from "lucide-react";

// A finished song in the chat, presented like an album: a 4:3 card with the cover (or a drawn one), the title, the
// style, a big play button, a progress bar and the time, then « Télécharger » (MP3) and — when the AI wrote the
// lyrics — « Paroles » (a .txt file, with the lyrics shown under the card). Songs on the user's own lyrics or
// instrumental songs get the card only.

export type MusicMeta = { title?: string | null; lyrics?: string | null; tags?: string | null; duration?: number | null; ownLyrics?: boolean; instrumental?: boolean };

const isImage = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(url.split("?")[0] ?? "");
const time = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
const hue = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export function MusicAlbum({ id, urls, meta, prompt, lang, onBroken, onDownload, saving }: {
  id: string; urls: string[]; meta?: MusicMeta | null; prompt: string; lang: "fr" | "en";
  onBroken: (url: string) => void; onDownload: (url: string) => void; saving: boolean;
}) {
  const fr = lang === "fr";
  const audioUrl = urls.find((u) => !isImage(u)) ?? urls[0]!;
  const cover = urls.find(isImage) ?? null;
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [length, setLength] = useState(meta?.duration ?? 0);
  const [showLyrics, setShowLyrics] = useState(false);
  const title = meta?.title?.trim() || (fr ? "Votre chanson" : "Your song");
  const style = meta?.tags?.trim() || prompt.slice(0, 90);
  const lyrics = !meta?.ownLyrics && !meta?.instrumental && meta?.lyrics && meta.lyrics.trim().length > 20 ? meta.lyrics.trim() : null;
  const h = hue(id);
  useEffect(() => { const a = audio.current; return () => a?.pause(); }, []);
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };
  const seek = (v: number) => { const a = audio.current; if (a && Number.isFinite(a.duration)) { a.currentTime = v; setNow(v); } };
  const saveLyrics = () => {
    if (!lyrics) return;
    const blob = new Blob([`${title}\n${style ? `${style}\n` : ""}\n${lyrics}\n\n— Créé avec TechNova AI Hub\n`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `paroles-${title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 50) || id.slice(0, 8)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const pct = length > 0 ? Math.min(100, (now / length) * 100) : 0;

  return <div className="my-2 w-full max-w-[560px]">
    <div className="relative w-full overflow-hidden rounded-[26px] text-white shadow-[0_24px_60px_-28px_rgba(0,0,0,.6)]" style={{ aspectRatio: "4 / 3", background: `linear-gradient(140deg, hsl(${h} 55% 32%), hsl(${(h + 60) % 360} 50% 18%))` }}>
      {cover && <img src={cover} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-2xl" onError={() => onBroken(cover)} />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/80" />
      <div className="relative flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75"><Music2 className="size-3.5" />TechNova Music{meta?.instrumental && <span className="rounded-full bg-white/15 px-2 py-0.5 normal-case tracking-normal">{fr ? "Instrumental" : "Instrumental"}</span>}</div>
        <div className="flex min-h-0 flex-1 items-center gap-4 sm:gap-5">
          <div className="relative aspect-square h-[58%] max-h-[220px] shrink-0 overflow-hidden rounded-2xl shadow-[0_18px_40px_-14px_rgba(0,0,0,.7)] ring-1 ring-white/15">
            {cover ? <img src={cover} alt={title} className="size-full object-cover" onError={() => onBroken(cover)} />
              : <div className="grid size-full place-items-center" style={{ background: `radial-gradient(circle at 30% 30%, hsl(${(h + 30) % 360} 70% 60%), hsl(${h} 60% 25%))` }}><Music2 className="size-10 text-white/85" /></div>}
            {playing && <span className="absolute bottom-2 left-2 flex h-4 items-end gap-[3px]" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="w-[3px] animate-pulse rounded-full bg-white" style={{ height: `${50 + i * 20}%`, animationDelay: `${i * 0.15}s` }} />)}</span>}
          </div>
          <div className="min-w-0">
            <p className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">{title}</p>
            {style && <p className="mt-1 line-clamp-2 text-[12.5px] text-white/70">{style}</p>}
            {length > 0 && <p className="mt-2 text-[12px] tabular-nums text-white/60">{time(length)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggle} aria-label={playing ? (fr ? "Pause" : "Pause") : (fr ? "Écouter" : "Play")} className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black shadow-lg transition hover:scale-105">
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>
          <div className="min-w-0 flex-1">
            <input type="range" min={0} max={length || 1} step={0.1} value={now} onChange={(e) => seek(Number(e.target.value))} aria-label={fr ? "Position dans la chanson" : "Position in the song"}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-white" style={{ background: `linear-gradient(90deg, #fff ${pct}%, rgba(255,255,255,.25) ${pct}%)` }} />
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/65"><span>{time(now)}</span><span>{time(length)}</span></div>
          </div>
        </div>
      </div>
      <audio ref={audio} src={audioUrl} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setNow(0); }}
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setLength(e.currentTarget.duration); }} onError={() => onBroken(audioUrl)} />
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <button type="button" onClick={() => onDownload(audioUrl)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{fr ? "Télécharger (MP3)" : "Download (MP3)"}
      </button>
      {lyrics && <>
        <button type="button" onClick={saveLyrics} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><FileText className="size-4" />{fr ? "Paroles (.txt)" : "Lyrics (.txt)"}</button>
        <button type="button" onClick={() => setShowLyrics((v) => !v)} aria-expanded={showLyrics} className="inline-flex h-8 items-center rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{showLyrics ? (fr ? "Masquer les paroles" : "Hide lyrics") : (fr ? "Voir les paroles" : "Show lyrics")}</button>
      </>}
    </div>
    {lyrics && showLyrics && <pre className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border bg-card p-4 font-sans text-[13px] leading-relaxed">{lyrics}</pre>}
  </div>;
}
