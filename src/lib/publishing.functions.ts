import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE_SLUG_RE } from "@/lib/connectors";

const RESERVED = new Set(["admin", "api", "www", "app", "dashboard", "technova", "support", "help", "login", "status"]);
const filesSchema = z.array(z.object({ path: z.string().min(1).max(200).refine((p) => !p.includes("..") && !p.startsWith("/")), content: z.string().max(400_000), language: z.string().max(40).optional() })).min(1).max(60);

export const listMySites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("published_sites").select("slug,title,updated_at,disabled_at").eq("owner_id", context.userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const publishSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; title: string; files: unknown }) => z.object({ slug: z.string().regex(SITE_SLUG_RE), title: z.string().max(120), files: filesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    const { getTier, allows } = await import("@/lib/plan.server");
    if (!allows(await getTier(context.userId), "publish")) { await logSecurityEvent(context.userId, "plan_limit_blocked", "info", { feature: "publish" }); return { ok: false as const, error: "plan_publish" }; }
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
    const { findPhishing } = await import("@/lib/phishing-scan");
    const phishing = findPhishing(data.files);
    if (phishing.length) {
      await logSecurityEvent(context.userId, "publish_blocked_phishing", "warning", { slug: data.slug, reasons: [...new Set(phishing.map((p) => p.reason))] });
      return { ok: false as const, error: "phishing" };
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
    const { publicSiteUrl } = await import("@/lib/site-host.server");
    const origin = process.env["TECHNOVA_APP_URL"]?.trim() || new URL(getRequest().url).origin;
    return { ok: true as const, slug: data.slug, url: publicSiteUrl(data.slug, origin) };
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
    const { getTier, allows } = await import("@/lib/plan.server");
    if (!allows(await getTier(context.userId), "github")) { await logSecurityEvent(context.userId, "plan_limit_blocked", "info", { feature: "github" }); return { ok: false as const, error: "plan_github" }; }
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

const MAX_PREVIEW_CHARS = 2_000_000;

/** Creates a 30-day shared preview link; refused when the files contain a secret or phishing content. */
export const createPreviewLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; files: unknown }) => z.object({ title: z.string().max(120), files: filesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "publish"))) return { ok: false as const, error: "rate" };
    if (data.files.reduce((n, f) => n + f.content.length, 0) > MAX_PREVIEW_CHARS) return { ok: false as const, error: "size" };
    const { findSecrets } = await import("@/lib/secret-scan");
    if (findSecrets(data.files).length) return { ok: false as const, error: "secrets" };
    const { findPhishing } = await import("@/lib/phishing-scan");
    const phishing = findPhishing(data.files);
    if (phishing.length) {
      await logSecurityEvent(context.userId, "preview_blocked_phishing", "warning", { reasons: [...new Set(phishing.map((p) => p.reason))] });
      return { ok: false as const, error: "phishing" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("studio_previews")
      .insert({ owner_id: context.userId, title: data.title || "Aperçu", files: data.files as never }).select("token").single();
    if (error || !row) return { ok: false as const, error: "failed" };
    return { ok: true as const, token: row.token };
  });

/** Shared checks before a site leaves TechNova: plan, rate limit, size, secrets, phishing. */
async function checkOutgoingSite(userId: string, files: { path: string; content: string }[], event: string) {
  const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
  const { getTier, allows } = await import("@/lib/plan.server");
  if (!allows(await getTier(userId), "publish")) { await logSecurityEvent(userId, "plan_limit_blocked", "info", { feature: "publish" }); return "plan_publish"; }
  if (!(await hitRateLimit(userId, "publish"))) return "rate";
  if (files.reduce((n, f) => n + f.content.length, 0) > 2_000_000) return "size";
  const { findSecrets } = await import("@/lib/secret-scan");
  const leaks = findSecrets(files);
  if (leaks.length) { await logSecurityEvent(userId, `${event}_blocked_secret`, "warning", { kinds: [...new Set(leaks.map((l) => l.kind))] }); return "secrets"; }
  const { findPhishing } = await import("@/lib/phishing-scan");
  const phishing = findPhishing(files);
  if (phishing.length) { await logSecurityEvent(userId, `${event}_blocked_phishing`, "warning", { reasons: [...new Set(phishing.map((p) => p.reason))] }); return "phishing"; }
  return null;
}

