import { useRef, useState } from "react";
import { AudioLines, FileAudio, Loader2, PenLine, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createAudioUpload } from "@/lib/audio.functions";
import { AUDIO_MAX_FILE_MB, AudioConvertError, decodeRecording, encodePieces } from "@/lib/audio-convert";
import {
  AUDIO_CREDITS_PER_MINUTE, AUDIO_MAX_MINUTES, AUDIO_MIN_CREDITS, audioCredits, audioDetails, audioLanguages, audioSummaryTypes,
  HUMANIZE_MAX_CHARS, HUMANIZE_MIN_CHARS, humanizeCredits, humanizeFormats, humanizeLengths, humanizeTones, optLabel, wordCount,
  type AudioTask, type HumanizeTask,
} from "@/lib/text-tools";
import { Chips, CostNote, field, label, optional, Shell } from "./MediaWizards";
import { cn } from "@/lib/utils";

// "Humaniser un texte" and "Résumé d'audio" journeys (chips under the chat box, next to music and video).
// Each gathers its settings, then starts a conversation whose first message carries the request as a data
// part ("data-tool-request" / "data-audio-request") that ThreadPage runs. Prices are fixed and re-checked
// on the server (src/lib/text-tools.ts).

type Lang = "fr" | "en";
const opts = (list: { id: string; fr: string; en: string }[], lang: Lang) => list.map((o) => [o.id, o[lang]] as [string, string]);
const errorBox = "rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive";

// ---------------------------------------------------------------- Humanize

export function HumanizeWizard({ open, onOpenChange, lang, onStart }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; onStart: (task: HumanizeTask, message: string, title: string) => void }) {
  const fr = lang === "fr";
  const [text, setText] = useState("");
  const [tone, setTone] = useState("natural");
  const [format, setFormat] = useState("keep");
  const [length, setLength] = useState("same");
  const [audience, setAudience] = useState("");
  const [error, setError] = useState("");
  const toneClass = "border-[#6f86d6]/70 bg-[#6f86d6]/12 text-[#4d63b0] dark:text-[#9cb4e6]";
  const words = wordCount(text);
  const price = humanizeCredits(words);

  function go() {
    const main = text.trim();
    if (main.length < HUMANIZE_MIN_CHARS) { setError(fr ? "Collez le texte à humaniser (quelques phrases au moins)." : "Paste the text to humanize (a few sentences at least)."); return; }
    const settings = [optLabel(humanizeTones, tone, lang), optLabel(humanizeFormats, format, lang), optLabel(humanizeLengths, length, lang), audience.trim() && `${fr ? "pour" : "for"} ${audience.trim()}`].filter(Boolean).join(" · ");
    const message = `${fr ? "Humaniser ce texte" : "Humanize this text"} — ${settings}\n\n${main}`;
    setError("");
    onStart({ kind: "humanize", tone, format, length, ...(audience.trim() ? { audience: audience.trim().slice(0, 200) } : {}) }, message, `${fr ? "Texte humanisé" : "Humanized text"} · ${main.replace(/\s+/g, " ").slice(0, 45)}`);
    onOpenChange(false);
    setText(""); setAudience(""); setTone("natural"); setFormat("keep"); setLength("same");
  }

  return <Shell open={open} onOpenChange={onOpenChange} accent="rgb(111 134 214 / .15)" icon={<PenLine className="size-4 text-[#6f86d6]" />}
    title={fr ? "Humaniser un texte" : "Humanize a text"}
    sub={fr ? "Collez un texte écrit par une IA : TechNova le réécrit avec un style naturel, dans le ton et le format de votre choix, sans changer les faits." : "Paste a text written by an AI: TechNova rewrites it in a natural style, in the tone and format you choose, without changing the facts."}
    footer={<>
      <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground">{fr ? "Annuler" : "Cancel"}</button>
      <button type="button" onClick={go} className="create-chip-humanize inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white"><PenLine className="size-4" />{fr ? `Humaniser · ${price} crédits` : `Humanize · ${price} credits`}</button>
    </>}>
    <label className="block space-y-1">
      <span className={label}>{fr ? "1. Le texte généré par l'IA" : "1. The AI-generated text"}</span>
      <textarea className={cn(field, "min-h-[170px] resize-y")} value={text} maxLength={HUMANIZE_MAX_CHARS} onChange={(e) => setText(e.target.value)}
        placeholder={fr ? "Collez ici le texte à rendre plus naturel…" : "Paste the text to make more natural here…"} />
      <span className="block text-right text-[11px] text-muted-foreground">{words.toLocaleString(fr ? "fr-FR" : "en-US")} {fr ? "mots" : "words"}</span>
    </label>
    <div><span className={label}>{fr ? "2. Type d'humanisation (ton)" : "2. Humanization type (tone)"}</span><Chips items={opts(humanizeTones, lang)} value={[tone]} onChange={(v) => setTone(v[0] ?? "natural")} tone={toneClass} /></div>
    <div><span className={label}>{fr ? "3. Format" : "3. Format"}</span><Chips items={opts(humanizeFormats, lang)} value={[format]} onChange={(v) => setFormat(v[0] ?? "keep")} tone={toneClass} /></div>
    <div><span className={label}>{fr ? "4. Longueur" : "4. Length"}</span><Chips items={opts(humanizeLengths, lang)} value={[length]} onChange={(v) => setLength(v[0] ?? "same")} tone={toneClass} /></div>
    <label className="block space-y-1"><span className={label}>{fr ? "Pour qui ?" : "For whom?"}{optional(fr)}</span><input className={field} value={audience} maxLength={200} placeholder={fr ? "Ex. : mes clients commerçants, des élèves de terminale, mon manager" : "E.g. my shop customers, high-school students, my manager"} onChange={(e) => setAudience(e.target.value)} /></label>
    {error && <p role="alert" className={errorBox}>{error}</p>}
    <CostNote>{fr ? `4 crédits jusqu'à 1 500 mots, 8 crédits au-delà (jusqu'à environ 5 000 mots). Les faits, chiffres et noms sont conservés ; relisez toujours le résultat avant de l'utiliser.` : `4 credits up to 1,500 words, 8 credits above (up to about 5,000 words). Facts, figures and names are kept; always proofread the result before using it.`}</CostNote>
  </Shell>;
}

