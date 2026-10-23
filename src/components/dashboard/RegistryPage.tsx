import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Download, GitFork, Heart, Plus, Search, Share2, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "./Modal";
import { DesignLibraryPage } from "./DesignLibraryPage";
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
  },
};

const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";
const chip = (on: boolean) => `h-8 shrink-0 rounded-full px-3.5 text-[12px] font-medium transition-colors ${on ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`;

export function RegistryPage() {
  const { lang } = useDashboard(); const c = T[lang]; const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]); const [favs, setFavs] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState(""); const [q, setQ] = useState(""); const [tab, setTab] = useState<string>("all");
  const [open, setOpen] = useState<Item | null>(null); const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [{ data: u }, { data: it }, { data: f }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("registry_items").select("*").order("owner_id", { nullsFirst: true }).order("created_at", { ascending: false }).limit(500),
      supabase.from("registry_favorites").select("item_id"),
    ]);
    setUid(u.user?.id ?? ""); setItems(it ?? []); setFavs(new Set((f ?? []).map(x => x.item_id)));
    const id = new URLSearchParams(window.location.search).get("item");
    if (id) { const hit = (it ?? []).find(x => x.id === id); if (hit) setOpen(hit); }
  }, []);
  useEffect(() => { void load(); }, [load]);

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
  function useInStudio(i: Item) {
    void navigator.clipboard.writeText(i.content); toast.success(c.copied);
    localStorage.setItem("technova-workspace-mode", "create"); void navigate({ to: "/dashboard/chat" });
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
    {tab !== "design" && <div className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={c.search} aria-label={c.search} className="h-11 rounded-full bg-background pl-11" /></div>}
    <div className="flex gap-2 overflow-x-auto pb-1">
      {["all", "favs", "mine", "design", ...CATS].map(k => <button key={k} type="button" onClick={() => setTab(k)} className={chip(tab === k)}>{k === "all" ? c.all : k === "favs" ? c.favs : k === "mine" ? c.mine : k === "design" ? "Design Library" : c.cats[k as keyof typeof c.cats]}</button>)}
    </div>
    {tab === "design" ? <DesignLibraryPage /> : shown.length === 0 ? <p className="py-16 text-center text-[13px] text-muted-foreground">{c.empty}</p> :
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map(i => <div key={i.id} className={`${card} flex flex-col`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">{c.cats[i.category as keyof typeof c.cats]}</p><button type="button" onClick={() => setOpen(i)} className="mt-1 text-left text-[14.5px] font-semibold hover:underline">{i.title}</button></div>
        <button type="button" aria-label={c.favs} onClick={() => void toggleFav(i)} className="grid size-8 place-items-center rounded-full hover:bg-secondary"><Heart className={`size-4 ${favs.has(i.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-[12.5px] text-muted-foreground">{i.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px]">
        <span className="rounded-full bg-secondary px-2 py-0.5">{c.lic[i.license as keyof typeof c.lic]}</span>
        {i.owner_id === null && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{c.official}</span>}
        {i.owner_id === uid && <span className="rounded-full border border-border px-2 py-0.5">{i.visibility === "public" ? c.pub : c.priv}</span>}
        {i.remix_of && <span className="rounded-full border border-border px-2 py-0.5">{c.remixOf}</span>}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <span className="flex-1 text-[11px] text-muted-foreground">{i.author || "—"} · {i.downloads} {c.downloads}</span>
        <Button size="sm" variant="ghost" className="rounded-full" aria-label={c.download} onClick={() => void download(i)}><Download className="size-4" /></Button>
        <Button size="sm" variant="outline" className="rounded-full text-[12px]" onClick={() => setOpen(i)}>{c.use.split(" ")[0]}</Button>
      </div>
    </div>)}</div>}

    {open && <Overlay onClose={() => setOpen(null)}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">{c.cats[open.category as keyof typeof c.cats]}</p>
      <h2 className="mt-1 font-display text-[22px] font-semibold">{open.title}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{open.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border p-4 text-[12px] sm:grid-cols-4">
        {[[c.source, open.source || "—"], [c.author, open.author || "—"], [c.license, c.lic[open.license as keyof typeof c.lic]], [c.commercial, open.commercial_use ? c.yes : c.no], [c.modif, open.modification ? c.yes : c.no], [c.redist, open.redistribution ? c.yes : c.no], [c.attrib, open.attribution_required ? c.yes : c.no]].map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium break-words">{v}</dd></div>)}
      </dl>
      <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-secondary p-4 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">{open.content}</pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="rounded-full" onClick={() => useInStudio(open)}><Wand2 className="size-4" />{c.use}</Button>
        <Button variant="outline" className="rounded-full" onClick={() => void download(open)}><Download className="size-4" />{c.download}</Button>
        <Button variant="outline" className="rounded-full" disabled={!open.modification && open.owner_id !== uid} onClick={() => void remix(open)}><GitFork className="size-4" />{c.remix}</Button>
        {open.visibility === "public" && <Button variant="outline" className="rounded-full" onClick={() => share(open)}><Share2 className="size-4" />{c.share}</Button>}
        <Button variant="ghost" className="rounded-full" onClick={() => { void navigator.clipboard.writeText(open.content); toast.success("OK"); }}><Copy className="size-4" /></Button>
        {open.owner_id === uid && <Button variant="ghost" className="ml-auto rounded-full text-destructive" onClick={() => void remove(open)}><Trash2 className="size-4" />{c.del}</Button>}
      </div>
    </Overlay>}

    {creating && <Overlay onClose={() => setCreating(false)}><CreateForm c={c} uid={uid} onDone={async () => { setCreating(false); setTab("mine"); await load(); }} /></Overlay>}
  </div>;
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <Modal label="Registry" onClose={onClose}>{children}</Modal>;
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
