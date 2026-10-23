import { supabase } from "@/integrations/supabase/client";

// Remembers, for this browser tab, which signed-in user has finished onboarding so the
// dashboard guard queries the profile once instead of on every navigation.
let onboardedUser: string | null = null;

export function markOnboarded(userId?: string) {
  onboardedUser = userId ?? "current";
}

/** True when the signed-in user still has to answer the welcome questions. */
export async function needsOnboarding(userId: string): Promise<boolean> {
  if (onboardedUser === userId || onboardedUser === "current") { onboardedUser = userId; return false; }
  const { data, error } = await supabase.from("profiles").select("onboarded_at").eq("id", userId).maybeSingle();
  // Never lock someone out of the dashboard because of a read error.
  if (error) return false;
  if (data?.onboarded_at) { onboardedUser = userId; return false; }
  return true;
}
