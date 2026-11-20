import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

// Projects and saved creations (migration 0051). Everything is owner-scoped by row security; a saved creation is
// kept 14 days after its last save (the database sets expires_at), then deleted by the daily purge.

export type Project = Tables<"projects">;
export type Creation = Tables<"user_creations">;
export type CreationKind = "design" | "sheet";
export const RETENTION_DAYS = 14;
export const PROJECT_COLORS = ["#7c5cff", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#be185d"];

export const daysLeft = (expiresAt: string) => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));

export async function listProjects(): Promise<Project[]> {
  const { data } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
  return data ?? [];
}
export async function createProject(name: string, color = PROJECT_COLORS[0]!, description = ""): Promise<Project> {
  const { data, error } = await supabase.from("projects").insert({ name: name.trim().slice(0, 80), color, description }).select("*").single();
  if (error || !data) throw new Error(error?.message.includes("PROJECTS_LIMIT") ? "PROJECTS_LIMIT" : "SAVE_FAILED");
  return data;
}

/** Saves (or updates) a creation; returns its row with the new expiry. */
export async function saveCreation(input: { id?: string | null; kind: CreationKind; title: string; subtitle?: string; data: unknown; projectId: string | null }): Promise<Creation> {
  const row = { kind: input.kind, title: input.title.trim().slice(0, 120) || "Sans titre", subtitle: (input.subtitle ?? "").slice(0, 120), data: input.data as Json, project_id: input.projectId };
  const q = input.id
    ? supabase.from("user_creations").update(row).eq("id", input.id).select("*").single()
    : supabase.from("user_creations").insert(row).select("*").single();
  const { data, error } = await q;
  if (error || !data) {
    const m = error?.message ?? "";
    throw new Error(m.includes("CREATION_TOO_LARGE") ? "TOO_LARGE" : m.includes("CREATIONS_LIMIT") ? "LIMIT" : "SAVE_FAILED");
  }
  return data;
}
export async function loadCreation(id: string): Promise<Creation | null> {
  const { data } = await supabase.from("user_creations").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export function saveErrorText(code: string, fr: boolean) {
  if (code === "TOO_LARGE") return fr ? "Fichier trop lourd pour être enregistré (5 Mo au plus) : réduisez ou retirez des images, ou téléchargez-le." : "File too large to save (5 MB max): shrink or remove pictures, or download it.";
  if (code === "LIMIT") return fr ? "Vous avez atteint 300 fichiers enregistrés : supprimez-en dans Projets." : "You reached 300 saved files: delete some in Projects.";
  if (code === "PROJECTS_LIMIT") return fr ? "50 projets au plus." : "50 projects at most.";
  return fr ? "Enregistrement impossible. Réessayez." : "Could not save. Try again.";
}
