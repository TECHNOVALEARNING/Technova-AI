import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, Briefcase, Calculator, Check, Code2, GraduationCap, Loader2, Lock, Megaphone, PenLine, Puzzle, Scale, Search, ShieldCheck, Slash, Store, Table2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ConfirmHost";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_AGENT_BUDGET, featureMinTier, packNames, upgradeSentence } from "@/lib/plans";
import { usePlanTier } from "@/lib/plan-client";
import { pluginCategories, pluginTools, plugins, toolLabels, type Plugin, type PluginCategory } from "@/lib/plugins";
import { installPlugin, setPluginEnabled, uninstallPlugin, useInstalledPlugins, type InstalledPlugin } from "@/lib/plugins-client";
import { cn } from "@/lib/utils";
import { useDashboard } from "./DashboardLayout";

const icons = { briefcase: Briefcase, scale: Scale, graduation: GraduationCap, megaphone: Megaphone, code: Code2, table: Table2, users: Users, calculator: Calculator, store: Store, pen: PenLine } as const;

function PluginIcon({ plugin, size = "md" }: { plugin: Plugin; size?: "md" | "lg" }) {
  const Icon = icons[plugin.icon];
  return <span className={cn("plugin-icon grid shrink-0 place-items-center rounded-xl", size === "lg" ? "size-12" : "size-10")} style={{ ["--hue" as string]: plugin.hue }}>
    <Icon className={size === "lg" ? "size-6" : "size-5"} strokeWidth={1.7} />
  </span>;
}

