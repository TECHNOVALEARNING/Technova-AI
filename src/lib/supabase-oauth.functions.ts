import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CALLBACK_PATH,
  activeToken,
  authorizeUrl,
  dropConnection,
  exchangeCode,
  fetchProjects,
  oauthConfig,
  readConnection,
  saveConnection,
  setActiveProject,
} from "@/lib/supabase-oauth.server";

const empty = () => z.object({}).parse({});

/** The address visitors actually use: preview host, published host, or a configured override. */
function appOrigin(): string {
  const configured = process.env["TECHNOVA_APP_URL"];
  if (configured) return configured.replace(/\/+$/, "");
  let origin = "";
  try {
    origin = getRequest()?.headers.get("origin") ?? "";
  } catch {
    origin = "";
  }
  if (!/^https?:\/\/[\w.-]+(:\d+)?$/.test(origin))
    throw new Error("Cannot determine the app address.");
  return origin.replace(/\/+$/, "");
}

export const startSupabaseConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ state: z.string().min(16).max(128) }).parse(d))
  .handler(async ({ data }) => {
    const { clientId, scope } = oauthConfig();
    if (!clientId) return { configured: false, url: "" };
    return {
      configured: true,
      url: authorizeUrl(clientId, `${appOrigin()}${CALLBACK_PATH}`, scope, data.state),
    };
  });

export const completeSupabaseConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(4096) }).parse(d))
  .handler(async ({ data, context }) => {
    const { clientId, clientSecret } = oauthConfig();
    if (!clientId || !clientSecret)
      throw new Error(
        "La connexion Supabase n'est pas encore activée sur ce serveur. / Supabase sign-in is not enabled on this server yet.",
      );
    const tokens = await exchangeCode(
      data.code,
      `${appOrigin()}${CALLBACK_PATH}`,
      clientId,
      clientSecret,
    );
    const projects = await fetchProjects(tokens.access);
    const only = projects.length === 1 ? projects[0] : undefined;
    await saveConnection(context.userId, tokens, only);
    return { projectRef: only?.ref ?? "", projectName: only?.name ?? "", projects };
  });

export const getSupabaseConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(empty)
  .handler(async ({ context }) => {
    const row = await readConnection(context.userId);
    return {
      connected: Boolean(row),
      projectRef: row?.project_ref ?? "",
      projectName: row?.project_name ?? "",
      scope: row?.scope ?? "",
    };
  });

export const listSupabaseProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(empty)
  .handler(async ({ context }) => ({
    projects: await fetchProjects(await activeToken(context.userId)),
  }));

export const selectSupabaseProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ref: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const projects = await fetchProjects(await activeToken(context.userId));
    const found = projects.find((p) => p.ref === data.ref);
    if (!found)
      throw new Error(
        "Ce projet n'appartient pas au compte Supabase relié. / This project is not on the connected Supabase account.",
      );
    await setActiveProject(context.userId, found);
    return { projectRef: found.ref, projectName: found.name };
  });

export const disconnectSupabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(empty)
  .handler(async ({ context }) => {
    await dropConnection(context.userId);
    return { ok: true };
  });
