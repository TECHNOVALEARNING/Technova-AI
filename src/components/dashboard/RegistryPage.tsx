import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Code2, Copy, Download, Eye, GitFork, Heart, Monitor, Plus, Search, Share2, Smartphone, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "./Modal";
import { MessageResponse } from "@/components/ai-elements/message";
import { DESIGN_DRAFT_KEY } from "@/lib/design-library";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useDashboard } from "./dashboard-context";

type Item = Tables<"registry_items">;
const CATS = ["landing", "animation", "font", "ui_kit", "prompt", "template", "component", "workflow"] as const;
const LICENSES = ["technova", "cc0", "mit", "cc_by", "cc_by_sa", "ofl", "all_rights_reserved"] as const;
const EXTS = ["txt", "md", "html", "css", "js", "tsx", "json", "sql"] as const;

const T = {
  fr: {
    title: "Registry", sub: "Bibliothèque de ressources réutilisables : pages, animations, polices, kits, prompts, modèles, composants et workflows.",
    search: "Rechercher une ressource…", all: "Tout", favs: "Favoris", mine: "Mes ressources", add: "Ajouter",
    cats: { landing: "Landing pages", animation: "Animations", font: "Polices", ui_kit: "Kits UI", prompt: "Prompts", template: "Modèles", component: "Composants", workflow: "Workflows" },
    lic: { technova: "Licence TechNova", cc0: "CC0 (domaine public)", mit: "MIT", cc_by: "CC BY", cc_by_sa: "CC BY-SA", ofl: "SIL OFL", all_rights_reserved: "Tous droits réservés" },
    source: "Source", author: "Auteur", license: "Licence", commercial: "Usage commercial", modif: "Modification", redist: "Redistribution", attrib: "Attribution requise",
    yes: "Oui", no: "Non", download: "Télécharger", share: "Partager", remix: "Remixer", use: "Utiliser dans le Studio", del: "Supprimer",
    shared: "Lien copié", remixed: "Remix créé dans vos ressources", noRemix: "La licence n'autorise pas la modification.", copied: "Contenu copié : collez-le dans le mode Créer.",
    empty: "Aucune ressource trouvée.", downloads: "téléchargements", official: "Officiel", priv: "Privé", pub: "Public",
    newTitle: "Nouvelle ressource", name: "Titre", desc: "Description", content: "Contenu (code, prompt, texte…)", format: "Format", makePublic: "Rendre publique",
    publicNeedsRights: "Une ressource publique doit autoriser la redistribution.", save: "Enregistrer", cancel: "Annuler", saved: "Ressource enregistrée", error: "Action impossible. Réessayez.",
    delConfirm: "Supprimer cette ressource ?", remixOf: "Remix d'une ressource",
    open: "Ouvrir", preview: "Aperçu", code: "Code", desktop: "Ordinateur", mobile: "Mobile", copy: "Copier", copiedCode: "Code copié", usePrompt: "Utiliser dans le chat",
    brief: (title: string, desc: string, cat: string) => `Crée un site pour mon activité en t'inspirant de la ressource « ${title} » (${cat}) du Registry TechNova : ${desc}\nReprends son niveau de finition, sa structure, sa typographie et sa palette, adaptés à mon activité.\nMon activité : `,
  },
  en: {
    title: "Registry", sub: "Reusable resource library: landing pages, animations, fonts, UI kits, prompts, templates, components and workflows.",
    search: "Search resources…", all: "All", favs: "Favorites", mine: "My resources", add: "Add",
    cats: { landing: "Landing pages", animation: "Animations", font: "Fonts", ui_kit: "UI kits", prompt: "Prompts", template: "Templates", component: "Components", workflow: "Workflows" },
    lic: { technova: "TechNova licence", cc0: "CC0 (public domain)", mit: "MIT", cc_by: "CC BY", cc_by_sa: "CC BY-SA", ofl: "SIL OFL", all_rights_reserved: "All rights reserved" },
    source: "Source", author: "Author", license: "Licence", commercial: "Commercial use", modif: "Modification", redist: "Redistribution", attrib: "Attribution required",
    yes: "Yes", no: "No", download: "Download", share: "Share", remix: "Remix", use: "Use in Studio", del: "Delete",
    shared: "Link copied", remixed: "Remix created in your resources", noRemix: "The licence does not allow modification.", copied: "Content copied: paste it in Create mode.",
    empty: "No resources found.", downloads: "downloads", official: "Official", priv: "Private", pub: "Public",
    newTitle: "New resource", name: "Title", desc: "Description", content: "Content (code, prompt, text…)", format: "Format", makePublic: "Make public",
    publicNeedsRights: "A public resource must allow redistribution.", save: "Save", cancel: "Cancel", saved: "Resource saved", error: "Action failed. Try again.",
    delConfirm: "Delete this resource?", remixOf: "Remix of a resource",
    open: "Open", preview: "Preview", code: "Code", desktop: "Desktop", mobile: "Mobile", copy: "Copy", copiedCode: "Code copied", usePrompt: "Use in chat",
    brief: (title: string, desc: string, cat: string) => `Build a website for my business inspired by the "${title}" resource (${cat}) from the TechNova Registry: ${desc}\nKeep its level of polish, structure, typography and palette, adapted to my business.\nMy business: `,
  },
};

