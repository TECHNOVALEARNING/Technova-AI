import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Online presence for the admin console: while a dashboard tab is visible, the signed-in account marks itself
// active every 2 minutes (touch_presence, migration 0042, writes only its own profile's last_seen_at).
// Nothing is stored in the browser; a missing migration simply makes the call fail silently.
const EVERY_MS = 2 * 60 * 1000;

export function usePresence() {
  useEffect(() => {
    const touch = () => { if (document.visibilityState === "visible") void supabase.rpc("touch_presence").then(() => {}, () => {}); };
    touch();
    const timer = window.setInterval(touch, EVERY_MS);
    document.addEventListener("visibilitychange", touch);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", touch); };
  }, []);
}
