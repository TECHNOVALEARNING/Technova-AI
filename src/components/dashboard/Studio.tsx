import { Rocket } from "lucide-react";
import { PublishDialog } from "./PublishDialog";
import { useEffect, useMemo, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { toast } from "sonner";
import { findSecrets, redactSecrets } from "@/lib/secret-scan";
import { findPhishing, phishingMessage } from "@/lib/phishing-scan";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardList, Code2, Copy, Database, Download, Eye, ExternalLink, FileCode2, Loader2, Monitor, Pencil, Search, ShieldCheck, Smartphone, Tablet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { previewDoc, resolvePreviewPage, STUDIO_COST, type StudioBuild, type StudioData, type StudioPlanData, type StudioQuestion } from "@/lib/studio";

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);

export function StudioQuestions({ data, lang, disabled, onSubmit }: {
  data: Extract<StudioData, { kind: "questions" }>; lang: Lang; disabled: boolean; onSubmit: (answers: string) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [free, setFree] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const locked = Boolean(data.answered) || disabled;
  const questions = data.questions;
  const question = questions[current];
  const selected = question ? picked[question.id] : undefined;
  const canContinue = question && (selected === "__other" ? Boolean(free[question.id]?.trim()) : Boolean(selected));
  const answers = (qs: StudioQuestion[]) => qs.map((q) => `- ${q.question} → ${picked[q.id] === "__other" ? free[q.id]?.trim() : picked[q.id]}`).join("\n");
  if (!question) return null;
  return (
    <div className="studio-card w-full max-w-xl rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-2 font-semibold"><ClipboardList className="size-4 text-chat-glow" />{tx(lang, "Précisons votre projet", "Let's refine your project")}</span><span>{current + 1} / {questions.length}</span></div>
      <div className="mt-4 flex gap-1" aria-hidden="true">{questions.map((q, i) => <span key={q.id} className={cn("h-1 flex-1 rounded-full", i <= current ? "bg-chat-glow" : "bg-muted")} />)}</div>
      {data.answered ? <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4" />{tx(lang, "Réponses envoyées", "Answers sent")}</div> : <>
        <h3 className="mt-5 text-base font-semibold leading-snug">{question.question}</h3>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label={question.question}>
          {[...question.choices, "__other"].map((choice) => <Button key={choice} type="button" variant="outline" role="radio" aria-checked={selected === choice} disabled={locked}
            onClick={() => setPicked((prev) => ({ ...prev, [question.id]: choice }))}
            className={cn("h-auto min-h-11 w-full justify-start whitespace-normal rounded-md border px-3 py-2 text-left text-sm font-normal", selected === choice ? "border-chat-glow bg-chat-glow/10 text-foreground" : "text-foreground hover:bg-muted")}>
            <span className={cn("mr-2 size-4 shrink-0 rounded-full border-2", selected === choice ? "border-chat-glow bg-chat-glow ring-2 ring-background ring-inset" : "border-muted-foreground/50")} />
            {choice === "__other" ? tx(lang, "Autre réponse", "Another answer") : choice}
          </Button>)}
        </div>
        {selected === "__other" && <input autoFocus value={free[question.id] ?? ""} onChange={(e) => setFree((prev) => ({ ...prev, [question.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && canContinue && current < questions.length - 1) setCurrent(current + 1); }} maxLength={200} placeholder={tx(lang, "Précisez votre réponse…", "Tell us more…")} aria-label={tx(lang, "Votre réponse", "Your answer")} className="mt-3 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-chat-glow" />}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <Button size="sm" variant="ghost" disabled={current === 0 || disabled} onClick={() => setCurrent(current - 1)}><ArrowLeft className="size-4" />{tx(lang, "Précédent", "Back")}</Button>
          <Button size="sm" disabled={locked || !canContinue} onClick={() => current < questions.length - 1 ? setCurrent(current + 1) : onSubmit(answers(questions))}>{current < questions.length - 1 ? tx(lang, "Suivant", "Next") : tx(lang, "Générer le plan", "Generate plan")}<ArrowRight className="size-4" /></Button>
        </div>
      </>}
    </div>
  );
}

export function StudioPlan({ data, lang, disabled, onApprove, onChange, onRetry }: {
  data: Extract<StudioData, { kind: "plan" }>; lang: Lang; disabled: boolean; onApprove: () => void; onChange: (feedback: string) => void; onRetry?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const p: StudioPlanData = data.plan;
  const List = ({ title, items }: { title: string; items?: string[] }) => items?.length ? (
    <div className="mt-3"><p className="text-[11px] font-bold uppercase text-muted-foreground">{title}</p>
      <ul className="mt-1 space-y-1 text-sm">{items.map((x) => <li key={x} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-chat-glow" />{x}</li>)}</ul></div>
  ) : null;
  const planContent = <><p className="text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
    <List title={tx(lang, "Objectifs", "Goals")} items={p.goals} />
    <List title={tx(lang, "Fonctionnalités proposées", "Proposed features")} items={p.features} />
    <List title={tx(lang, "Fichiers", "Files")} items={p.files} />
    {p.database?.needed && <><List title={tx(lang, "Base de données", "Database")} items={p.database.tables} />
      {p.database.sql && <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-[11.5px]"><code>{p.database.sql}</code></pre>}
      <p className="mt-3 text-xs text-muted-foreground">{tx(lang, "Le SQL est proposé ici, mais n'est pas envoyé automatiquement à votre projet Supabase.", "SQL is proposed here, but is not automatically sent to your Supabase project.")}</p></>}
  </>;
  return (
    <div className="studio-card w-full max-w-xl rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-semibold text-chat-glow"><ClipboardList className="size-4" />{tx(lang, "Plan prêt à examiner", "Plan ready to review")}</p>
      <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold">{p.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
      {data.status === "pending" ? (
        editing ? (
          <div className="mt-4 space-y-2">
            <textarea autoFocus value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} rows={3}
              placeholder={tx(lang, "Que faut-il changer ?", "What should change?")} className="w-full rounded-xl border border-border bg-transparent p-3 text-sm outline-none focus:border-chat-glow" />
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full" disabled={disabled || !feedback.trim()} onClick={() => onChange(feedback.trim())}>{tx(lang, "Nouveau plan", "New plan")}</Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>{tx(lang, "Annuler", "Cancel")}</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => setReviewing(true)}><Eye className="size-4" />{tx(lang, "Examiner", "Review")}</Button>
            <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setEditing(true)}><Pencil className="size-4" />{tx(lang, "Modifier", "Edit")}</Button>
            <Button size="sm" className="ml-auto" disabled={disabled} onClick={onApprove}><Check className="size-4" />{tx(lang, `Approuver · ${STUDIO_COST.build} crédits`, `Approve · ${STUDIO_COST.build} credits`)}</Button>
          </div>
        )
      ) : (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="size-3.5" />{data.status === "approved" ? tx(lang, "Plan approuvé", "Plan approved") : tx(lang, "Modifications demandées", "Changes requested")}</p>
      )}
      {onRetry && (
        <Button size="sm" className="mt-3 rounded-full" disabled={disabled} onClick={onRetry}><Code2 />{tx(lang, "Lancer la génération", "Start generation")}</Button>
      )}
      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className="flex max-h-[88dvh] w-[min(94vw,900px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
          <div className="shrink-0 border-b border-border px-5 py-4 pr-12"><DialogTitle>{tx(lang, "Plan de réalisation", "Implementation plan")}</DialogTitle><DialogDescription className="sr-only">{p.title}</DialogDescription></div>
          <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-10"><h2 className="mb-4 font-display text-xl font-semibold">{p.title}</h2>{planContent}</div>
          {data.status === "pending" && <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3"><Button variant="outline" onClick={() => { setReviewing(false); setEditing(true); }}>{tx(lang, "Demander une modification", "Request changes")}</Button><Button disabled={disabled} onClick={() => { setReviewing(false); onApprove(); }}><Check className="size-4" />{tx(lang, `Approuver · ${STUDIO_COST.build} crédits`, `Approve · ${STUDIO_COST.build} credits`)}</Button></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function stepIcon(title: string) {
  const t = title.toLowerCase();
  if (/donn|data|sql/.test(t)) return Database;
  if (/écri|writ|fichier|file/.test(t)) return FileCode2;
  if (/vérif|check/.test(t)) return ShieldCheck;
  if (/design|visuel/.test(t)) return Eye;
  return Search;
}

export function StudioTimeline({ build, lang, disabled, onOpen, onRetry }: { build: StudioBuild; lang: Lang; disabled?: boolean; onOpen: () => void; onRetry?: () => void }) {
  const latest = [...build.steps].reverse().find((step) => step.title.trim());
  const label = build.done ? tx(lang, "Projet généré", "Project generated") : onRetry ? tx(lang, "Génération interrompue", "Generation interrupted") : latest?.title || tx(lang, "Préparation du projet…", "Preparing project…");
  return (
    <div className="w-full max-w-xl space-y-2">
      <Button type="button" variant="ghost" onClick={onOpen} aria-label={tx(lang, `Voir les détails : ${label}`, `View details: ${label}`)} className="h-auto min-h-11 w-full justify-start gap-3 rounded-md border border-border/70 bg-card px-3 py-2.5 text-left hover:bg-muted/60">
        {!build.done && !onRetry ? <Loader2 className="size-4 shrink-0 animate-spin text-chat-glow" /> : <Code2 className="size-4 shrink-0 text-chat-glow" />}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{build.steps.length}</span><ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {onRetry && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={onRetry}>{tx(lang, "Reprendre la génération", "Resume generation")}</Button>
      )}
    </div>
  );
}

export function ArtifactPanel({ build, versions = [], onPickVersion, lang, title, activityView, onClose }: {
  build: StudioBuild; versions?: StudioBuild[]; onPickVersion?: (build: StudioBuild) => void; lang: Lang; title: string; activityView: number; onClose: () => void;
}) {
  const versionIndex = versions.indexOf(build);
  const [tab, setTab] = useState<"activity" | "preview" | "code" | "sql">("activity");
  useEffect(() => { setTab("activity"); }, [activityView]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [page, setPage] = useState("index.html");
  const [previewError, setPreviewError] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const doc = useMemo(() => (build.done ? previewDoc(build.files, page) : null), [build, page]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== document.querySelector<HTMLIFrameElement>('iframe[data-studio-preview]')?.contentWindow || event.data?.type !== "technova-preview-navigate") return;
      const next = resolvePreviewPage(build.files, page, String(event.data.path ?? ""));
      if (next) { setHistory((h) => [...h, page]); setPage(next); setPreviewError(""); }
      else setPreviewError(tx(lang, "Cette page n’a pas été générée.", "This page was not generated."));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [build.files, page, lang]);
  const sharePreview = async () => {
    if (!build.done || !doc || sharing) return;
    setSharing(true); setPreviewError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setPreviewError(tx(lang, "Reconnectez-vous pour partager.", "Sign in to share.")); setSharing(false); return; }
    if (findSecrets(build.files).length) {
      setPreviewError(tx(lang, "Le code contient une clé secrète : retirez-la avant de partager un lien public.", "The code contains a secret key: remove it before sharing a public link."));
      setSharing(false); return;
    }
    if (findPhishing(build.files).length) {
      setPreviewError(phishingMessage(lang !== "en"));
      setSharing(false); return;
    }
    const { data, error } = await supabase.from("studio_previews").insert({ owner_id: auth.user.id, title, files: build.files as unknown as Json }).select("token").single();
    if (error || !data) setPreviewError(tx(lang, "Impossible de créer le lien public.", "Could not create the public link."));
    else {
      const url = `${window.location.origin}/apercu/${data.token}`;
      setSharedUrl(url);
      try { await navigator.clipboard.writeText(url); } catch { /* link remains selectable */ }
    }
    setSharing(false);
  };
  /** Deletes the shared preview: the link stops working immediately. */
  const revokeShare = async () => {
    const token = sharedUrl.split("/").pop() ?? "";
    const { error } = await supabase.from("studio_previews").delete().eq("token", token);
    if (error) { setPreviewError(tx(lang, "Impossible de désactiver le lien.", "Could not disable the link.")); return; }
    setSharedUrl("");
    toast.success(tx(lang, "Lien désactivé.", "Link disabled."));
  };
  const current = build.files.find((f) => f.path === selected) ?? build.files[0];
  const download = () => {
    const entries: Record<string, Uint8Array> = {};
    // The archive never carries a credential: detected secrets are replaced and explained.
    const leaks = findSecrets(build.files);
    const files = leaks.length ? redactSecrets(build.files) : build.files;
    for (const f of files) entries[f.path.replace(/^\/+/, "")] = strToU8(f.content);
    if (leaks.length) {
      entries["SECRETS-RETIRES.txt"] = strToU8(`${tx(lang, "Des clés secrètes ont été retirées de ce projet et remplacées par REMPLACEZ_PAR_VOTRE_CLE. Stockez-les dans des variables d'environnement côté serveur, jamais dans le code.", "Secret keys were removed from this project and replaced with REMPLACEZ_PAR_VOTRE_CLE. Keep them in server-side environment variables, never in code.")}\n\n${leaks.map((l) => `- ${l.path} : ${l.kind}`).join("\n")}\n`);
      toast.warning(tx(lang, `${leaks.length} clé(s) secrète(s) retirée(s) du ZIP (voir SECRETS-RETIRES.txt).`, `${leaks.length} secret key(s) removed from the ZIP (see SECRETS-RETIRES.txt).`));
    }
    if (build.sql) entries["database.sql"] = strToU8(build.sql);
    const blob = new Blob([zipSync(entries)], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\w-]+/g, "-").slice(0, 40) || "projet"}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = (text: string) => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const tabs = [
    { id: "activity" as const, label: tx(lang, "Activité", "Activity"), icon: ClipboardList },
    { id: "preview" as const, label: tx(lang, "Aperçu", "Preview"), icon: Eye },
    { id: "code" as const, label: "Code", icon: Code2 },
    ...(build.sql ? [{ id: "sql" as const, label: "SQL", icon: Database }] : []),
  ];
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-background">
      <div className="flex items-center gap-1 border-b border-border px-2 py-2 sm:gap-1.5 sm:px-3">
        {tabs.map((t) => (
          <Button key={t.id} type="button" variant="ghost" onClick={() => setTab(t.id)}
            className={cn("inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium transition sm:gap-1.5 sm:px-3", tab === t.id ? "bg-chat-glow/15 text-foreground" : "text-muted-foreground hover:bg-muted")}>
            <t.icon className="hidden size-3.5 sm:block" />{t.label}
          </Button>
        ))}
        <div className="flex-1" />
        {versions.length > 1 && onPickVersion && (
          <select
            aria-label={tx(lang, "Version du projet", "Project version")}
            title={tx(lang, "Revenir à une version précédente : aperçu, téléchargement et publication utilisent la version choisie.", "Go back to an earlier version: preview, download and publish use the chosen version.")}
            value={versionIndex < 0 ? versions.length - 1 : versionIndex}
            onChange={(e) => { const v = versions[Number(e.target.value)]; if (v) { onPickVersion(v); setPage("index.html"); setSelected(null); setSharedUrl(""); } }}
            className="h-8 max-w-[140px] rounded-full border border-border bg-background px-2 text-xs"
          >
            {versions.map((v, i) => <option key={i} value={i}>{tx(lang, "Version", "Version")} {i + 1}{i === versions.length - 1 ? tx(lang, " (dernière)", " (latest)") : ""} · {v.files.length} {tx(lang, "fichiers", "files")}</option>)}
          </select>
        )}
        <Button size="sm" variant="secondary" className="h-8 rounded-full" disabled={!build.done || !build.files.length} onClick={() => setPublishOpen(true)}><Rocket className="size-3.5" />{tx(lang, "Publier", "Publish")}</Button>
        <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} title={title} files={build.files} lang={lang} />
        <Button size="icon-sm" variant="ghost" title={tx(lang, "Télécharger", "Download")} aria-label={tx(lang, "Télécharger", "Download")} disabled={!build.files.length} onClick={download}><Download /></Button>
        <Button size="icon-sm" variant="ghost" className="rounded-full" aria-label={tx(lang, "Fermer", "Close")} onClick={onClose}><X /></Button>
      </div>
      {tab === "activity" && <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="mb-7 border-b border-border pb-5"><p className="text-xs font-medium text-muted-foreground">{tx(lang, "Chronologie du projet", "Project timeline")}</p><h2 className="mt-2 break-words font-display text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{build.done ? tx(lang, "Génération terminée", "Generation complete") : tx(lang, "Génération en cours", "Generation in progress")}</p></div>
        <ol className="space-y-0">{build.steps.map((step, index) => {
          const Icon = stepIcon(step.title);
          const file = step.file ? build.files.find((item) => item.path === step.file) : undefined;
          const isOpen = expanded === index;
          return <li key={index} className="relative border-l border-border pb-4 pl-5 last:border-transparent">
            <span className="absolute -left-3 top-0 grid size-6 place-items-center rounded-md border border-border bg-background">{step.done ? <Icon className="size-3.5 text-chat-glow" /> : <Loader2 className="size-3.5 animate-spin text-chat-glow" />}</span>
            <Button type="button" variant="ghost" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : index)} className="h-auto min-h-8 w-full justify-between gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/60"><span className="min-w-0 break-words text-sm font-medium">{step.title}</span><ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} /></Button>
            {isOpen && <div className="min-w-0 px-2 pb-2 pt-1">{step.detail && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted-foreground">{step.detail}</p>}{file && <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs"><code>{file.content}</code></pre>}</div>}
          </li>;
        })}</ol>
        {build.files.length > 0 && <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("code")}><Code2 className="size-4" />{tx(lang, `Voir les fichiers (${build.files.length})`, `View files (${build.files.length})`)}</Button>}
      </div>}
      {tab === "preview" && (
        <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
          {doc && <div className="flex min-h-11 shrink-0 items-center justify-between gap-1 border-b border-border bg-background px-2 sm:px-3">
            <div className="flex min-w-0 items-center gap-1"><Button size="icon-sm" variant="ghost" title={tx(lang,"Page précédente","Previous page")} aria-label={tx(lang,"Page précédente","Previous page")} disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { setPage(previous); setHistory(history.slice(0,-1)); setPreviewError(""); } }}><ArrowLeft className="size-4" /></Button><span className="max-w-24 truncate text-xs text-muted-foreground sm:max-w-40" title={page}>{page}</span></div>
            <div className="flex items-center gap-0.5" role="group" aria-label={tx(lang,"Taille de l’aperçu","Preview size")}>{(["desktop","tablet","mobile"] as const).map((mode) => { const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone; return <Button key={mode} size="icon-sm" variant={device === mode ? "secondary" : "ghost"} aria-label={mode === "desktop" ? "PC" : mode === "tablet" ? "Tablette" : "Mobile"} title={mode === "desktop" ? "PC" : mode === "tablet" ? "Tablette" : "Mobile"} aria-pressed={device === mode} onClick={() => setDevice(mode)}><Icon className="size-4" /></Button>; })}</div>
            <div className="flex items-center gap-0.5">{sharedUrl && <Button asChild size="icon-sm" variant="ghost"><a href={sharedUrl} target="_blank" rel="noopener noreferrer" title={tx(lang,"Ouvrir l’aperçu dans un nouvel onglet","Open preview in new tab")} aria-label={tx(lang,"Ouvrir l’aperçu dans un nouvel onglet","Open preview in new tab")}><ExternalLink className="size-4" /></a></Button>}<Button size="sm" variant="outline" disabled={sharing || Boolean(sharedUrl)} onClick={() => void sharePreview()}>{sharing ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}{sharedUrl ? tx(lang,"Publié","Published") : tx(lang,"Publier l’aperçu","Publish preview")}</Button></div>
          </div>}
          {sharedUrl && <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2"><input aria-label={tx(lang,"Lien public","Public link")} readOnly value={sharedUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none" /><Button size="icon-sm" variant="ghost" aria-label={tx(lang,"Copier le lien","Copy link")} onClick={() => void navigator.clipboard.writeText(sharedUrl)}><Copy className="size-4" /></Button><Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs" onClick={() => void revokeShare()}>{tx(lang, "Désactiver", "Disable")}</Button></div>}
          {sharedUrl && <p className="shrink-0 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">{tx(lang, "Toute personne ayant ce lien peut voir l'aperçu pendant 30 jours. Désactivez-le à tout moment.", "Anyone with this link can view the preview for 30 days. Disable it at any time.")}</p>}
          {previewError && <p role="alert" className="shrink-0 border-b border-border px-3 py-2 text-xs text-destructive">{previewError}</p>}
          {doc ? (
             <div className="flex min-h-0 flex-1 justify-center overflow-auto"><iframe key={page} data-studio-preview title="preview" sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={doc} className={cn("h-full shrink-0 border-0 bg-background transition-[width]", device === "mobile" ? "w-[390px]" : device === "tablet" ? "w-[768px]" : "w-full")} /></div>
          ) : (
            <div className="grid size-full place-items-center p-6 text-center text-sm text-muted-foreground">
              {build.done ? tx(lang, "Aucun index.html à afficher. Consultez l'onglet Code.", "No index.html to preview. See the Code tab.") : (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{tx(lang, "L'aperçu s'affichera à la fin de la génération…", "Preview appears when generation ends…")}</span>
              )}
            </div>
          )}
        </div>
      )}
      {tab === "code" && (
        <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)]">
          <div className="overflow-y-auto border-r border-border p-2">
            {build.files.map((f) => (
              <Button key={f.path} variant="ghost" type="button" onClick={() => setSelected(f.path)}
                className={cn("flex w-full items-center gap-1.5 truncate rounded-lg px-2 py-1.5 text-left text-xs", current?.path === f.path ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60")}>
                {f.done ? <FileCode2 className="size-3.5 shrink-0" /> : <Loader2 className="size-3.5 shrink-0 animate-spin" />}
                <span className="truncate">{f.path}</span>
              </Button>
            ))}
          </div>
          <div className="relative min-h-0 overflow-auto">
            {current && (
              <>
                <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{current.path}</span>
                  <Button size="icon-sm" variant="ghost" className="rounded-full" aria-label="Copy" onClick={() => copy(current.content)}>{copied ? <Check /> : <Copy />}</Button>
                </div>
                <pre className="p-3 text-[12px] leading-relaxed"><code>{current.content}</code></pre>
              </>
            )}
          </div>
        </div>
      )}
      {tab === "sql" && (
        <div className="relative min-h-0 flex-1 overflow-auto">
          <div className="sticky top-0 flex justify-end border-b border-border bg-background px-3 py-1.5">
            <Button size="sm" variant="ghost" className="rounded-full text-xs" onClick={() => copy(build.sql)}>{copied ? <Check /> : <Copy />}{tx(lang, "Copier le SQL", "Copy SQL")}</Button>
          </div>
          <pre className="p-3 text-[12px] leading-relaxed"><code>{build.sql}</code></pre>
        </div>
      )}
    </aside>
  );
}
