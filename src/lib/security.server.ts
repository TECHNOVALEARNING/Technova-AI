// Server-only security helpers (V4.1 socle): per-account rate limits and a security journal.
// Never log secrets, tokens, prompts or private content here.

export const RATE_LIMITS = {
  chat: { limit: 30, window: 60 },
  studio: { limit: 12, window: 60 },
  media: { limit: 10, window: 300 },
  publish: { limit: 10, window: 600 },
  connect: { limit: 10, window: 600 },
  api: { limit: 60, window: 60 },
  admin_transfer: { limit: 20, window: 60 },
} as const;

export type RateBucket = keyof typeof RATE_LIMITS;

/** Returns true when the call is allowed. Fails open only if the database itself errors. */
export async function hitRateLimit(userId: string, bucket: RateBucket): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cfg = RATE_LIMITS[bucket];
  const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
    _user: userId, _bucket: bucket, _limit: cfg.limit, _window_seconds: cfg.window,
  });
  if (error) { console.error("rate limit check failed", error.message); return true; }
  return data !== false;
}

export function rateLimitMessage(lang: string | undefined, bucket: RateBucket) {
  const w = RATE_LIMITS[bucket].window;
  const mins = Math.max(1, Math.round(w / 60));
  return lang === "en"
    ? `Too many requests. Please wait about ${mins} min and try again.`
    : `Trop de demandes. Patientez environ ${mins} min puis réessayez.`;
}

export async function logSecurityEvent(userId: string | null, kind: string, severity: "info" | "warning" | "critical" = "info", detail: Record<string, unknown> = {}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { currentRequestId } = await import("@/lib/request-context.server");
    const requestId = currentRequestId();
    await supabaseAdmin.from("security_events").insert({ user_id: userId, kind, severity, detail: { ...detail, ...(requestId ? { request_id: requestId } : {}) } as never });
  } catch (e) { console.error("security log failed", e); }
}