export function PluginsPage() {
  const { lang } = useDashboard();
  const fr = lang !== "en";
  const L = fr ? "fr" : "en";
  const tier = usePlanTier();
  const { items, ready } = useInstalledPlugins();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PluginCategory | "all" | "installed">("all");
  const [open, setOpen] = useState<Plugin | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const installed = useMemo(() => new Map(items.map((i) => [i.plugin_id, i])), [items]);
  const agentsLocked = tier !== null && tier < featureMinTier.agents;

  const shown = plugins.filter((p) => {
    if (category === "installed" && !installed.has(p.id)) return false;
    if (category !== "all" && category !== "installed" && p.category !== category) return false;
    const q = query.trim().toLowerCase();
    return !q || [p.name[L], p.tagline[L], p.description[L], ...p.commands.map((c) => c.label[L])].some((s) => s.toLowerCase().includes(q));
  });

  async function install(p: Plugin) {
    setBusy(p.id);
    try {
      const r = await installPlugin(p.id, L);
      toast.success(fr ? `${p.name.fr} est installé` : `${p.name.en} installed`, { description: r.agents ? (fr ? "Agents ajoutés et commandes « / » disponibles dans le chat." : "Agents added and “/” commands available in the chat.") : (fr ? `Commandes « / » disponibles. Les agents arrivent avec le forfait ${packNames[featureMinTier.agents]}.` : `“/” commands available. Agents come with the ${packNames[featureMinTier.agents]} plan.`) });
    } catch {
      toast.error(fr ? "Installation impossible pour le moment." : "Could not install right now.");
    } finally { setBusy(null); }
  }
  async function remove(p: Plugin, item: InstalledPlugin) {
    if (!(await confirmDialog({ title: fr ? `Désinstaller ${p.name.fr} ?` : `Uninstall ${p.name.en}?`, description: fr ? `Ses commandes « / » disparaissent${item.agent_ids.length ? " et ses agents sont supprimés (vos autres agents ne changent pas)" : ""}. Vous pourrez le réinstaller à tout moment.` : `Its “/” commands are removed${item.agent_ids.length ? " and its agents deleted (your other agents are untouched)" : ""}. You can reinstall it any time.`, tone: "danger", confirmLabel: fr ? "Désinstaller" : "Uninstall" }))) return;
    setBusy(p.id);
    try { await uninstallPlugin(item); toast(fr ? "Plugin désinstallé" : "Plugin uninstalled"); setOpen(null); }
    catch { toast.error(fr ? "Désinstallation impossible pour le moment." : "Could not uninstall right now."); }
    finally { setBusy(null); }
  }
  async function toggle(p: Plugin, enabled: boolean) {
    setBusy(p.id);
    try { await setPluginEnabled(p.id, enabled); } catch { toast.error(fr ? "Modification impossible." : "Could not update."); } finally { setBusy(null); }
  }

  const filters: { id: typeof category; label: string }[] = [
    { id: "all", label: fr ? "Tous" : "All" }, { id: "installed", label: fr ? `Installés (${items.length})` : `Installed (${items.length})` },
    ...(Object.keys(pluginCategories) as PluginCategory[]).map((c) => ({ id: c, label: pluginCategories[c][L] })),
  ];

  return <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="space-y-1">
      <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Puzzle className="size-6 text-primary" />Plugins</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{fr ? "Des métiers prêts à l'emploi : chaque plugin ajoute des agents spécialisés et des commandes « / » à taper dans le chat. Installation en un clic, désinstallation à tout moment." : "Ready-made skills: each plugin adds specialised agents and “/” commands to type in the chat. One-click install, uninstall any time."}</p>
    </header>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative block sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? "Rechercher un plugin ou une commande" : "Search a plugin or a command"} className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-foreground/30" />
      </label>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {filters.map((f) => <button key={f.id} type="button" onClick={() => setCategory(f.id)} aria-pressed={category === f.id} className={cn("h-8 shrink-0 rounded-full border px-3 text-[12.5px] transition", category === f.id ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/30")}>{f.label}</button>)}
      </div>
    </div>

    {!ready ? <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      : shown.length === 0 ? <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">{category === "installed" ? (fr ? "Aucun plugin installé pour le moment." : "No plugins installed yet.") : (fr ? "Aucun plugin ne correspond." : "No matching plugin.")}</p>
      : <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => {
          const item = installed.get(p.id);
          return <article key={p.id} className="plugin-card flex flex-col gap-3 rounded-2xl border border-border bg-card p-4" style={{ ["--hue" as string]: p.hue }}>
            <button type="button" onClick={() => setOpen(p)} className="flex items-start gap-3 text-left">
              <PluginIcon plugin={p} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate font-semibold">{p.name[L]}</span>{item && <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", item.enabled ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : "bg-secondary text-muted-foreground")}>{item.enabled ? <Check className="size-3" /> : null}{item.enabled ? (fr ? "Installé" : "Installed") : (fr ? "Désactivé" : "Disabled")}</span>}</span>
                <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{p.tagline[L]}</span>
              </span>
            </button>
            <div className="flex flex-wrap gap-1">{p.commands.map((c) => <span key={c.slug} className="rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">/{c.slug}</span>)}</div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground"><Bot className="size-3.5" />{p.agents.length} {fr ? "agent" : "agent"}{p.agents.length > 1 ? "s" : ""} · {p.commands.length} {fr ? "commandes" : "commands"}</span>
              {item ? <button type="button" onClick={() => setOpen(p)} className="h-8 rounded-full border border-border px-3 text-[12.5px] font-medium transition hover:border-foreground/30">{fr ? "Gérer" : "Manage"}</button>
                : <button type="button" disabled={busy === p.id} onClick={() => void install(p)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-semibold text-background transition hover:opacity-90 disabled:opacity-60">{busy === p.id && <Loader2 className="size-3.5 animate-spin" />}{fr ? "Installer" : "Install"}</button>}
            </div>
          </article>;
        })}
      </section>}

    <p className="flex items-start gap-2 text-[12px] text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />{fr ? `Les plugins officiels sont conçus par TechNova. Leurs agents n'ont que les accès affichés (lecture seule), un budget de ${DEFAULT_AGENT_BUDGET} crédits par réponse, et ne peuvent ni payer, ni envoyer d'e-mails, ni écrire dans une base.` : `Official plugins are made by TechNova. Their agents only get the accesses shown (read-only), a budget of ${DEFAULT_AGENT_BUDGET} credits per reply, and can never pay, send emails or write to a database.`}</p>

    <PluginSheet plugin={open} item={open ? installed.get(open.id) ?? null : null} lang={L} agentsLocked={agentsLocked} busy={busy !== null}
      onClose={() => setOpen(null)} onInstall={install} onRemove={remove} onToggle={toggle} />
  </div>;
}

