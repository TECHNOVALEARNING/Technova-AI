import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { STUDIO_COST } from "@/lib/studio";

const body = z.object({
  stage: z.enum(["intent", "questions", "plan", "build"]),
  lang: z.enum(["fr", "en"]).optional(),
  request: z.string().min(1).max(20000),
  answers: z.string().max(10000).optional(),
  plan: z.string().max(30000).optional(),
  feedback: z.string().max(5000).optional(),
});

const COST = STUDIO_COST;

const PROMPTS = {
  intent:
    'Decide if the user message asks to BUILD something (website, app, page, code, script, database, component, feature) or is just conversation/question. Reply ONLY with JSON: {"intent":"build"|"chat"}.',
  questions:
    'You are TechNova Studio, a senior product designer and full-stack engineer. Ask 2 to 5 relevant questions where the brief has gaps: business offer, audience, visual references or style, useful actions, language. If social proof is requested, ask whether the user has genuine quotes; never invent them. Ask whether there are real brand or product photos when visual fidelity is important; otherwise licensed editorial photos may be sourced, never portrayed as the client. Only ask about storage or accounts if the request requires saved dynamic data; a simple business site needs no database connection. Each question has 2-4 specific choices grounded in the site category, not generic quiz options. Reply in the user\'s language, ONLY with JSON: {"intro":"one short sentence","questions":[{"id":"q1","question":"...","choices":["..."]}]}.',
  plan:
    'You are TechNova Studio. Write a concrete implementation plan: identify the business category, visitor intent, specific sections and a visual direction suited to THIS business. Preserve requested treatments such as glassmorphism, but do not apply them blindly. Include 2-3 concise English photo-subject search phrases fitting this business (for example "artisan bakery bread loaves", not its brand name), or [] if photography is unsuitable. Do not imply photos show the actual business or its products. Testimonials only when real quotes are supplied; otherwise use an honest trust or value section. A static presentation, portfolio, restaurant or bakery site needs NO database unless the user explicitly requests saved bookings, orders, accounts or editable content. A contact link can work without a database. In those cases set database.needed=false, tables=[], sql="". Do not require a Supabase connection unless persistence is necessary. Reply in the user\'s language ONLY with JSON: {"title":"...","summary":"2 sentences","goals":["..."],"features":["..."],"files":["index.html", "..."],"imageSearches":["English photo subject", "English photo subject"],"database":{"needed":true|false,"tables":["table: purpose"],"sql":"CREATE TABLE ... (empty string if not needed)"}}. Files must always include a runnable index.html.',
  build: `You are TechNova Studio, an expert designer and engineer. Implement the approved plan as a complete, polished, modern, responsive project.
Output ONLY this tagged format, nothing else:
<step title="Analyse de la demande">what you understood (2-4 lines)</step>
<step title="Analyse du design">palette, typography, layout decisions</step>
(if database) <step title="Conception de la base de données">tables and relations</step>
then for EACH file: <step title="Écriture de PATH">what this file does</step><file path="PATH">full file content</file>
(if database) <sql>full SQL with tables and row level security</sql>
<step title="Vérification">checks you made</step>
Rules: include a browser-runnable index.html with viewport meta tag and layouts adapting to phone, tablet and desktop. Use relative local CSS and plain browser-compatible JavaScript, not unbundled React or bare imports. Every internal page link must target an existing generated HTML file or real section; buttons and forms must perform meaningful actions, not pretend to store data. Generate SQL only when the approved plan requires a database. Never fabricate testimonials, customer names, awards, figures, addresses or claims. Write step titles in the user's language. Never use markdown fences.`,
};

async function verifyUser(request: Request) {
  const auth = request.headers.get("authorization");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!auth?.startsWith("Bearer ") || !url || !key) return null;
  const token = auth.slice(7);
  if (token.split(".").length !== 3) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

