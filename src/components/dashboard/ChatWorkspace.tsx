import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Mic,
  Paperclip,
  X,
  Loader2,
  FileAudio,
  FileVideo,
  FileText,
  Square,
  Copy,
  Wand2,
  Film,
  Image as ImageIcon,
  Telescope,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useDashboard, type Thread } from "./dashboard-context";
import { chatWorkspaceText } from "@/lib/i18n";
import { ACCEPT, MAX_FILES, budgetFiles, kindOf, mediaKey, pendingMedia, persistableParts, toFilePart, type ChatFilePart } from "@/lib/chat-attachments";
import { openRouterModelIds } from "@/lib/chat-models";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ArtifactPanel, StudioPlan, StudioQuestions, StudioTimeline } from "./Studio";
import { parseBuild, type StudioBuild, type StudioData, type StudioPlanData } from "@/lib/studio";
import { createMediaGeneration, getVideoAccess, refreshMediaGeneration, VIDEO_UPGRADE_REQUIRED } from "@/lib/media-generation.functions";
import { PENDING_PACK_KEY } from "@/lib/public-pricing";
import { RESEARCH_MAX_CREDITS, splitResearchStream } from "@/lib/research";
import { DESIGN_DRAFT_KEY } from "@/lib/design-library";
import { defaultImageModel, defaultMusicModel, defaultVideoModel, findMediaModel, mediaModels, mediaReserve, type MediaKind } from "@/lib/media-models";
import { ChatMedia, type ChatMediaData } from "./ChatMedia";