const chip = (on: boolean) => `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium transition-colors ${on ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`;
const isPage = (i: Item) => i.file_ext === "html";

/** Renders an HTML item at desktop width inside a sandboxed frame (no same-origin), scaled to its box. */
function LivePreview({ html, width = 1280, height = 800, interactive = false, className = "" }: { html: string; width?: number; height?: number; interactive?: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => { if (e) setScale(e.contentRect.width / width); });
    ro.observe(el); return () => ro.disconnect();
  }, [width]);
  return <div ref={box} className={`relative overflow-hidden ${className}`} style={{ aspectRatio: interactive ? undefined : `${width} / ${height}` }}>
    <iframe title="Aperçu" srcDoc={html} sandbox="allow-scripts" loading="lazy" tabIndex={interactive ? 0 : -1}
      className={`absolute left-0 top-0 origin-top-left border-0 bg-white ${interactive ? "" : "pointer-events-none"}`}
      style={{ width, height: interactive ? `${100 / scale}%` : height, transform: `scale(${scale})` }} />
  </div>;
}

/** Text items (prompts, workflows): a calm "page" showing the first lines. */
function TextThumb({ item }: { item: Item }) {
  const lines = item.content.split("\n").filter((l) => l.trim() && !/^(---|```|\|)/.test(l.trim())).slice(0, 9);
  return <div className="relative aspect-[1280/800] overflow-hidden bg-gradient-to-b from-secondary/70 to-card p-5">
    <div className="mx-auto h-full max-w-[85%] rounded-t-lg border border-b-0 border-border bg-background px-5 pt-4 shadow-sm">
      {lines.map((l, k) => <p key={k} className={k === 0 ? "truncate font-display text-[13px] font-semibold" : "truncate text-[10.5px] leading-[1.7] text-muted-foreground"}>{l.replace(/^#+\s*|^>\s*|\*\*|`/g, "")}</p>)}
    </div>
  </div>;
}

