import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/components/ConfirmHost";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Lock, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "./Modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AGENT_BUDGET, upgradeFeatureOf, upgradeSentence } from "@/lib/plans";
import { usePlanTier } from "@/lib/plan-client";
import type { Tables } from "@/integrations/supabase/types";
import { openRouterModelIds } from "@/lib/chat-models";
import { useDashboard } from "./DashboardLayout";

type Agent = Tables<"agents">;
const tx = (lang: string, fr: string, en: string) => (lang === "en" ? en : fr);

// Tools are deny-by-default. Web search and page reading execute server-side; sensitive ones stay locked.
const TOOLS = [
  { id: "web_search", fr: "Recherche web", en: "Web search" },
  { id: "web_fetch", fr: "Lire une page web", en: "Read a web page" },
  { id: "read_file", fr: "Lire des fichiers", en: "Read files" },
  { id: "database_read", fr: "Lire une base de données", en: "Read a database" },
  { id: "execute_code", fr: "Exécuter du code", en: "Run code", locked: true },
  { id: "database_write", fr: "Écrire en base", en: "Write to database", locked: true },
  { id: "email", fr: "Envoyer des e-mails", en: "Send emails", locked: true },
  { id: "payment", fr: "Paiements", en: "Payments", locked: true },
] as const;

const empty = { name: "", description: "", instructions: "", memory: "", model: "TechNova Smart", max_tokens: 1024, max_cost: 20, tools: [] as string[], knowledge_base_ids: [] as string[] };
const models = ["TechNova Smart", ...Object.keys(openRouterModelIds)];

