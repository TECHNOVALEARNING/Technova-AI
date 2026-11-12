import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { confirmDialog } from "@/components/ConfirmHost";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  History,
  Share,
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
  Zap,
  Film,
  Image as ImageIcon,
  Telescope,
  Music,
  Library,
  AlertCircle,
  LayoutTemplate,
  ShoppingBag,
  BarChart3,
  Gamepad2,
  ScanEye,
  FileSearch,
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
import { ACCEPT, INDEXED_FILE_TYPE, MAX_FILES, budgetFiles, indexedFileId, indexedFileUrl, isDirectAttachment, kindOf, mediaKey, pendingMedia, persistableParts, toFilePart, type ChatFilePart } from "@/lib/chat-attachments";
import { ALL_ACCEPT, MAX_CHAT_DOCUMENTS, checkFile, formatsLabel } from "@/lib/file-types";
import { fileErrorText, uploadAndIndex, type UploadPhase } from "@/lib/file-upload";
import { chatTierIds, chatTiers, defaultChatChoice, EXPERT_MIN_TIER, isChatChoice, smartChoice, type ChatChoice } from "@/lib/chat-modes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faBrain, faScaleBalanced, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { usePlanTier } from "@/lib/plan-client";
import { cn } from "@/lib/utils";
import { ThinkingLine } from "./ThinkingSpinner";
import { ArtifactPanel, StudioPlan, StudioQuestions, StudioTimeline } from "./Studio";
import { parseBuild, type StudioBuild, type StudioData, type StudioPlanData } from "@/lib/studio";
import { featureMinTier, packSlugs, upgradeFeatureOf, upgradeSentence, type PlanFeature } from "@/lib/plans";
import { savePref } from "@/lib/consent";
import { createMediaGeneration, getVideoAccess, refreshMediaGeneration, VIDEO_UPGRADE_REQUIRED } from "@/lib/media-generation.functions";
import { PENDING_PACK_KEY } from "@/lib/public-pricing";
import { RESEARCH_MAX_CREDITS, splitResearchStream } from "@/lib/research";
import { DESIGN_DRAFT_KEY } from "@/lib/design-library";
import { defaultImageModel, defaultMusicModel, defaultVideoModel, imageEditModel, mediaLabel, qualityImageModel, qualityVideoModel, type MediaKind } from "@/lib/media-models";
import { ChatMedia, type ChatMediaData } from "./ChatMedia";

type Mode = "chat" | "create";
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

function useWorkspaceChoice() {
  const { lang } = useDashboard();
  const copy = chatWorkspaceText[lang];
  const [mode, setMode] = useState<Mode>("chat");
  // One of the three modes (Éclair, Équilibré, Expert); the engine behind it is chosen on the server.
  const [tier, setTier] = useState<ChatChoice>(defaultChatChoice);
  // Deep Research stays on for the browser session until switched off (it costs more than a reply).
  const [research, setResearch] = useState(false);
  const [kbIds, setKbIds] = useState<string[]>([]);
  useEffect(() => {
    try { setResearch(sessionStorage.getItem("technova-research") === "1"); } catch { /* storage blocked */ }
    try { const kb = JSON.parse(localStorage.getItem("technova-chat-kbs") ?? "[]"); if (Array.isArray(kb)) setKbIds(kb.filter((x): x is string => typeof x === "string").slice(0, 5)); } catch { /* storage blocked */ }
    try {
      const storedMode = localStorage.getItem("technova-workspace-mode");
      const storedTier = localStorage.getItem("technova-workspace-tier");
      if (storedMode === "chat" || storedMode === "create") setMode(storedMode);
      if (isChatChoice(storedTier)) setTier(storedTier);
    } catch { /* storage blocked */ }
  }, []);
  function chooseMode(value: Mode) {
    setMode(value);
    savePref("technova-workspace-mode", value);
  }
  function chooseTier(value: ChatChoice) {
    setTier(value);
    savePref("technova-workspace-tier", value);
  }
  function chooseKnowledgeBases(ids: string[]) {
    const next = ids.slice(0, 5);
    setKbIds(next);
    savePref("technova-chat-kbs", JSON.stringify(next));
  }
  function toggleResearch() {
    setResearch((on) => {
      try { sessionStorage.setItem("technova-research", on ? "0" : "1"); } catch { /* storage blocked */ }
      return !on;
    });
  }
  return { mode, tier, research: mode === "chat" && research, toggleResearch, kbIds, chooseKnowledgeBases, chooseMode, chooseTier, copy };
}

const tierIcons = { eclair: faBolt, equilibre: faScaleBalanced, expert: faBrain, smart: faWandMagicSparkles } as const;

