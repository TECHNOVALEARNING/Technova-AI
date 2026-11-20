import { useEffect, useState } from "react";
import { Clock, FolderPlus, Loader2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RETENTION_DAYS, createProject, listProjects, saveErrorText, type Project } from "@/lib/creations";

// « Enregistrer dans un projet »: title + project (or none, or a new one). Used by TechNova Design and Tableur.

type Lang = "fr" | "en";

export function SaveToProject({ open, onOpenChange, lang, defaultTitle, projectId, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; lang: Lang; defaultTitle: string; projectId: string | null;
  onSave: (title: string, projectId: string | null) => Promise<void>;
}) {
  const fr = lang === "fr";
  const [title, setTitle] = useState(defaultTitle);
  const [project, setProject] = useState<string>(projectId ?? "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!open) return; setTitle(defaultTitle); setProject(projectId ?? ""); setError(""); void listProjects().then(setProjects); }, [open, defaultTitle, projectId]);
  const submit = async () => {
    setBusy(true); setError("");
    try {
      let pid: string | null = project || null;
      if (project === "__new") { if (!newName.trim()) { setError(fr ? "Donnez un nom au projet." : "Name the project."); setBusy(false); return; } pid = (await createProject(newName)).id; }
      await onSave(title.trim() || defaultTitle, pid);
      onOpenChange(false);
    } catch (e) { setError(saveErrorText(e instanceof Error ? e.message : "", fr)); }
    finally { setBusy(false); }
  };
  const field = "h-10 w-full rounded-xl border border-border bg-background px-3 text-[13.5px] outline-none focus:border-foreground/40";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[440px] rounded-2xl">
      <DialogTitle className="flex items-center gap-2"><Save className="size-4" />{fr ? "Enregistrer dans mes projets" : "Save to my projects"}</DialogTitle>
      <DialogDescription>{fr ? `Retrouvez ce fichier dans Projets et rouvrez-le pour le modifier. Il est supprimé ${RETENTION_DAYS} jours après son premier enregistrement.` : `Find this file in Projects and reopen it to edit. It is deleted ${RETENTION_DAYS} days after it was first saved.`}</DialogDescription>
      <label className="grid gap-1.5 text-[13px] font-medium">{fr ? "Nom du fichier" : "File name"}<input className={field} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{fr ? "Projet" : "Project"}
        <select className={field} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">{fr ? "Sans projet" : "No project"}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="__new">{fr ? "+ Nouveau projet…" : "+ New project…"}</option>
        </select>
      </label>
      {project === "__new" && <label className="grid gap-1.5 text-[13px] font-medium"><span className="flex items-center gap-1.5"><FolderPlus className="size-4" />{fr ? "Nom du nouveau projet" : "New project name"}</span><input className={field} value={newName} maxLength={80} autoFocus onChange={(e) => setNewName(e.target.value)} placeholder={fr ? "Ex. : Mariage de Fifamè, Boutique Awa…" : "E.g. Wedding, Shop…"} /></label>}
      <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200"><Clock className="mt-0.5 size-3.5 shrink-0" />{fr ? `${RETENTION_DAYS} jours après son premier enregistrement, le fichier est supprimé définitivement, même si vous l'enregistrez à nouveau. Pour le garder, téléchargez-le en PDF, PowerPoint ou Excel, puis rangez-le dans votre Google Drive ou Notion.` : `${RETENTION_DAYS} days after its first save the file is deleted for good, even if you save it again. To keep it, download it as PDF, PowerPoint or Excel, then store it in your Google Drive or Notion.`}</p>
      {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-full border border-border px-4 text-[13px] hover:bg-secondary">{fr ? "Annuler" : "Cancel"}</button>
        <button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-semibold text-background disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{fr ? "Enregistrer" : "Save"}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
