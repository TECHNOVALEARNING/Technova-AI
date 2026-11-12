import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AGENT_BUDGET } from "@/lib/plans";
import { pluginById } from "@/lib/plugins";

// Installed plugins of the signed-in user (user_plugins, owner-only RLS). Install copies the plugin's agents
// into the user's own agents (the database refuses them below Creator, and clamps the budget below Pro);
// the "/" commands come from the catalogue and only need the installed + enabled state.

export type InstalledPlugin = { plugin_id: string; enabled: boolean; agent_ids: string[]; installed_at: string };
const CHANGED = "technova-plugins-changed";
const notify = () => { try { window.dispatchEvent(new Event(CHANGED)); } catch { /* not in a browser */ } };

export function useInstalledPlugins() {
  const [items, setItems] = useState<InstalledPlugin[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("user_plugins").select("plugin_id, enabled, agent_ids, installed_at").order("installed_at");
    setItems(error ? [] : (data ?? []));
    setReady(true);
  }, []);
  useEffect(() => {
    void load().catch(() => setReady(true));
    const again = () => { void load().catch(() => {}); };
    window.addEventListener(CHANGED, again);
    return () => window.removeEventListener(CHANGED, again);
  }, [load]);
  return { items, ready, reload: load };
}

/** Installs a plugin. Returns whether its agents could be created (false below the Creator plan). */
export async function installPlugin(id: string, lang: "fr" | "en"): Promise<{ agents: boolean }> {
  const plugin = pluginById(id);
  if (!plugin) throw new Error("UNKNOWN_PLUGIN");
  const { data: auth } = await supabase.auth.getUser();
  const owner = auth.user?.id;
  if (!owner) throw new Error("AUTH");
  const agentIds: string[] = [];
  let agents = true;
  for (const a of plugin.agents) {
    const { data, error } = await supabase.from("agents").insert({
      owner_id: owner, name: a.name[lang].slice(0, 80), description: a.description[lang].slice(0, 300), instructions: a.instructions[lang].slice(0, 8000),
      model: "TechNova Smart", max_tokens: 1024, max_cost: DEFAULT_AGENT_BUDGET, tools: a.tools, knowledge_base_ids: [],
    }).select("id").single();
    if (error || !data) {
      if (error?.message.includes("PLAN_UPGRADE_REQUIRED")) { agents = false; break; }
      // Undo the agents already created, so a failed install leaves nothing behind.
      if (agentIds.length) await supabase.from("agents").delete().in("id", agentIds);
      throw new Error(error?.message || "INSTALL_FAILED");
    }
    agentIds.push(data.id);
  }
  const { error } = await supabase.from("user_plugins").upsert({ owner_id: owner, plugin_id: id, enabled: true, agent_ids: agentIds }, { onConflict: "owner_id,plugin_id" });
  if (error) {
    if (agentIds.length) await supabase.from("agents").delete().in("id", agentIds);
    throw new Error(error.message);
  }
  notify();
  return { agents };
}

/** Removes the plugin and exactly the agents it created (agents the user made themselves are untouched). */
export async function uninstallPlugin(item: InstalledPlugin) {
  if (item.agent_ids.length) {
    const { error } = await supabase.from("agents").delete().in("id", item.agent_ids);
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase.from("user_plugins").delete().eq("plugin_id", item.plugin_id);
  if (error) throw new Error(error.message);
  notify();
}

export async function setPluginEnabled(id: string, enabled: boolean) {
  const { error } = await supabase.from("user_plugins").update({ enabled }).eq("plugin_id", id);
  if (error) throw new Error(error.message);
  notify();
}
