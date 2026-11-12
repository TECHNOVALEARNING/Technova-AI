import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clapperboard, Coins, Lock, Music2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { mediaTiers, MEDIA_VIDEO_SECONDS, type MediaRatio, type MusicOptions } from "@/lib/media-models";
import { featureMinTier, packNames } from "@/lib/plans";
import { usePlanTier } from "@/lib/plan-client";
import { cn } from "@/lib/utils";

// Music and video creation journeys (chips under the chat box). They gather a precise brief so the first
// creation is the right one, then start a conversation whose first message carries the structured request
// (a "data-media-request" part read by ThreadPage). The server still checks the plan, reserves the fixed
// price and refunds a failed creation.

type Lang = "fr" | "en";
export type MediaRequest =
  | { kind: "music"; prompt: string; music: MusicOptions }
  | { kind: "video"; prompt: string; aspectRatio: MediaRatio; quality: boolean };

const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13.5px] outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-ring/20";
const label = "text-[12px] font-medium text-foreground/80";
const optional = (fr: boolean) => <span className="ml-1 font-normal text-muted-foreground">{fr ? "(facultatif)" : "(optional)"}</span>;

function Chips<T extends string>({ items, value, onChange, multi = false, tone }: { items: [T, string][]; value: T[]; onChange: (v: T[]) => void; multi?: boolean; tone: string }) {
  return <div className="mt-1.5 flex flex-wrap gap-1.5">{items.map(([id, text]) => {
    const on = value.includes(id);
    return <button key={id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== id) : multi ? [...value, id] : [id])}
      className={cn("h-8 rounded-full border px-3 text-[12.5px] transition", on ? `${tone} font-semibold` : "border-border hover:border-foreground/30")}>{text}</button>;
  })}</div>;
}

