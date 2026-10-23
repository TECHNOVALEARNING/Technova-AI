import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SITE_SLUG_RE } from "@/lib/connectors";

// Public: any visitor can report a published site. The visitor is identified only by a
// salted hash (IP + browser), never stored in clear; 3 distinct reporters suspend the site.
const body = z.object({
  slug: z.string().regex(SITE_SLUG_RE),
  reason: z.enum(["phishing", "scam", "malware", "illegal", "other"]),
  details: z.string().trim().max(500).default(""),
});

export const Route = createFileRoute("/api/public/report-site")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
        const { createHash } = await import("node:crypto");
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
        const salt = process.env["TECHNOVA_CONN_CRYPTO_KEY"] ?? "technova";
        const reporter = createHash("sha256").update(`${ip}|${request.headers.get("user-agent") ?? ""}|${salt}`).digest("hex");
        // Rate limit per reporter: the hash is shaped as a uuid for the shared limiter.
        const limiterId = `${reporter.slice(0, 8)}-${reporter.slice(8, 12)}-4${reporter.slice(13, 16)}-8${reporter.slice(17, 20)}-${reporter.slice(20, 32)}`;
        const { hitRateLimit, logSecurityEvent } = await import("@/lib/security.server");
        if (!(await hitRateLimit(limiterId, "site_report"))) return Response.json({ ok: false, error: "rate" }, { status: 429 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("report_site", { _slug: parsed.data.slug, _reason: parsed.data.reason, _details: parsed.data.details, _reporter_hash: reporter });
        if (error) return Response.json({ ok: false, error: "failed" }, { status: 500 });
        if (data === "not_found") return Response.json({ ok: false, error: "not_found" }, { status: 404 });
        await logSecurityEvent(null, data === "suspended" ? "site_auto_suspended" : "site_reported", data === "suspended" ? "warning" : "info", { slug: parsed.data.slug, reason: parsed.data.reason });
        return Response.json({ ok: true, status: data });
      },
    },
  },
});