// ---------------------------------------------------------------- Audio summary

type Loaded = { file: File; samples: Float32Array; seconds: number };
const clock = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60); return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min ${String(sec).padStart(2, "0")} s`; };

export function AudioWizard({ open, onOpenChange, lang, onStart }: { open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; onStart: (task: AudioTask, message: string, title: string) => void }) {
  const fr = lang === "fr";
  const register = useServerFn(createAudioUpload);
  const input = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reading, setReading] = useState(false);
  const [type, setType] = useState("meeting");
  const [detail, setDetail] = useState("standard");
  const [language, setLanguage] = useState(fr ? "fr" : "en");
  const [context, setContext] = useState("");
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const toneClass = "border-[#c27a55]/70 bg-[#c27a55]/12 text-[#9a5a39] dark:text-[#e7a985]";
  const price = loaded ? audioCredits(loaded.seconds) : null;

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError(""); setLoaded(null); setReading(true);
    try {
      const { samples, seconds } = await decodeRecording(file);
      setLoaded({ file, samples, seconds });
    } catch (e) {
      const code = e instanceof AudioConvertError ? e.code : "unreadable";
      setError(code === "too_big" ? (fr ? `Fichier trop lourd (plus de ${AUDIO_MAX_FILE_MB} Mo).` : `File too large (over ${AUDIO_MAX_FILE_MB} MB).`)
        : code === "too_long" ? (fr ? `Enregistrement trop long : ${AUDIO_MAX_MINUTES / 60} heures au maximum. Coupez-le en deux.` : `Recording too long: ${AUDIO_MAX_MINUTES / 60} hours at most. Split it in two.`)
        : code === "empty" ? (fr ? "Cet enregistrement est vide ou dure moins d'une seconde." : "This recording is empty or shorter than a second.")
        : (fr ? "Ce fichier ne peut pas être lu par votre navigateur. Essayez en MP3, M4A, WAV, OGG, OPUS, FLAC ou WEBM (les formats AMR et WMA ne sont pas lus)." : "Your browser cannot read this file. Try MP3, M4A, WAV, OGG, OPUS, FLAC or WEBM (AMR and WMA are not supported)."));
    } finally { setReading(false); }
  }

  function reset() { setLoaded(null); setProgress(null); setError(""); setContext(""); if (input.current) input.current.value = ""; }

  async function go() {
    if (!loaded || progress) return;
    setError("");
    try {
      setProgress({ label: fr ? "Préparation de l'audio…" : "Preparing the audio…", value: 0 });
      const pieces = await encodePieces(loaded.samples, (p) => setProgress({ label: fr ? "Préparation de l'audio…" : "Preparing the audio…", value: p * 0.6 }));
      const { uploads } = await register({ data: { pieces: pieces.length, seconds: loaded.seconds } });
      for (let i = 0; i < pieces.length; i++) {
        setProgress({ label: fr ? `Envoi sécurisé (${i + 1}/${pieces.length})…` : `Secure upload (${i + 1}/${pieces.length})…`, value: 0.6 + (0.4 * i) / pieces.length });
        const up = uploads[i]!;
        const { error: upError } = await supabase.storage.from("user-files").uploadToSignedUrl(up.path, up.token, pieces[i]!, { contentType: "audio/mpeg" });
        if (upError) throw new Error("upload");
      }
      const task: AudioTask = { type, detail, language, ...(context.trim() ? { context: context.trim().slice(0, 500) } : {}), filename: loaded.file.name.slice(0, 200), seconds: Math.round(loaded.seconds), paths: uploads.map((u) => u.path) };
      const kind = optLabel(audioSummaryTypes, type, lang);
      const message = `${fr ? "Résumé d'audio" : "Audio summary"} — ${kind} · ${optLabel(audioDetails, detail, lang)} · ${optLabel(audioLanguages, language, lang)}\n\n🎧 ${loaded.file.name} (${clock(loaded.seconds)})${context.trim() ? `\n${fr ? "Contexte" : "Context"} : ${context.trim()}` : ""}`;
      onStart(task, message, `${kind} · ${loaded.file.name.replace(/\.[^.]+$/, "").slice(0, 45)}`);
      onOpenChange(false);
      reset();
    } catch {
      setProgress(null);
      setError(fr ? "L'envoi de l'audio a échoué. Vérifiez votre connexion et réessayez." : "The audio upload failed. Check your connection and try again.");
    }
  }

  return <Shell open={open} onOpenChange={(o) => { if (!progress) onOpenChange(o); }} accent="rgb(194 122 85 / .15)" icon={<AudioLines className="size-4 text-[#c27a55]" />}
    title={fr ? "Résumé d'un audio" : "Audio summary"}
    sub={fr ? "Envoyez l'enregistrement d'une réunion, d'un cours ou d'un appel : TechNova l'écoute et vous rend le résumé de votre choix, à télécharger en Word ou PDF." : "Send a recording of a meeting, class or call: TechNova listens and gives you the summary you choose, to download as Word or PDF."}
    footer={<>
      <button type="button" disabled={!!progress} onClick={() => onOpenChange(false)} className="h-9 rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-50">{fr ? "Annuler" : "Cancel"}</button>
      <button type="button" disabled={!loaded || !!progress} onClick={() => void go()} className="create-chip-audio inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60">
        {progress ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4" />}{price ? (fr ? `Résumer · ${price} crédits` : `Summarize · ${price} credits`) : (fr ? "Résumer" : "Summarize")}</button>
    </>}>
    <div>
      <span className={label}>{fr ? "1. L'enregistrement" : "1. The recording"}</span>
      <input ref={input} type="file" className="hidden" accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm,.mp4,.mpeg,.mpga,.aif,.aiff,.caf,.3gp,.amr,.wma"
        onChange={(e) => void pickFile(e.target.files?.[0])} />
      {loaded ? <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
        <FileAudio className="size-5 shrink-0 text-[#c27a55]" />
        <span className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{loaded.file.name}</strong><small className="text-[11.5px] text-muted-foreground">{clock(loaded.seconds)} · {(loaded.file.size / 1024 / 1024).toFixed(1)} {fr ? "Mo" : "MB"}</small></span>
        {!progress && <button type="button" onClick={reset} aria-label={fr ? "Changer de fichier" : "Change file"} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="size-4" /></button>}
      </div> : <button type="button" disabled={reading} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void pickFile(e.dataTransfer.files?.[0]); }}
        className={cn("mt-1.5 grid w-full place-items-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition", drag ? "border-[#c27a55] bg-[#c27a55]/8" : "border-border hover:border-foreground/30")}>
        {reading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <Upload className="size-5 text-muted-foreground" />}
        <strong className="text-[13px]">{reading ? (fr ? "Lecture du fichier…" : "Reading the file…") : (fr ? "Choisir ou déposer un fichier audio" : "Choose or drop an audio file")}</strong>
        <small className="text-[11.5px] text-muted-foreground">MP3, M4A, WAV, OGG, OPUS, AAC, FLAC, WEBM, MP4… · {fr ? `jusqu'à ${AUDIO_MAX_MINUTES / 60} h` : `up to ${AUDIO_MAX_MINUTES / 60} h`}</small>
      </button>}
    </div>
    <div>
      <span className={label}>{fr ? "2. Type de résumé" : "2. Summary type"}</span>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">{audioSummaryTypes.map((o) => <button key={o.id} type="button" aria-pressed={type === o.id} onClick={() => setType(o.id)}
        className={cn("rounded-xl border px-3 py-2 text-left transition", type === o.id ? toneClass : "border-border hover:border-foreground/30")}>
        <span className="block text-[12.5px] font-semibold">{o[lang]}</span><span className="block text-[11px] text-muted-foreground">{fr ? o.hintFr : o.hintEn}</span>
      </button>)}</div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><span className={label}>{fr ? "3. Niveau de détail" : "3. Level of detail"}</span><Chips items={opts(audioDetails, lang)} value={[detail]} onChange={(v) => setDetail(v[0] ?? "standard")} tone={toneClass} /></div>
      <div><span className={label}>{fr ? "4. Langue du résumé" : "4. Summary language"}</span><Chips items={opts(audioLanguages, lang)} value={[language]} onChange={(v) => setLanguage(v[0] ?? "fr")} tone={toneClass} /></div>
    </div>
    <label className="block space-y-1"><span className={label}>{fr ? "Contexte" : "Context"}{optional(fr)}</span><input className={field} value={context} maxLength={500} placeholder={fr ? "Ex. : réunion commerciale du lundi, avec Awa, Koffi et Mariam" : "E.g. Monday sales meeting with Awa, Koffi and Mariam"} onChange={(e) => setContext(e.target.value)} /></label>
    {progress && <div className="space-y-1.5" role="status">
      <div className="flex justify-between text-[12px]"><span>{progress.label}</span><span className="text-muted-foreground">{Math.round(progress.value * 100)} %</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#c27a55] transition-[width]" style={{ width: `${Math.round(progress.value * 100)}%` }} /></div>
    </div>}
    {error && <p role="alert" className={errorBox}>{error}</p>}
    <CostNote>{fr
      ? `${AUDIO_CREDITS_PER_MINUTE} crédits par minute d'enregistrement (${AUDIO_MIN_CREDITS} crédits minimum)${price ? ` : ${price} crédits pour ce fichier` : ""}. Rien n'est prélevé si l'audio ne peut pas être compris. L'audio est converti dans votre navigateur, envoyé de façon privée puis supprimé dès le résumé terminé.`
      : `${AUDIO_CREDITS_PER_MINUTE} credits per minute of recording (${AUDIO_MIN_CREDITS} credits minimum)${price ? `: ${price} credits for this file` : ""}. Nothing is charged if the audio cannot be understood. The audio is converted in your browser, sent privately and deleted as soon as the summary is done.`}</CostNote>
  </Shell>;
}
