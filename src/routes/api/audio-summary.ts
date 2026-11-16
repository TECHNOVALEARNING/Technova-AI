import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AUDIO_CHUNK_MINUTES, AUDIO_FOLDER, AUDIO_MAX_MINUTES, audioCredits, audioRules } from "@/lib/text-tools";

// "Résumé d'audio": the browser uploaded the recording as mono 16 kHz MP3 pieces (32 kb/s, 15 minutes each).
// 1. each piece is listened to by Gemini 2.5 Flash (in parallel) → detailed notes, or a clean transcript;
// 2. the notes become the summary type the user chose. Fixed price (4 credits a minute, reserved first),
// nothing charged when nothing could be read. The response streams "§" status lines then the Markdown, like
// Deep Research. The pieces are deleted at the end, whatever happens.

const MODEL = "google/gemini-2.5-flash";
const BYTES_PER_SECOND = 4000; // 32 kb/s

const body = z.object({
  paths: z.array(z.string().max(300)).min(1).max(Math.ceil(AUDIO_MAX_MINUTES / AUDIO_CHUNK_MINUTES)),
  seconds: z.number().positive().max(AUDIO_MAX_MINUTES * 60 + 60),
  type: z.string().max(30),
  detail: z.string().max(30),
  language: z.string().max(30),
  context: z.string().max(500).optional(),
  filename: z.string().max(200),
  lang: z.enum(["fr", "en"]).default("fr"),
});

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const Route = createFileRoute("/api/audio-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userIdFromRequest } = await import("@/lib/auth.server");
        const userId = await userIdFromRequest(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const d = parsed.data;
        const fr = d.lang === "fr";
        // Only the caller's own pieces, from the audio folder, never a path trick.
        if (d.paths.some((p) => !p.startsWith(`${userId}/${AUDIO_FOLDER}/`) || p.includes("..") || !p.endsWith(".mp3"))) return new Response("Invalid audio", { status: 400 });
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "audio_summary"))) return new Response(rateLimitMessage(d.lang, "audio_summary"), { status: 429 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { FILES_BUCKET } = await import("@/lib/files.server");
        const bucket = supabaseAdmin.storage.from(FILES_BUCKET);
        const cleanup = () => bucket.remove(d.paths).catch(() => null);

        // Read the pieces now: the real length (from their size) decides the price, not what the browser said.
        const pieces: Uint8Array[] = [];
        for (const p of d.paths) {
          const { data: blob, error } = await bucket.download(p);
          if (error || !blob) { await cleanup(); return new Response(fr ? "Audio introuvable, renvoyez le fichier." : "Audio not found, send the file again.", { status: 404 }); }
          if (blob.size > AUDIO_CHUNK_MINUTES * 60 * BYTES_PER_SECOND * 1.25) { await cleanup(); return new Response("Invalid audio", { status: 400 }); }
          pieces.push(new Uint8Array(await blob.arrayBuffer()));
        }
        const bytes = pieces.reduce((n, p) => n + p.length, 0);
        const seconds = Math.min(AUDIO_MAX_MINUTES * 60, Math.max(d.seconds, bytes / BYTES_PER_SECOND));
        const price = audioCredits(seconds);

        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        const reservation = await reserveCredits(userId, price, "Résumé d'audio");
        if (!reservation) { await cleanup(); return new Response(fr ? `Crédits insuffisants : ce résumé coûte ${price} crédits.` : `Not enough credits: this summary costs ${price} credits.`, { status: 402 }); }

        const { orComplete, providerMessage, OpenRouterError } = await import("@/lib/openrouter.server");
        const rules = audioRules(d);
        const context = d.context?.trim() ? `\nContext given by the user (names, topic): ${d.context.trim()}` : "";
        const enc = new TextEncoder();
        const startedAt = Date.now();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const say = (line: string) => { try { controller.enqueue(enc.encode(line)); } catch { /* client gone */ } };
            const ping = setInterval(() => say("§\n"), 8000);
            let costUsd = 0, inputTokens = 0, outputTokens = 0, heard = false;
            try {
              say(fr ? `§Écoute de l'enregistrement (${Math.ceil(seconds / 60)} min)…\n` : `§Listening to the recording (${Math.ceil(seconds / 60)} min)…\n`);
              let offset = 0;
              const ranges = pieces.map((p) => { const from = offset; offset += p.length / BYTES_PER_SECOND; return { from, to: offset }; });
              const notes = await Promise.all(pieces.map(async (p, i) => {
                const { from, to } = ranges[i]!;
                const instruction = rules.transcript
                  ? `Transcribe this audio (part ${i + 1} of ${pieces.length}, from ${clock(from)} to ${clock(to)} of the recording). Clean it up: remove hesitations and repeated words, keep every idea. Label speakers ("Intervenant 1:", "Intervenant 2:"… or their names when they are said) and add a [mm:ss] timestamp, counted from the start of the whole recording, at each new paragraph. Write it in ${rules.language}. Output only the transcript.`
                  : `Listen to this audio (part ${i + 1} of ${pieces.length}, from ${clock(from)} to ${clock(to)} of the recording) and write detailed notes in ${rules.language}: every topic in order with its key points, arguments, figures, names, dates, decisions, action items with owner and deadline when said, and open questions. Mark speakers when you can tell them apart. Do not invent anything; write "(inaudible)" where it cannot be understood. Output only the notes.`;
                const r = await orComplete({
                  model: MODEL, maxTokens: rules.transcript ? 16000 : 6000, temperature: 0.2, signal: request.signal, timeoutMs: 240_000,
                  messages: [{ role: "user", content: [{ type: "text", text: instruction + context }, { type: "input_audio", input_audio: { data: Buffer.from(p).toString("base64"), format: "mp3" } }] }],
                });
                costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
                if (r.content.trim()) heard = true;
                return r.content.trim();
              }));
              if (!heard) throw new OpenRouterError(422, "empty");
              let report: string;
              if (rules.transcript) {
                report = notes.join("\n\n");
              } else {
                say(fr ? "§Rédaction du résumé…\n" : "§Writing the summary…\n");
                const r = await orComplete({
                  model: MODEL, maxTokens: 6000, temperature: 0.3, signal: request.signal, timeoutMs: 120_000,
                  messages: [
                    { role: "system", content: `You turn notes taken while listening to a recording into ${rules.summary}. Write in ${rules.language}, in clean Markdown, and ${rules.detail}. Use ONLY the notes: never invent names, figures, decisions or deadlines. Start with a level-2 heading naming the document type and the recording's subject.` },
                    { role: "user", content: `Recording: ${d.filename} (${clock(seconds)}).${context}\n\nNotes, in order:\n\n${notes.map((n, i) => `### Part ${i + 1}\n${n}`).join("\n\n")}` },
                  ],
                });
                costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
                report = r.content.trim();
              }
              const footer = fr
                ? `\n\n---\n*Résumé d'audio · ${d.filename} · ${clock(seconds)} · ${price} crédits. Téléchargez-le avec le bouton de téléchargement sous la réponse (Word, PDF…).*`
                : `\n\n---\n*Audio summary · ${d.filename} · ${clock(seconds)} · ${price} credits. Download it with the download button under the reply (Word, PDF…).*`;
              say(report + footer);
              await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: "Résumé d'audio", input_tokens: inputTokens, output_tokens: outputTokens, credits: price, latency_ms: Date.now() - startedAt });
              await supabaseAdmin.from("chat_engine_costs").insert({ owner_id: userId, mode: "Résumé d'audio", engine: MODEL, input_tokens: inputTokens, output_tokens: outputTokens, reasoning_tokens: 0, cost_usd: costUsd, credits: price });
              await settleCredits(reservation, price);
            } catch (e) {
              // Nothing usable came back: nothing is charged.
              await releaseCredits(reservation);
              const status = e instanceof OpenRouterError ? e.status : 502;
              if ((e as Error)?.name !== "AbortError") say(status === 422
                ? (fr ? "⚠️ Aucune parole n'a pu être comprise dans cet enregistrement. Aucun crédit n'a été prélevé." : "⚠️ No speech could be understood in this recording. No credits were charged.")
                : `⚠️ ${providerMessage(status)} ${fr ? "Aucun crédit n'a été prélevé." : "No credits were charged."}`);
            } finally {
              clearInterval(ping);
              await cleanup();
              try { controller.close(); } catch { /* closed */ }
            }
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