type Mode = "chat" | "create";
const SMART_MODEL = "TechNova Smart";
type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function ChatGreeting({ choice }: { choice: ReturnType<typeof useWorkspaceChoice> }) {
  const { name } = useDashboard();
  const [time, setTime] = useState<TimeOfDay | null>(null);
  useEffect(() => {
    const update = () => setTime(getTimeOfDay());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const firstName = name.trim().split(/\s+/)[0];
  const question = choice.copy.greetingQuestion[time ?? "morning"].replace(
    "{name}",
    firstName ? `, ${firstName}` : "",
  );
  return <span>{question}</span>;
}

const modelGroups = [
  {
    id: "flagship",
    models: [
      "GPT-4o",
      "GPT-4o Mini",
      "Claude Sonnet 5",
      "Claude Haiku 4.5",
      "DeepSeek R1",
      "DeepSeek V3",
      "Gemini 2.5 Flash",
      "Gemini 2.5 Pro",
    ],
  },
  {
    id: "specialized",
    models: [
      "Llama 3.3 70B",
      "Mistral Large",
      "Qwen 2.5 Coder 32B",
      "Qwen 2.5 72B",
      "Hermes 3 405B",
    ],
  },
  { id: "fast", models: ["Llama 3.1 8B", "Gemma 3 12B"] },
] as const;
const allModels = modelGroups.flatMap((group) => group.models);

function useWorkspaceChoice() {
  const { lang } = useDashboard();
  const copy = chatWorkspaceText[lang];
  const [mode, setMode] = useState<Mode>("chat");
  // Auto (TechNova Smart) by default; a specific model is the Expert choice.
  const [model, setModel] = useState(SMART_MODEL);
  const [imageModel, setImageModel] = useState(defaultImageModel);
  const [videoModel, setVideoModel] = useState(defaultVideoModel);
  // Deep Research stays on for the browser session until switched off (it costs more than a reply).
  const [research, setResearch] = useState(false);
  useEffect(() => {
    try { setResearch(sessionStorage.getItem("technova-research") === "1"); } catch { /* storage blocked */ }
    const storedImage = localStorage.getItem("technova-image-model");
    const storedVideo = localStorage.getItem("technova-video-model");
    if (storedImage && findMediaModel(storedImage)?.kind === "image") setImageModel(storedImage);
    if (storedVideo && findMediaModel(storedVideo)?.kind === "video") setVideoModel(storedVideo);
    const storedMode = localStorage.getItem("technova-workspace-mode");
    const storedModel = localStorage.getItem("technova-workspace-model");
    if (storedMode === "chat" || storedMode === "create") setMode(storedMode);
    if (storedModel && (storedModel === SMART_MODEL || openRouterModelIds[storedModel])) setModel(storedModel);
  }, []);
  function chooseMode(value: Mode) {
    setMode(value);
    localStorage.setItem("technova-workspace-mode", value);
  }
  function chooseModel(value: string) {
    setModel(value);
    localStorage.setItem("technova-workspace-model", value);
  }
  function chooseMediaModel(value: string) {
    const spec = findMediaModel(value);
    if (!spec) return;
    if (spec.kind === "image") { setImageModel(value); localStorage.setItem("technova-image-model", value); }
    else if (spec.kind === "video") { setVideoModel(value); localStorage.setItem("technova-video-model", value); }
  }
  function toggleResearch() {
    setResearch((on) => {
      try { sessionStorage.setItem("technova-research", on ? "0" : "1"); } catch { /* storage blocked */ }
      return !on;
    });
  }
  return { mode, model: mode === "create" ? SMART_MODEL : model, imageModel, videoModel, musicModel: defaultMusicModel, research: mode === "chat" && research, toggleResearch, chooseMode, chooseModel, chooseMediaModel, copy };
}

function ChoiceControls({ choice }: { choice: ReturnType<typeof useWorkspaceChoice> }) {
  const [filter, setFilter] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const { mode, model, chooseMode, chooseModel, copy, imageModel, videoModel, chooseMediaModel } = choice;
  const fr = copy.locale.startsWith("fr");
  const q = filter.toLowerCase();
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Popover open={modeOpen} onOpenChange={setModeOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={copy.chooseMode}
            className="h-9 min-w-0 rounded-full border border-border/70 bg-card/80 px-2.5 text-xs font-semibold sm:px-3"
          >
            <span className="grid size-5 place-items-center rounded-full bg-chat-glow text-chat-glow-foreground">
              {mode === "chat" ? (
                <MessageCircle className="size-3" />
              ) : (
                <Code2 className="size-3" />
              )}
            </span>
            {copy[mode]}
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-64 rounded-2xl border-border bg-popover p-1.5 shadow-soft"
        >
          {(["chat", "create"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              variant="ghost"
              onClick={() => {
                chooseMode(item);
                setModeOpen(false);
              }}
              className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
                {item === "chat" ? (
                  <MessageCircle className="size-4" />
                ) : (
                  <Code2 className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1 whitespace-normal">
                <strong className="block text-xs">{copy[item]}</strong>
                <small className="block text-[10px] font-normal text-muted-foreground">
                  {copy[`${item}Hint`]}
                </small>
              </span>
              {mode === item && <Check className="size-3.5 text-chat-glow" />}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
      <span className="h-5 w-px bg-border" />
      {mode === "create" ? (
        <span
          title={copy.locale.startsWith("fr") ? "TechNova Smart choisit automatiquement le meilleur modèle au meilleur prix" : "TechNova Smart picks the best model at the best price automatically"}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 text-xs font-medium"
        >
          <Wand2 className="size-3.5 text-chat-glow" />
          {SMART_MODEL}
        </span>
      ) : (
      <Popover open={modelOpen} onOpenChange={setModelOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={copy.chooseModel}
            className="h-9 min-w-0 max-w-[125px] rounded-full border border-border/70 bg-card/80 px-2.5 text-xs font-medium min-[400px]:max-w-[155px] sm:max-w-[200px]"
          >
            <span className="truncate">{model}</span>
            <ChevronDown className="size-3 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[min(330px,calc(100vw-32px))] rounded-2xl border-border bg-popover p-0 shadow-soft"
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={copy.searchModels}
                aria-label={copy.searchModels}
                className="h-9 rounded-full pl-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[min(420px,55vh)] overflow-y-auto p-1.5">
            {SMART_MODEL.toLowerCase().includes(q) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { chooseModel(SMART_MODEL); setModelOpen(false); setFilter(""); }}
                className="mb-1 h-auto w-full justify-between rounded-xl px-2.5 py-2 text-left text-xs font-normal"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Wand2 className="size-3.5 shrink-0 text-chat-glow" />
                  <span className="min-w-0">
                    <strong className="block">{SMART_MODEL} · Auto</strong>
                    <small className="block text-[10px] text-muted-foreground">{fr ? "Choisit le modèle adapté au meilleur prix" : "Picks the right model at the best price"}</small>
                  </span>
                </span>
                {model === SMART_MODEL && <Check className="size-3.5 text-chat-glow" />}
              </Button>
            )}
            {modelGroups.map((group) => {
              const matches = group.models.filter((item) =>
                item.toLowerCase().includes(filter.toLowerCase()),
              );
              return matches.length ? (
                <div key={group.id} className="mb-2">
                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {copy[group.id]}
                  </p>
                   {matches.map((item) => (
                     <Button
                      key={item}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        chooseModel(item);
                        setModelOpen(false);
                        setFilter("");
                      }}
                      className="h-8 w-full justify-between rounded-xl px-2.5 text-xs font-normal"
                    >
                      <span className="truncate">{item}</span>
                      {item === model && <Check className="size-3.5 text-chat-glow" />}
                    </Button>
                  ))}
                </div>
              ) : null;
            })}
            {(["image", "video", "music"] as const).map((kind) => {
              const matches = mediaModels.filter((m) => m.kind === kind && (m.label + " " + m.provider).toLowerCase().includes(q));
              const selected = kind === "image" ? imageModel : kind === "video" ? videoModel : defaultMusicModel;
              return matches.length ? (
                <div key={kind} className="mb-2">
                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {kind === "image" ? (fr ? "Génération d’images" : "Image generation") : kind === "video" ? (fr ? "Génération de vidéos" : "Video generation") : (fr ? "Génération de musique" : "Music generation")}
                  </p>
                  {matches.map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      variant="ghost"
                      onClick={() => chooseMediaModel(m.id)}
                      className="h-auto min-h-8 w-full justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-normal"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {kind === "image" ? <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" /> : kind === "video" ? <Film className="size-3.5 shrink-0 text-muted-foreground" /> : <Music className="size-3.5 shrink-0 text-muted-foreground" />}
                        <span className="truncate">{m.label}</span>
                        <span className="truncate text-[10px] text-muted-foreground">{m.provider}</span>
                        {m.cheap && <span className="shrink-0 rounded-full bg-chat-glow/15 px-1.5 py-0.5 text-[9px] font-semibold text-chat-glow">{fr ? "Économique" : "Low cost"}</span>}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1.5">
                        {/* Price shown before generating: the full amount reserved (5 s for videos). */}
                        <span className="text-[10px] tabular-nums text-muted-foreground">{mediaReserve(m, 5).toLocaleString(fr ? "fr-FR" : "en-US")} cr.{kind === "video" ? " / 5 s" : ""}</span>
                        {m.id === selected && <Check className="size-3.5 shrink-0 text-chat-glow" />}
                      </span>
                    </Button>
                  ))}
                </div>
              ) : null;
            })}
            <p className="px-2.5 pb-1 text-[10px] leading-relaxed text-muted-foreground">
              {fr ? "Demandez « génère-moi une image… », « une vidéo… » ou « une chanson… » : le modèle coché est utilisé. Prix en crédits, réservés avant la création ; seul le coût réel est facturé." : "Ask “generate an image…”, “a video…” or “a song…”: the checked model is used. Prices in credits, reserved up front; only the real cost is charged."}
            </p>
            {!allModels.some((item) => item.toLowerCase().includes(q)) && !mediaModels.some((m) => (m.label + " " + m.provider).toLowerCase().includes(q)) && (
              <p className="px-3 py-5 text-center text-xs text-muted-foreground">{copy.noModels}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      )}
    </div>
  );
}

function setTextareaValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function VoiceButton({ inputRef }: { inputRef?: React.RefObject<HTMLTextAreaElement | null> | undefined }) {
  const { lang } = useDashboard();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<{ stop: () => void } | null>(null);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setSupported(Boolean(w['SpeechRecognition'] || w['webkitSpeechRecognition']));
    return () => recRef.current?.stop();
  }, []);
  function toggle() {
    if (listening) { recRef.current?.stop(); return; }
    const w = window as unknown as Record<string, any>;
    const Ctor = w['SpeechRecognition'] || w['webkitSpeechRecognition'];
    const el = inputRef?.current;
    if (!Ctor || !el) return;
    const rec = new Ctor();
    rec.lang = lang === "fr" ? "fr-FR" : "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    const base = el.value ? el.value.trimEnd() + " " : "";
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTextareaValue(el, base + text);
    };
    rec.onend = () => { setListening(false); recRef.current = null; el.focus(); };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }
  if (!supported) return null;
  const label = listening ? (lang === "fr" ? "Arrêter la dictée" : "Stop dictation") : (lang === "fr" ? "Dicter un message" : "Dictate a message");
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={listening}
      className={`grid size-8 place-items-center rounded-full border transition-colors ${listening ? "voice-live border-transparent" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
      {listening ? <Square className="size-3 fill-current" /> : <Mic className="size-4" />}
    </button>
  );
}

function MessageActionsRow({ text }: { text: string }) {
  const { lang } = useDashboard();
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const label = lang === "fr" ? "Copier" : "Copy";
  return (
    <div className="-mt-3 flex items-center gap-0.5">
      <button type="button" aria-label={label} title={label} onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

function ChatComposer({
  choice,
  onSubmit,
  disabled,
  inputRef,
}: {
  choice: ReturnType<typeof useWorkspaceChoice>;
  onSubmit: (text: string, files: ChatFilePart[]) => Promise<void>;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { copy, mode } = choice;
  const { lang } = useDashboard();
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? ownRef;
  // A design picked in the Design Library arrives as a draft: switch to Créer and prefill the brief.
  useEffect(() => {
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(DESIGN_DRAFT_KEY); sessionStorage.removeItem(DESIGN_DRAFT_KEY); } catch { return; }
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { mode?: string; text?: string };
      if (draft.mode === "create") choice.chooseMode("create");
      const el = textareaRef.current;
      if (el && typeof draft.text === "string") { setTextareaValue(el, draft.text); el.focus(); el.setSelectionRange(0, 0); }
    } catch { /* malformed draft: ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [files, setFiles] = useState<ChatFilePart[]>([]);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  async function pick(list: FileList | null) {
    if (!list?.length) return;
    setFileError(""); setReading(true);
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) { setFileError(lang === "fr" ? `${MAX_FILES} fichiers maximum.` : `${MAX_FILES} files maximum.`); break; }
      try { next.push(await toFilePart(file)); }
      catch (e) { setFileError(e instanceof Error && e.message === "too-large" ? (lang === "fr" ? `« ${file.name} » est trop lourd (3 Mo maximum par fichier PDF, audio ou vidéo).` : `"${file.name}" is too large (3 MB max per PDF, audio or video file).`) : (lang === "fr" ? `Format non pris en charge : ${file.name}` : `Unsupported format: ${file.name}`)); }
    }
    setFiles(next); setReading(false);
    if (fileInput.current) fileInput.current.value = "";
  }
  const attachLabel = lang === "fr" ? "Joindre une image, un PDF, un audio ou une vidéo" : "Attach an image, PDF, audio or video";
  return (
    <div className="w-full">
      <PromptInput
        onSubmit={async ({ text }) => {
          if (!text.trim() && !files.length) return;
          const sent = files; setFiles([]); setFileError("");
          await onSubmit(text, sent);
        }}
        className="chat-composer rounded-[26px] border border-border bg-card"
      >
        {files.length > 0 && (
          <div className="flex w-full flex-wrap gap-2 px-3 pt-3">
            {files.map((f, i) => <AttachmentChip key={i} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />)}
          </div>
        )}
        <PromptInputTextarea
          ref={textareaRef}
          autoFocus
          disabled={disabled}
          placeholder={mode === "chat" ? copy.chatPlaceholder : copy.createPlaceholder}
          className="min-h-[56px] max-h-48 px-4 pt-3.5 text-[14px]"
        />
        <PromptInputFooter className="min-h-12 flex-wrap justify-between gap-2 px-2 pb-2">
          <ChoiceControls choice={choice} />
          <div className="flex items-center gap-1.5">
            <input ref={fileInput} data-chat-attach type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => void pick(e.target.files)} />
            {mode === "chat" && (
              <button
                type="button"
                onClick={choice.toggleResearch}
                aria-pressed={choice.research}
                title={lang === "fr" ? `Recherche approfondie sur le web avec sources (jusqu'à ${RESEARCH_MAX_CREDITS} crédits, facturée au coût réel)` : `Deep web research with sources (up to ${RESEARCH_MAX_CREDITS} credits, billed at real cost)`}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors disabled:opacity-50", choice.research ? "border-chat-glow bg-chat-glow/10 text-foreground" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground")}
                disabled={disabled}
              >
                <Telescope className="size-4" />
                <span className="hidden sm:inline">{lang === "fr" ? "Recherche" : "Research"}</span>
              </button>
            )}
            <button type="button" onClick={() => fileInput.current?.click()} disabled={disabled || reading} aria-label={attachLabel} title={attachLabel}
              className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50">
              {reading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            </button>
            <VoiceButton inputRef={textareaRef} />
            <PromptInputSubmit
              disabled={disabled || reading}
              aria-label={copy.saveIdea}
              className="size-8 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/85"
            />
          </div>
        </PromptInputFooter>
      </PromptInput>
      {fileError && <p role="alert" className="mt-2 text-center text-xs text-destructive">{fileError}</p>}
    </div>
  );
}

function AttachmentChip({ file, onRemove }: { file: ChatFilePart; onRemove?: () => void }) {
  const kind = kindOf(file.mediaType);
  const Icon = kind === "audio" ? FileAudio : kind === "video" ? FileVideo : FileText;
  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-border bg-background p-1.5 pr-3 text-[12px]">
      {kind === "image" && file.url ? <img src={file.url} alt={file.filename} className="size-10 rounded-lg object-cover" /> : <span className="grid size-10 place-items-center rounded-lg bg-secondary"><Icon className="size-4 text-muted-foreground" /></span>}
      <span className="max-w-[140px] truncate">{file.filename}</span>
      {onRemove && <button type="button" onClick={onRemove} aria-label="Retirer" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"><X className="size-3" /></button>}
    </div>
  );
}

export function ChatListPage() {
  const { threads, reload, t } = useDashboard();
  const choice = useWorkspaceChoice();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filtered = threads.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  async function start(text = "", files: ChatFilePart[] = []) {
    if (busy) return;
    setBusy(true);
    setError("");
    const title = text.trim() ? text.trim().replace(/\s+/g, " ").slice(0, 65) : files[0]?.filename.slice(0, 65) || t.newChat;
    const { data, error: insertError } = await supabase
      .from("chat_threads")
      .insert({ title })
      .select("id")
      .single();
    if (insertError || !data) {
      setError(t.actionError);
      setBusy(false);
      return;
    }
    if (text.trim() || files.length) {
      const sdkId = crypto.randomUUID();
      const { error: noteError } = await supabase.from("chat_messages").insert({
        thread_id: data.id,
        sdk_id: sdkId,
        role: "user",
        parts: persistableParts(sdkId, [{ type: "text", text: text.trim() }, ...files]) as Json,
      });
      if (noteError) {
        await supabase.from("chat_threads").delete().eq("id", data.id);
        setError(t.actionError);
        setBusy(false);
        return;
      }
    }
    await reload();
    void navigate({ to: "/dashboard/chat/$threadId", params: { threadId: data.id } });
  }
  return (
    <div className="chat-workspace chat-home relative -mx-4 -mt-6 min-h-[calc(100svh-80px)] lg:min-h-[calc(100svh-32px)] overflow-hidden sm:-mx-6 lg:-mx-7">
      <div className="relative mx-auto flex min-h-[calc(100svh-80px)] lg:min-h-[calc(100svh-32px)] max-w-[1330px] flex-col px-4 pb-8 sm:px-8 lg:px-12">
        <section className="flex flex-1 flex-col items-center justify-center gap-7 py-12 sm:gap-8 sm:py-16">
          <div className="text-center">
            <h1 className="max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
              <ChatGreeting choice={choice} />
            </h1>
          </div>
          <div className="w-full max-w-[660px]">
            <ChatComposer choice={choice} disabled={busy} onSubmit={start} />
            {error && (
              <p role="alert" className="mt-3 text-center text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </section>
        <section className="chat-library relative w-full rounded-2xl border border-border/70 bg-card/85 p-4 shadow-soft backdrop-blur-xl sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-chat-glow">
                {choice.copy.libraryLabel}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold">{choice.copy.library}</h2>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {threads.length} {choice.copy.saved}
            </span>
          </div>
          <div className="relative mt-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="h-9 rounded-full bg-background/80 pl-9 text-xs"
            />
          </div>
          <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((thread) => (
              <Link
                key={thread.id}
                to="/dashboard/chat/$threadId"
                params={{ threadId: thread.id }}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/75 px-4 py-3 transition-colors hover:border-chat-glow/50 hover:bg-chat-glow/5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-chat-glow">
                  <MessageCircle className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs font-semibold">{thread.title}</strong>
                  <small className="text-[10px] text-muted-foreground">
                    {new Date(thread.updated_at).toLocaleDateString(choice.copy.locale)}
                  </small>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="py-5 text-xs text-muted-foreground">
                {query ? t.noResults : t.noChats}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ThreadPage({ threadId }: { threadId: string }) {
  const { t, reload, createThread, lang, setArtifactWorkspaceOpen } = useDashboard();
  const choice = useWorkspaceChoice();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoReplied = useRef(false);
  const [agent, setAgent] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => { try { const a = JSON.parse(localStorage.getItem("technova-active-agent") ?? "null"); if (a?.id && a?.name) setAgent(a); } catch { /* ignore */ } }, []);
  const clearAgent = () => { localStorage.removeItem("technova-active-agent"); setAgent(null); };
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const createMedia = useServerFn(createMediaGeneration);
  const videoAccess = useServerFn(getVideoAccess);
  const [upgrade, setUpgrade] = useState<{ feature: "video" | "site"; balance: number } | null>(null);
  // Shows the plan upgrade card; the balance comes from the server, which also decides access.
  async function showUpgrade(feature: "video" | "site") {
    const access = await videoAccess().catch(() => null);
    setUpgrade({ feature, balance: access?.balance ?? 0 });
  }
  const refreshMedia = useServerFn(refreshMediaGeneration);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [researchStatus, setResearchStatus] = useState("");
  const [artifact, setArtifact] = useState<StudioBuild | null>(null);
  const [activity, setActivity] = useState<StudioBuild | null>(null);
  const [activityView, setActivityView] = useState(0);
  const [showArtifact, setShowArtifact] = useState(false);
  const panelBuild = activity ?? artifact;
  const artifactIsOpen = showArtifact && Boolean(panelBuild);
  useEffect(() => {
    setArtifactWorkspaceOpen(artifactIsOpen);
    return () => setArtifactWorkspaceOpen(false);
  }, [artifactIsOpen, setArtifactWorkspaceOpen]);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try { return Number(localStorage.getItem("tn-artifact-width")) || 0; } catch { return 0; }
  });
  const splitRef = useRef<HTMLDivElement | null>(null);
  const clampPanel = (w: number, containerW: number) =>
    Math.min(Math.max(w, 360), Math.max(360, containerW - 380));
  const startPanelDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const handle = splitRef.current;
    const container = handle?.parentElement;
    if (!handle || !container || e.button !== 0) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    try { handle.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const onMove = (ev: PointerEvent) => {
      setPanelWidth(clampPanel(Math.round(rect.right - ev.clientX), rect.width));
    };
    const stop = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem("tn-artifact-width", String(panelWidthRef.current)); } catch { /* ignore */ }
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };
  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;
  useEffect(() => {
    if (!panelWidth) return;
    const onResize = () => {
      const container = splitRef.current?.parentElement;
      if (container) setPanelWidth((w) => clampPanel(w, container.getBoundingClientRect().width));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [panelWidth]);
  const navigate = useNavigate();
  useEffect(() => {
    let live = true;
    setLoading(true);
    setMessages([]);
    setArtifact(null);
    setActivity(null);
    setShowArtifact(false);
    autoReplied.current = false;
    setThread(null);
    setError("");
    void (async () => {
      const [{ data: selected, error: threadError }, { data: rows, error: messageError }] =
        await Promise.all([
          supabase.from("chat_threads").select("*").eq("id", threadId).maybeSingle(),
          supabase
            .from("chat_messages")
            .select("sdk_id,role,parts")
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true }),
        ]);
      if (!live) return;
      if (threadError || messageError || !selected) setError(t.loadError);
      else {
        setThread(selected);
        setTitle(selected.title);
        const lastBuild = [...(rows ?? [])].reverse().flatMap((r) => (Array.isArray(r.parts) ? (r.parts as Array<{ type?: string; data?: StudioData }>) : []))
          .find((p) => p.type === "data-studio" && p.data?.kind === "build")?.data;
        if (lastBuild?.kind === "build") setArtifact(lastBuild.build);
        const runningId = (rows ?? []).find((r) => (Array.isArray(r.parts) ? (r.parts as Array<{ type?: string; data?: StudioData }>) : []).some((p) => p.type === "data-studio" && p.data?.kind === "build" && p.data.jobStatus === "running" && !p.data.build.done))?.sdk_id;
        if (runningId) {
          setShowArtifact(true);
          setTimeout(() => void followBuildRef.current?.(runningId), 0);
        }
        setMessages(
          (rows ?? []).filter((row) => Array.isArray(row.parts) && row.parts.length > 0).map((row) => ({
            id: row.sdk_id,
            role: row.role as "user" | "assistant",
            parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [threadId, t.loadError]);
  useEffect(() => {
    const pending = messages.flatMap((message) => message.parts.flatMap((part) => {
      if ((part.type as string) !== "data-media") return [];
      const data = (part as unknown as { data: ChatMediaData }).data;
      return data && !["success", "fail"].includes(data.status) ? [data.id] : [];
    }));
    if (!pending.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void Promise.allSettled(pending.map((id) => refreshMedia({ data: { id, threadId } }))).then((results) => {
        if (!active) return;
        for (const result of results) {
          if (result.status === "rejected") { setError(String(result.reason?.message ?? result.reason)); continue; }
          const data = result.value;
          if (!data) continue;
          setMessages((prev) => prev.map((message) => message.id === data.id
            ? { ...message, parts: [{ type: "data-media", data }] as unknown as UIMessage["parts"] } : message));
        }
      });
    }, 5000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [messages, refreshMedia, threadId]);
  useEffect(() => {
    if (!loading && thread && !editing) inputRef.current?.focus();
  }, [loading, thread, editing]);
  async function saveTitle() {
    if (!title.trim()) return;
    setBusy(true);
    const nextTitle = title.trim().slice(0, 100);
    const { error: saveError } = await supabase
      .from("chat_threads")
      .update({ title: nextTitle, updated_at: new Date().toISOString() })
      .eq("id", threadId);
    setBusy(false);
    if (saveError) {
      setError(t.actionError);
      return;
    }
    setThread((current) => (current ? { ...current, title: nextTitle } : current));
    setEditing(false);
    await reload();
  }
  async function removeThread() {
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    const { error: deleteError } = await supabase.from("chat_threads").delete().eq("id", threadId);
    setBusy(false);
    if (deleteError) {
      setError(t.actionError);
      return;
    }
    await reload();
    void navigate({ to: "/dashboard/chat", replace: true });
  }
  async function studioCall(payload: Record<string, unknown>) {
    const { data: session } = await supabase.auth.getSession();
    return fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
      body: JSON.stringify({ lang, ...payload }),
    });
  }
  async function saveStudio(id: string, data: StudioData, update = false) {
    const parts = [{ type: "data-studio", data }] as unknown as Json;
    setMessages((prev) => {
      const next: UIMessage = { id, role: "assistant", parts: [{ type: "data-studio", data }] as unknown as UIMessage["parts"] };
      return prev.some((m) => m.id === id) ? prev.map((m) => (m.id === id ? next : m)) : [...prev, next];
    });
    if (update) await supabase.from("chat_messages").update({ parts }).eq("thread_id", threadId).eq("sdk_id", id);
    else await supabase.from("chat_messages").insert({ thread_id: threadId, sdk_id: id, role: "assistant", parts });
  }
  async function studioStage(stage: "questions" | "plan", payload: Record<string, unknown>) {
    setThinking(true);
    setActivity({ steps: [{ title: stage === "questions" ? (lang === "fr" ? "Analyse de votre demande" : "Analysing your request") : (lang === "fr" ? "Préparation du plan" : "Preparing the plan"), detail: "", done: false }], files: [], sql: "", done: false });
    setPanelWidth(0);
    setShowArtifact(true);
    try {
      const res = await studioCall({ stage, ...payload });
      const raw = (await res.text().catch(() => "")).trim();
      if (!res.ok) {
        if (raw.includes("STUDIO_UPGRADE_REQUIRED")) await showUpgrade("site"); else setError(raw || t.actionError);
        return null;
      }
      const json = JSON.parse(raw) as Record<string, unknown>;
      if (typeof json["error"] === "string") { setError(json["error"]); return null; }
      return json;
    } catch {
      setError(lang === "fr" ? "La connexion au studio a été interrompue. Réessayez." : "The studio connection was interrupted. Try again.");
      return null;
    } finally { setThinking(false); setActivity(null); setShowArtifact(false); }
  }
  async function askQuestions(request: string) {
    const json = await studioStage("questions", { request });
    if (!json) return;
    await saveStudio(crypto.randomUUID(), { kind: "questions", request, intro: String(json["intro"] ?? ""), questions: Array.isArray(json["questions"]) ? (json["questions"] as Extract<StudioData, { kind: "questions" }>["questions"]).slice(0, 5) : [] });
  }
  async function makePlan(request: string, answers: string, feedback?: string, previous?: string) {
    const json = await studioStage("plan", { request, answers, ...(feedback ? { feedback, plan: previous } : {}) });
    if (!json) return false;
    await saveStudio(crypto.randomUUID(), { kind: "plan", request, answers, plan: json as unknown as Extract<StudioData, { kind: "plan" }>["plan"], status: "pending" });
    return true;
  }
  async function runStudio(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await fn(); } finally { setBusy(false); }
  }
  async function answerQuestions(msgId: string, data: Extract<StudioData, { kind: "questions" }>, answers: string) {
    await runStudio(async () => {
      await saveStudio(msgId, { ...data, answered: answers }, true);
      // Unlock the questions again if the plan could not be produced, so the user can retry.
      if (!(await makePlan(data.request, answers))) { const { answered: _a, ...rest } = data; await saveStudio(msgId, rest, true); }
    });
  }
  async function changePlan(msgId: string, data: Extract<StudioData, { kind: "plan" }>, feedback: string) {
    await runStudio(async () => {
      await saveStudio(msgId, { ...data, status: "changed" }, true);
      await makePlan(data.request, data.answers, feedback, JSON.stringify(data.plan));
    });
  }
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const activeThread = useRef(threadId);
  const followBuildRef = useRef<((id: string) => Promise<void>) | null>(null);
  useEffect(() => { activeThread.current = threadId; }, [threadId]);
  async function approvePlan(msgId: string, data: Extract<StudioData, { kind: "plan" }>) {
    await runStudio(async () => {
      await saveStudio(msgId, { ...data, status: "approved" }, true);
      await runBuild(data.request, data.answers, data.plan);
    });
  }
  async function retryBuild(request: string, answers: string, plan: StudioPlanData, oldId?: string) {
    await runStudio(async () => {
      if (oldId) {
        setMessages((prev) => prev.filter((m) => m.id !== oldId));
        await supabase.from("chat_messages").update({ parts: [] as unknown as Json }).eq("thread_id", threadId).eq("sdk_id", oldId);
      }
      await runBuild(request, answers, plan);
    });
  }
  /** Follows a server-side build by reading its saved message until it finishes. */
  async function followBuild(id: string) {
    setBuildingId(id);
    const myThread = threadId;
    try {
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        if (activeThread.current !== myThread) return;
        const { data: row } = await supabase.from("chat_messages").select("parts").eq("thread_id", myThread).eq("sdk_id", id).maybeSingle();
        const part = (Array.isArray(row?.parts) ? (row.parts as Array<{ type?: string; data?: StudioData }>) : []).find((p) => p.type === "data-studio")?.data;
        if (part?.kind !== "build") continue;
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, parts: [{ type: "data-studio", data: part }] as unknown as UIMessage["parts"] } : m)));
        setArtifact(part.build);
        if (part.jobStatus === "failed") {
          setError(part.jobError === "credits"
            ? (lang === "fr" ? "Crédits IA de l'espace épuisés. La génération est en pause." : "AI credits exhausted. Generation is paused.")
            : (lang === "fr" ? "La génération n'a pas pu se terminer. Cliquez sur « Reprendre la génération »." : "Generation could not finish. Click “Resume generation”."));
          return;
        }
        if (part.jobStatus === "done" || part.build.done) return;
      }
    } finally { if (activeThread.current === myThread) setBuildingId(null); }
  }
  followBuildRef.current = followBuild;
  async function runBuild(request: string, answers: string, plan: StudioPlanData) {
    const id = crypto.randomUUID();
    const build: StudioBuild = { steps: [{ title: lang === "fr" ? "Préparation" : "Preparing", detail: "", done: false }], files: [], sql: "", done: false };
    setArtifact(build);
    setActivity(null);
    setActivityView((v) => v + 1);
    setPanelWidth(0);
    setShowArtifact(true);
    await saveStudio(id, { kind: "build", request, answers, plan, build, jobStatus: "running" });
    const { data: session } = await supabase.auth.getSession();
    // The server runs the whole build and saves it; closing or reloading the page no longer stops it.
    const res = await fetch("/api/studio-job", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
      body: JSON.stringify({ threadId, messageId: id, lang, request, answers, plan }),
    }).catch(() => null);
    if (!res?.ok) {
      const msg = res ? await res.text().catch(() => "") : "";
      await saveStudio(id, { kind: "build", request, answers, plan, build, jobStatus: "failed" }, true);
      if (msg.includes("STUDIO_UPGRADE_REQUIRED")) await showUpgrade("site"); else setError(msg || t.actionError);
      return;
    }
    // Keep the connection open while the page is here; the server keeps going if it drops.
    void res.text().catch(() => "");
    await followBuild(id);
  }
  async function streamReply(history: UIMessage[]) {
    const last = history[history.length - 1];
    const request = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim() ?? "";
    if (last?.role === "user" && request && choice.research) {
      const researchId = crypto.randomUUID();
      const show = (text: string) => setMessages((prev) => [...prev.filter((m) => m.id !== researchId), { id: researchId, role: "assistant", parts: [{ type: "text", text }] }]);
      setThinking(true);
      setResearchStatus(lang === "fr" ? "Recherche approfondie en cours…" : "Deep research in progress…");
      let raw = "";
      let report = "";
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` },
          body: JSON.stringify({ question: request, lang }),
        });
        if (!res.ok || !res.body) { setError((await res.text().catch(() => "")) || t.actionError); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const parts = splitResearchStream(raw);
          if (parts.status) setResearchStatus(parts.status);
          if (parts.report) { report = parts.report; setThinking(false); show(report); }
        }
        if (report) {
          await supabase.from("chat_messages").insert({ thread_id: threadId, sdk_id: researchId, role: "assistant", parts: [{ type: "text", text: report }] as Json });
        }
      } catch {
        setError(t.actionError);
      } finally {
        setThinking(false);
        setResearchStatus("");
      }
      return;
    }
    const mediaRequest = choice.mode === "chat" && /\b(?:g[ée]n[èe]re(?:z)?(?:-moi)?|cr[ée]e(?:z)?(?:-moi)?|fais(?:-moi)?|fabrique(?:-moi)?|generate|create|make)\b[\s\S]{0,110}\b(?:image|photo|illustration|visuel|picture|image|video|vid[ée]o|clip|animation|musique|chanson|morceau|jingle|beat|music|song|track)\b/i.test(request);
    if (last?.role === "user" && mediaRequest) {
      const kind: MediaKind = /\b(?:musique|chanson|morceau|jingle|beat|music|song|track)\b/i.test(request) ? "music" : /\b(?:vid[ée]o|video|clip|animation)\b/i.test(request) ? "video" : "image";
      const mediaModel = kind === "image" ? choice.imageModel : kind === "video" ? choice.videoModel : choice.musicModel;
      const aspectRatio = /\b(?:9:16|portrait|vertical|story|reel)\b/i.test(request) ? "9:16" : /\b(?:1:1|carr[ée]|square)\b/i.test(request) ? "1:1" : "16:9";
      const duration = /\b(?:10\s*(?:s|sec|secondes?|seconds?))\b/i.test(request) ? "10" : "5";
      setThinking(true);
      try {
        const id = await createMedia({ data: { threadId, kind, prompt: request, aspectRatio, model: mediaModel, ...(kind === "video" ? { duration } : {}) } });
        const media: ChatMediaData = { id, kind, model: findMediaModel(mediaModel)?.label ?? "", prompt: request, status: "waiting", progress: null, urls: [], error: null };
        setMessages((prev) => [...prev, { id, role: "assistant", parts: [{ type: "data-media", data: media }] as unknown as UIMessage["parts"] }]);
      } catch (e) {
        const message = String((e as Error)?.message ?? e);
        if (message.includes(VIDEO_UPGRADE_REQUIRED)) {
          await showUpgrade("video");
        } else setError(message);
      }
      finally { setThinking(false); }
      return;
    }
    const looksLikeBuild = /\b(cr[ée]e|cr[ée]er|construi\w*|g[ée]n[èe]re\w*|d[ée]veloppe\w*|fais|code|build|create|make|generate)\b[\s\S]{0,60}\b(site|landing|page|app|application|syst[èe]me|dashboard|tableau|boutique|portfolio|api|script|composant|component|base de donn[ée]es|database|jeu|game|formulaire|form)/i.test(request);
    if (last?.role === "user" && request && choice.mode === "create") {
      setThinking(true);
      setActivity({ steps: [{ title: lang === "fr" ? "Analyse de la demande" : "Analysing the request", detail: "", done: false }], files: [], sql: "", done: false });
      setPanelWidth(0);
      setShowArtifact(true);
      const res = await studioCall({ stage: "intent", request }).catch(() => null);
      const intent = res?.ok ? ((await res.json().catch(() => null)) as { intent?: string } | null)?.intent : null;
      setThinking(false);
      setActivity(null);
      setShowArtifact(false);
      if (intent === "build" || (intent == null && looksLikeBuild)) { await askQuestions(request); return; }
    } else if (last?.role === "user" && looksLikeBuild) {
      await askQuestions(request); return;
    }
    await chatReply(history);
  }
  function renderStudio(msgId: string, data: StudioData) {
    if (data.kind === "questions") return <StudioQuestions data={data} lang={lang} disabled={busy} onSubmit={(a) => void answerQuestions(msgId, data, a)} />;
    if (data.kind === "plan") {
      const idx = messages.findIndex((m) => m.id === msgId);
      const hasBuild = messages.slice(idx + 1).some((m) => m.parts.some((p) => p.type === "data-studio" && (p as unknown as { data: StudioData }).data.kind === "build"));
      const onRetry = data.status === "approved" && !hasBuild ? () => void retryBuild(data.request, data.answers, data.plan) : undefined;
      return <StudioPlan data={data} lang={lang} disabled={busy} onApprove={() => void approvePlan(msgId, data)} onChange={(f) => void changePlan(msgId, data, f)} {...(onRetry ? { onRetry } : {})} />;
    }
    const b = data;
    const onRetry = !b.build.done && buildingId !== msgId && b.jobStatus !== "running" && b.plan ? () => void retryBuild(b.request, b.answers ?? "", b.plan as StudioPlanData, msgId) : undefined;
    return <StudioTimeline build={data.build} lang={lang} disabled={busy} onOpen={() => { setArtifact(data.build); setActivityView((v) => v + 1); setShowArtifact(true); }} {...(onRetry ? { onRetry } : {})} />;
  }
  async function chatReply(history: UIMessage[]) {
    const assistantId = crypto.randomUUID();
    const textOf = (m: UIMessage) =>
      m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    const setAssistant = (text: string) =>
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== assistantId);
        return [...rest, { id: assistantId, role: "assistant", parts: [{ type: "text", text }] }];
      });
    // Send media only for the latest few turns, newest first, within the request size budget.
    const payload = budgetFiles(history.slice(-30).map((m) => ({
      role: m.role,
      content: textOf(m),
      files: (m.parts as unknown as Array<{ type: string } & Partial<ChatFilePart>>).flatMap((p, i) =>
        p.type === "file" ? [{ mediaType: p.mediaType ?? "", filename: p.filename ?? "file", url: p.url || pendingMedia.get(mediaKey(m.id, i)) || "" }] : []).filter((f) => f.url),
    })));
    const last = history[history.length - 1];
    const lastSent = payload[payload.length - 1];
    if (last?.role === "user" && last.parts.some((p) => p.type === "file") && !lastSent?.files?.length) {
      setError(lang === "fr" ? "Vos fichiers dépassent la taille maximale d'envoi (environ 3 Mo au total). Retirez-en un ou réduisez leur taille." : "Your files exceed the maximum upload size (about 3 MB in total). Remove one or reduce their size.");
      return;
    }
    setThinking(true);
    let answer = "";
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          model: choice.model,
          mode: choice.mode,
          lang,
          ...(agent ? { agentId: agent.id } : {}),
          messages: payload,
        }),
      });
      if (!res.ok || !res.body) {
        setError((await res.text().catch(() => "")) || t.actionError);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setThinking(false);
        setAssistant(answer);
      }
      if (answer.trim()) {
        await supabase.from("chat_messages").insert({
          thread_id: threadId,
          sdk_id: assistantId,
          role: "assistant",
          parts: [{ type: "text", text: answer }] as Json,
        });
      }
    } catch {
      setError(t.actionError);
    } finally {
      setThinking(false);
    }
  }
  useEffect(() => {
    if (loading || !thread || autoReplied.current) return;
    autoReplied.current = true;
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      setBusy(true);
      void streamReply(messages).finally(() => setBusy(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, thread]);
  async function addNote(text: string, files: ChatFilePart[] = []) {
    if ((!text.trim() && !files.length) || busy || !thread) return;
    setBusy(true);
    setError("");
    setSaved(false);
    const clean = text.trim();
    const id = crypto.randomUUID();
    const parts = [...(clean ? [{ type: "text" as const, text: clean }] : []), ...files];
    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert({ thread_id: threadId, sdk_id: id, role: "user", parts: persistableParts(id, parts) as Json });
    if (insertError) {
      setError(t.actionError);
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    const nextMessages: UIMessage[] = [...messages, { id, role: "user", parts: parts as UIMessage["parts"] }];
    setMessages(nextMessages);
    const automaticTitle =
      messages.length === 0 && ["Nouvelle conversation", "New conversation"].includes(thread.title);
    const nextTitle = automaticTitle ? (clean || files[0]?.filename || thread.title).replace(/\s+/g, " ").slice(0, 65) : thread.title;
    const { error: touchError } = await supabase
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        ...(automaticTitle ? { title: nextTitle } : {}),
      })
      .eq("id", threadId);
    if (!touchError && automaticTitle) {
      setThread((current) => (current ? { ...current, title: nextTitle } : current));
      setTitle(nextTitle);
      void reload();
    }
    await streamReply(nextMessages);
    setSaved(true);
    setBusy(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  return (
    <div className="relative -mx-4 -mt-6 flex h-[calc(100svh-80px)] min-h-[480px] overflow-hidden sm:-mx-6 lg:-mx-7 lg:h-[calc(100svh-32px)]">
    <div className={cn("chat-thread relative flex min-w-0 flex-1 flex-col overflow-hidden", artifactIsOpen && "lg:min-w-[320px] lg:max-w-[560px] lg:basis-[480px] max-lg:hidden")}>
      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
        <div className="min-w-0">
          
          {editing ? (
            <div className="mt-1 flex max-w-sm gap-2">
              <Input
                autoFocus
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveTitle();
                  if (e.key === "Escape") setEditing(false);
                }}
                aria-label={t.titlePlaceholder}
                className="h-8 rounded-lg text-xs"
              />
              <Button
                size="icon-sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => void saveTitle()}
                aria-label={t.save}
              >
                <Check />
              </Button>
            </div>
          ) : (
            <h1 className="truncate text-[13px] font-semibold">
              {thread?.title || t.loading}
            </h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            title={t.rename}
            aria-label={t.rename}
            disabled={!thread || busy}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            title={t.remove}
            aria-label={t.remove}
            disabled={!thread || busy}
            onClick={() => void removeThread()}
          >
            <Trash2 />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            title={t.newChat}
            aria-label={t.newChat}
            onClick={() => void createThread()}
          >
            <Plus />
          </Button>
        </div>
      </div>
      {agent && (
        <div className="relative z-10 mx-auto mt-2 flex w-full max-w-3xl items-center gap-2 px-4 text-xs">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-medium text-foreground">{lang === "en" ? "Agent" : "Agent"} · {agent.name}</span>
          <button type="button" onClick={clearAgent} className="text-muted-foreground underline-offset-2 hover:underline">{lang === "en" ? "Stop using" : "Retirer"}</button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="relative z-10 mx-auto mt-2 w-full max-w-3xl px-4 text-xs text-destructive"
        >
          {error}
        </p>
      )}
      {upgrade && (() => {
        const fr = lang !== "en";
        const site = upgrade.feature === "site";
        const packs = site ? (["essential", "creator", "pro"] as const) : (["creator", "pro"] as const);
        const names = { essential: "Essential", creator: "Creator", pro: "Pro" } as const;
        return <div role="alert" className="relative z-10 mx-auto mt-2 w-full max-w-3xl px-4">
          <div className="rounded-2xl border border-border bg-card/95 p-4 text-sm shadow-sm backdrop-blur">
            <p className="font-medium">
              {site
                ? (fr ? "🌐 La création de sites web est réservée aux forfaits Essential (2499 frs), Creator (4999 frs) et Pro (7699 frs)." : "🌐 Website creation is reserved for the Essential (2,499 F), Creator (4,999 F) and Pro (7,699 F) plans.")
                : (fr ? "🎬 La génération vidéo est réservée aux forfaits Creator (4999 frs) et Pro (7699 frs)." : "🎬 Video generation is reserved for the Creator (4,999 F) and Pro (7,699 F) plans.")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {fr
                ? `Passez à un forfait supérieur pour débloquer ${site ? "les sites web" : "les vidéos"}. Il vous reste ${upgrade.balance.toLocaleString("fr-FR")} crédits.`
                : `Upgrade to unlock ${site ? "websites" : "videos"}. You have ${upgrade.balance.toLocaleString("en-US")} credits left.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {packs.map((slug) => (
                <Button key={slug} size="sm" variant={slug === "pro" ? "default" : "outline"} onClick={() => { try { localStorage.setItem(PENDING_PACK_KEY, slug); } catch { /* storage blocked */ } void navigate({ to: "/dashboard/credits" }); }}>
                  {fr ? `Passer à ${names[slug]}` : `Upgrade to ${names[slug]}`}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setUpgrade(null)}>{fr ? "Fermer" : "Close"}</Button>
            </div>
          </div>
        </div>;
      })()}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Conversation className="min-h-0 w-full">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
            {messages.length === 0 && !loading && (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <h2 className="font-display text-xl font-semibold">
                  <ChatGreeting choice={choice} />
                </h2>
                <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                  {choice.copy.emptyThread}
                </p>
              </div>
            )}
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent className="chat-msg text-[14px] leading-relaxed text-foreground group-[.is-user]:rounded-3xl group-[.is-user]:border group-[.is-user]:border-border group-[.is-user]:bg-card group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-assistant]:bg-transparent group-[.is-assistant]:px-0">
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      part.text ? <MessageResponse key={index}>{part.text}</MessageResponse> : null
                    ) : (part.type as string) === "data-studio" ? (
                      <div key={index} className="w-full">{renderStudio(message.id, (part as unknown as { data: StudioData }).data)}</div>
                    ) : (part.type as string) === "data-media" ? (
                      <ChatMedia key={index} data={(part as unknown as { data: ChatMediaData }).data} lang={lang} />
                    ) : part.type === "file" ? (
                      <div key={index} className="my-1"><AttachmentChip file={{ type: "file", mediaType: part.mediaType, filename: part.filename ?? "file", url: part.url }} /></div>
                    ) : null,
                  )}
                </MessageContent>
                {message.role === "assistant" && <MessageActionsRow text={message.parts.map(p => p.type === "text" ? p.text : "").join("")} />}
              </Message>
            ))}
            {thinking && (
              <Message from="assistant">
                <MessageContent className="bg-transparent px-0">
                  {activity ? <StudioTimeline build={activity} lang={lang} onOpen={() => { setActivityView((v) => v + 1); setShowArtifact(true); }} /> : <Shimmer>{researchStatus || (lang === "fr" ? "Réflexion en cours…" : "Thinking…")}</Shimmer>}
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        <ChatComposer
          choice={choice}
          inputRef={inputRef}
          disabled={loading || !thread || busy}
          onSubmit={addNote}
        />
        {saved && (
          <span role="status" className="sr-only">
            {t.draftSaved}
          </span>
        )}
      </div>
    </div>
    {artifactIsOpen && panelBuild && (
      <>
      <div
        ref={splitRef}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le panneau du projet"
        onPointerDown={startPanelDrag}
        onDoubleClick={() => { setPanelWidth(0); try { localStorage.removeItem("tn-artifact-width"); } catch { /* ignore */ } }}
        className="group relative z-50 hidden w-1.5 shrink-0 cursor-col-resize touch-none select-none lg:block"
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary/60" />
        <div className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div
        className="fixed inset-0 z-40 lg:static lg:z-auto lg:min-w-0 lg:flex-1 lg:basis-0"
        style={panelWidth ? { width: `${panelWidth}px`, flex: `0 0 ${panelWidth}px` } : undefined}
      >
        <div className="h-full w-full">
          <ArtifactPanel build={panelBuild} lang={lang} title={thread?.title ?? "projet"} activityView={activityView} onClose={() => setShowArtifact(false)} />
        </div>
      </div>
      </>
    )}
    </div>
  );
}
