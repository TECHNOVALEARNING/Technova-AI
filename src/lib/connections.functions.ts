import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OAUTH_CONNECTORS = ["github", "google_drive", "notion"] as const;
const connectorSchema = z.enum(OAUTH_CONNECTORS);

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isConfigured } = await import("@/lib/connections.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("app_user_connections").select("connector_id,account_label,updated_at").eq("user_id", context.userId);
    return OAUTH_CONNECTORS.map((id) => {
      const row = data?.find((r) => r.connector_id === id);
      return { id, configured: isConfigured(id), connected: Boolean(row), label: row?.account_label ?? null };
    });
  });

export const startConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectorId: string }) => ({ connectorId: connectorSchema.parse(input.connectorId) }))
  .handler(async ({ data, context }) => {
    const { isConfigured, appOrigin, authorizationUrl, signState, RETURN_PATH } = await import("@/lib/connections.server");
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "connect"))) throw new Error("Trop de tentatives. Réessayez plus tard.");
    if (!isConfigured(data.connectorId)) throw new Error("Ce service n'est pas encore configuré.");
    const redirectUri = `${appOrigin(getRequest())}${RETURN_PATH}`;
    return { authorizationUrl: authorizationUrl(data.connectorId, redirectUri, signState(context.userId, data.connectorId)) };
  });

export const completeConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; state: string; connectorId: string }) =>
    z.object({ code: z.string().min(4).max(2000), state: z.string().min(20).max(600), connectorId: connectorSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { verifyState, exchangeCode, accountLabel, saveConnection, appOrigin, RETURN_PATH } = await import("@/lib/connections.server");
    const { logSecurityEvent } = await import("@/lib/security.server");
    if (!verifyState(data.state, context.userId, data.connectorId)) {
      await logSecurityEvent(context.userId, "connector_state_mismatch", "warning", { connector: data.connectorId });
      throw new Error("La demande de connexion n'a pas pu être vérifiée.");
    }
    const token = await exchangeCode(data.connectorId, data.code, `${appOrigin(getRequest())}${RETURN_PATH}`);
    const label = await accountLabel(data.connectorId, token.access);
    await saveConnection(context.userId, data.connectorId, token, label);
    await logSecurityEvent(context.userId, "connector_connected", "info", { connector: data.connectorId });
    return { ok: true, label };
  });

export const disconnectConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectorId: string }) => ({ connectorId: connectorSchema.parse(input.connectorId) }))
  .handler(async ({ data, context }) => {
    const { revokeConnection } = await import("@/lib/connections.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await revokeConnection(context.userId, data.connectorId);
    await supabaseAdmin.from("app_user_connections").delete().eq("user_id", context.userId).eq("connector_id", data.connectorId);
    return { ok: true };
  });
