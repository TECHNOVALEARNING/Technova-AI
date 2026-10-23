import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE_SLUG_RE } from "@/lib/connectors";

const RESERVED = new Set(["admin", "api", "www", "app", "dashboard", "technova", "support", "help", "login", "status"]);
const filesSchema = z.array(z.object({ path: z.string().min(1).max(200).refine((p) => !p.includes("..") && !p.startsWith("/")), content: z.string().max(400_000), language: z.string().max(40).optional() })).min(1).max(60);

export const listMySites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("published_sites").select("slug,title,updated_at").eq("owner_id", context.userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const publishSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; title: string; files: unknown }) => z.object({ slug: z.string().regex(SITE_SLUG_RE), title: z.string().max(120), files: filesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    if (RESERVED.has(data.slug)) return { ok: false as const, error: "reserved" };
    if (!(await hitRateLimit(context.userId, "publish"))) return { ok: false as const, error: "rate" };
    const total = data.files.reduce((n, f) => n + f.content.length, 0);
    if (total > 2_000_000) return { ok: false as const, error: "size" };
    // A published site is public: never serve a credential left in the generated code.
    const { findSecrets } = await import("@/lib/secret-scan");
    const leaks = findSecrets(data.files);
    if (leaks.length) {
      await logSecurityEvent(context.userId, "publish_blocked_secret", "warning", { slug: data.slug, kinds: [...new Set(leaks.map((l) => l.kind))] });
      return { ok: false as const, error: "secrets" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("published_sites").select("owner_id").eq("slug", data.slug).maybeSingle();
    if (existing && existing.owner_id !== context.userId) return { ok: false as const, error: "taken" };
    const row = { owner_id: context.userId, slug: data.slug, title: data.title, files: data.files as never, updated_at: new Date().toISOString() };
    const { error } = existing
      ? await supabaseAdmin.from("published_sites").update(row).eq("slug", data.slug).eq("owner_id", context.userId)
      : await supabaseAdmin.from("published_sites").insert(row);
    if (error) return { ok: false as const, error: error.code === "23505" ? "taken" : "failed" };
    await logSecurityEvent(context.userId, "site_published", "info", { slug: data.slug });
    return { ok: true as const, slug: data.slug };
  });

export const unpublishSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().regex(SITE_SLUG_RE) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("published_sites").delete().eq("slug", data.slug).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Creates (or reuses) a repo in the user's own GitHub account and commits the files. */
export const pushSiteToGitHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repo: string; files: unknown }) => z.object({ repo: z.string().regex(/^[A-Za-z0-9._-]{1,90}$/), files: filesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { getAccessToken, githubFetch } = await import("@/lib/connections.server");
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "publish"))) return { ok: false as const, error: "rate" };
    const { findSecrets } = await import("@/lib/secret-scan");
    const leaks = findSecrets(data.files);
    if (leaks.length) {
      await logSecurityEvent(context.userId, "github_push_blocked_secret", "warning", { repo: data.repo, kinds: [...new Set(leaks.map((l) => l.kind))] });
      return { ok: false as const, error: "secrets" };
    }
    const key = await getAccessToken(context.userId, "github");
    if (!key) return { ok: false as const, error: "reconnect" };
    const gh = (path: string, init?: RequestInit) => githubFetch(key, path, { ...init, headers: { "Content-Type": "application/json" } });
    const me = await gh("/user");
    if (me.status === 401) return { ok: false as const, error: "reconnect" };
    if (!me.ok) return { ok: false as const, error: `github_${me.status}` };
    const login = ((await me.json()) as { login: string }).login;
    let repoRes = await gh(`/repos/${login}/${data.repo}`);
    if (repoRes.status === 404) {
      repoRes = await gh("/user/repos", { method: "POST", body: JSON.stringify({ name: data.repo, private: true, auto_init: true, description: "Créé avec TechNova AI Hub" }) });
      if (!repoRes.ok) return { ok: false as const, error: `github_${repoRes.status}` };
      await new Promise((r) => setTimeout(r, 1500));
    } else if (!repoRes.ok) return { ok: false as const, error: `github_${repoRes.status}` };
    for (const f of data.files) {
      const path = f.path.split("/").map(encodeURIComponent).join("/");
      const cur = await gh(`/repos/${login}/${data.repo}/contents/${path}`);
      const sha = cur.ok ? ((await cur.json()) as { sha?: string }).sha : undefined;
      const put = await gh(`/repos/${login}/${data.repo}/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `TechNova: ${f.path}`, content: Buffer.from(f.content, "utf8").toString("base64"), sha }) });
      if (!put.ok) return { ok: false as const, error: `github_${put.status}` };
    }
    return { ok: true as const, url: `https://github.com/${login}/${data.repo}` };
  });
