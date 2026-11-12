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
  research: { limit: 5, window: 600 },
  payment: { limit: 10, window: 600 },
  payment_check: { limit: 30, window: 60 },
  arena: { limit: 10, window: 300 },
  site_report: { limit: 5, window: 3600 },
  admin_moderation: { limit: 60, window: 60 },
  files: { limit: 40, window: 600 },
  knowledge: { limit: 60, window: 60 },
  // Public help assistant: per visitor, and one shared daily ceiling that bounds its cost.
  help_chat: { limit: 12, window: 600 },
  help_chat_daily: { limit: 1500, window: 86400 },
} as const;

export type RateBucket = keyof typeof RATE_LIMITS;

/**
 * Buckets whose actions cost money (AI providers, credits, embeddings). If the rate-limit check itself fails
 * (database error), these are refused rather than let through unlimited; free actions stay allowed so an
 * incident does not lock people out of publishing, payments or connections.
 */
const FAIL_CLOSED: ReadonlySet<RateBucket> = new Set<RateBucket>(["chat", "studio", "media", "api", "research", "files", "knowledge", "arena", "help_chat", "help_chat_daily", "admin_transfer"]);

/** Returns true when the call is allowed. On a database error: refused for paid buckets, allowed otherwise. */
export async function hitRateLimit(userId: string, bucket: RateBucket): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cfg = RATE_LIMITS[bucket];
  const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
    _user: userId, _bucket: bucket, _limit: cfg.limit, _window_seconds: cfg.window,
  });
  if (error) { console.error("rate limit check failed", bucket, error.message); return !FAIL_CLOSED.has(bucket); }
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
