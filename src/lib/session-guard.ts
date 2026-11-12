import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Sessions do not stay open forever: after INACTIVE_DAYS without any activity in the dashboard, the next visit
// signs out and asks to sign in again (a left-open laptop or shared computer no longer means an open account).
// The last-activity time is strictly necessary security storage (listed on /cookies).
const KEY = "technova-last-active";
export const INACTIVE_DAYS = 7;
const LIMIT_MS = INACTIVE_DAYS * 24 * 60 * 60 * 1000;
const WRITE_EVERY_MS = 5 * 60 * 1000;

const read = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const write = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked: no expiry tracking */ } };

/** Call once in the dashboard layout. `onExpired` runs after the sign-out (e.g. go to the sign-in page). */
export function useSessionGuard(onExpired: () => void) {
  useEffect(() => {
    const last = read();
    if (last && Date.now() - last > LIMIT_MS) {
      void supabase.auth.signOut().finally(() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } onExpired(); });
      return;
    }
    write();
    let lastWrite = Date.now();
    const touch = () => { if (Date.now() - lastWrite > WRITE_EVERY_MS) { lastWrite = Date.now(); write(); } };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    // A tab left open for days: check again when it comes back to the foreground.
    const onWake = () => { if (document.visibilityState === "visible" && Date.now() - read() > LIMIT_MS) void supabase.auth.signOut().finally(onExpired); };
    document.addEventListener("visibilitychange", onWake);
    return () => { events.forEach((e) => window.removeEventListener(e, touch)); document.removeEventListener("visibilitychange", onWake); };
  }, [onExpired]);
}

/** Forget the activity time on sign-out, so the next account starts fresh. */
export function clearSessionGuard() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