function gatewayError(status = 502) {
  const msg =
    status === 402 ? "Le service IA est momentanément indisponible (solde du fournisseur épuisé). / The AI provider is out of balance." :
    status === 429 ? "Trop de requêtes, réessayez dans un instant. / Rate limited." :
    "Le studio n'a pas pu répondre. / The studio could not answer.";
  return new Response(msg, { status });
}

export const Route = createFileRoute("/api/studio")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await verifyUser(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const d = parsed.data;
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "studio"))) return new Response(rateLimitMessage((d as { lang?: string }).lang, "studio"), { status: 429 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cost = COST[d.stage];
        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        const reservation = cost > 0 ? await reserveCredits(userId, cost, `TechNova Studio · ${d.stage}`) : null;
        if (cost > 0 && !reservation) return new Response("Crédits insuffisants — rechargez votre solde dans Crédits. / Not enough credits.", { status: 402 });
        let settled = false;
        const release = async () => { if (!settled && reservation) { settled = true; await releaseCredits(reservation); } };
        const { studioStream, studioErrorStatus, parseJson, STUDIO_MAX_TOKENS } = await import("@/lib/studio-gateway.server");
        const langRule = d.lang === "en"
          ? "Always write everything (questions, plan, steps, code comments) in English."
          : "Écris toujours tout (questions, plan, étapes, commentaires) en français.";
        let content = `Request:\n${d.request}`;
        if (d.answers) content += `\n\nAnswers:\n${d.answers}`;
        if (d.plan) content += `\n\nApproved plan:\n${d.plan}`;
        if (d.feedback) content += `\n\nChanges requested on the previous plan:\n${d.feedback}`;
        const startedAt = Date.now();
        const charge = async (out: string) => {
          if (cost <= 0 || settled || !reservation) return;
          settled = true;
          await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: "TechNova Studio", input_tokens: Math.ceil(content.length / 4), output_tokens: Math.ceil(out.length / 4), credits: cost, latency_ms: Date.now() - startedAt });
          await settleCredits(reservation, cost);
        };
        let result: ReturnType<typeof studioStream> | null = null;
        try {
          result = studioStream(request, `${PROMPTS[d.stage]} ${langRule}`, [{ role: "user", content }], STUDIO_MAX_TOKENS[d.stage]);
          const run = result;
          if (d.stage !== "build") {
            // Stream keep-alive spaces while the model thinks so long plans never hit idle-connection timeouts.
            const enc = new TextEncoder();
            const stream = new ReadableStream<Uint8Array>({
              async start(controller) {
                const ping = setInterval(() => { try { controller.enqueue(enc.encode(" ")); } catch { /* closed */ } }, 5000);
                try {
                  const text = await run.text;
                  const json = parseJson<Record<string, unknown>>(text);
                  if (!json) controller.enqueue(enc.encode(JSON.stringify({ error: "Réponse illisible, réessayez. / Unreadable answer." })));
                  else { await charge(text); controller.enqueue(enc.encode(JSON.stringify(json))); }
                } catch (e) {
                  const s = studioErrorStatus(e, run.providerError());
                  controller.enqueue(enc.encode(JSON.stringify({ error: s === 402 ? "Le service IA est momentanément indisponible (solde du fournisseur épuisé). / The AI provider is out of balance." : s === 429 ? "Trop de requêtes, réessayez dans un instant. / Rate limited." : "Le studio n'a pas pu répondre, réessayez. / The studio could not answer." })));
                } finally { clearInterval(ping); await release(); controller.close(); }
              },
            });
            return new Response(stream, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
          }
          let out = "";
          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                for await (const delta of run.textStream) {
                  out += delta;
                  controller.enqueue(encoder.encode(delta));
                }
                await charge(out);
              } catch {
                controller.enqueue(encoder.encode('\n<step title="Erreur">La génération a été interrompue.</step>'));
              }
              await release();
              controller.close();
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
        } catch (e) {
          await release();
          if ((e as Error)?.name === "AbortError") return new Response(null, { status: 499 });
          return gatewayError(studioErrorStatus(e, result?.providerError()));
        }
      },
    },
  },
});