export function RegistryPage() {
  const { lang } = useDashboard(); const c = T[lang]; const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]); const [favs, setFavs] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState(""); const [q, setQ] = useState(""); const [tab, setTab] = useState<string>("all");
  const [open, setOpen] = useState<Item | null>(null); const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [{ data: u }, { data: it }, { data: f }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("registry_items").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("registry_favorites").select("item_id"),
    ]);
    // Official items first, in catalogue order; then the newest community and personal items.
    const sorted = [...(it ?? [])].sort((a, b) => (a.owner_id === null) !== (b.owner_id === null) ? (a.owner_id === null ? -1 : 1) : a.owner_id === null ? a.id.localeCompare(b.id) : 0);
    setUid(u.user?.id ?? ""); setItems(sorted); setFavs(new Set((f ?? []).map(x => x.item_id))); setLoaded(true);
    const id = new URLSearchParams(window.location.search).get("item");
    if (id) { const hit = sorted.find(x => x.id === id); if (hit) setOpen(hit); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(CATS.map((k) => [k, items.filter((i) => i.category === k).length])), [items]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(i =>
      (tab === "all" || (tab === "favs" ? favs.has(i.id) : tab === "mine" ? i.owner_id === uid : i.category === tab)) &&
      (!s || `${i.title} ${i.description} ${i.author}`.toLowerCase().includes(s)));
  }, [items, q, tab, favs, uid]);

  async function toggleFav(i: Item) {
    const on = favs.has(i.id); const next = new Set(favs); on ? next.delete(i.id) : next.add(i.id); setFavs(next);
    const r = on ? await supabase.from("registry_favorites").delete().eq("item_id", i.id) : await supabase.from("registry_favorites").insert({ item_id: i.id });
    if (r.error) { toast.error(c.error); void load(); }
  }
  async function download(i: Item) {
    const { data, error } = await supabase.rpc("registry_download", { _item: i.id });
    if (error || data == null) { toast.error(c.error); return; }
    const header = i.attribution_required ? `${i.file_ext === "html" ? "<!--" : "/*"} ${i.title} — ${i.author} (${c.lic[i.license as keyof typeof c.lic]}) ${i.source} ${i.file_ext === "html" ? "-->" : "*/"}\n` : "";
    const blob = new Blob([(["txt", "md", "json"].includes(i.file_ext) ? "" : header) + data], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${i.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.${i.file_ext}`; a.click(); URL.revokeObjectURL(a.href);
    setItems(xs => xs.map(x => x.id === i.id ? { ...x, downloads: x.downloads + 1 } : x));
  }
  function share(i: Item) { void navigator.clipboard.writeText(`${window.location.origin}/dashboard/registry?item=${i.id}`); toast.success(c.shared); }
  async function remix(i: Item) {
    if (!i.modification && i.owner_id !== uid) { toast.error(c.noRemix); return; }
    const { data, error } = await supabase.rpc("registry_remix", { _item: i.id });
    if (error || !data) { toast.error(c.noRemix); return; }
    toast.success(c.remixed); setOpen(null); setTab("mine"); await load();
  }
  /** Prompts go to the composer as they are; designs become a brief that names the reference. */
  function useInStudio(i: Item) {
    const text = i.category === "prompt" || i.category === "workflow" ? i.content.slice(0, 8000)
      : c.brief(i.title, i.description, c.cats[i.category as keyof typeof c.cats]);
    try { sessionStorage.setItem(DESIGN_DRAFT_KEY, JSON.stringify({ mode: i.category === "prompt" || i.category === "workflow" ? "chat" : "create", text })); } catch { /* storage blocked */ }
    void navigate({ to: "/dashboard/chat" });
  }
  async function remove(i: Item) {
    if (!confirm(c.delConfirm)) return;
    const { error } = await supabase.from("registry_items").delete().eq("id", i.id);
    if (error) { toast.error(c.error); return; } setOpen(null); await load();
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-[26px] font-semibold leading-tight">{c.title}</h1><p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{c.sub}</p></div>
      <Button className="h-9 rounded-full" onClick={() => setCreating(true)}><Plus className="size-4" />{c.add}</Button>
    </div>
    <div className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={c.search} aria-label={c.search} className="h-11 rounded-full bg-background pl-11" /></div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {(["all", "favs", "mine", ...CATS] as string[]).map(k => <button key={k} type="button" onClick={() => setTab(k)} className={chip(tab === k)}>
        {k === "all" ? c.all : k === "favs" ? c.favs : k === "mine" ? c.mine : c.cats[k as keyof typeof c.cats]}
        {k in counts && <span className={`text-[10.5px] ${tab === k ? "opacity-70" : "opacity-60"}`}>{counts[k]}</span>}
      </button>)}
    </div>
    {!loaded ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(k => <div key={k} className="aspect-[4/3] animate-pulse rounded-2xl bg-secondary" />)}</div>
      : shown.length === 0 ? <p className="py-16 text-center text-[13px] text-muted-foreground">{c.empty}</p> :
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{shown.map(i => <article key={i.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <button type="button" onClick={() => setOpen(i)} aria-label={`${c.open} : ${i.title}`} className="relative block border-b border-border text-left">
        {isPage(i) ? <LivePreview html={i.content} /> : <TextThumb item={i} />}
        <span className="absolute inset-0 grid place-items-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/10 group-hover:opacity-100"><span className="rounded-full bg-background px-3.5 py-1.5 text-[12px] font-medium shadow">{c.open}</span></span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{c.cats[i.category as keyof typeof c.cats]}{i.owner_id === null && <span className="ml-2 text-primary">· {c.official}</span>}</p><h2 className="mt-1 truncate text-[14.5px] font-semibold">{i.title}</h2></div>
          <button type="button" aria-label={c.favs} onClick={() => void toggleFav(i)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-secondary"><Heart className={`size-4 ${favs.has(i.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>
        </div>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[12.5px] text-muted-foreground">{i.description}</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5">{c.lic[i.license as keyof typeof c.lic]}</span>
          {i.owner_id === uid && <span className="rounded-full border border-border px-2 py-0.5">{i.visibility === "public" ? c.pub : c.priv}</span>}
          <span className="ml-auto">{i.downloads} {c.downloads}</span>
        </div>
      </div>
    </article>)}</div>}

    {open && <Modal label={open.title} onClose={() => setOpen(null)} className="max-w-6xl p-0 sm:p-0"><Detail item={open} c={c} uid={uid} onUse={() => useInStudio(open)} onDownload={() => void download(open)} onRemix={() => void remix(open)} onShare={() => share(open)} onRemove={() => void remove(open)} /></Modal>}

    {creating && <Modal label={c.newTitle} onClose={() => setCreating(false)}><CreateForm c={c} uid={uid} onDone={async () => { setCreating(false); setTab("mine"); await load(); }} /></Modal>}
  </div>;
}

function Detail({ item, c, uid, onUse, onDownload, onRemix, onShare, onRemove }: { item: Item; c: (typeof T)["fr"]; uid: string; onUse: () => void; onDownload: () => void; onRemix: () => void; onShare: () => void; onRemove: () => void }) {
  const page = isPage(item);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const seg = (on: boolean) => `inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;
  return <div>
    <div className="flex flex-wrap items-start gap-4 border-b border-border p-5 pr-14 sm:p-6 sm:pr-14">
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{c.cats[item.category as keyof typeof c.cats]}{item.owner_id === null && <span className="ml-2 text-primary">· {c.official}</span>}</p>
        <h2 className="mt-1 font-display text-[22px] font-semibold leading-tight">{item.title}</h2>
        <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{item.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-full" onClick={onUse}><Wand2 className="size-4" />{item.category === "prompt" || item.category === "workflow" ? c.usePrompt : c.use}</Button>
        <Button variant="outline" className="rounded-full" onClick={onDownload}><Download className="size-4" />{c.download}</Button>
        <Button variant="outline" size="icon" className="rounded-full" aria-label={c.remix} title={c.remix} disabled={!item.modification && item.owner_id !== uid} onClick={onRemix}><GitFork className="size-4" /></Button>
        {item.visibility === "public" && <Button variant="outline" size="icon" className="rounded-full" aria-label={c.share} title={c.share} onClick={onShare}><Share2 className="size-4" /></Button>}
        {item.owner_id === uid && <Button variant="ghost" size="icon" className="rounded-full text-destructive" aria-label={c.del} title={c.del} onClick={onRemove}><Trash2 className="size-4" /></Button>}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 sm:px-6">
      <div className="inline-flex rounded-full bg-secondary p-1">
        <button type="button" className={seg(view === "preview")} onClick={() => setView("preview")}><Eye className="size-3.5" />{c.preview}</button>
        <button type="button" className={seg(view === "code")} onClick={() => setView("code")}><Code2 className="size-3.5" />{page ? c.code : c.source}</button>
      </div>
      <div className="flex items-center gap-2">
        {page && view === "preview" && <div className="inline-flex rounded-full bg-secondary p-1">
          <button type="button" aria-label={c.desktop} title={c.desktop} className={seg(device === "desktop")} onClick={() => setDevice("desktop")}><Monitor className="size-3.5" /></button>
          <button type="button" aria-label={c.mobile} title={c.mobile} className={seg(device === "mobile")} onClick={() => setDevice("mobile")}><Smartphone className="size-3.5" /></button>
        </div>}
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { void navigator.clipboard.writeText(item.content); toast.success(c.copiedCode); }}><Copy className="size-3.5" />{c.copy}</Button>
      </div>
    </div>
    <div className="p-5 sm:p-6">
      {view === "code"
        ? <pre className="max-h-[68vh] overflow-auto rounded-xl bg-ink p-5 font-mono text-[12px] leading-relaxed text-ink-foreground/90"><code>{item.content}</code></pre>
        : page
          ? <div className="rounded-xl border border-border bg-secondary/50 p-2 sm:p-3">
              {device === "desktop"
                ? <div className="h-[68vh] overflow-hidden rounded-lg"><LivePreview html={item.content} interactive className="h-full" /></div>
                : <div className="mx-auto h-[68vh] w-[390px] max-w-full overflow-hidden rounded-[28px] border-[6px] border-foreground/85 bg-white"><iframe title={c.preview} srcDoc={item.content} sandbox="allow-scripts" className="h-full w-full border-0" /></div>}
            </div>
          : <div className="max-h-[68vh] overflow-auto rounded-xl border border-border bg-background p-6"><MessageResponse>{item.content}</MessageResponse></div>}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11.5px] sm:grid-cols-4 lg:grid-cols-7">
        {[[c.source, item.source || "—"], [c.author, item.author || "—"], [c.license, c.lic[item.license as keyof typeof c.lic]], [c.commercial, item.commercial_use ? c.yes : c.no], [c.modif, item.modification ? c.yes : c.no], [c.redist, item.redistribution ? c.yes : c.no], [c.attrib, item.attribution_required ? c.yes : c.no]].map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium break-words">{v}</dd></div>)}
      </dl>
    </div>
  </div>;
}

function CreateForm({ c, uid, onDone }: { c: (typeof T)["fr"]; uid: string; onDone: () => Promise<void> }) {
  const [f, setF] = useState({ title: "", description: "", category: "prompt", content: "", file_ext: "txt", source: "", author: "", license: "technova", commercial_use: true, modification: true, redistribution: false, attribution_required: true, visibility: "private" });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (f.visibility === "public" && !f.redistribution) { toast.error(c.publicNeedsRights); return; }
    setBusy(true); const { error } = await supabase.from("registry_items").insert({ ...f, owner_id: uid }); setBusy(false);
    if (error) { toast.error(c.error); return; } toast.success(c.saved); await onDone();
  }
  const sel = "h-10 w-full rounded-full border border-input bg-background px-4 text-[13px]";
  const box = (k: "commercial_use" | "modification" | "redistribution" | "attribution_required", label: string) => <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={f[k]} onChange={e => set(k, e.target.checked)} />{label}</label>;
  return <form onSubmit={submit} className="space-y-3">
    <h2 className="font-display text-[20px] font-semibold">{c.newTitle}</h2>
    <Input required minLength={2} maxLength={120} value={f.title} onChange={e => set("title", e.target.value)} placeholder={c.name} className="h-10 rounded-full bg-background px-4" />
    <Input maxLength={300} value={f.description} onChange={e => set("description", e.target.value)} placeholder={c.desc} className="h-10 rounded-full bg-background px-4" />
    <div className="grid grid-cols-2 gap-2">
      <select aria-label="Catégorie" value={f.category} onChange={e => set("category", e.target.value)} className={sel}>{CATS.map(k => <option key={k} value={k}>{c.cats[k]}</option>)}</select>
      <select aria-label={c.format} value={f.file_ext} onChange={e => set("file_ext", e.target.value)} className={sel}>{EXTS.map(k => <option key={k} value={k}>.{k}</option>)}</select>
    </div>
    <Textarea required maxLength={60000} value={f.content} onChange={e => set("content", e.target.value)} placeholder={c.content} className="min-h-40 rounded-xl bg-background font-mono text-[12px]" />
    <div className="grid grid-cols-2 gap-2">
      <Input maxLength={200} value={f.source} onChange={e => set("source", e.target.value)} placeholder={c.source} className="h-10 rounded-full bg-background px-4" />
      <Input maxLength={120} value={f.author} onChange={e => set("author", e.target.value)} placeholder={c.author} className="h-10 rounded-full bg-background px-4" />
    </div>
    <select aria-label={c.license} value={f.license} onChange={e => set("license", e.target.value)} className={sel}>{LICENSES.map(k => <option key={k} value={k}>{c.lic[k]}</option>)}</select>
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3">{box("commercial_use", c.commercial)}{box("modification", c.modif)}{box("redistribution", c.redist)}{box("attribution_required", c.attrib)}</div>
    <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={f.visibility === "public"} onChange={e => set("visibility", e.target.checked ? "public" : "private")} />{c.makePublic}</label>
    {f.visibility === "public" && !f.redistribution && <p className="text-[12px] text-destructive">{c.publicNeedsRights}</p>}
    <div className="flex justify-end gap-2 pt-1"><Button type="submit" disabled={busy} className="rounded-full">{c.save}</Button></div>
  </form>;
}
