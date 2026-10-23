import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RESEARCH_MAX_CREDITS } from "@/lib/research";

// Deep Research: plan sub-questions → search the web for each (OpenRouter web plugin)
// → write a sourced report. Billed at real provider cost, within a reserved ceiling.
// The response streams progress lines prefixed with "§" (shown as status, not saved),
// then the final Markdown report.

const MODEL = "google/gemini-2.5-flash";

const body = z.object({
  question: z.string().trim().min(3).max(4000),
  lang: z.enum(["fr", "en"]).default("fr"),
});

function parseQueries(text: string, fallback: string): string[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  try {
    const json = JSON.parse(text.slice(start, end + 1)) as { queries?: unknown };
    const list = Array.isArray(json.queries) ? json.queries.filter((q): q is string => typeof q === "string" && q.trim().length > 2) : [];
    return list.length ? list.slice(0, 4).map((q) => q.trim().slice(0, 300)) : [fallback];
  } catch {
    return [fallback];
  }
}

export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userIdFromRequest } = await import("@/lib/auth.server");
        const userId = await userIdFromRequest(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const { question, lang } = parsed.data;
        const fr = lang === "fr";
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "research"))) return new Response(rateLimitMessage(lang, "research"), { status: 429 });
        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        const reservation = await reserveCredits(userId, RESEARCH_MAX_CREDITS, "Deep Research");
        if (!reservation) return new Response(fr ? `Crédits insuffisants : une recherche approfondie demande jusqu'à ${RESEARCH_MAX_CREDITS} crédits.` : `Not enough credits: a deep research needs up to ${RESEARCH_MAX_CREDITS} credits.`, { status: 402 });

        const { orComplete, creditsFor, providerMessage, OpenRouterError } = await import("@/lib/openrouter.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const enc = new TextEncoder();
        const startedAt = Date.now();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const say = (line: string) => { try { controller.enqueue(enc.encode(line)); } catch { /* client gone */ } };
            const ping = setInterval(() => say("§\n"), 8000);
            let costUsd = 0, inputTokens = 0, outputTokens = 0;
            const track = <T extends { costUsd: number; inputTokens: number; outputTokens: number }>(r: T): T => { costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens; return r; };
            try {
              say(fr ? "§Préparation du plan de recherche…\n" : "§Planning the research…\n");
              const plan = track(await orComplete({
                model: MODEL, maxTokens: 400, temperature: 0.2, signal: request.signal,
                messages: [
                  { role: "system", content: `Split the user's question into 3 or 4 precise web search sub-questions that together answer it. Write them in ${fr ? "French" : "English"} unless another language gives better sources. Reply ONLY with JSON: {"queries":["..."]}` },
                  { role: "user", content: question },
                ],
              }));
              const queries = parseQueries(plan.content, question);
              for (const q of queries) say(`§${fr ? "Recherche" : "Searching"} : ${q}\n`);
              const findings = await Promise.all(queries.map((q) => orComplete({
                model: MODEL, maxTokens: 900, webResults: 4, signal: request.signal,
                messages: [
                  { role: "system", content: "You are a research assistant. Using the web results, state the key facts, figures and dates that answer the question. Be factual and concise; say so if sources disagree or are missing." },
                  { role: "user", content: q },
                ],
              }).then(track)));

              const sources: { url: string; title: string }[] = [];
              for (const f of findings) for (const c of f.citations) if (!sources.some((s) => s.url === c.url) && sources.length < 12) sources.push(c);
              say(fr ? `§Rédaction du rapport (${sources.length} sources)…\n` : `§Writing the report (${sources.length} sources)…\n`);
              const notes = findings.map((f, i) => `## ${queries[i]}\n${f.content}`).join("\n\n");
              const numbered = sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n");
              const report = track(await orComplete({
                model: MODEL, maxTokens: 3000, temperature: 0.3, signal: request.signal,
                messages: [
                  { role: "system", content: `Write a well-structured research report in ${fr ? "French" : "English"} answering the user's question, in Markdown: a short summary, then sections with headings, then a conclusion. Use ONLY the research notes. Cite sources inline as [n] using the numbered source list; never invent sources, numbers or URLs. Do not add a sources section (it is appended automatically).` },
                  { role: "user", content: `Question: ${question}\n\nResearch notes:\n${notes}\n\nNumbered sources:\n${numbered || "(none)"}` },
                ],
              }));
              const sourcesBlock = sources.length ? `\n\n### Sources\n${sources.map((s, i) => `${i + 1}. [${s.title.replace(/[[\]]/g, "")}](${s.url})`).join("\n")}` : "";
              say(report.content.trim() + sourcesBlock);
              const credits = Math.min(RESEARCH_MAX_CREDITS, creditsFor(costUsd));
              await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: "Deep Research", input_tokens: inputTokens, output_tokens: outputTokens, credits, latency_ms: Date.now() - startedAt });
              await settleCredits(reservation, credits);
            } catch (e) {
              const status = e instanceof OpenRouterError ? e.status : 502;
              // Work already paid to the provider is charged; nothing is charged if nothing ran.
              const spent = Math.min(RESEARCH_MAX_CREDITS, creditsFor(costUsd));
              if (spent > 0) await settleCredits(reservation, spent); else await releaseCredits(reservation);
              if ((e as Error)?.name !== "AbortError") say(`\n\n⚠️ ${providerMessage(status)}`);
            } finally {
              clearInterval(ping);
              try { controller.close(); } catch { /* closed */ }
            }
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