function ChoiceControls({ choice }: { choice: ReturnType<typeof useWorkspaceChoice> }) {
  const [modeOpen, setModeOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const { mode, tier, chooseMode, chooseTier, copy } = choice;
  const fr = copy.locale.startsWith("fr");
  const plan = usePlanTier();
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Popover open={modeOpen} onOpenChange={setModeOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={copy.chooseMode}
            className="h-8 min-w-0 gap-1 rounded-full px-2.5 text-[13px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {copy[mode]}
            <ChevronDown className="size-3.5" />
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
              {item === "chat" ? (
                <MessageCircle className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
              ) : (
                <Code2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
              )}
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
      <Popover open={tierOpen} onOpenChange={setTierOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={fr ? "Choisir le mode de réponse" : "Choose the answer mode"}
            className="h-8 min-w-0 gap-1.5 rounded-full px-2.5 text-[13px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} fixedWidth aria-hidden className="size-3.5" />
            <span className="truncate">{tier === "smart" ? smartChoice.fr : fr ? chatTiers[tier].fr : chatTiers[tier].en}</span>
            <ChevronDown className="size-3.5 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 rounded-2xl border-border bg-popover p-1.5 shadow-soft">
          {[...chatTierIds, "smart" as const].map((id) => {
            const smart = id === "smart";
            const locked = id === "expert" && plan !== null && plan < EXPERT_MIN_TIER;
            const name = smart ? smartChoice.fr : fr ? chatTiers[id].fr : chatTiers[id].en;
            const hint = smart ? (fr ? smartChoice.hintFr : smartChoice.hintEn) : fr ? chatTiers[id].hintFr : chatTiers[id].hintEn;
            const note = locked ? (fr ? "À partir du forfait Creator" : "From the Creator plan") : "";
            return (
              <Button
                key={id}
                type="button"
                variant="ghost"
                onClick={() => { chooseTier(id); setTierOpen(false); }}
                className={`h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left ${smart ? "mt-1 border-t border-border/60 pt-3" : ""}`}
              >
                <FontAwesomeIcon icon={tierIcons[id]} fixedWidth aria-hidden className={`size-4 shrink-0 ${smart ? "text-chat-glow" : "text-muted-foreground"}`} />
                <span className="min-w-0 flex-1 whitespace-normal">
                  <strong className="block text-xs">{name}</strong>
                  <small className="block text-[10px] font-normal text-muted-foreground">{hint}</small>
                  {note && <small className="block text-[10px] font-normal text-destructive">{note}</small>}
                </span>
                {tier === id && <Check className="size-3.5 shrink-0 text-chat-glow" />}
              </Button>
            );
          })}
        </PopoverContent>
      </Popover>
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
      className={`grid size-8 place-items-center rounded-full transition-colors ${listening ? "voice-live" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}>
      {listening ? <Square className="size-3 fill-current" /> : <Mic className="size-4" />}
    </button>
  );
}

/** Under a prompt you sent: send it again, copy it, share it, or put it back in the box to change it. */
function UserMessageActions({ text, onRetry, onEdit, disabled }: { text: string; onRetry: () => void; onEdit: () => void; disabled?: boolean }) {
  const { lang } = useDashboard();
  const fr = lang === "fr";
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const share = async () => {
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const btn = "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40";
  return (
    <div className="-mt-3 flex items-center justify-end gap-0.5 opacity-70 transition-opacity hover:opacity-100">
      <button type="button" disabled={disabled} aria-label={fr ? "Renvoyer" : "Send again"} title={fr ? "Renvoyer" : "Send again"} onClick={onRetry} className={btn}><History className="size-3.5" /></button>
      <button type="button" aria-label={fr ? "Copier" : "Copy"} title={fr ? "Copier" : "Copy"} onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={btn}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
      <button type="button" aria-label={fr ? "Partager" : "Share"} title={fr ? "Partager" : "Share"} onClick={() => void share()} className={btn}><Share className="size-3.5" /></button>
      <button type="button" disabled={disabled} aria-label={fr ? "Modifier" : "Edit"} title={fr ? "Modifier" : "Edit"} onClick={onEdit} className={btn}><Pencil className="size-3.5" /></button>
    </div>
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

/** Types `text` one character at a time (restarts when `run` or the text changes); instant with reduced motion. */
function useTypewriter(text: string, run: number) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(text); return; }
    let i = 0;
    setShown("");
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i) + (i < text.length ? "▍" : ""));
      if (i >= text.length) window.clearInterval(id);
    }, 38);
    return () => window.clearInterval(id);
  }, [text, run]);
  return shown;
}

function ChatComposer({
  choice,
  onSubmit,
  disabled,
  inputRef,
  editing,
  onCancelEdit,
}: {
  choice: ReturnType<typeof useWorkspaceChoice>;
  onSubmit: (text: string, files: ChatFilePart[]) => Promise<void>;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** A generated image chosen with "Modifier": the next message describes the change. */
  editing?: { url: string } | null;
  onCancelEdit?: () => void;
}) {
  const { copy, mode } = choice;
  const { lang } = useDashboard();
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? ownRef;
  // A Registry item arrives as a draft: switch to its mode and prefill the brief.
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
  const [docs, setDocs] = useState<ComposerDoc[]>([]);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  // The send button appears once there is something to send (the mic stays alone otherwise).
  const [hasText, setHasText] = useState(false);
  // The placeholder writes itself on arrival and again when the pointer comes over the empty box.
  const fullPlaceholder = editing ? (lang === "fr" ? "Ex. : rends le ciel plus orangé, ajoute un logo…" : "E.g. make the sky more orange, add a logo…") : mode === "chat" ? copy.chatPlaceholder : copy.createPlaceholder;
  const [typeRun, setTypeRun] = useState(0);
  const typedPlaceholder = useTypewriter(fullPlaceholder, typeRun);
  const fileInput = useRef<HTMLInputElement>(null);
  const updateDoc = (key: string, patch: Partial<ComposerDoc>) => setDocs((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  async function pick(list: FileList | null) {
    if (!list?.length) return;
    setFileError(""); setReading(true);
    const next = [...files];
    let docCount = docs.length;
    for (const file of Array.from(list)) {
      // Small images, PDF, audio and video go straight to the model; every other file is indexed.
      if (isDirectAttachment(file)) {
        if (next.length >= MAX_FILES) { setFileError(lang === "fr" ? `${MAX_FILES} images ou médias maximum par message.` : `${MAX_FILES} images or media max per message.`); continue; }
        try { next.push(await toFilePart(file)); } catch { setFileError(lang === "fr" ? `Format non pris en charge : ${file.name}` : `Unsupported format: ${file.name}`); }
        continue;
      }
      const check = checkFile(file.name, file.size);
      if (!check.ok) { setFileError(`${file.name} : ${fileErrorText(`file_${check.reason}`, lang)}`); continue; }
      if (docCount >= MAX_CHAT_DOCUMENTS) { setFileError(lang === "fr" ? `${MAX_CHAT_DOCUMENTS} documents maximum par message.` : `${MAX_CHAT_DOCUMENTS} documents max per message.`); break; }
      docCount++;
      const key = crypto.randomUUID();
      setDocs((all) => [...all, { key, filename: file.name, phase: "uploading", fileId: null, error: null }]);
      void uploadAndIndex(file, "chat", (phase) => updateDoc(key, { phase })).then((r) => updateDoc(key, { phase: r.status, fileId: r.fileId, error: r.error }));
    }
    setFiles(next); setReading(false);
    if (fileInput.current) fileInput.current.value = "";
  }
  const docsBusy = docs.some((d) => d.phase === "uploading" || d.phase === "processing");
  const attachLabel = lang === "fr" ? `Joindre des fichiers (${formatsLabel}, code)` : `Attach files (${formatsLabel}, code)`;
  return (
    <div className="w-full">
      <p className="mb-1.5 text-center text-[11px] text-muted-foreground">
        {lang === "fr" ? "TechNova AI Hub peut faire des erreurs. Vérifiez les informations importantes." : "TechNova AI Hub can make mistakes. Check important information."}
      </p>
      <PromptInput
        onSubmit={async ({ text }) => {
          const readyDocs = docs.filter((d) => d.phase === "ready" && d.fileId);
          if (docsBusy || (!text.trim() && !files.length && !readyDocs.length)) return;
          const sent = [...files, ...readyDocs.map((d): ChatFilePart => ({ type: "file", mediaType: INDEXED_FILE_TYPE, filename: d.filename, url: indexedFileUrl(d.fileId!) }))];
          setFiles([]); setDocs([]); setFileError(""); setHasText(false);
          await onSubmit(text, sent);
        }}
        className="chat-composer rounded-[22px] border border-border bg-card"
      >
        {editing && (
          <div className="flex w-full items-center gap-3 px-3 pt-3">
            <img src={editing.url} alt="" className="size-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{lang === "fr" ? "Modifier cette image" : "Edit this image"}</p>
              <p className="text-[11px] text-muted-foreground">{lang === "fr" ? "Décrivez le changement souhaité, la nouvelle version apparaîtra dans la conversation." : "Describe the change; the new version will appear in the conversation."}</p>
            </div>
            <button type="button" onClick={onCancelEdit} aria-label={lang === "fr" ? "Annuler la modification" : "Cancel edit"} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="size-4" /></button>
          </div>
        )}
        {(files.length > 0 || docs.length > 0) && (
          <div className="flex w-full flex-wrap gap-2 px-3 pt-3">
            {files.map((f, i) => <AttachmentChip key={i} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />)}
            {docs.map((d) => <AttachmentChip key={d.key} file={{ type: "file", mediaType: INDEXED_FILE_TYPE, filename: d.filename, url: "" }} phase={d.phase} error={d.error ? fileErrorText(d.error, lang) : null} onRemove={() => setDocs((all) => all.filter((x) => x.key !== d.key))} />)}
          </div>
        )}
        <PromptInputTextarea
          ref={textareaRef}
          autoFocus
          disabled={disabled}
          placeholder={typedPlaceholder}
          onMouseEnter={() => { if (!hasText) setTypeRun((n) => n + 1); }}
          onChange={(e) => setHasText(e.currentTarget.value.trim().length > 0)}
          className="min-h-[60px] max-h-48 px-4 pt-3.5 text-[14px]"
        />
        <PromptInputFooter className="min-h-12 flex-wrap justify-between gap-2 px-3 pb-2.5">
          <div className="flex items-center gap-0.5">
            <input ref={fileInput} data-chat-attach type="file" accept={`${ACCEPT},${ALL_ACCEPT}`} multiple className="hidden" onChange={(e) => void pick(e.target.files)} />
            <button type="button" onClick={() => fileInput.current?.click()} disabled={disabled || reading} aria-label={attachLabel} title={attachLabel}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:opacity-50">
              {reading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" strokeWidth={1.7} />}
            </button>
            {mode === "chat" && (
              <button
                type="button"
                onClick={choice.toggleResearch}
                aria-pressed={choice.research}
                aria-label={lang === "fr" ? "Recherche approfondie" : "Deep research"}
                title={lang === "fr" ? `Recherche approfondie sur le web avec sources (jusqu'à ${RESEARCH_MAX_CREDITS} crédits, facturée au coût réel)` : `Deep web research with sources (up to ${RESEARCH_MAX_CREDITS} credits, billed at real cost)`}
                className={cn("grid size-8 place-items-center rounded-full transition-colors disabled:opacity-50", choice.research ? "bg-chat-glow/15 text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground")}
                disabled={disabled}
              >
                <Telescope className="size-4" strokeWidth={1.7} />
              </button>
            )}
            {mode === "chat" && <KnowledgePicker choice={choice} />}
          </div>
          <div className="flex min-w-0 items-center gap-0.5">
            <ChoiceControls choice={choice} />
            <VoiceButton inputRef={textareaRef} />
            {(hasText || files.length > 0 || docs.length > 0) && (
              <PromptInputSubmit
                disabled={disabled || reading || docsBusy}
                aria-label={copy.saveIdea}
                className="ml-1 size-8 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/85"
              />
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>
      {fileError && <p role="alert" className="mt-2 text-center text-xs text-destructive">{fileError}</p>}
    </div>
  );
}

/** Knowledge bases the chat answers from (browser-local choice, like mode and model). */
function KnowledgePicker({ choice }: { choice: ReturnType<typeof useWorkspaceChoice> }) {
  const { lang } = useDashboard();
  const fr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [bases, setBases] = useState<{ id: string; name: string }[] | null>(null);
  useEffect(() => {
    if (!open || bases) return;
    void supabase.from("knowledge_bases").select("id, name").order("created_at", { ascending: false }).then(({ data }) => {
      setBases(data ?? []);
      // Forget bases that were deleted since they were chosen.
      if (data) { const valid = choice.kbIds.filter((id) => data.some((b) => b.id === id)); if (valid.length !== choice.kbIds.length) choice.chooseKnowledgeBases(valid); }
    });
  }, [open, bases, choice]);
  const count = choice.kbIds.length;
  const label = fr ? "Bases de connaissances" : "Knowledge bases";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} title={label}
          className={cn("inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-1.5 text-xs transition-colors", count ? "bg-chat-glow/10 text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground")}>
          <Library className="size-4" strokeWidth={1.7} />{count > 0 && <span className="font-semibold">{count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 pb-1.5 pt-1 text-xs font-semibold">{label}</p>
        <p className="px-2 pb-2 text-[11px] text-muted-foreground">{fr ? "Le chat répond en s'appuyant sur les bases choisies (5 maximum)." : "The chat answers from the chosen bases (5 max)."}</p>
        {bases === null ? <div className="grid place-items-center py-4"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          : bases.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">{fr ? "Aucune base pour le moment." : "No knowledge base yet."}</p>
          : <ul className="max-h-60 space-y-0.5 overflow-y-auto">{bases.map((b) => {
            const on = choice.kbIds.includes(b.id);
            return <li key={b.id}><button type="button" disabled={!on && count >= 5} onClick={() => choice.chooseKnowledgeBases(on ? choice.kbIds.filter((x) => x !== b.id) : [...choice.kbIds, b.id])}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-secondary disabled:opacity-40">
              <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on ? "border-foreground bg-foreground text-background" : "border-border")}>{on && <Check className="size-3" />}</span>
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
            </button></li>;
          })}</ul>}
        <Link to="/dashboard/knowledge" onClick={() => setOpen(false)} className="mt-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          {fr ? "Gérer les bases" : "Manage bases"}<ArrowRight className="size-3.5" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

type ComposerDoc = { key: string; filename: string; phase: UploadPhase; fileId: string | null; error: string | null };

function AttachmentChip({ file, onRemove, phase, error }: { file: ChatFilePart; onRemove?: () => void; phase?: UploadPhase; error?: string | null }) {
  const { lang } = useDashboard();
  const kind = kindOf(file.mediaType);
  const Icon = kind === "audio" ? FileAudio : kind === "video" ? FileVideo : FileText;
  const busy = phase === "uploading" || phase === "processing";
  const status = phase === "uploading" ? (lang === "fr" ? "Envoi…" : "Uploading…") : phase === "processing" ? (lang === "fr" ? "Analyse…" : "Analysing…") : phase === "failed" ? error : file.mediaType === INDEXED_FILE_TYPE ? (lang === "fr" ? "Document indexé" : "Indexed document") : null;
  return (
    <div title={error ?? undefined} className={cn("relative flex items-center gap-2 rounded-xl border bg-background p-1.5 pr-3 text-[12px]", phase === "failed" ? "border-destructive/50" : "border-border")}>
      {kind === "image" && file.url ? <img src={file.url} alt={file.filename} className="size-10 rounded-lg object-cover" /> : <span className="grid size-10 place-items-center rounded-lg bg-secondary">{busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : phase === "failed" ? <AlertCircle className="size-4 text-destructive" /> : <Icon className="size-4 text-muted-foreground" />}</span>}
      <span className="min-w-0"><span className="block max-w-[160px] truncate">{file.filename}</span>{status && <span className={cn("block max-w-[160px] truncate text-[10.5px]", phase === "failed" ? "text-destructive" : "text-muted-foreground")}>{status}</span>}</span>
      {onRemove && <button type="button" onClick={onRemove} aria-label="Retirer" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"><X className="size-3" /></button>}
    </div>
  );
}

/** Welcome orb: a glass ball whose colours swirl inside it (the ball itself stays still). */
function ChatOrb() {
  return <div className="chat-orb" aria-hidden="true"><span className="chat-orb-ball"><i /><i /><i /><b /></span></div>;
}

type StarterIdea = { icon: typeof LayoutTemplate; mode: Mode; attach?: boolean; fr: [string, string, string]; en: [string, string, string] };

// One-click starting points: [title, hint, prefilled prompt]. Brackets mark what the user completes.
const starterIdeas: StarterIdea[] = [
  { icon: LayoutTemplate, mode: "create", fr: ["Landing page", "Une page moderne et épurée", "Crée une landing page moderne et épurée pour [mon activité] : héros percutant, trois avantages, témoignages, tarifs et appel à l'action."], en: ["Landing page", "A modern, clean page", "Build a modern, clean landing page for [my business]: strong hero, three benefits, testimonials, pricing and a call to action."] },
  { icon: ShoppingBag, mode: "create", fr: ["Boutique en ligne", "Catalogue, fiche produit, panier", "Crée une boutique en ligne élégante pour vendre [mes produits] : catalogue avec filtres, fiche produit détaillée et panier."], en: ["Online store", "Catalog, product page, cart", "Build an elegant online store to sell [my products]: filterable catalog, detailed product page and cart."] },
  { icon: BarChart3, mode: "create", fr: ["Tableau de bord", "Données en graphiques interactifs", "Crée un tableau de bord interactif pour suivre [mes ventes / mes indicateurs] : chiffres clés, graphiques et filtres par période."], en: ["Dashboard", "Data as interactive charts", "Build an interactive dashboard to track [my sales / my metrics]: key figures, charts and period filters."] },
  { icon: Gamepad2, mode: "create", fr: ["Jeu web", "Jouable dans le navigateur", "Crée un petit jeu jouable dans le navigateur : [idée de jeu], avec score, niveaux et bouton rejouer."], en: ["Web game", "Playable in the browser", "Build a small browser game: [game idea], with score, levels and a replay button."] },
  { icon: ScanEye, mode: "chat", attach: true, fr: ["Design vers code", "Une capture devient une page", "Reproduis fidèlement le design de l'image jointe en une page HTML/CSS responsive, dans un seul fichier."], en: ["Design to code", "A screenshot becomes a page", "Faithfully recreate the design in the attached image as a responsive HTML/CSS page, in a single file."] },
  { icon: FileSearch, mode: "chat", attach: true, fr: ["Analyser un document", "PDF, Word, Excel, PowerPoint…", "Résume le document joint en 5 points clés, puis liste les décisions et les actions à mener."], en: ["Analyse a document", "PDF, Word, Excel, PowerPoint…", "Summarise the attached document in 5 key points, then list the decisions and actions to take."] },
];

function StarterIdeas({ choice, inputRef }: { choice: ReturnType<typeof useWorkspaceChoice>; inputRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const { lang } = useDashboard();
  function pick(idea: StarterIdea) {
    choice.chooseMode(idea.mode);
    const [, , prompt] = idea[lang === "en" ? "en" : "fr"];
    // Let the composer re-render in the chosen mode, then prefill and select the part to complete.
    window.setTimeout(() => {
      const el = inputRef.current; if (!el) return;
      setTextareaValue(el, prompt); el.focus();
      const start = prompt.indexOf("["), end = prompt.indexOf("]");
      if (start >= 0 && end > start) el.setSelectionRange(start, end + 1);
      if (idea.attach) document.querySelector<HTMLInputElement>("input[data-chat-attach]")?.click();
    }, 0);
  }
  return <div className="starter-row flex w-full flex-nowrap justify-center gap-1 overflow-x-auto">
    {starterIdeas.map((idea) => {
      const [title, hint] = idea[lang === "en" ? "en" : "fr"];
      const Icon = idea.icon;
      return <button key={title} type="button" onClick={() => pick(idea)}
        title={hint}
        className="starter-chip group inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-[11.5px] text-foreground/80 transition-colors hover:text-foreground">
        <Icon className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={1.6} />
        <span className="truncate">{title}</span>
      </button>;
    })}
  </div>;
}

export function ChatListPage() {
  const { reload, t } = useDashboard();
  const choice = useWorkspaceChoice();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    <div className="chat-workspace chat-home relative -mx-4 -mt-6 min-h-[calc(100svh-170px)] lg:min-h-[calc(100svh-150px)] overflow-hidden sm:-mx-6 lg:-mx-7">
      <div className="relative mx-auto flex min-h-[calc(100svh-170px)] lg:min-h-[calc(100svh-150px)] max-w-[1330px] flex-col px-4 pb-4 sm:px-8 lg:px-12">
        <section className="flex flex-1 flex-col items-center justify-center gap-5 py-10 sm:gap-6 sm:py-12">
          <div className="text-center">
            <h1 className="chat-greeting text-balance text-2xl font-medium leading-tight tracking-tight sm:whitespace-nowrap sm:text-[32px]">
              <ChatGreeting choice={choice} />
            </h1>
          </div>
          <ChatOrb />
          <div className="w-full max-w-[740px]">
            <ChatComposer choice={choice} disabled={busy} onSubmit={start} inputRef={composerRef} />
            {error && (
              <p role="alert" className="mt-3 text-center text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="mt-4"><StarterIdeas choice={choice} inputRef={composerRef} /></div>
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
  const [upgrade, setUpgrade] = useState<{ feature: PlanFeature; balance: number } | null>(null);
  // Shows the plan upgrade card; the balance comes from the server, which also decides access.
  async function showUpgrade(feature: PlanFeature) {
    const access = await videoAccess().catch(() => null);
    setUpgrade({ feature, balance: access?.balance ?? 0 });
  }
  /** Server refusals: a plan limit opens the upgrade card, anything else is shown as an error. */
  async function failWith(message: string) {
    const feature = message.includes("STUDIO_UPGRADE_REQUIRED") ? "site" : message.includes(VIDEO_UPGRADE_REQUIRED) ? "video" : upgradeFeatureOf(message);
    if (feature) await showUpgrade(feature); else setError(message || t.actionError);
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
  // Every finished site generation in this conversation is a version the user can reopen.
  const versions = messages.flatMap((m) => (m.parts as unknown as { type: string; data?: StudioData }[])
    .filter((p) => p.type === "data-studio" && p.data?.kind === "build" && p.data.build.done && p.data.build.files.length)
    .map((p) => (p.data as Extract<StudioData, { kind: "build" }>).build));
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
      savePref("tn-artifact-width", String(panelWidthRef.current));
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
  // Finished media are served through signed links that expire: they are re-signed once per visit
  // (and again when a file fails to load); unfinished ones are polled every 5 seconds.
  const signedMedia = useRef(new Set<string>());
  // Shown for a while after a creation finishes: generated files are only kept 14 days.
  const [retentionNotice, setRetentionNotice] = useState(0);
  useEffect(() => {
    if (!retentionNotice) return;
    const timer = window.setTimeout(() => setRetentionNotice(0), 15000);
    return () => window.clearTimeout(timer);
  }, [retentionNotice]);
  const [mediaRetry, setMediaRetry] = useState(0);
  const reloadMedia = useCallback((id: string) => { signedMedia.current.delete(id); setMediaRetry((n) => n + 1); }, []);
  // "Modifier" on a generated image: the next message is sent to the image edit model with that image.
  const [editSource, setEditSource] = useState<{ id: string; url: string } | null>(null);
  const editSourceRef = useRef(editSource);
  editSourceRef.current = editSource;
  const startEdit = useCallback((media: ChatMediaData, url: string) => {
    if (choice.mode !== "chat") choice.chooseMode("chat");
    setEditSource({ id: media.id, url });
    inputRef.current?.focus();
  }, [choice]);
  useEffect(() => {
    const media = messages.flatMap((message) => message.parts.flatMap((part) => {
      if ((part.type as string) !== "data-media") return [];
      const data = (part as unknown as { data: ChatMediaData }).data;
      return data ? [data] : [];
    }));
    const pending = media.filter((m) => !["success", "fail"].includes(m.status)).map((m) => m.id);
    const unsigned = media.filter((m) => m.status === "success" && !signedMedia.current.has(m.id)).map((m) => m.id);
    if (!pending.length && !unsigned.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      unsigned.forEach((id) => signedMedia.current.add(id));
      const ids = [...pending, ...unsigned];
      void Promise.allSettled(ids.map((id) => refreshMedia({ data: { id, threadId } }))).then((results) => {
        for (const [i, result] of results.entries()) {
          // Re-signing an old file quietly keeps its previous link (and may be retried); only a running creation reports errors.
          if (result.status === "rejected") {
            if (i >= pending.length) signedMedia.current.delete(ids[i]!);
            else if (active) setError(String(result.reason?.message ?? result.reason));
            continue;
          }
          const data = result.value;
          if (!data) continue;
          // Applied even when the list changed meanwhile: the update targets this message by id only.
          if (i < pending.length && data.status === "success") setRetentionNotice(Date.now());
          setMessages((prev) => prev.map((message) => message.id === data.id
            ? { ...message, parts: [{ type: "data-media", data }] as unknown as UIMessage["parts"] } : message));
        }
      });
    }, pending.length ? 5000 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [messages, refreshMedia, threadId, mediaRetry]);
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
    if (!(await confirmDialog({ title: lang === "fr" ? "Supprimer cette conversation ?" : "Delete this conversation?", description: lang === "fr" ? "Tous ses messages et créations seront définitivement supprimés." : "All its messages and creations will be permanently deleted.", tone: "danger", confirmLabel: lang === "fr" ? "Supprimer" : "Delete" }))) return;
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
        await failWith(raw);
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
      await failWith(msg);
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
    const editing = editSourceRef.current;
    if (last?.role === "user" && request && editing && choice.mode === "chat") {
      setEditSource(null);
      setThinking(true);
      try {
        const id = await createMedia({ data: { threadId, kind: "image", prompt: request, aspectRatio: "1:1", sourceId: editing.id } });
        const media: ChatMediaData = { id, kind: "image", model: imageEditModel.label, prompt: request, ratio: "1:1", status: "waiting", progress: null, urls: [], error: null };
        setMessages((prev) => [...prev, { id, role: "assistant", parts: [{ type: "data-media", data: media }] as unknown as UIMessage["parts"] }]);
      } catch (e) {
        await failWith(String((e as Error)?.message ?? e));
      }
      finally { setThinking(false); }
      return;
    }
    const mediaRequest = choice.mode === "chat" && /(?:^|[^\p{L}])(?:g[ée]n[éèe]r\p{L}*|cr[ée]+\p{L}*|fai[st]\p{L}*|faire|fabriqu\p{L}*|dessin\p{L}*|produi[rst]\p{L}*|r[ée]alis\p{L}*|compos\p{L}*|imagin\p{L}*|generat\p{L}*|create|make|draw|design)(?![\p{L}])[\s\S]{0,110}?(?:^|[^\p{L}])(?:image|images|photo|photos|illustration|visuel|portrait|affiche|logo|picture|vid[ée]o|vid[ée]os|clip|animation|musique|chanson|morceau|jingle|beat|music|song|track)(?![\p{L}])/iu.test(request);
    if (last?.role === "user" && mediaRequest) {
      const kind: MediaKind = /\b(?:musique|chanson|morceau|jingle|beat|music|song|track)\b/i.test(request) ? "music" : /\b(?:vid[ée]o|video|clip|animation)\b/i.test(request) ? "video" : "image";
      const quality = /\b(?:hd|haute (?:qualit[ée]|d[ée]finition)|qualit[ée]|4k|high quality|quality|detailed|d[ée]taill[ée]e?)\b/i.test(request);
      const mediaModel = kind === "image" ? (quality ? qualityImageModel : defaultImageModel) : kind === "video" ? (quality ? qualityVideoModel : defaultVideoModel) : defaultMusicModel;
      const aspectRatio = /\b(?:9:16|portrait|vertical|story|reel)\b/i.test(request) ? "9:16" : /\b(?:1:1|carr[ée]|square)\b/i.test(request) ? "1:1" : "16:9";
      setThinking(true);
      try {
        const id = await createMedia({ data: { threadId, kind, prompt: request, aspectRatio, model: mediaModel, ...(kind === "video" ? { duration: "5" } : {}) } });
        const media: ChatMediaData = { id, kind, model: mediaLabel(mediaModel, kind), prompt: request, ratio: aspectRatio, status: "waiting", progress: null, urls: [], error: null };
        setMessages((prev) => [...prev, { id, role: "assistant", parts: [{ type: "data-media", data: media }] as unknown as UIMessage["parts"] }]);
      } catch (e) {
        const message = String((e as Error)?.message ?? e);
        await failWith(message);
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
        p.type === "file" && !indexedFileId(p.url) ? [{ mediaType: p.mediaType ?? "", filename: p.filename ?? "file", url: p.url || pendingMedia.get(mediaKey(m.id, i)) || "" }] : []).filter((f) => f.url),
    })));
    const fileIds = [...new Set(history.slice(-30).flatMap((m) => (m.parts as unknown as Array<{ type: string; url?: string }>).map((p) => (p.type === "file" ? indexedFileId(p.url) : null)).filter((id): id is string => !!id)))].slice(-10);
    const last = history[history.length - 1];
    const lastSent = payload[payload.length - 1];
    if (last?.role === "user" && last.parts.some((p) => p.type === "file" && !indexedFileId((p as { url?: string }).url)) && !lastSent?.files?.length) {
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
          tier: choice.tier,
          mode: choice.mode,
          lang,
          ...(agent ? { agentId: agent.id } : {}),
          ...(fileIds.length ? { fileIds } : {}),
          ...(choice.kbIds.length && choice.mode === "chat" ? { knowledgeBaseIds: choice.kbIds } : {}),
          messages: payload,
        }),
      });
      if (!res.ok || !res.body) {
        await failWith(await res.text().catch(() => ""));
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
    <div className="relative -mx-4 -mt-6 flex h-[calc(100svh-120px)] min-h-[480px] overflow-hidden sm:-mx-6 lg:-mx-7 lg:h-[calc(100svh-104px)]">
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
      {retentionNotice > 0 && (
        <div role="status" className="relative z-10 mx-auto mt-2 flex w-full max-w-3xl justify-center px-4">
          <p className="flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/15 py-1.5 pl-3.5 pr-1.5 text-[12px] font-medium text-orange-800 backdrop-blur-md dark:text-orange-200">
            {lang === "en"
              ? "Generated images, videos and music are kept for 14 days only. Download them before they disappear."
              : "Les images, vidéos et musiques générées sont conservées 14 jours seulement. Téléchargez-les avant qu’elles ne disparaissent."}
            <button type="button" onClick={() => setRetentionNotice(0)} aria-label={lang === "en" ? "Close" : "Fermer"} className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-orange-500/20">
              <X className="size-3.5" />
            </button>
          </p>
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
        const generic = !site && upgrade.feature !== "video";
        const packs = packSlugs.slice(Math.max(1, featureMinTier[upgrade.feature]));
        const names = { starter: "Starter", essential: "Essential", creator: "Creator", pro: "Pro" } as const;
        return <div role="alert" className="relative z-10 mx-auto mt-2 w-full max-w-3xl px-4">
          <div className="rounded-2xl border border-border bg-card/95 p-4 text-sm shadow-sm backdrop-blur">
            <p className="font-medium">
              {generic ? upgradeSentence(upgrade.feature, fr) : site
                ? (fr ? "🌐 La création de sites web est réservée aux forfaits Essential (2499 frs), Creator (4999 frs) et Pro (7699 frs)." : "🌐 Website creation is reserved for the Essential (2,499 F), Creator (4,999 F) and Pro (7,699 F) plans.")
                : (fr ? "🎬 La génération vidéo est réservée aux forfaits Creator (4999 frs) et Pro (7699 frs)." : "🎬 Video generation is reserved for the Creator (4,999 F) and Pro (7,699 F) plans.")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {fr
                ? `${generic ? "Passez à un forfait supérieur pour en profiter." : `Passez à un forfait supérieur pour débloquer ${site ? "les sites web" : "les vidéos"}.`} Il vous reste ${upgrade.balance.toLocaleString("fr-FR")} crédits.`
                : `${generic ? "Upgrade to use it." : `Upgrade to unlock ${site ? "websites" : "videos"}.`} You have ${upgrade.balance.toLocaleString("en-US")} credits left.`}
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
                      <ChatMedia key={index} data={(part as unknown as { data: ChatMediaData }).data} lang={lang} onBroken={reloadMedia} onEdit={startEdit} />
                    ) : part.type === "file" ? (
                      <div key={index} className="my-1"><AttachmentChip file={{ type: "file", mediaType: part.mediaType, filename: part.filename ?? "file", url: part.url }} /></div>
                    ) : null,
                  )}
                </MessageContent>
                {message.role === "assistant" && <MessageActionsRow text={message.parts.map(p => p.type === "text" ? p.text : "").join("")} />}
                {message.role === "user" && (() => {
                  const text = message.parts.map(p => p.type === "text" ? p.text : "").join("");
                  return <UserMessageActions text={text} disabled={busy || loading} onRetry={() => void addNote(text)}
                    onEdit={() => { const el = inputRef.current; if (!el) return; setTextareaValue(el, text); el.focus(); el.setSelectionRange(text.length, text.length); }} />;
                })()}
              </Message>
            ))}
            {thinking && (
              <Message from="assistant">
                <MessageContent className="bg-transparent px-0">
                  {activity ? <StudioTimeline build={activity} lang={lang} onOpen={() => { setActivityView((v) => v + 1); setShowArtifact(true); }} /> : <ThinkingLine fr={lang === "fr"} label={researchStatus || undefined} />}
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
          editing={editSource}
          onCancelEdit={() => setEditSource(null)}
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
          <ArtifactPanel build={panelBuild} versions={activity ? [] : versions} onPickVersion={setArtifact} lang={lang} title={thread?.title ?? "projet"} activityView={activityView} onClose={() => setShowArtifact(false)} />
        </div>
      </div>
      </>
    )}
    </div>
  );
}
