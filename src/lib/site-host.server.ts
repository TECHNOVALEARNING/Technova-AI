// Server-only: serves published sites on their own sub-domain, e.g. https://boulangerie.<SITES_BASE_DOMAIN>.
// Enabled only when SITES_BASE_DOMAIN is set (wildcard DNS *.<domain> pointing to this deployment).
// Each page is sent with `Content-Security-Policy: sandbox`, so it runs in an opaque origin and
// can never read TechNova sessions, cookies or storage, even on a TechNova-owned domain.
import { SITE_SLUG_RE } from "@/lib/connectors";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8",
  svg: "image/svg+xml", txt: "text/plain; charset=utf-8", xml: "application/xml; charset=utf-8", webmanifest: "application/manifest+json",
};

const SANDBOX_HEADERS = {
  "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups allow-modals; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function page(status: number, title: string, text: string) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;color:#18181b"><div><h1 style="font-size:22px">${title}</h1><p style="color:#52525b;max-width:420px">${text}</p></div></body></html>`;
  return new Response(html, { status, headers: { ...SANDBOX_HEADERS, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Slug when the request targets a site sub-domain, else null (normal TechNova request). */
export function siteSlugForHost(request: Request): string | null {
  const base = process.env["SITES_BASE_DOMAIN"]?.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  if (!base) return null;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0]!.trim().split(":")[0]!.toLowerCase();
  if (!host.endsWith(`.${base}`)) return null;
  return host.slice(0, -(base.length + 1));
}

export function publicSiteUrl(slug: string, fallbackOrigin: string) {
  const base = process.env["SITES_BASE_DOMAIN"]?.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  return base ? `https://${slug}.${base}` : `${fallbackOrigin.replace(/\/+$/, "")}/s/${slug}`;
}

export async function serveSiteHost(request: Request, slug: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (!SITE_SLUG_RE.test(slug)) return page(404, "Site introuvable", "Ce site n'existe pas.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: site } = await supabaseAdmin.from("published_sites").select("files,disabled_at").eq("slug", slug).maybeSingle();
  if (!site) return page(404, "Site introuvable", "Ce site n'existe pas ou a été dépublié.");
  if (site.disabled_at) return page(410, "Site suspendu", "Ce site a été signalé et suspendu par mesure de sécurité, le temps d'une vérification par l'équipe TechNova.");

  const files = (Array.isArray(site.files) ? site.files : []) as { path?: string; content?: string }[];
  const byPath = new Map(files.filter((f) => typeof f.path === "string" && typeof f.content === "string").map((f) => [f.path!.replace(/^\.?\/+/, ""), f.content!]));
  let path: string;
  try { path = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, ""); }
  catch { return page(400, "Adresse invalide", "Cette adresse n'est pas valide."); }
  if (path === "" || path.endsWith("/")) path += "index.html";
  if (path.split("/").includes("..")) return page(400, "Adresse invalide", "Cette adresse n'est pas valide.");
  let content = byPath.get(path);
  if (content === undefined && !/\.[a-z0-9]+$/i.test(path)) { path += ".html"; content = byPath.get(path); }
  if (content === undefined) return page(404, "Page introuvable", "Cette page n'existe pas sur ce site.");

  const ext = path.split(".").pop()!.toLowerCase();
  const type = TYPES[ext] ?? "text/plain; charset=utf-8";
  if (type.startsWith("text/html")) {
    // Every page carries the TechNova badge with a report link (anti-phishing).
    const app = (process.env["TECHNOVA_APP_URL"]?.trim() || "").replace(/\/+$/, "");
    const badge = `<a href="${app}/s/${slug}?report=1" target="_blank" rel="noopener" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;font:500 11px system-ui,sans-serif;background:rgba(255,255,255,.92);color:#3f3f46;border:1px solid #e4e4e7;border-radius:999px;padding:5px 10px;text-decoration:none">Créé avec TechNova · Signaler</a>`;
    content = /<\/body\s*>/i.test(content) ? content.replace(/<\/body\s*>/i, `${badge}</body>`) : content + badge;
  }
  return new Response(request.method === "HEAD" ? null : content, { headers: { ...SANDBOX_HEADERS, "Content-Type": type, "Cache-Control": "public, max-age=60" } });
}