/**
 * Deploys the files to the user's own Netlify account (file-digest deploy, docs.netlify.com/api/get-started):
 * reuses the site of the same name or creates one, sends SHA-1 digests, uploads only the files Netlify asks for.
 */
export const deploySiteToNetlify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; files: unknown }) => z.object({ name: z.string().regex(SITE_SLUG_RE), files: filesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const blocked = await checkOutgoingSite(context.userId, data.files, "netlify_deploy");
    if (blocked) return { ok: false as const, error: blocked };
    const { getAccessToken, netlifyFetch } = await import("@/lib/connections.server");
    const key = await getAccessToken(context.userId, "netlify");
    if (!key) return { ok: false as const, error: "not_connected_netlify" };
    const api = (path: string, init?: RequestInit) => netlifyFetch(key, path, init);
    const json = { "Content-Type": "application/json" };
    type NetlifySite = { id: string; name: string; ssl_url?: string; url?: string };
    // Reuse this user's site with that name, else create it (adding a short suffix when the name is taken on Netlify).
    const list = await api(`/sites?name=${encodeURIComponent(data.name)}&filter=all&per_page=50`);
    if (list.status === 401) return { ok: false as const, error: "reconnect_netlify" };
    let site: NetlifySite | undefined = list.ok ? ((await list.json()) as NetlifySite[]).find((s) => s.name === data.name) : undefined;
    if (!site) {
      for (const name of [data.name, `${data.name}-${Math.random().toString(36).slice(2, 6)}`]) {
        const created = await api("/sites", { method: "POST", headers: json, body: JSON.stringify({ name }) });
        if (created.ok) { site = (await created.json()) as NetlifySite; break; }
        if (created.status !== 422) return { ok: false as const, error: `netlify_${created.status}` };
      }
      if (!site) return { ok: false as const, error: "taken" };
    }
    const { createHash } = await import("node:crypto");
    const bodies = new Map<string, { path: string; content: string }>();
    const digest: Record<string, string> = {};
    for (const f of data.files) {
      const sha = createHash("sha1").update(f.content, "utf8").digest("hex");
      digest[`/${f.path}`] = sha;
      bodies.set(sha, f);
    }
    const deployRes = await api(`/sites/${site.id}/deploys`, { method: "POST", headers: json, body: JSON.stringify({ files: digest }) });
    if (!deployRes.ok) return { ok: false as const, error: `netlify_${deployRes.status}` };
    const deploy = (await deployRes.json()) as { id: string; required?: string[]; ssl_url?: string };
    for (const sha of deploy.required ?? []) {
      const f = bodies.get(sha);
      if (!f) continue;
      const path = f.path.split("/").map(encodeURIComponent).join("/");
      const put = await api(`/deploys/${deploy.id}/files/${path}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: f.content });
      if (!put.ok) return { ok: false as const, error: `netlify_${put.status}` };
    }
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "netlify_deployed", "info", { site: site.name });
    return { ok: true as const, url: site.ssl_url || deploy.ssl_url || `https://${site.name}.netlify.app` };
  });

/**
 * Deploys the files to the user's own Vercel account (POST /v13/deployments with inline files, production target).
 * Needs the Deployments and Projects "Read and Write" permissions on the TechNova Vercel app; a token tied to a
 * team is retried with that team's id.
 */
export const deploySiteToVercel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; files: unknown }) => z.object({ name: z.string().regex(SITE_SLUG_RE), files: filesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const blocked = await checkOutgoingSite(context.userId, data.files, "vercel_deploy");
    if (blocked) return { ok: false as const, error: blocked };
    const { getAccessToken, vercelFetch } = await import("@/lib/connections.server");
    const key = await getAccessToken(context.userId, "vercel");
    if (!key) return { ok: false as const, error: "reconnect_vercel" };
    const body = JSON.stringify({
      name: data.name, target: "production",
      files: data.files.map((f) => ({ file: f.path, data: f.content })),
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
    });
    const send = (team?: string) => vercelFetch(key, `/v13/deployments?skipAutoDetectionConfirmation=1${team ? `&teamId=${encodeURIComponent(team)}` : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    let res = await send();
    if (res.status === 403 || res.status === 404) {
      const teams = await vercelFetch(key, "/v2/teams?limit=1");
      const team = teams.ok ? ((await teams.json()) as { teams?: { id: string }[] }).teams?.[0]?.id : undefined;
      if (team) res = await send(team);
    }
    if (res.status === 401) return { ok: false as const, error: "reconnect_vercel" };
    if (res.status === 403) return { ok: false as const, error: "vercel_permissions" };
    if (!res.ok) { console.error("[vercel] deploy", res.status, (await res.text().catch(() => "")).slice(0, 300)); return { ok: false as const, error: `vercel_${res.status}` }; }
    const dep = (await res.json()) as { url?: string; alias?: string[] };
    const { logSecurityEvent } = await import("@/lib/security.server");
    await logSecurityEvent(context.userId, "vercel_deployed", "info", { name: data.name });
    const host = dep.alias?.[0] ?? dep.url ?? `${data.name}.vercel.app`;
    return { ok: true as const, url: `https://${host}` };
  });

// Stripe zero-decimal currencies: amounts are sent as is; others in hundredths (docs.stripe.com/currencies).
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
const STRIPE_CURRENCY: Record<string, string> = { FCFA: "xof", XOF: "xof", XAF: "xaf", EUR: "eur", USD: "usd", NGN: "ngn", GHS: "ghs", MAD: "mad", GNF: "gnf", CDF: "cdf" };

/** Creates a product, a price and a Payment Link on the user's connected Stripe account; returns its URL. */
export const createStripePaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { product: string; amount: string; currency: string }) => z.object({ product: z.string().trim().min(1).max(120), amount: z.string().trim().max(20), currency: z.string().max(8) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getTier, allows } = await import("@/lib/plan.server");
    if (!allows(await getTier(context.userId), "site")) return { ok: false as const, error: "plan_site" };
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "publish"))) return { ok: false as const, error: "rate" };
    const currency = STRIPE_CURRENCY[data.currency.toUpperCase()];
    if (!currency) return { ok: false as const, error: "stripe_currency" };
    const value = Number(data.amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return { ok: false as const, error: "stripe_amount" };
    const unit = ZERO_DECIMAL.has(currency) ? Math.round(value) : Math.round(value * 100);
    const { getAccessToken, stripeFetch } = await import("@/lib/connections.server");
    const account = await getAccessToken(context.userId, "stripe");
    if (!account) return { ok: false as const, error: "not_connected_stripe" };
    const fail = async (step: string, res: Response) => { console.error(`[stripe] ${step}`, res.status, (await res.text().catch(() => "")).slice(0, 300)); return { ok: false as const, error: `stripe_${res.status}` }; };
    const product = await stripeFetch(account, "/v1/products", { name: data.product });
    if (!product.ok) return fail("product", product);
    const productId = ((await product.json()) as { id: string }).id;
    const price = await stripeFetch(account, "/v1/prices", { product: productId, unit_amount: String(unit), currency });
    if (!price.ok) return fail("price", price);
    const priceId = ((await price.json()) as { id: string }).id;
    const link = await stripeFetch(account, "/v1/payment_links", { "line_items[0][price]": priceId, "line_items[0][quantity]": "1" });
    if (!link.ok) return fail("link", link);
    return { ok: true as const, url: ((await link.json()) as { url: string }).url };
  });
