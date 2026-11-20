import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Clock, FileSpreadsheet, FolderKanban, FolderPlus, LayoutTemplate, MessageCircle, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog, promptDialog } from "@/components/ConfirmHost";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS, RETENTION_DAYS, createProject, daysLeft, listProjects, saveErrorText, type Creation, type Project } from "@/lib/creations";
import { useDashboard } from "@/components/dashboard/DashboardLayout";

// Projets: the account's projects with their conversations and saved files (TechNova Design presentations and
// documents, TechNova Tableur workbooks). Saved files are deleted 14 days after creation (no renewal): each card shows the
// date, files ending within 3 days are flagged, and the page explains how to keep them (save again or download).

type Filter = "all" | "none" | string;

export function ProjectsPage() {
  const { lang, threads, reload } = useDashboard();
  const fr = lang !== "en";
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creations, setCreations] = useState<Omit<Creation, "data">[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [p, c] = await Promise.all([listProjects(), supabase.from("user_creations").select("id,owner_id,project_id,kind,title,subtitle,size_bytes,created_at,updated_at,expires_at").order("updated_at", { ascending: false })]);
    setProjects(p); setCreations(c.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const current = projects.find((p) => p.id === filter) ?? null;
  const shownFiles = creations.filter((c) => filter === "all" || (filter === "none" ? !c.project_id : c.project_id === filter));
  const shownThreads = useMemo(() => threads.filter((t) => filter === "all" ? !!t.project_id : filter === "none" ? false : t.project_id === filter), [threads, filter]);
  const soon = creations.filter((c) => daysLeft(c.expires_at) <= 3);

  const newProject = async () => {
    const name = await promptDialog({ title: fr ? "Nouveau projet" : "New project", description: fr ? "Regroupez conversations, présentations et tableaux d'un même sujet." : "Group the conversations, presentations and spreadsheets of one topic.", input: { label: fr ? "Nom du projet" : "Project name", placeholder: fr ? "Ex. : Boutique Awa" : "E.g. Awa's shop", required: true }, confirmLabel: fr ? "Créer" : "Create" });
    if (!name) return;
    try { const p = await createProject(name, PROJECT_COLORS[projects.length % PROJECT_COLORS.length]); await load(); setFilter(p.id); }
    catch (e) { toast.error(saveErrorText(e instanceof Error ? e.message : "", fr)); }
  };
  const renameProject = async (p: Project) => {
    const name = await promptDialog({ title: fr ? "Renommer le projet" : "Rename project", input: { label: fr ? "Nom" : "Name", defaultValue: p.name, required: true }, confirmLabel: fr ? "Renommer" : "Rename" });
    if (!name) return;
    await supabase.from("projects").update({ name: name.slice(0, 80), updated_at: new Date().toISOString() }).eq("id", p.id); void load();
  };
  const deleteProject = async (p: Project) => {
    if (!(await confirmDialog({ title: fr ? `Supprimer le projet « ${p.name} » ?` : `Delete project "${p.name}"?`, description: fr ? "Ses conversations et ses fichiers ne sont pas supprimés : ils restent dans « Sans projet »." : "Its conversations and files are not deleted: they move to “No project”.", confirmLabel: fr ? "Supprimer" : "Delete", tone: "danger" }))) return;
    await supabase.from("projects").delete().eq("id", p.id); setFilter("all"); void load(); void reload();
  };
  const deleteFile = async (c: Omit<Creation, "data">) => {
    if (!(await confirmDialog({ title: fr ? `Supprimer « ${c.title} » ?` : `Delete "${c.title}"?`, description: fr ? "Le fichier est supprimé définitivement de vos projets." : "The file is permanently deleted from your projects.", confirmLabel: fr ? "Supprimer" : "Delete", tone: "danger" }))) return;
    await supabase.from("user_creations").delete().eq("id", c.id); void load();
  };
  const moveFile = async (c: Omit<Creation, "data">, projectId: string | null) => {
    const { error } = await supabase.from("user_creations").update({ project_id: projectId }).eq("id", c.id);
    if (error) toast.error(saveErrorText("", fr)); else { toast.success(fr ? "Fichier déplacé." : "File moved."); void load(); }
  };
  const openFile = (c: Omit<Creation, "data">) => void navigate({ to: "/dashboard/registry", search: { section: c.kind === "sheet" ? "sheet" : "design", creation: c.id } as never });
  const detachThread = async (id: string) => { await supabase.from("chat_threads").update({ project_id: null }).eq("id", id); void reload(); };
  const dateFmt = (d: string) => new Date(d).toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "short" });

  return <div className="mx-auto max-w-[1180px] space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><FolderKanban className="size-3.5" />{fr ? "Projets" : "Projects"}</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold">{fr ? "Tout votre travail, rangé par projet" : "All your work, organised by project"}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{fr ? "Conversations, présentations, documents et tableaux enregistrés, au même endroit." : "Conversations, presentations, documents and spreadsheets, in one place."}</p>
      </div>
      <button type="button" onClick={() => void newProject()} className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background"><FolderPlus className="size-4" />{fr ? "Nouveau projet" : "New project"}</button>
    </div>

    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3 text-[12.5px]">
      <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p><strong>{fr ? `Les fichiers enregistrés sont supprimés ${RETENTION_DAYS} jours après leur création, sans prolongation possible.` : `Saved files are deleted ${RETENTION_DAYS} days after they were created, with no extension.`}</strong> {fr ? "Pour les garder : ouvrez-les, téléchargez-les en PDF, PowerPoint ou Excel, puis rangez-les dans votre Google Drive ou Notion. Vous êtes prévenu 3 jours avant dans votre boîte de réception. Les conversations, elles, restent." : "To keep them: open them, download them as PDF, PowerPoint or Excel, then store them in your Google Drive or Notion. Your Inbox warns you 3 days before. Conversations stay."}</p>
    </div>
    {soon.length > 0 && <div className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/[0.06] px-4 py-2.5 text-[12.5px] text-red-700 dark:text-red-300"><AlertTriangle className="size-4 shrink-0" />{fr ? `${soon.length} fichier(s) supprimé(s) dans 3 jours ou moins : téléchargez-les maintenant pour les garder.` : `${soon.length} file(s) deleted within 3 days: download them now to keep them.`}</div>}

    <div className="flex flex-wrap gap-1.5">
      {[["all", fr ? "Tout" : "All", creations.length], ["none", fr ? "Sans projet" : "No project", creations.filter((c) => !c.project_id).length]].map(([id, label, n]) => <button key={id as string} type="button" onClick={() => setFilter(id as string)} className={cn("h-8 rounded-full border px-3.5 text-[12.5px]", filter === id ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-secondary")}>{label} <span className="opacity-60">{n}</span></button>)}
      {projects.map((p) => <button key={p.id} type="button" onClick={() => setFilter(p.id)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px]", filter === p.id ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-secondary")}><span className="size-2.5 rounded-full" style={{ background: p.color }} />{p.name}</button>)}
    </div>

    {current && <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      <span className="size-3 rounded-full" style={{ background: current.color }} />
      <strong className="text-[14px]">{current.name}</strong>
      <span className="text-[12px] text-muted-foreground">· {shownThreads.length} {fr ? "conversation(s)" : "conversation(s)"} · {shownFiles.length} {fr ? "fichier(s)" : "file(s)"}</span>
      <div className="ml-auto flex gap-1.5">
        <button type="button" onClick={() => setPicker(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[12px] hover:bg-secondary"><Plus className="size-3.5" />{fr ? "Ajouter des conversations" : "Add conversations"}</button>
        <button type="button" onClick={() => void renameProject(current)} className="grid size-8 place-items-center rounded-full border border-border hover:bg-secondary" aria-label={fr ? "Renommer" : "Rename"}><Pencil className="size-3.5" /></button>
        <button type="button" onClick={() => void deleteProject(current)} className="grid size-8 place-items-center rounded-full border border-border text-destructive hover:bg-destructive/10" aria-label={fr ? "Supprimer le projet" : "Delete project"}><Trash2 className="size-3.5" /></button>
      </div>
    </div>}

    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Fichiers enregistrés" : "Saved files"}</p>
        {!shownFiles.length ? <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
          {fr ? "Aucun fichier ici. Dans Créativité ou Tableur, cliquez sur « Enregistrer » pour retrouver votre travail." : "No file here. In Creativity or Spreadsheet, click “Save” to find your work again."}
          <div className="mt-3 flex justify-center gap-2"><Link to="/dashboard/registry" search={{ section: "design" } as never} className="rounded-full border border-border px-3 py-1.5 text-[12px] hover:bg-secondary">{fr ? "Ouvrir Créativité" : "Open Creativity"}</Link><Link to="/dashboard/registry" search={{ section: "sheet" } as never} className="rounded-full border border-border px-3 py-1.5 text-[12px] hover:bg-secondary">{fr ? "Ouvrir Tableur" : "Open Spreadsheet"}</Link></div>
        </div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shownFiles.map((c) => {
          const left = daysLeft(c.expires_at); const proj = projects.find((p) => p.id === c.project_id);
          const Icon = c.kind === "sheet" ? FileSpreadsheet : LayoutTemplate;
          return <div key={c.id} className="group relative flex flex-col rounded-2xl border border-border bg-card p-4">
            <button type="button" onClick={() => openFile(c)} className="flex items-start gap-3 text-left">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-white", c.kind === "sheet" ? "bg-[#1f7a5a]" : "bg-gradient-to-br from-[#e86a9e] to-[#a46be0]")}><Icon className="size-5" /></span>
              <span className="min-w-0"><strong className="block truncate text-[13.5px]">{c.title}</strong><span className="block truncate text-[11.5px] text-muted-foreground">{c.subtitle || (c.kind === "sheet" ? (fr ? "Tableur" : "Spreadsheet") : (fr ? "Créativité" : "Creativity"))} · {dateFmt(c.updated_at)}</span></span>
            </button>
            <div className="mt-3 flex items-center gap-2 text-[11.5px]">
              {proj && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"><span className="size-2 rounded-full" style={{ background: proj.color }} />{proj.name}</span>}
              <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", left <= 3 ? "bg-red-500/10 text-red-600 dark:text-red-300" : "bg-secondary text-muted-foreground")}><Clock className="size-3" />{left <= 0 ? (fr ? "Supprimé aujourd'hui" : "Deleted today") : fr ? `Supprimé dans ${left} j` : `Deleted in ${left} d`}</span>
            </div>
            <button type="button" onClick={() => setMenu(menu === c.id ? null : c.id)} aria-label={fr ? "Options" : "Options"} className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg opacity-60 hover:bg-secondary hover:opacity-100"><MoreHorizontal className="size-4" /></button>
            {menu === c.id && <><div className="fixed inset-0 z-40" onClick={() => setMenu(null)} /><div className="absolute right-2 top-9 z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-[12.5px] shadow-xl">
              <button type="button" onClick={() => { setMenu(null); openFile(c); }} className="w-full rounded-lg px-2.5 py-2 text-left hover:bg-secondary">{fr ? "Ouvrir et modifier" : "Open and edit"}</button>
              <p className="px-2.5 pb-1 pt-2 text-[10.5px] uppercase tracking-wide text-muted-foreground">{fr ? "Déplacer vers" : "Move to"}</p>
              <button type="button" onClick={() => { setMenu(null); void moveFile(c, null); }} className="w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-secondary">{fr ? "Sans projet" : "No project"}</button>
              {projects.map((p) => <button key={p.id} type="button" onClick={() => { setMenu(null); void moveFile(c, p.id); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-secondary"><span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}</button>)}
              <div className="my-1 h-px bg-border" />
              <button type="button" onClick={() => { setMenu(null); void deleteFile(c); }} className="w-full rounded-lg px-2.5 py-2 text-left text-destructive hover:bg-destructive/10">{fr ? "Supprimer" : "Delete"}</button>
            </div></>}
          </div>;
        })}</div>}
      </section>
      <aside>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Conversations" : "Conversations"}</p>
        <div className="rounded-2xl border border-border bg-card p-2">
          {!shownThreads.length ? <p className="px-2 py-6 text-center text-[12.5px] text-muted-foreground">{current ? (fr ? "Aucune conversation dans ce projet." : "No conversation in this project.") : (fr ? "Choisissez un projet puis « Ajouter des conversations »." : "Pick a project, then “Add conversations”.")}</p>
            : shownThreads.map((t) => <div key={t.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-secondary">
              <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
              <Link to="/dashboard/chat/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 truncate text-[13px]">{t.title}</Link>
              {filter === "all" && (() => { const p = projects.find((x) => x.id === t.project_id); return p ? <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} title={p.name} /> : null; })()}
              {current && <button type="button" onClick={() => void detachThread(t.id)} aria-label={fr ? "Retirer du projet" : "Remove from project"} className="grid size-6 place-items-center rounded-md opacity-0 hover:bg-background group-hover:opacity-100"><X className="size-3.5" /></button>}
            </div>)}
        </div>
      </aside>
    </div>

    {current && <Dialog open={picker} onOpenChange={setPicker}>
      <DialogContent className="max-w-[480px] rounded-2xl">
        <DialogTitle>{fr ? `Ajouter à « ${current.name} »` : `Add to "${current.name}"`}</DialogTitle>
        <DialogDescription>{fr ? "Choisissez les conversations à ranger dans ce projet." : "Pick the conversations to put in this project."}</DialogDescription>
        <div className="max-h-[50vh] space-y-0.5 overflow-y-auto">{threads.filter((t) => t.project_id !== current.id).slice(0, 200).map((t) => <button key={t.id} type="button" onClick={async () => { await supabase.from("chat_threads").update({ project_id: current.id }).eq("id", t.id); void reload(); }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-secondary"><MessageCircle className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{t.title}</span>{t.project_id && <span className="text-[11px] text-muted-foreground">{projects.find((p) => p.id === t.project_id)?.name}</span>}<Plus className="size-4" /></button>)}</div>
      </DialogContent>
    </Dialog>}
  </div>;
}