export function AgentsPage() {
  const { lang } = useDashboard();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState<typeof empty & { id?: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [bases, setBases] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { void supabase.from("knowledge_bases").select("id, name").order("name").then(({ data }) => setBases(data ?? [])); }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("agents").select("*").order("updated_at", { ascending: false });
    if (error) setNotice(tx(lang, "Impossible de charger vos agents.", "Could not load agents.")); else setAgents(data);
  }, [lang]);
  useEffect(() => { void load(); }, [load]);

  const tier = usePlanTier();
  const fr = lang !== "en";
  const save = async () => {
    if (!form || !form.name.trim() || !form.instructions.trim()) { setNotice(tx(lang, "Nom et instructions sont obligatoires.", "Name and instructions are required.")); return; }
    setSaving(true); setNotice("");
    const { data: u } = await supabase.auth.getUser();
    const row = { name: form.name.trim().slice(0, 80), description: form.description.slice(0, 300), instructions: form.instructions.slice(0, 8000), memory: form.memory.slice(0, 4000), model: form.model, max_tokens: form.max_tokens, max_cost: form.max_cost, tools: form.tools, knowledge_base_ids: form.knowledge_base_ids.slice(0, 5)};
    const { error } = form.id
      ? await supabase.from("agents").update(row).eq("id", form.id)
      : await supabase.from("agents").insert({ ...row, owner_id: u.user?.id ?? "" });
    setSaving(false);
    if (error) { const f = upgradeFeatureOf(error.message); setNotice(f ? upgradeSentence(f, fr) : tx(lang, "Enregistrement impossible.", "Could not save.")); return; }
    setForm(null); setNotice(tx(lang, "Agent enregistré.", "Agent saved.")); void load();
  };
  const remove = async (a: Agent) => {
    if (!(await confirmDialog({ title: tx(lang, "Supprimer cet agent ?", "Delete this agent?"), description: tx(lang, `« ${a.name} » et ses réglages seront définitivement supprimés.`, `"${a.name}" and its settings will be permanently deleted.`), tone: "danger", confirmLabel: tx(lang, "Supprimer", "Delete") }))) return;
    await supabase.from("agents").delete().eq("id", a.id); void load();
  };
  const chat = (a: Agent) => { localStorage.setItem("technova-active-agent", JSON.stringify({ id: a.id, name: a.name })); void navigate({ to: "/dashboard/chat" }); };

  return <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-semibold">{tx(lang, "Agents IA", "AI Agents")}</h1><p className="mt-1 text-sm text-muted-foreground">{tx(lang, "Créez vos assistants : consignes, modèle, mémoire et budget par réponse.", "Build your assistants: instructions, model, memory and per-reply budget.")}</p></div>
      <Button className="rounded-full" disabled={tier !== null && tier < 2} onClick={() => setForm({ ...empty })}><Plus className="size-4" />{tx(lang, "Nouvel agent", "New agent")}</Button>
    </header>
    {tier !== null && tier < 2 && <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm">{upgradeSentence("agents", fr)} <a href="/dashboard/credits" className="font-medium text-primary hover:underline">{tx(lang, "Voir les packs", "See packs")}</a></p>}
    {notice && <p role="status" className="rounded-xl border border-border bg-card px-4 py-2 text-sm">{notice}</p>}

    {agents.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card/80 p-10 text-center"><Bot className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">{tx(lang, "Aucun agent pour le moment.", "No agents yet.")}</p></div>
      : <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{agents.map(a => <article key={a.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><Bot className="size-5" /></span><div className="min-w-0"><h2 className="truncate font-medium">{a.name}</h2><p className="truncate text-xs text-muted-foreground">{a.model} · v{a.version}</p></div></div>
        <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{a.description || a.instructions}</p>
        <p className="text-xs text-muted-foreground">{tx(lang, "Budget", "Budget")} : {a.max_cost} {tx(lang, "crédits Technova / réponse", "Technova credits / reply")}</p>
        <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => chat(a)}><MessageCircle className="size-4" />{tx(lang, "Discuter", "Chat")}</Button><Button size="sm" variant="outline" aria-label={tx(lang, "Modifier", "Edit")} onClick={() => setForm({ id: a.id, name: a.name, description: a.description, instructions: a.instructions, memory: a.memory, model: a.model, max_tokens: a.max_tokens, max_cost: a.max_cost, tools: a.tools, knowledge_base_ids: a.knowledge_base_ids ?? [] })}><Pencil className="size-4" /></Button><Button size="sm" variant="outline" aria-label={tx(lang, "Supprimer", "Delete")} onClick={() => void remove(a)}><Trash2 className="size-4" /></Button></div>
      </article>)}</section>}

    {form && <Modal label={form.id ? tx(lang, "Modifier l’agent", "Edit agent") : tx(lang, "Nouvel agent", "New agent")} onClose={() => setForm(null)} closeOnBackdrop={false} showClose={false}>
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{form.id ? tx(lang, "Modifier l’agent", "Edit agent") : tx(lang, "Nouvel agent", "New agent")}</h2><Button variant="ghost" size="icon-sm" onClick={() => setForm(null)} aria-label={tx(lang, "Fermer", "Close")}><X /></Button></div>
        <label className="block space-y-1 text-sm"><span>{tx(lang, "Nom", "Name")}</span><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={tx(lang, "Ex. Rédacteur marketing", "e.g. Marketing writer")} /></label>
        <label className="block space-y-1 text-sm"><span>{tx(lang, "Description", "Description")}</span><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label className="block space-y-1 text-sm"><span>{tx(lang, "Instructions", "Instructions")}</span><Textarea rows={5} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder={tx(lang, "Rôle, ton, format des réponses, ce qu’il doit éviter…", "Role, tone, answer format, what to avoid…")} /></label>
        <label className="block space-y-1 text-sm"><span>{tx(lang, "Mémoire (faits à retenir)", "Memory (facts to remember)")}</span><Textarea rows={3} value={form.memory} onChange={e => setForm({ ...form, memory: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-sm"><span>{tx(lang, "Modèle", "Model")}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}>{models.map(m => <option key={m}>{m}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span>{tx(lang, "Longueur max (jetons)", "Max length (tokens)")}</span><Input type="number" min={128} max={4096} value={form.max_tokens} onChange={e => setForm({ ...form, max_tokens: Math.min(4096, Math.max(128, Number(e.target.value) || 128)) })} /></label>
          <label className="block space-y-1 text-sm"><span>{tx(lang, "Budget / réponse", "Budget / reply")}</span><Input type="number" min={1} max={500} disabled={tier !== null && tier < 3} value={tier !== null && tier < 3 ? DEFAULT_AGENT_BUDGET : form.max_cost} onChange={e => setForm({ ...form, max_cost: Math.min(500, Math.max(1, Number(e.target.value) || 1)) })} />{tier !== null && tier < 3 && <span className="block text-xs text-muted-foreground">{upgradeSentence("agent_budget", fr)}</span>}</label>
        </div>
        <fieldset className="space-y-2"><legend className="text-sm">{tx(lang, "Outils (désactivés par défaut)", "Tools (off by default)")}</legend>
          <p className="text-xs text-muted-foreground">{tx(lang, "Les autorisations sont enregistrées ; l’exécution des outils arrive dans une prochaine étape. Pour l’instant l’agent répond uniquement par écrit.", "Permissions are saved; tool execution comes in a later step. For now the agent replies in text only.")}</p>
          <div className="grid gap-2 sm:grid-cols-2">{TOOLS.map(tool => { const locked = "locked" in tool; const on = form.tools.includes(tool.id); return <label key={tool.id} className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${locked ? "opacity-60" : ""}`}><input type="checkbox" disabled={locked} checked={on} onChange={() => setForm({ ...form, tools: on ? form.tools.filter(x => x !== tool.id) : [...form.tools, tool.id] })} />{tx(lang, tool.fr, tool.en)}{locked && <Lock className="ml-auto size-3.5" />}</label>; })}</div>
        </fieldset>
        <fieldset className="space-y-2"><legend className="text-sm">{tx(lang, "Bases de connaissances (5 maximum)", "Knowledge bases (5 max)")}</legend>
          {bases.length === 0
            ? <p className="text-xs text-muted-foreground">{tx(lang, "Créez une base dans « Connaissances » pour que l'agent réponde à partir de vos documents.", "Create a base in “Knowledge” so the agent answers from your documents.")}</p>
            : <div className="grid gap-2 sm:grid-cols-2">{bases.map(b => { const on = form.knowledge_base_ids.includes(b.id); return <label key={b.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={on} disabled={!on && form.knowledge_base_ids.length >= 5} onChange={() => setForm({ ...form, knowledge_base_ids: on ? form.knowledge_base_ids.filter(x => x !== b.id) : [...form.knowledge_base_ids, b.id] })} /><span className="truncate">{b.name}</span></label>; })}</div>}
        </fieldset>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>{tx(lang, "Annuler", "Cancel")}</Button><Button onClick={() => void save()} disabled={saving}>{tx(lang, "Enregistrer", "Save")}</Button></div>
      </div>
    </Modal>}
  </div>;
}
