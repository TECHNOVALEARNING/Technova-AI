import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openRouterModelIds } from "@/lib/chat-models";
import { creditCost, estimateTokens } from "@/lib/model-pricing";

const bodySchema = z.object({
  model: z.string(),
  mode: z.enum(["chat", "create"]),
  lang: z.enum(["fr", "en"]).optional(),
  agentId: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(40000),
        files: z
          .array(z.object({ mediaType: z.string().max(100), filename: z.string().max(200), url: z.string().max(30_000_000) }))
          .max(4)
          .optional(),
      }),
    )
    .min(1)
    .max(60),
});

const systemPrompts = {
  chat: "You are TechNova AI, a helpful, precise assistant. Answer in the user's language. Use Markdown when it improves readability.",
  create:
    "You are TechNova Studio, an expert product designer and full-stack engineer. In this conversational step, chat briefly and helpfully. NEVER output full files or long code blocks here: projects are generated in the TechNova project panel. If the user wants something built, invite them to describe it (e.g. « Crée-moi un site pour… ») so the studio starts. Answer in the user's language.",
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

type InFile = { mediaType: string; filename: string; url: string };

// TechNova Smart: picks the cheapest model that fits the request.
function smartPick(text: string): string {
  const t = text.toLowerCase();
  const has = (words: string[]) => words.some((w) => t.includes(w));
  const big = t.length > 1200 || has(["application complète", "full app", "architecture", "système complet", "full system", "saas", "plateforme"]);
  if (big) return "Gemini 2.5 Pro";
  if (has(["design", "landing", "page", "ui", "ux", "interface", "maquette", "css", "tailwind", "animation", "couleur", "color", "site"])) return "Claude Sonnet 5";
  if (has(["sql", "supabase", "base de données", "database", "api", "backend", "fonction", "function", "bug", "erreur", "error", "code", "react", "python", "php", "javascript", "typescript", "script"])) return "DeepSeek V3";
  return "GPT-4o Mini";
}
const visionModels = new Set(["GPT-4o", "GPT-4o Mini", "Claude Sonnet 5", "Claude Haiku 4.5", "Gemini 2.5 Flash", "Gemini 2.5 Pro", "Mistral Large", "Gemma 3 12B"]);
const mediaModels = new Set(["Gemini 2.5 Flash", "Gemini 2.5 Pro"]);
const audioFormats: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac" };

function toParts(text: string, files: InFile[]) {
  const parts: unknown[] = [];
  if (text) parts.push({ type: "text", text });
  for (const f of files) {
    if (!f.url.startsWith("data:")) continue;
    if (f.mediaType.startsWith("image/")) parts.push({ type: "image_url", image_url: { url: f.url } });
    else if (f.mediaType === "application/pdf") parts.push({ type: "file", file: { filename: f.filename, file_data: f.url } });
    else if (f.mediaType.startsWith("audio/")) parts.push({ type: "input_audio", input_audio: { data: f.url.split(",")[1] ?? "", format: audioFormats[f.mediaType] ?? "mp3" } });
    else if (f.mediaType.startsWith("video/")) parts.push({ type: "video_url", video_url: { url: f.url } });
  }
  if (!parts.length) parts.push({ type: "text", text: "(fichier joint)" });
  return parts;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await verifyUser(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "chat"))) return new Response(rateLimitMessage(request.headers.get("accept-language")?.startsWith("en") ? "en" : "fr", "chat"), { status: 429 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: ledger } = await supabaseAdmin.from("credit_transactions").select("amount").eq("owner_id", userId);
        const balance = (ledger ?? []).reduce((sum, row) => sum + row.amount, 0);
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const allFiles = parsed.data.messages.flatMap(m => m.files ?? []).filter(f => f.url.startsWith("data:"));
        const needsMedia = allFiles.some(f => f.mediaType.startsWith("audio/") || f.mediaType.startsWith("video/"));
        const needsVision = allFiles.length > 0;
        const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        let agent: { name: string; instructions: string; memory: string; model: string; max_tokens: number; max_cost: number; tools: string[] } | null = null;
        if (parsed.data.agentId) {
          const { data: a } = await supabaseAdmin.from("agents").select("name, instructions, memory, model, max_tokens, max_cost, tools").eq("id", parsed.data.agentId).eq("owner_id", userId).maybeSingle();
          if (!a) return new Response("Agent introuvable / Agent not found", { status: 404 });
          agent = a;
        }
        const chosen = agent ? agent.model : parsed.data.model;
        const requested = chosen === "TechNova Smart" ? smartPick(lastUser) : chosen;
        const model = (needsMedia && !mediaModels.has(requested)) || (needsVision && !visionModels.has(requested)) ? "Gemini 2.5 Flash" : requested;
        const modelId = openRouterModelIds[model];
        if (!modelId) return new Response("Model not available for chat", { status: 400 });
        const apiKey = process.env["OPENROUTER_API_KEY"];
        if (!apiKey) return new Response("OpenRouter is not configured", { status: 500 });
        if (balance <= 0 && creditCost(model, 1_000_000, 1_000_000) > 0) return new Response("Crédits insuffisants — rechargez votre solde dans Crédits. / Not enough credits.", { status: 402 });
        const startedAt = Date.now();
        const langRule = parsed.data.lang === "en"
          ? " IMPORTANT: always reply in English, whatever language the user writes in."
          : " IMPORTANT : réponds toujours en français, quelle que soit la langue du message de l'utilisateur.";
        // Agent tools run server-side, deny-by-default: only explicitly enabled tools execute.
        let toolContext = "";
        const agentTools = new Set(agent?.tools ?? []);
        if (agent && agentTools.has("web_fetch")) {
          const urls = [...new Set(lastUser.match(/https?:\/\/[^\s)"']+/g) ?? [])].slice(0, 2);
          for (const url of urls) {
            try {
              const { fetchPublicText } = await import("@/lib/safe-fetch.server");
              const html = await fetchPublicText(url, { headers: { "User-Agent": "TechNova-Agent/1.0" } });
              const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
              if (text) toolContext += `\n\nWEB PAGE CONTENT (${url}):\n${text}`;
            } catch { /* unreachable page: ignore */ }
          }
        }
        if (agent && agentTools.has("web_search") && lastUser.trim().length >= 3) {
          try {
            const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(lastUser.slice(0, 300))}&format=json&no_html=1&no_redirect=1`, { signal: AbortSignal.timeout(8000) });
            const data = await res.json() as { AbstractText?: string; AbstractURL?: string; RelatedTopics?: { Text?: string; FirstURL?: string; Topics?: { Text?: string; FirstURL?: string }[] }[] };
            const topics = (data.RelatedTopics ?? []).flatMap((t) => t.Topics ?? [t]).filter((t) => t.Text).slice(0, 5);
            if (data.AbstractText || topics.length) {
              toolContext += `\n\nWEB SEARCH RESULTS for "${lastUser.slice(0, 120)}":`;
              if (data.AbstractText) toolContext += `\n- ${data.AbstractText}${data.AbstractURL ? ` (${data.AbstractURL})` : ""}`;
              for (const t of topics) toolContext += `\n- ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}`;
            }
          } catch { /* search unavailable: answer without it */ }
        }
        const toolsRule = agent
          ? toolContext
            ? "\n\nYou have the tools: web search and/or page reading. Their fresh results are provided below — use them and cite sources. Never claim other abilities (code execution, emails, payments, database writes)."
            : `\n\nEnabled tools: ${[...agentTools].join(", ") || "none"}. No live tool result was needed or available for this message. Never claim abilities beyond your enabled tools.`
          : "";
        const systemPrompt = agent
          ? `You are "${agent.name}", a custom TechNova agent. Follow the owner's instructions below.${toolsRule}\n\nINSTRUCTIONS:\n${agent.instructions}${agent.memory ? `\n\nMEMORY (facts to remember):\n${agent.memory}` : ""}` + toolContext + langRule
          : systemPrompts[parsed.data.mode] + langRule;
        const maxTokens = agent ? Math.min(4096, Math.max(128, agent.max_tokens)) : 1024;
        const inputTokens = estimateTokens(systemPrompt + parsed.data.messages.map(m => m.content).join(" ")) + allFiles.reduce((sum, f) => sum + (f.mediaType.startsWith("image/") ? 1000 : f.mediaType === "application/pdf" ? 3000 : 8000), 0);
        if (agent) {
          const worst = creditCost(model, inputTokens, maxTokens);
          if (worst > agent.max_cost) return new Response(`Cette demande dépasse le budget de l’agent (${worst} > ${agent.max_cost} crédits Technova). / This request exceeds the agent budget.`, { status: 402 });
          if (worst > balance && worst > 0) return new Response("Crédits insuffisants. / Not enough credits.", { status: 402 });
        }
        let outputText = "";

        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: request.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": new URL(request.url).origin,
            "X-Title": "TechNova AI Hub",
          },
          body: JSON.stringify({
            model: modelId,
            stream: true,
            max_tokens: maxTokens,
            messages: [{ role: "system", content: systemPrompt }, ...parsed.data.messages.map(m => (m.files?.length && m.role === "user" ? { role: m.role, content: toParts(m.content, m.files) } : { role: m.role, content: m.content }))],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("OpenRouter error", upstream.status, detail.slice(0, 500));
          const message =
            upstream.status === 402
              ? "Le service de modèles est momentanément indisponible (solde du fournisseur épuisé). / The model provider is out of balance."
              : upstream.status === 429
                ? "Trop de requêtes, réessayez dans un instant. / Rate limited, try again shortly."
                : "Le modèle n'a pas pu répondre, réessayez. / The model could not answer.";
          return new Response(message, { status: upstream.status || 502 });
        }

        // Convert OpenRouter SSE into a plain text stream of answer deltas.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        const stream = upstream.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              buffer += decoder.decode(chunk, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const data = trimmed.slice(5).trim();
                if (data === "[DONE]") continue;
                try {
                  const json = JSON.parse(data);
                  if (json.error) {
                    controller.enqueue(encoder.encode(`\n\n⚠️ ${json.error.message ?? "Error"}`));
                    continue;
                  }
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) { outputText += delta; controller.enqueue(encoder.encode(delta)); }
                } catch {
                  /* partial frame */
                }
              }
            },
            async flush() {
              const outputTokens = estimateTokens(outputText);
              const credits = creditCost(model, inputTokens, outputTokens);
              await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: model, input_tokens: inputTokens, output_tokens: outputTokens, credits, latency_ms: Date.now() - startedAt });
              if (credits > 0) await supabaseAdmin.from("credit_transactions").insert({ owner_id: userId, amount: -credits, kind: "usage", label: model });
            },
          }),
        );
        return new Response(stream, {
          headers: { "X-TechNova-Model": encodeURIComponent(model), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
