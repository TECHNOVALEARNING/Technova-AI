import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/connection-crypto.server";

// Direct OAuth 2.0 with each provider, using TechNova's own OAuth apps.
// Every provider app must register the redirect URI `${TECHNOVA_APP_URL}${RETURN_PATH}`.
export const RETURN_PATH = "/oauth/connect/return";

type Provider = {
  authorize: string;
  token: string;
  scopes: string[];
  env: string;
  /** Notion expects client credentials as HTTP Basic; the others as form fields. */
  basicAuth?: boolean;
  extra?: Record<string, string>;
};

const PROVIDERS: Record<string, Provider> = {
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "repo"],
    env: "GITHUB",
  },
  google_drive: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    env: "GOOGLE_DRIVE",
    extra: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  },
  notion: {
    authorize: "https://api.notion.com/v1/oauth/authorize",
    token: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    env: "NOTION",
    basicAuth: true,
    extra: { owner: "user" },
  },
};

function credentials(connectorId: string) {
  const p = PROVIDERS[connectorId];
  if (!p) return null;
  const id = process.env[`${p.env}_OAUTH_CLIENT_ID`]?.trim();
  const secret = process.env[`${p.env}_OAUTH_CLIENT_SECRET`]?.trim();
  return id && secret ? { provider: p, id, secret } : null;
}

export function isConfigured(connectorId: string) {
  return credentials(connectorId) !== null;
}

/** The public address of the app: TECHNOVA_APP_URL, else the browser's Origin header. */
export function appOrigin(request: Request): string {
  const configured = process.env["TECHNOVA_APP_URL"]?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const origin = request.headers.get("origin") ?? "";
  if (!/^https?:\/\/[\w.-]+(:\d+)?$/.test(origin)) throw new Error("Cannot determine the app address.");
  return origin;
}

// ---- Signed state: binds the consent round-trip to one user, one connector, 10 minutes.

function stateKey() {
  const raw = process.env["TECHNOVA_CONN_CRYPTO_KEY"];
  if (!raw) throw new Error("TECHNOVA_CONN_CRYPTO_KEY is not set");
  return createHmac("sha256", raw).update("oauth-state-v1").digest();
}

export function signState(userId: string, connectorId: string) {
  const payload = Buffer.from(JSON.stringify({ u: userId, c: connectorId, n: randomBytes(12).toString("hex"), e: Date.now() + 600_000 })).toString("base64url");
  const sig = createHmac("sha256", stateKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string, userId: string, connectorId: string) {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", stateKey()).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: string; c?: string; e?: number };
    return d.u === userId && d.c === connectorId && typeof d.e === "number" && d.e > Date.now();
  } catch {
    return false;
  }
}

export function authorizationUrl(connectorId: string, redirectUri: string, state: string) {
  const c = credentials(connectorId);
  if (!c) throw new Error("not_configured");
  const q = new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri, response_type: "code", state, ...c.provider.extra });
  if (c.provider.scopes.length) q.set("scope", c.provider.scopes.join(" "));
  return `${c.provider.authorize}?${q.toString()}`;
}

// ---- Tokens

type StoredToken = { access: string; refresh?: string; expiresAt?: number };

async function tokenRequest(connectorId: string, params: Record<string, string>): Promise<StoredToken> {
  const c = credentials(connectorId);
  if (!c) throw new Error("not_configured");
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string;
  if (c.provider.basicAuth) {
    headers["Authorization"] = `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString("base64")}`;
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(params);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams({ ...params, client_id: c.id, client_secret: c.secret }).toString();
  }
  const res = await fetch(c.provider.token, { method: "POST", headers, body, signal: AbortSignal.timeout(15_000) });
  const json = (await res.json().catch(() => ({}))) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; error?: unknown };
  if (!res.ok || typeof json.access_token !== "string") throw new Error(`token_exchange_${res.status}`);
  const expiresIn = Number(json.expires_in ?? 0);
  return {
    access: json.access_token,
    ...(typeof json.refresh_token === "string" ? { refresh: json.refresh_token } : {}),
    ...(expiresIn > 0 ? { expiresAt: Date.now() + expiresIn * 1000 } : {}),
  };
}

export function exchangeCode(connectorId: string, code: string, redirectUri: string) {
  return tokenRequest(connectorId, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

export async function accountLabel(connectorId: string, access: string): Promise<string | null> {
  try {
    if (connectorId === "github") {
      const res = await githubFetch(access, "/user");
      return res.ok ? ((await res.json()) as { login?: string }).login ?? null : null;
    }
    if (connectorId === "google_drive") {
      const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", { headers: { Authorization: `Bearer ${access}` } });
      return res.ok ? ((await res.json()) as { user?: { emailAddress?: string } }).user?.emailAddress ?? null : null;
    }
  } catch { /* the label is cosmetic */ }
  return null;
}

export async function saveConnection(userId: string, connectorId: string, token: StoredToken, label: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("app_user_connections").upsert({
    user_id: userId, connector_id: connectorId, connection_key_ciphertext: encryptSecret(JSON.stringify(token)),
    account_label: label, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,connector_id" });
  if (error) throw error;
}

async function readToken(userId: string, connectorId: string): Promise<StoredToken | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_user_connections").select("connection_key_ciphertext")
    .eq("user_id", userId).eq("connector_id", connectorId).maybeSingle();
  if (!data) return null;
  try {
    const parsed = JSON.parse(decryptSecret(data.connection_key_ciphertext)) as StoredToken;
    return typeof parsed.access === "string" ? parsed : null;
  } catch {
    // Rows written by the former connector gateway are not usable tokens: ask for a reconnect.
    return null;
  }
}

/** A usable access token for this user's account, refreshed when the provider issues expiring tokens. */
export async function getAccessToken(userId: string, connectorId: string): Promise<string | null> {
  const token = await readToken(userId, connectorId);
  if (!token) return null;
  if (!token.expiresAt || token.expiresAt > Date.now() + 60_000) return token.access;
  if (!token.refresh) return null;
  try {
    const next = await tokenRequest(connectorId, { grant_type: "refresh_token", refresh_token: token.refresh });
    const merged = { ...next, refresh: next.refresh ?? token.refresh };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_user_connections").update({ connection_key_ciphertext: encryptSecret(JSON.stringify(merged)), updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("connector_id", connectorId);
    return merged.access;
  } catch {
    return null;
  }
}

/** Best-effort revocation at the provider when a user disconnects. */
export async function revokeConnection(userId: string, connectorId: string) {
  const token = await readToken(userId, connectorId);
  const c = credentials(connectorId);
  if (!token || !c) return;
  try {
    if (connectorId === "github") {
      await fetch(`https://api.github.com/applications/${encodeURIComponent(c.id)}/grant`, {
        method: "DELETE",
        headers: { Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString("base64")}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token.access }),
      });
    } else if (connectorId === "google_drive") {
      await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: token.refresh ?? token.access }) });
    }
  } catch (e) { console.error("revoke failed", connectorId, e); }
}

export function githubFetch(access: string, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${access}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  headers.set("User-Agent", "TechNova-AI-Hub");
  return fetch(`https://api.github.com${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers, signal: AbortSignal.timeout(20_000) });
}