function CostNote({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-2 rounded-xl bg-secondary/70 px-3 py-2.5 text-[12px] text-muted-foreground"><Coins className="mt-0.5 size-3.5 shrink-0" /><span>{children}</span></p>;
}

function Shell({ open, onOpenChange, icon, title, sub, accent, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; icon: React.ReactNode; title: string; sub: string; accent: string; children: React.ReactNode; footer: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[620px] gap-0 rounded-2xl p-0 sm:rounded-2xl">
      <div className="border-b border-border px-5 pb-4 pt-5 sm:px-6" style={{ background: `linear-gradient(135deg, ${accent}, transparent 70%)` }}>
        <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold">{icon}{title}</DialogTitle>
        <DialogDescription className="mt-1 text-[12.5px]">{sub}</DialogDescription>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3.5 sm:px-6">{footer}</div>
    </DialogContent>
  </Dialog>;
}

// ---------------------------------------------------------------- Music

const genres = ["Afrobeat", "Afro-pop", "Coupé-décalé", "Zouglou", "Amapiano", "Highlife", "Makossa", "Rumba", "Gospel", "Rap", "R&B", "Zouk", "Reggae", "Dancehall", "Pop", "Jazz", "Électro", "Variété"] as const;
const moods: Record<Lang, [string, string][]> = {
  fr: [["joyful", "Joyeuse"], ["romantic", "Romantique"], ["festive", "Festive"], ["uplifting", "Motivante"], ["spiritual", "Spirituelle"], ["calm", "Calme"], ["melancholic", "Mélancolique"], ["epic", "Épique"]],
  en: [["joyful", "Joyful"], ["romantic", "Romantic"], ["festive", "Festive"], ["uplifting", "Uplifting"], ["spiritual", "Spiritual"], ["calm", "Calm"], ["melancholic", "Melancholic"], ["epic", "Epic"]],
};
const tempos: Record<Lang, [string, string][]> = { fr: [["slow tempo", "Lent"], ["mid tempo", "Moyen"], ["fast tempo", "Rapide"]], en: [["slow tempo", "Slow"], ["mid tempo", "Medium"], ["fast tempo", "Fast"]] };
const languages = ["Français", "English", "Fon", "Yoruba", "Lingala", "Wolof", "Swahili", "Éwé", "Bambara", "Dioula", "Português", "Español"];

export function MusicWizard({ open, onOpenChange, lang, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; onCreate: (r: MediaRequest, summary: string, title: string) => void }) {
  const fr = lang === "fr";
  const [mode, setMode] = useState<"describe" | "lyrics">("describe");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [tempo, setTempo] = useState<string[]>([]);
  const [voice, setVoice] = useState<("f" | "m")[]>([]);
  const [language, setLanguage] = useState<string[]>([]);
  const [instruments, setInstruments] = useState("");
  const [exclude, setExclude] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [error, setError] = useState("");
  const tone = "border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300";

  function create() {
    const main = text.trim();
    if (mode === "describe" && main.length < 10) { setError(fr ? "Décrivez la chanson en une phrase au moins." : "Describe the song in at least one sentence."); return; }
    if (mode === "lyrics" && !instrumental && main.length < 20) { setError(fr ? "Collez vos paroles (quelques lignes au moins)." : "Paste your lyrics (a few lines at least)."); return; }
    const style = [...genre, ...mood, ...tempo, instruments.trim() && `${instruments.trim()}`, language[0] && !instrumental && `lyrics in ${language[0]}`].filter(Boolean).join(", ");
    const lyricsMode = mode === "lyrics" && !instrumental;
    const description = mode === "describe" ? `${main}${language[0] && !instrumental ? ` — ${fr ? "paroles en" : "lyrics in"} ${language[0]}` : ""}` : (title.trim() || main.split("\n").find((l) => l.trim() && !l.trim().startsWith("["))?.trim() || (fr ? "Ma chanson" : "My song"));
    const music: MusicOptions = {
      ...(title.trim() ? { title: title.trim().slice(0, 80) } : {}),
      ...(lyricsMode ? { lyrics: main.slice(0, 5000) } : {}),
      ...(style ? { style: style.slice(0, 1000) } : {}),
      ...(exclude.trim() ? { exclude: exclude.trim().slice(0, 300) } : {}),
      ...(voice[0] && !instrumental ? { vocal: voice[0] } : {}),
      ...(instrumental ? { instrumental: true } : {}),
    };
    const facts = [title.trim() && `« ${title.trim()} »`, style, instrumental ? (fr ? "instrumental" : "instrumental") : voice[0] === "f" ? (fr ? "voix féminine" : "female vocals") : voice[0] === "m" ? (fr ? "voix masculine" : "male vocals") : ""].filter(Boolean).join(" · ");
    const summary = `${fr ? "Création musicale" : "Music creation"}${facts ? ` — ${facts}` : ""}\n\n${lyricsMode ? `${fr ? "Paroles" : "Lyrics"} :\n${main}` : main}`;
    setError("");
    onCreate({ kind: "music", prompt: description.slice(0, 3000), music }, summary.slice(0, 6000), `${fr ? "Musique" : "Music"} · ${(title.trim() || description).slice(0, 50)}`);
    onOpenChange(false);
    setText(""); setTitle(""); setGenre([]); setMood([]); setTempo([]); setVoice([]); setLanguage([]); setInstruments(""); setExclude(""); setInstrumental(false); setMode("describe");
  }

  return <Shell open={open} onOpenChange={onOpenChange} accent="rgb(217 70 239 / .12)" icon={<Music2 className="size-4 text-fuchsia-600" />}
    title={fr ? "Créer une musique" : "Create a song"} sub={fr ? "Décrivez votre chanson ou collez vos paroles ; précisez le style si vous le souhaitez. Une chanson complète, prête à télécharger." : "Describe your song or paste your lyrics; add a style if you like. A complete song, ready to download."}
    footer={<>
      <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">{fr ? "Annuler" : "Cancel"}</button>
      <button type="button" onClick={create} className="create-chip-music inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white"><Sparkles className="size-4" />{fr ? "Créer la chanson" : "Create the song"}</button>
    </>}>
    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary/70 p-1">
      {(["describe", "lyrics"] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn("h-8 rounded-lg text-[12.5px] transition", mode === m ? "bg-card font-semibold shadow-sm" : "text-muted-foreground")}>{m === "describe" ? (fr ? "Décrire ma chanson" : "Describe my song") : (fr ? "J'ai mes paroles" : "I have my lyrics")}</button>)}
    </div>
    <label className="block space-y-1">
      <span className={label}>{mode === "describe" ? (fr ? "De quoi parle la chanson ?" : "What is the song about?") : (fr ? "Vos paroles" : "Your lyrics")}</span>
      <textarea className={cn(field, mode === "lyrics" ? "min-h-[150px]" : "min-h-[90px]", "resize-y")} value={text} maxLength={mode === "lyrics" ? 5000 : 3000} onChange={(e) => setText(e.target.value)}
        placeholder={mode === "describe" ? (fr ? "Ex. : une chanson d'anniversaire joyeuse pour ma mère Awa, qui parle de sa force et de sa douceur" : "E.g. a joyful birthday song for my mother Awa, about her strength and kindness") : (fr ? "[Couplet]\n…\n[Refrain]\n…" : "[Verse]\n…\n[Chorus]\n…")} />
      {mode === "lyrics" && <span className="block text-[11px] text-muted-foreground">{fr ? "Astuce : balisez [Couplet], [Refrain], [Pont] pour structurer la chanson. Les paroles sont chantées telles quelles." : "Tip: mark [Verse], [Chorus], [Bridge] to structure the song. Lyrics are sung as written."}</span>}
    </label>
    <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={instrumental} onChange={(e) => setInstrumental(e.target.checked)} className="size-4" />{fr ? "Instrumental (sans voix)" : "Instrumental (no vocals)"}</label>
    <label className="block space-y-1"><span className={label}>{fr ? "Titre" : "Title"}{optional(fr)}</span><input className={field} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
    <div><span className={label}>{fr ? "Genre" : "Genre"}{optional(fr)}</span><Chips items={genres.map((g) => [g, g])} value={genre} onChange={setGenre} multi tone={tone} /></div>
    <div><span className={label}>{fr ? "Ambiance" : "Mood"}{optional(fr)}</span><Chips items={moods[lang]} value={mood} onChange={setMood} multi tone={tone} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><span className={label}>Tempo{optional(fr)}</span><Chips items={tempos[lang]} value={tempo} onChange={setTempo} tone={tone} /></div>
      {!instrumental && <div><span className={label}>{fr ? "Voix" : "Voice"}{optional(fr)}</span><Chips<"f" | "m"> items={[["f", fr ? "Féminine" : "Female"], ["m", fr ? "Masculine" : "Male"]]} value={voice} onChange={setVoice} tone={tone} /></div>}
    </div>
    {!instrumental && <div><span className={label}>{fr ? "Langue des paroles" : "Lyrics language"}{optional(fr)}</span><Chips items={languages.map((l) => [l, l])} value={language} onChange={setLanguage} tone={tone} /></div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1"><span className={label}>{fr ? "Instruments" : "Instruments"}{optional(fr)}</span><input className={field} value={instruments} maxLength={200} placeholder={fr ? "Ex. : kora, guitare, djembé" : "E.g. kora, guitar, djembe"} onChange={(e) => setInstruments(e.target.value)} /></label>
      <label className="block space-y-1"><span className={label}>{fr ? "À éviter" : "Avoid"}{optional(fr)}</span><input className={field} value={exclude} maxLength={300} placeholder={fr ? "Ex. : batterie lourde, autotune" : "E.g. heavy drums, autotune"} onChange={(e) => setExclude(e.target.value)} /></label>
    </div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">{error}</p>}
    <CostNote>{fr ? `Une chanson coûte ${mediaTiers.musique.credits} crédits, prélevés à la création et remboursés si elle échoue. Elle est conservée 14 jours : pensez à la télécharger.` : `A song costs ${mediaTiers.musique.credits} credits, charged at creation and refunded if it fails. It is kept 14 days: remember to download it.`}</CostNote>
  </Shell>;
}

// ---------------------------------------------------------------- Video

const videoStyles: Record<Lang, [string, string][]> = {
  fr: [["cinematic", "Cinématique"], ["photorealistic", "Réaliste"], ["product commercial", "Publicité produit"], ["3D animation", "Animation 3D"], ["cartoon", "Dessin animé"], ["anime", "Anime"], ["documentary", "Documentaire"], ["music video", "Clip musical"]],
  en: [["cinematic", "Cinematic"], ["photorealistic", "Realistic"], ["product commercial", "Product ad"], ["3D animation", "3D animation"], ["cartoon", "Cartoon"], ["anime", "Anime"], ["documentary", "Documentary"], ["music video", "Music video"]],
};
const cameras: Record<Lang, [string, string][]> = {
  fr: [["static shot", "Plan fixe"], ["slow dolly-in", "Travelling avant"], ["smooth pan", "Panoramique"], ["aerial drone shot", "Vue de drone"], ["close-up", "Gros plan"], ["handheld camera", "Caméra à l'épaule"], ["orbit around the subject", "Orbite"]],
  en: [["static shot", "Static shot"], ["slow dolly-in", "Dolly-in"], ["smooth pan", "Pan"], ["aerial drone shot", "Drone shot"], ["close-up", "Close-up"], ["handheld camera", "Handheld"], ["orbit around the subject", "Orbit"]],
};
const lights: Record<Lang, [string, string][]> = {
  fr: [["natural daylight", "Lumière du jour"], ["golden hour", "Heure dorée"], ["night", "Nuit"], ["neon lights", "Néons"], ["studio lighting", "Studio"], ["dramatic lighting", "Dramatique"]],
  en: [["natural daylight", "Daylight"], ["golden hour", "Golden hour"], ["night", "Night"], ["neon lights", "Neon"], ["studio lighting", "Studio"], ["dramatic lighting", "Dramatic"]],
};

export function VideoWizard({ open, onOpenChange, lang, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; onCreate: (r: MediaRequest, summary: string, title: string) => void }) {
  const fr = lang === "fr";
  const tier = usePlanTier();
  const locked = tier !== null && tier < featureMinTier.video;
  const [scene, setScene] = useState("");
  const [subject, setSubject] = useState("");
  const [place, setPlace] = useState("");
  const [style, setStyle] = useState<string[]>([]);
  const [camera, setCamera] = useState<string[]>([]);
  const [light, setLight] = useState<string[]>([]);
  const [ratio, setRatio] = useState<MediaRatio>("16:9");
  const [quality, setQuality] = useState(false);
  const [avoid, setAvoid] = useState("");
  const [error, setError] = useState("");
  const tone = "border-orange-500/60 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  const price = quality ? mediaTiers.video_quality.credits : mediaTiers.video_fast.credits;

  function create() {
    if (tier === null || locked) return;
    const main = scene.trim();
    if (main.length < 10) { setError(fr ? "Décrivez la scène en une phrase au moins." : "Describe the scene in at least one sentence."); return; }
    const parts = [
      main,
      subject.trim() && `Main subject: ${subject.trim()}`,
      place.trim() && `Setting: ${place.trim()}`,
      style.length && `Style: ${style.join(", ")}`,
      camera[0] && `Camera: ${camera[0]}`,
      light[0] && `Lighting: ${light[0]}`,
      `${MEDIA_VIDEO_SECONDS}-second shot, smooth natural motion, coherent subject from start to end`,
      avoid.trim() && `Avoid: ${avoid.trim()}`,
    ].filter(Boolean);
    const prompt = parts.join(". ").slice(0, 5000);
    const label = (list: [string, string][], v?: string) => list.find(([id]) => id === v)?.[1];
    const facts = [style.map((s) => label(videoStyles[lang], s)).join(", "), label(cameras[lang], camera[0]), label(lights[lang], light[0]), ratio, quality ? (fr ? "qualité" : "quality") : (fr ? "rapide" : "quick")].filter(Boolean).join(" · ");
    const summary = `${fr ? "Création vidéo" : "Video creation"} — ${facts}\n\n${main}${subject.trim() ? `\n${fr ? "Sujet" : "Subject"} : ${subject.trim()}` : ""}${place.trim() ? `\n${fr ? "Décor" : "Setting"} : ${place.trim()}` : ""}`;
    setError("");
    onCreate({ kind: "video", prompt, aspectRatio: ratio, quality }, summary.slice(0, 6000), `${fr ? "Vidéo" : "Video"} · ${main.slice(0, 50)}`);
    onOpenChange(false);
    setScene(""); setSubject(""); setPlace(""); setStyle([]); setCamera([]); setLight([]); setRatio("16:9"); setQuality(false); setAvoid("");
  }

  const formats: [MediaRatio, string][] = [["16:9", fr ? "16:9 · Paysage (YouTube)" : "16:9 · Landscape (YouTube)"], ["9:16", fr ? "9:16 · Vertical (TikTok, Reels, Statut)" : "9:16 · Vertical (TikTok, Reels)"], ["1:1", fr ? "1:1 · Carré" : "1:1 · Square"]];
  return <Shell open={open} onOpenChange={onOpenChange} accent="rgb(249 115 22 / .12)" icon={<Clapperboard className="size-4 text-orange-600" />}
    title={fr ? "Créer une vidéo" : "Create a video"} sub={fr ? `Décrivez la scène ; précisez le style, la caméra et la lumière pour une vidéo de ${MEDIA_VIDEO_SECONDS} secondes réussie du premier coup.` : `Describe the scene; set the style, camera and light for a ${MEDIA_VIDEO_SECONDS}-second video that works first time.`}
    footer={locked
      ? <><span className="mr-auto text-[12px] text-muted-foreground">{fr ? `La vidéo est incluse à partir du forfait ${packNames[featureMinTier.video]}.` : `Video is included from the ${packNames[featureMinTier.video]} plan.`}</span><Link to="/dashboard/credits" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background"><Lock className="size-4" />{fr ? "Voir les forfaits" : "See plans"}</Link></>
      : <>
        <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">{fr ? "Annuler" : "Cancel"}</button>
        <button type="button" disabled={tier === null} onClick={create} className="create-chip-video inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"><Sparkles className="size-4" />{fr ? `Créer la vidéo · ${price} crédits` : `Create the video · ${price} credits`}</button>
      </>}>
    <label className="block space-y-1">
      <span className={label}>{fr ? "La scène" : "The scene"}</span>
      <textarea className={cn(field, "min-h-[96px] resize-y")} value={scene} maxLength={2000} onChange={(e) => setScene(e.target.value)}
        placeholder={fr ? "Ex. : une jeune femme en pagne wax marche dans un marché coloré de Cotonou et sourit à la caméra" : "E.g. a young woman in a wax-print dress walks through a colourful market and smiles at the camera"} />
      <span className="block text-[11px] text-muted-foreground">{fr ? "Une seule scène, une action claire : c'est ce qui donne les meilleures vidéos courtes." : "One scene, one clear action: that gives the best short videos."}</span>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1"><span className={label}>{fr ? "Sujet principal" : "Main subject"}{optional(fr)}</span><input className={field} value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} /></label>
      <label className="block space-y-1"><span className={label}>{fr ? "Décor / lieu" : "Setting / place"}{optional(fr)}</span><input className={field} value={place} maxLength={200} onChange={(e) => setPlace(e.target.value)} /></label>
    </div>
    <div><span className={label}>Style{optional(fr)}</span><Chips items={videoStyles[lang]} value={style} onChange={setStyle} multi tone={tone} /></div>
    <div><span className={label}>{fr ? "Mouvement de caméra" : "Camera movement"}{optional(fr)}</span><Chips items={cameras[lang]} value={camera} onChange={setCamera} tone={tone} /></div>
    <div><span className={label}>{fr ? "Lumière" : "Lighting"}{optional(fr)}</span><Chips items={lights[lang]} value={light} onChange={setLight} tone={tone} /></div>
    <div><span className={label}>Format</span><Chips items={formats} value={[ratio]} onChange={(v) => setRatio(v[0] ?? "16:9")} tone={tone} /></div>
    <div>
      <span className={label}>{fr ? "Qualité" : "Quality"}</span>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">{([false, true] as const).map((q) => <button key={String(q)} type="button" aria-pressed={quality === q} onClick={() => setQuality(q)} className={cn("rounded-xl border px-3 py-2.5 text-left transition", quality === q ? tone : "border-border hover:border-foreground/30")}>
        <span className="block text-[13px] font-semibold">{q ? (fr ? "Qualité" : "Quality") : (fr ? "Rapide" : "Quick")}</span>
        <span className="block text-[11.5px] text-muted-foreground">{q ? mediaTiers.video_quality.credits : mediaTiers.video_fast.credits} {fr ? "crédits" : "credits"} · {q ? (fr ? "rendu détaillé, plus lent" : "detailed, slower") : (fr ? "idéal pour essayer" : "great to try ideas")}</span>
      </button>)}</div>
    </div>
    <label className="block space-y-1"><span className={label}>{fr ? "À éviter" : "Avoid"}{optional(fr)}</span><input className={field} value={avoid} maxLength={300} placeholder={fr ? "Ex. : texte à l'écran, flou, visages déformés" : "E.g. on-screen text, blur, distorted faces"} onChange={(e) => setAvoid(e.target.value)} /></label>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">{error}</p>}
    <CostNote>{fr ? `Une vidéo de ${MEDIA_VIDEO_SECONDS} secondes coûte ${mediaTiers.video_fast.credits} crédits (rapide) ou ${mediaTiers.video_quality.credits} crédits (qualité), prélevés à la création et remboursés si elle échoue. Elle est conservée 14 jours : pensez à la télécharger.` : `A ${MEDIA_VIDEO_SECONDS}-second video costs ${mediaTiers.video_fast.credits} credits (quick) or ${mediaTiers.video_quality.credits} credits (quality), charged at creation and refunded if it fails. It is kept 14 days: remember to download it.`}</CostNote>
  </Shell>;
}
