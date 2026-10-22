import { createContext, useContext } from "react";
import type { Lang, dashboardText } from "@/lib/i18n";
import type { Tables } from "@/integrations/supabase/types";

export type Thread = Tables<"chat_threads">;
export type DashboardContextValue = { lang: Lang; t: typeof dashboardText[Lang]; theme: "light" | "dark"; setLang: (lang: Lang) => void; setTheme: (theme: "light" | "dark") => void; setArtifactWorkspaceOpen: (open: boolean) => void; threads: Thread[]; reload: () => Promise<void>; createThread: () => Promise<void>; name: string; email: string; error: string };

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("Dashboard context missing");
  return value;
}
