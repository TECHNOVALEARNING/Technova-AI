import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openRouterModelIds } from "@/lib/chat-models";
import { creditCost, estimateTokens } from "@/lib/model-pricing";
import { chatTierCredits, chatTiers, EXPERT_MIN_TIER, PRO_TIER, smartTier, type ChatTier } from "@/lib/chat-modes";

const bodySchema = z.object({
  // The chat composer sends one of the three modes; custom agents keep their own model.
  tier: z.enum(["eclair", "equilibre", "expert", "smart"]).optional(),
  model: z.string().optional(),
  mode: z.enum(["chat", "create"]),
  lang: z.enum(["fr", "en"]).optional(),
  agentId: z.string().uuid().optional(),
  // Indexed files attached in this conversation and knowledge bases chosen in the composer.
  fileIds: z.array(z.string().uuid()).max(10).optional(),
  knowledgeBaseIds: z.array(z.string().uuid()).max(5).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(40000),
        files: z
          .array(z.object({ mediaType: z.string().max(100), filename: z.string().max(200), url: z.string().max(4_500_000) }))
          .max(4)
          .optional(),
      }),
    )
    .min(1)
    .max(60),
});

const systemPrompts = {
  chat: "You are TechNova AI, a helpful, precise assistant. Answer in the user's language. Use Markdown when it improves readability. TechNova AI Hub itself generates images, videos and music right in this chat: never say you are a text-only AI or that you cannot create images, and never send the user to another tool (Midjourney, DALL-E…). If the user asks for an image, video or song, tell them to write their request starting with « Génère une image… », « Génère une vidéo… » or « Génère une musique… » so TechNova creates it, and offer a refined description they can reuse.",
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

// Engine behind each mode (server only, never shown). Prices in credits per million tokens = USD × 1 200.
type Engine = { id: string; input: number; output: number; maxTokens: number; vision: boolean; media: boolean };
const engines = {
  flashLite: { id: "google/gemini-2.5-flash-lite", input: 120, output: 480, maxTokens: 1024, vision: true, media: true },
  balanced: { id: "qwen/qwen3-235b-a22b-2507", input: 168, output: 960, maxTokens: 4096, vision: false, media: false },
  balancedFiles: { id: "google/gemini-3.5-flash-lite", input: 360, output: 3000, maxTokens: 4096, vision: true, media: true },
  expert: { id: "anthropic/claude-sonnet-5", input: 2400, output: 12000, maxTokens: 8192, vision: true, media: false },
  expertPro: { id: "anthropic/claude-opus-5", input: 6000, output: 30000, maxTokens: 8192, vision: true, media: false },
  expertMedia: { id: "google/gemini-3.5-flash", input: 1800, output: 10800, maxTokens: 8192, vision: true, media: true },
} satisfies Record<string, Engine>;
function engineFor(tier: ChatTier, planTier: number, needsVision: boolean, needsMedia: boolean): Engine {
  if (tier === "eclair") return engines.flashLite;
  if (tier === "equilibre") return needsVision || needsMedia ? engines.balancedFiles : engines.balanced;
  if (needsMedia) return engines.expertMedia;
  return planTier >= PRO_TIER ? engines.expertPro : engines.expert;
}
const engineCost = (e: Engine, inputTokens: number, outputTokens: number) => {
  const raw = (inputTokens * e.input + outputTokens * e.output) / 1_000_000;
  return raw > 0 ? Math.ceil(raw) : 0;
};

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
const visionModels = new Set(["GPT-4o", "GPT-4o Mini", "Claude Sonnet 5", "Claude Opus 5", "Gemini 2.5 Flash Lite", "Gemini 3.5 Flash Lite", "Claude Haiku 4.5", "Gemini 2.5 Flash", "Gemini 2.5 Pro", "Mistral Large", "Gemma 3 12B"]);
const mediaModels = new Set(["Gemini 2.5 Flash", "Gemini 2.5 Pro", "Gemini 2.5 Flash Lite", "Gemini 3.5 Flash Lite"]);
const reasoningModels = new Set(["DeepSeek R1"]);
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
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        // A suspended account may still hold a valid session for up to an hour: refuse its requests.
        const { data: suspended } = await admin.from("account_suspensions").select("user_id").eq("user_id", userId).maybeSingle();
        if (suspended) return new Response("Compte suspendu. / Account suspended.", { status: 403 });
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "chat"))) return new Response(rateLimitMessage(request.headers.get("accept-language")?.startsWith("en") ? "en" : "fr", "chat"), { status: 429 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const allFiles = parsed.data.messages.flatMap(m => m.files ?? []).filter(f => f.url.startsWith("data:"));
        const needsMedia = allFiles.some(f => f.mediaType.startsWith("audio/") || f.mediaType.startsWith("video/"));
        const needsVision = allFiles.length > 0;
        const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        // Plan limits (src/lib/plans.ts): premium models from Essential, custom agents from Creator.
        const { getTier, planResponse } = await import("@/lib/plan.server");
        const { PREMIUM_CHAT_MODELS, STARTER_SMART_FALLBACK, DEFAULT_AGENT_BUDGET } = await import("@/lib/plans");
        const tier = await getTier(userId);
        let agent: { name: string; instructions: string; memory: string; model: string; max_tokens: number; max_cost: number; tools: string[]; knowledge_base_ids: string[] } | null = null;
        if (parsed.data.agentId) {
          if (tier < 2) return planResponse(userId, "agents");
          const { data: a } = await supabaseAdmin.from("agents").select("name, instructions, memory, model, max_tokens, max_cost, tools, knowledge_base_ids").eq("id", parsed.data.agentId).eq("owner_id", userId).maybeSingle();
          if (!a) return new Response("Agent introuvable / Agent not found", { status: 404 });
          // Only Pro chooses the per-reply budget; other plans use the default.
          agent = tier < 3 ? { ...a, max_cost: DEFAULT_AGENT_BUDGET } : a;
        }
        // Mode chosen in the composer (Éclair by default when an old client sends a model name).
        const hasFile = allFiles.length > 0 || (parsed.data.fileIds?.length ?? 0) > 0;
        const requestedTier = parsed.data.tier ?? "eclair";
        const chatTier: ChatTier = requestedTier === "smart" ? smartTier(lastUser, hasFile, tier) : requestedTier;
        if (!agent && chatTier === "expert" && tier < EXPERT_MIN_TIER) return planResponse(userId, "expert_mode");
        let model: string;
        let modelId: string;
        let engine: Engine | null = null;
        if (agent) {
          const chosen = agent.model;
          if (tier < 1 && PREMIUM_CHAT_MODELS.has(chosen)) return planResponse(userId, "premium_models");
          const picked = chosen === "TechNova Smart" ? smartPick(lastUser) : chosen;
          const requested = tier < 1 ? (STARTER_SMART_FALLBACK[picked] ?? picked) : picked;
          model = (needsMedia && !mediaModels.has(requested)) || (needsVision && !visionModels.has(requested)) ? "Gemini 2.5 Flash" : requested;
          const id = openRouterModelIds[model];
          if (!id) return new Response("Model not available for chat", { status: 400 });
          modelId = id;
        } else {
          engine = engineFor(chatTier, tier, needsVision, needsMedia);
          model = (requestedTier === "smart" ? "Smart · " : "") + chatTiers[chatTier].fr; // usage pages show the mode, never the engine
          modelId = engine.id;
        }
        // Fixed price of the mode for this message; a very long exchange costs its real price when that is higher.
        const flat = engine ? chatTierCredits(chatTier, hasFile, tier) : 0;
        const apiKey = process.env["OPENROUTER_API_KEY"];
        if (!apiKey) return new Response("OpenRouter is not configured", { status: 500 });
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
        // RAG: chat files and knowledge bases (the agent's own bases included), ownership checked server-side.
        const kbIds = [...(parsed.data.knowledgeBaseIds ?? []), ...(agent?.knowledge_base_ids ?? [])];
        if ((parsed.data.fileIds?.length || kbIds.length) && lastUser.trim()) {
          try {
            const { buildFileContext } = await import("@/lib/files.server");
            toolContext += await buildFileContext({ ownerId: userId, query: lastUser, fileIds: parsed.data.fileIds ?? [], kbIds, context: agent ? "agent" : "chat" });
          } catch (e) { console.error("file context", e instanceof Error ? e.message : e); }
        }
        const toolsRule = agent
          ? toolContext
            ? "\n\nFresh results from your enabled tools and/or the user's documents are provided below — use them and cite sources. Never claim other abilities (code execution, emails, payments, database writes)."
            : `\n\nEnabled tools: ${[...agentTools].join(", ") || "none"}. No live tool result was needed or available for this message. Never claim abilities beyond your enabled tools.`
          : "";
        const systemPrompt = agent
          ? `You are "${agent.name}", a custom TechNova agent. Follow the owner's instructions below.${toolsRule}\n\nINSTRUCTIONS:\n${agent.instructions}${agent.memory ? `\n\nMEMORY (facts to remember):\n${agent.memory}` : ""}` + toolContext + langRule
          : systemPrompts[parsed.data.mode] + toolContext + langRule;
        // Reasoning models think before answering: cap the thinking so it cannot eat the whole reply.
        const reasoning = reasoningModels.has(model);
        const maxTokens = agent ? Math.min(4096, Math.max(128, agent.max_tokens)) : engine ? engine.maxTokens : reasoning ? 2048 : 1024;
        const inputTokens = estimateTokens(systemPrompt + parsed.data.messages.map(m => m.content).join(" ")) + allFiles.reduce((sum, f) => sum + (f.mediaType.startsWith("image/") ? 1000 : f.mediaType === "application/pdf" ? 3000 : 8000), 0);
        // Hold the worst-case cost before calling the provider; the real cost is charged at the end.
        const worst = engine ? Math.max(flat, engineCost(engine, inputTokens, maxTokens)) : creditCost(model, inputTokens, maxTokens);
        if (agent && worst > agent.max_cost) return new Response(`Cette demande dépasse le budget de l’agent (${worst} > ${agent.max_cost} crédits Technova). / This request exceeds the agent budget.`, { status: 402 });
        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        const reservation = worst > 0 ? await reserveCredits(userId, worst, model) : null;
        if (worst > 0 && !reservation) return new Response("Crédits insuffisants — rechargez votre solde dans Crédits. / Not enough credits.", { status: 402 });
        let outputText = "";
        let billed: { input: number; output: number; reasoning: number; costUsd: number | null } | null = null;
        let settled = false;
        // Charges what was actually generated, once — at the end of the stream or when the client disconnects.
        const settle = async () => {
          if (settled) return;
          settled = true;
          const inTokens = billed?.input || inputTokens;
          const outTokens = billed ? billed.output : estimateTokens(outputText);
          // Charge what the provider billed (1 200 credits per USD), never less than the mode's fixed price.
          const realCredits = billed?.costUsd != null ? Math.ceil(billed.costUsd * 1200) : engine ? engineCost(engine, inTokens, outTokens) : creditCost(model, inTokens, outTokens);
          const credits = engine ? Math.max(flat, realCredits) : billed?.costUsd != null ? Math.max(1, realCredits) : realCredits;
          await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: model, input_tokens: inTokens, output_tokens: outTokens, credits, latency_ms: Date.now() - startedAt });
          // Admin-only record of the engine behind the mode and its real cost (never readable from the browser).
          await supabaseAdmin.from("chat_engine_costs").insert({ owner_id: userId, mode: model, engine: modelId, input_tokens: inTokens, output_tokens: outTokens, reasoning_tokens: billed?.reasoning ?? 0, cost_usd: billed?.costUsd ?? null, credits });
          if (reservation) await settleCredits(reservation, credits);
        };
        const abandon = async () => {
          if (settled) return;
          settled = true;
          if (reservation) await releaseCredits(reservation);
        };

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
            usage: { include: true },
            ...(reasoning ? { reasoning: { max_tokens: Math.floor(maxTokens / 2) } } : {}),
            messages: [{ role: "system", content: systemPrompt }, ...parsed.data.messages.map(m => (m.files?.length && m.role === "user" ? { role: m.role, content: toParts(m.content, m.files) } : { role: m.role, content: m.content }))],
          }),
        }).catch(() => null);
        if (!upstream?.ok || !upstream.body) {
          await abandon();
          if (!upstream) return new Response("Le modèle n'a pas pu répondre, réessayez. / The model could not answer.", { status: 502 });
          const detail = await upstream.text().catch(() => "");
          console.error("OpenRouter error", upstream.status, detail.slice(0, 500));
          const message =
            upstream.status === 402
              ? "Le service de modèles est momentanément indisponible (solde du fournisseur épuisé). / The model provider is out of balance."
              : upstream.status === 401 || upstream.status === 403
                ? "Le service de modèles est mal configuré (clé du fournisseur refusée). L'équipe TechNova doit vérifier la clé. / The model provider key was refused."
              : upstream.status === 429
                ? "Trop de requêtes, réessayez dans un instant. / Rate limited, try again shortly."
                : "Le modèle n'a pas pu répondre, réessayez. / The model could not answer.";
          return new Response(message, { status: upstream.status || 502 });
        }

        // A reply stopped by the visitor is still billed (at least the mode price): the provider already charged for the
        // prompt and any hidden reasoning, so aborting early must never make a reply free.
        request.signal.addEventListener("abort", () => { void settle(); }, { once: true });

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
                  if (json.usage) {
                    const u = json.usage as { prompt_tokens?: number; completion_tokens?: number; cost?: number; completion_tokens_details?: { reasoning_tokens?: number } };
                    billed = { input: u.prompt_tokens ?? 0, output: u.completion_tokens ?? 0, reasoning: u.completion_tokens_details?.reasoning_tokens ?? 0, costUsd: typeof u.cost === "number" ? u.cost : null };
                  }
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) { outputText += delta; controller.enqueue(encoder.encode(delta)); }
                } catch {
                  /* partial frame */
                }
              }
            },
            async flush() {
              await settle();
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
