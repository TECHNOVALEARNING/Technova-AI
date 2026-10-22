import { decryptSecret, encryptSecret } from "./connection-crypto.server";

const MANAGE = "https://api.supabase.com/v1";
const AUTHORIZE = "https://api.supabase.com/v1/oauth/authorize";
const TOKEN_URL = `${MANAGE}/oauth/token`;

export const CALLBACK_PATH = "/api/public/supabase-oauth/callback";

export type SupabaseProject = { ref: string; name: string };
export type ProviderTokens = { access: string; refresh: string; scope: string; expiresAt: string | null };

export function oauthConfig() {
  return {
    clientId: (process.env["TECHNOVA_OAUTH_CLIENT_ID"] ?? "").trim(),
    clientSecret: (process.env["TECHNOVA_OAUTH_CLIENT_SECRET"] ?? "").trim(),
    scope: process.env["TECHNOVA_OAUTH_SCOPE"]?.trim() || "",
  };
}

export function authorizeUrl(clientId: string, redirectUri: string, scope: string, state: string) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", state });
  if (scope) q.set("scope", scope);
  return `${AUTHORIZE}?${q.toString()}`;
}

type TokenResponse = { access_token?: unknown; refresh_token?: unknown; scope?: unknown; expires_in?: unknown };

function toTokens(body: TokenResponse): ProviderTokens {
  const access = typeof body.access_token === "string" ? body.access_token : "";
  if (!access) throw new Error("no_access_token");
  const expiresIn = Number(body.expires_in ?? 0);
  return {
    access,
    refresh: typeof body.refresh_token === "string" ? body.refresh_token : "",
    scope: typeof body.scope === "string" ? body.scope : "",
    expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

async function tokenPost(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`token_exchange_${res.status}`);
  return toTokens((await res.json().catch(() => ({}))) as TokenResponse);
}

export function exchangeCode(code: string, redirectUri: string, clientId: string, clientSecret: string) {
  return tokenPost({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri });
}

export function refreshTokens(refreshToken: string, clientId: string, clientSecret: string) {
  return tokenPost({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken });
}

export async function fetchProjects(accessToken: string): Promise<SupabaseProject[]> {
  const res = await fetch(`${MANAGE}/projects`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
  if (!res.ok) return [];
  const rows = await res.json().catch(() => []);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is { id: string; name?: string } => Boolean(r) && typeof r.id === "string")
    .map(r => ({ ref: r.id, name: r.name?.trim() || r.id }));
}

export async function saveConnection(userId: string, t: ProviderTokens, project?: SupabaseProject) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("supabase_connections").upsert(
    {
      owner_id: userId,
      project_ref: project?.ref ?? null,
      project_name: project?.name ?? null,
      scope: t.scope,
      access_token_ciphertext: encryptSecret(t.access),
      refresh_token_ciphertext: encryptSecret(t.refresh),
      expires_at: t.expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) throw new Error("save_failed");
}

export async function readConnection(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("supabase_connections")
    .select("project_ref,project_name,scope,access_token_ciphertext,refresh_token_ciphertext,expires_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error("read_failed");
  return data;
}

export async function setActiveProject(userId: string, project: SupabaseProject) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("supabase_connections")
    .update({ project_ref: project.ref, project_name: project.name, updated_at: new Date().toISOString() })
    .eq("owner_id", userId);
  if (error) throw new Error("save_failed");
}

export async function dropConnection(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("supabase_connections").delete().eq("owner_id", userId);
  if (error) throw new Error("delete_failed");
}

/** A usable provider access token for this user, refreshed when it has expired. */
export async function activeToken(userId: string): Promise<string> {
  const row = await readConnection(userId);
  if (!row) throw new Error("not_connected");
  const expired = Boolean(row.expires_at) && new Date(row.expires_at!).getTime() < Date.now() + 60_000;
  if (!expired) return decryptSecret(row.access_token_ciphertext);
  const { clientId, clientSecret } = oauthConfig();
  const refreshed = await refreshTokens(decryptSecret(row.refresh_token_ciphertext), clientId, clientSecret);
  await saveConnection(userId, refreshed, row.project_ref ? { ref: row.project_ref, name: row.project_name ?? row.project_ref } : undefined);
  return refreshed.access;
}