function PluginSheet({ plugin, item, lang, agentsLocked, busy, onClose, onInstall, onRemove, onToggle }: {
  plugin: Plugin | null; item: InstalledPlugin | null; lang: "fr" | "en"; agentsLocked: boolean; busy: boolean;
  onClose: () => void; onInstall: (p: Plugin) => Promise<void>; onRemove: (p: Plugin, item: InstalledPlugin) => Promise<void>; onToggle: (p: Plugin, enabled: boolean) => Promise<void>;
}) {
  const navigate = useNavigate();
  const fr = lang === "fr";
  if (!plugin) return null;
  const tools = pluginTools(plugin);
  const tryCommand = () => { onClose(); void navigate({ to: "/dashboard/chat" }); toast(fr ? "Tapez « / » dans la zone de message" : "Type “/” in the message box", { description: fr ? `Puis choisissez une commande de ${plugin.name.fr}.` : `Then pick a ${plugin.name.en} command.` }); };
  return <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-[560px] gap-0 rounded-2xl p-0 sm:rounded-2xl">
      <div className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
        <PluginIcon plugin={plugin} size="lg" />
        <div className="min-w-0 flex-1 pr-6">
          <DialogTitle className="text-[17px] font-semibold">{plugin.name[lang]}</DialogTitle>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{fr ? "Plugin officiel TechNova" : "Official TechNova plugin"} · {pluginCategories[plugin.category][lang]}</p>
          <DialogDescription className="mt-2 text-[13px] text-foreground/80">{plugin.description[lang]}</DialogDescription>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Ce qui est installé" : "What gets installed"}</h3>
          <ul className="space-y-1.5">
            {plugin.agents.map((a) => <li key={a.name.en} className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5 text-[13px]">
              <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1"><b className="font-medium">{fr ? "Agent" : "Agent"} « {a.name[lang]} »</b><span className="block text-[12px] text-muted-foreground">{a.description[lang]}</span></span>
              {agentsLocked && <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"><Lock className="size-3" />{packNames[featureMinTier.agents]}</span>}
            </li>)}
            {plugin.commands.map((c) => <li key={c.slug} className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5 text-[13px]">
              <Slash className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1"><b className="font-mono text-[12.5px] font-medium">/{c.slug}</b> <span className="text-muted-foreground">— {c.label[lang]}</span><span className="mt-0.5 block text-[12px] text-muted-foreground">{c.prompt[lang]}</span></span>
            </li>)}
          </ul>
          {agentsLocked && <p className="mt-2 text-[12px] text-muted-foreground">{upgradeSentence("agents", fr)} {fr ? "Les commandes « / » fonctionnent avec tous les forfaits." : "The “/” commands work with every plan."} <Link to="/dashboard/credits" className="font-medium text-primary hover:underline">{fr ? "Voir les forfaits" : "See plans"}</Link></p>}
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Accès demandés" : "Accesses requested"}</h3>
          {tools.length ? <ul className="space-y-1">{tools.map((t) => <li key={t} className="flex items-start gap-2 text-[13px]"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span><b className="font-medium">{toolLabels[t][lang]}</b> <span className="text-muted-foreground">— {toolLabels[t].detail[lang]}</span></span></li>)}</ul>
            : <p className="text-[13px] text-muted-foreground">{fr ? "Aucun : ce plugin ne lit ni Internet, ni vos fichiers." : "None: this plugin reads neither the web nor your files."}</p>}
          <p className="mt-2 text-[12px] text-muted-foreground">{fr ? `Jamais : paiements, envoi d'e-mails, écriture en base. Budget : ${DEFAULT_AGENT_BUDGET} crédits maximum par réponse d'agent ; les commandes coûtent le prix normal du mode choisi.` : `Never: payments, sending emails, writing to a database. Budget: at most ${DEFAULT_AGENT_BUDGET} credits per agent reply; commands cost the normal price of the chosen mode.`}</p>
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5 sm:px-6">
        {item ? <>
          <label className="flex items-center gap-2 text-[13px]"><Switch checked={item.enabled} disabled={busy} onCheckedChange={(v) => void onToggle(plugin, v)} />{item.enabled ? (fr ? "Activé" : "Enabled") : (fr ? "Désactivé" : "Disabled")}</label>
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void onRemove(plugin, item)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-destructive transition hover:bg-destructive/10"><Trash2 className="size-4" />{fr ? "Désinstaller" : "Uninstall"}</button>
            {item.enabled && <button type="button" onClick={tryCommand} className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition hover:opacity-90">{fr ? "Essayer dans le chat" : "Try in the chat"}</button>}
          </div>
        </> : <>
          <span className="text-[12px] text-muted-foreground">{fr ? "Gratuit · désinstallable à tout moment" : "Free · uninstall any time"}</span>
          <button type="button" disabled={busy} onClick={() => void onInstall(plugin)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition hover:opacity-90 disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />}{fr ? "Installer" : "Install"}</button>
        </>}
      </div>
    </DialogContent>
  </Dialog>;
}
