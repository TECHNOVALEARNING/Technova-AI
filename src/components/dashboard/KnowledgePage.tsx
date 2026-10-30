import { useCallback, useEffect, useRef, useState } from "react";
import { confirmDialog } from "@/components/ConfirmHost";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileText, Library, Loader2, MessageCircle, Pencil, Plus, RotateCcw, Search, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ALL_ACCEPT, checkFile, formatsLabel, sizeLabel } from "@/lib/file-types";
import { createKnowledgeBase, deleteKnowledgeBase, processUploadedFile, removeKnowledgeSource, searchKnowledge, updateKnowledgeBase } from "@/lib/files.functions";
import { fileErrorText, uploadAndIndex, warningText } from "@/lib/file-upload";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal";
import { useDashboard } from "./DashboardLayout";

type Base = Tables<"knowledge_bases"> & { count: number };
type Source = Pick<Tables<"files">, "id" | "filename" | "kind" | "size_bytes" | "status" | "error" | "chunk_count" | "credits" | "created_at"> & { warnings: string[] };
type Hit = { fileId: string; filename: string; chunk: number; score: number; excerpt: string };
const tx = (lang: string, fr: string, en: string) => (lang === "en" ? en : fr);

export function KnowledgePage() {
  const { lang } = useDashboard();
  const l = lang === "en" ? "en" : "fr";
  const navigate = useNavigate();
  const [bases, setBases] = useState<Base[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [uploads, setUploads] = useState<{ key: string; filename: string; phase: string }[]>([]);
  const [form, setForm] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const active = bases?.find((b) => b.id === activeId) ?? null;

  const loadBases = useCallback(async () => {
    const [{ data: kbs }, { data: links }] = await Promise.all([
      supabase.from("knowledge_bases").select("*").order("created_at", { ascending: false }),
      supabase.from("knowledge_sources").select("knowledge_base_id"),
    ]);
    const list = (kbs ?? []).map((b) => ({ ...b, count: (links ?? []).filter((s) => s.knowledge_base_id === b.id).length }));
    setBases(list);
    setActiveId((id) => (id && list.some((b) => b.id === id) ? id : list[0]?.id ?? null));
  }, []);

  const loadSources = useCallback(async (kbId: string) => {
    const { data: links } = await supabase.from("knowledge_sources").select("file_id").eq("knowledge_base_id", kbId);
    const ids = (links ?? []).map((s) => s.file_id);
    if (!ids.length) { setSources([]); return; }
    const [{ data: files }, { data: meta }] = await Promise.all([
      supabase.from("files").select("id, filename, kind, size_bytes, status, error, chunk_count, credits, created_at").in("id", ids).order("created_at", { ascending: false }),
      supabase.from("file_metadata").select("file_id, warnings").in("file_id", ids),
    ]);
    setSources((files ?? []).map((f) => ({ ...f, warnings: meta?.find((m) => m.file_id === f.id)?.warnings ?? [] })));
  }, []);

  useEffect(() => { void loadBases(); }, [loadBases]);
  useEffect(() => { setHits(null); setQuery(""); if (activeId) void loadSources(activeId); else setSources([]); }, [activeId, loadSources]);
  // Refresh while files are being analysed (also covers analyses started from another tab).
  useEffect(() => {
    if (!activeId || !sources.some((s) => s.status === "pending" || s.status === "processing")) return;
    const t = window.setInterval(() => void loadSources(activeId), 4000);
    return () => window.clearInterval(t);
  }, [activeId, sources, loadSources]);

  async function saveBase() {
    if (!form?.name.trim()) return;
    try {
      if (form.id) await updateKnowledgeBase({ data: { id: form.id, name: form.name, description: form.description } });
      else { const { id } = await createKnowledgeBase({ data: { name: form.name, description: form.description } }); setActiveId(id); }
      setForm(null); void loadBases();
    } catch (e) { setNotice(fileErrorText(e instanceof Error ? e.message : null, l)); }
  }

  async function removeBase(b: Base) {
    if (!(await confirmDialog({ title: tx(lang, "Supprimer cette base ?", "Delete this base?"), description: tx(lang, `« ${b.name} » et tous ses fichiers seront définitivement supprimés.`, `"${b.name}" and all its files will be permanently deleted.`), tone: "danger", confirmLabel: tx(lang, "Supprimer", "Delete") }))) return;
    await deleteKnowledgeBase({ data: { id: b.id } });
    setActiveId(null); void loadBases();
  }

  async function addFiles(list: FileList | File[] | null) {
    if (!list || !activeId) return;
    setNotice("");
    for (const file of Array.from(list)) {
      const check = checkFile(file.name, file.size);
      if (!check.ok) { setNotice(`${file.name} : ${fileErrorText(`file_${check.reason}`, l)}`); continue; }
      const key = crypto.randomUUID();
      const kbId = activeId;
      setUploads((u) => [...u, { key, filename: file.name, phase: "uploading" }]);
      void uploadAndIndex(file, "knowledge", (phase) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, phase } : x))), kbId).then((r) => {
        setUploads((u) => u.filter((x) => x.key !== key));
        if (r.status === "failed" && !r.fileId) setNotice(`${file.name} : ${fileErrorText(r.error, l)}`);
        void loadSources(kbId); void loadBases();
      });
      // The file row exists as soon as it is registered: show it in the list right away.
      window.setTimeout(() => void loadSources(kbId), 1500);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function retry(s: Source) {
    setSources((all) => all.map((x) => (x.id === s.id ? { ...x, status: "processing", error: null } : x)));
    await processUploadedFile({ data: { fileId: s.id } }).catch(() => null);
    if (activeId) void loadSources(activeId);
  }

  async function removeSource(s: Source) {
    if (!activeId || !(await confirmDialog({ title: tx(lang, "Retirer ce fichier ?", "Remove this file?"), description: tx(lang, `« ${s.filename} » ne sera plus utilisé par cette base.`, `"${s.filename}" will no longer be used by this base.`), tone: "danger", confirmLabel: tx(lang, "Retirer", "Remove") }))) return;
    await removeKnowledgeSource({ data: { knowledgeBaseId: activeId, fileId: s.id } });
    void loadSources(activeId); void loadBases();
  }

  async function search() {
    if (!activeId || query.trim().length < 2) return;
    setSearching(true);
    try { setHits(await searchKnowledge({ data: { query, knowledgeBaseIds: [activeId] } })); }
    catch (e) { setNotice(fileErrorText(e instanceof Error ? e.message : null, l)); }
    setSearching(false);
  }

  function useInChat() {
    if (!activeId) return;
    try {
      const current = JSON.parse(localStorage.getItem("technova-chat-kbs") ?? "[]") as unknown;
      const list = Array.isArray(current) ? current.filter((x): x is string => typeof x === "string") : [];
      localStorage.setItem("technova-chat-kbs", JSON.stringify([activeId, ...list.filter((x) => x !== activeId)].slice(0, 5)));
      localStorage.setItem("technova-workspace-mode", "chat");
    } catch { /* storage blocked */ }
    void navigate({ to: "/dashboard/chat" });
  }

  const statusChip = (s: Source) => {
    if (s.status === "ready") return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />{tx(lang, `Prêt · ${s.chunk_count} passages`, `Ready · ${s.chunk_count} passages`)}</span>;
    if (s.status === "pending" || s.status === "processing") return <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />{tx(lang, "Analyse en cours…", "Analysing…")}</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="size-3.5" />{fileErrorText(s.error, l)}</span>;
  };

  return <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">{tx(lang, "Bases de connaissances", "Knowledge bases")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tx(lang, "Ajoutez vos documents : ils sont lus, découpés et indexés pour que le chat et vos agents répondent à partir de leur contenu.", "Add your documents: they are read, split and indexed so the chat and your agents answer from their content.")}</p>
      </div>
      <Button className="rounded-full" onClick={() => setForm({ name: "", description: "" })}><Plus className="size-4" />{tx(lang, "Nouvelle base", "New base")}</Button>
    </header>
    {notice && <p role="status" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 text-sm">{notice}<button type="button" onClick={() => setNotice("")} aria-label={tx(lang, "Fermer", "Close")}><X className="size-4" /></button></p>}

    {bases === null ? <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      : bases.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card/80 p-10 text-center">
        <Library className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">{tx(lang, "Aucune base pour le moment", "No knowledge base yet")}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{tx(lang, "Créez une base (par exemple « Documentation produit » ou « Cours de droit ») puis ajoutez-y vos fichiers.", "Create a base (for example “Product docs” or “Law lectures”) then add your files.")}</p>
        <Button className="mt-5 rounded-full" onClick={() => setForm({ name: "", description: "" })}><Plus className="size-4" />{tx(lang, "Créer ma première base", "Create my first base")}</Button>
      </div>
      : <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav aria-label={tx(lang, "Vos bases", "Your bases")} className="space-y-1.5">
          {bases.map((b) => <button key={b.id} type="button" onClick={() => setActiveId(b.id)} aria-current={b.id === activeId ? "true" : undefined}
            className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition", b.id === activeId ? "border-foreground/30 bg-card shadow-soft" : "border-transparent hover:bg-card/70")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Library className="size-4" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{b.name}</span><span className="text-[11px] text-muted-foreground">{b.count} {tx(lang, b.count > 1 ? "fichiers" : "fichier", b.count === 1 ? "file" : "files")}</span></span>
          </button>)}
        </nav>

        {active && <section className="min-w-0 space-y-5 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="truncate font-display text-xl font-semibold">{active.name}</h2>{active.description && <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>}</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={useInChat} disabled={!sources.some((s) => s.status === "ready")}><MessageCircle className="size-4" />{tx(lang, "Utiliser dans le chat", "Use in chat")}</Button>
              <Button size="sm" variant="outline" aria-label={tx(lang, "Modifier", "Edit")} onClick={() => setForm({ id: active.id, name: active.name, description: active.description })}><Pencil className="size-4" /></Button>
              <Button size="sm" variant="outline" aria-label={tx(lang, "Supprimer la base", "Delete base")} onClick={() => void removeBase(active)}><Trash2 className="size-4" /></Button>
            </div>
          </div>

          <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
            className={cn("rounded-2xl border-2 border-dashed p-6 text-center transition", dragging ? "border-chat-glow bg-chat-glow/5" : "border-border")}>
            <UploadCloud className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">{tx(lang, "Glissez vos fichiers ici", "Drop your files here")}</p>
            <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground">{formatsLabel} {tx(lang, "et fichiers de code. Jusqu'à 25 Mo selon le format. L'analyse est facturée au coût réel (souvent 1 à quelques crédits ; plus pour l'audio et la vidéo).", "and code files. Up to 25 MB depending on format. Analysis is billed at real cost (often 1 to a few credits; more for audio and video).")}</p>
            <input ref={fileInput} type="file" multiple accept={ALL_ACCEPT} className="hidden" onChange={(e) => void addFiles(e.target.files)} />
            <Button size="sm" variant="outline" className="mt-4 rounded-full" onClick={() => fileInput.current?.click()}><Plus className="size-4" />{tx(lang, "Ajouter des fichiers", "Add files")}</Button>
          </div>

          {(uploads.length > 0 || sources.length > 0) && <ul className="divide-y divide-border rounded-xl border border-border">
            {uploads.filter((u) => u.phase === "uploading").map((u) => <li key={u.key} className="flex items-center gap-3 px-3 py-2.5 text-sm"><Loader2 className="size-4 animate-spin text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{u.filename}</span><span className="text-[11px] text-muted-foreground">{tx(lang, "Envoi…", "Uploading…")}</span></li>)}
            {sources.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.filename}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">{sizeLabel(s.size_bytes)}{s.credits > 0 && <span>· {s.credits} {tx(lang, "crédits", "credits")}</span>}{s.warnings.map((w) => <span key={w} className="text-amber-600 dark:text-amber-400">· {warningText[w]?.[l] ?? w}</span>)}</span>
              </span>
              {statusChip(s)}
              {s.status === "failed" && <Button size="icon-sm" variant="ghost" aria-label={tx(lang, "Relancer l'analyse", "Retry analysis")} onClick={() => void retry(s)}><RotateCcw className="size-4" /></Button>}
              <Button size="icon-sm" variant="ghost" aria-label={tx(lang, "Retirer", "Remove")} onClick={() => void removeSource(s)}><Trash2 className="size-4" /></Button>
            </li>)}
          </ul>}

          {sources.some((s) => s.status === "ready") && <div className="space-y-3">
            <form onSubmit={(e) => { e.preventDefault(); void search(); }} className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx(lang, "Rechercher dans cette base…", "Search this base…")} className="pl-9" maxLength={500} /></div>
              <Button type="submit" variant="outline" disabled={searching || query.trim().length < 2}>{searching ? <Loader2 className="size-4 animate-spin" /> : tx(lang, "Rechercher", "Search")}</Button>
            </form>
            {hits && (hits.length === 0 ? <p className="text-sm text-muted-foreground">{tx(lang, "Aucun passage pertinent trouvé.", "No relevant passage found.")}</p>
              : <ul className="space-y-2">{hits.map((h, i) => <li key={i} className="rounded-xl border border-border bg-background/60 p-3">
                <p className="flex items-center justify-between gap-2 text-xs font-medium"><span className="truncate">{h.filename} · {tx(lang, "passage", "passage")} {h.chunk}</span><span className="shrink-0 text-muted-foreground">{h.score} %</span></p>
                <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-[13px] text-muted-foreground">{h.excerpt}</p>
              </li>)}</ul>)}
          </div>}
        </section>}
      </div>}

    {form && <Modal label={form.id ? tx(lang, "Modifier la base", "Edit base") : tx(lang, "Nouvelle base", "New base")} onClose={() => setForm(null)} closeOnBackdrop={false} showClose={false}>
      <form onSubmit={(e) => { e.preventDefault(); void saveBase(); }} className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{form.id ? tx(lang, "Modifier la base", "Edit base") : tx(lang, "Nouvelle base", "New base")}</h2><Button type="button" variant="ghost" size="icon-sm" onClick={() => setForm(null)} aria-label={tx(lang, "Fermer", "Close")}><X /></Button></div>
        <label className="block space-y-1 text-sm"><span>{tx(lang, "Nom", "Name")}</span><Input autoFocus required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tx(lang, "Ex. Documentation produit", "e.g. Product docs")} /></label>
        <label className="block space-y-1 text-sm"><span>{tx(lang, "Description (facultatif)", "Description (optional)")}</span><Textarea rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setForm(null)}>{tx(lang, "Annuler", "Cancel")}</Button><Button type="submit" disabled={!form.name.trim()}>{tx(lang, "Enregistrer", "Save")}</Button></div>
      </form>
    </Modal>}
  </div>;
}
