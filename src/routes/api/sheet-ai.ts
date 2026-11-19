import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// TechNova Tableur → « Assistant IA » (SHEET_AI_CREDITS a request) and « Tableaux d'un PDF » (SHEET_PDF_CREDITS):
// twice the price is reserved first (reserveCredits also refuses suspended accounts), then the job is billed
// max(price, real OpenRouter cost × 1 200), never more than the reservation; nothing is charged when it fails.
// One cheap engine (Gemini 2.5 Flash Lite), two rate limits (sheet_ai per 10 min, sheet_ai_daily per day,
// fail-closed); usage_logs and chat_engine_costs (mode "sheet") record it for the Usage page and the admin chart. The assistant answers in text and proposes changes
// as validated actions that the browser applies only after the user approves them; nothing is stored.

const MODEL = "google/gemini-2.5-flash-lite";

const assist = z.object({
  kind: z.literal("assist"),
  lang: z.enum(["fr", "en"]).default("fr"),
  title: z.string().max(120),
  sheet: z.string().max(40),
  sheets: z.array(z.string().max(40)).max(30),
  selection: z.string().max(30),
  context: z.string().max(40_000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(8),
  message: z.string().trim().min(1).max(4000),
});
const pdf = z.object({
  kind: z.literal("pdf"),
  lang: z.enum(["fr", "en"]).default("fr"),
  name: z.string().max(200),
  data: z.string().max(11_000_000),
});
const body = z.discriminatedUnion("kind", [assist, pdf]);

const SYSTEM = (fr: boolean) => `You are the assistant of TechNova Tableur, a spreadsheet editor (like Excel) inside TechNova AI Hub. You help the user build, fill, format, analyse and fix their spreadsheet, and you also help them write (titles, labels, comments, notes).
You see the active sheet as lines of "A1: value" for typed values and "B2=formula → result" for formulas.
Reply with ONLY a JSON object: {"reply": string, "actions": Action[]}.
- "reply": a short, friendly answer in ${fr ? "French" : "English"} (unless the user writes in another language): explain what you propose, give the formula and why, or answer the question. Plain text, no Markdown tables.
- "actions": the changes to make (empty when the user only asks a question). Allowed actions:
  {"type":"set","sheet"?:name,"cells":{"A1":"text or number or =FORMULA"}}
  {"type":"format","sheet"?:name,"range":"A1:D1","style":{"b"?:bool,"i"?:bool,"u"?:bool,"color"?:"#RRGGBB","bg"?:"#RRGGBB","align"?:"left"|"center"|"right","size"?:8-40,"wrap"?:bool,"fmt"?:"general"|"number"|"fcfa"|"eur"|"usd"|"percent"|"date"|"text","dec"?:0-6,"border"?:bool}}
  {"type":"chart","sheet"?:name,"kind":"bar"|"line"|"area"|"pie","range":"A1:B8" or "A2:A6,D2:D6","title":string}
  {"type":"addSheet","name":string}
  {"type":"width","sheet"?:name,"col":"B","px":120}
  {"type":"clear","sheet"?:name,"range":"A1:B2"}
Rules:
- Formulas use French Excel names with ";" separators (SOMME, MOYENNE, SI, SOMME.SI, NB.SI, RECHERCHEX, RECHERCHEV, ARRONDI, SIERREUR, CONCAT, AUJOURDHUI, MIN, MAX, NBVAL, ET, OU) and real cell references; never hard-code a result that a formula can compute.
- Numbers are plain (150000, 12.5), dates dd/mm/yyyy, money amounts as numbers with "fmt":"fcfa" (or eur/usd when the user uses them), percentages as 0.18 with "fmt":"percent".
- A table: a bold header row with a background colour and white text, borders, sensible column widths, totals in bold. Keep existing data unless the user asks to replace it; write new tables in empty areas.
- Charts: labels column first; series columns after; include the header row so series get names, but never the total row.
- Cell values in "set" are strings ("150000", "=SOMME(B2:B9)"). Fill every row you announce: when you create a table with example rows, write the example values and the row formulas too.
- Never invent the user's real figures (sales, names, prices) unless asked for an example: then say they are examples.
- At most 60 actions and 400 cells per answer.`;

export const Route = createFileRoute("/api/sheet-ai")({
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
        const { hitRateLimit, rateLimitMessage } = await import("@/lib/security.server");
        if (!(await hitRateLimit(userId, "sheet_ai"))) return new Response(rateLimitMessage(d.lang, "sheet_ai"), { status: 429 });
        if (!(await hitRateLimit(userId, "sheet_ai_daily"))) return new Response(fr ? "Vous avez atteint la limite du jour de l'assistant du tableur. Elle se renouvelle dans 24 heures." : "You reached today's limit for the spreadsheet assistant. It renews within 24 hours.", { status: 429 });
        const { SHEET_AI_CREDITS, SHEET_PDF_CREDITS } = await import("@/lib/sheet/limits");
        const price = d.kind === "pdf" ? SHEET_PDF_CREDITS : SHEET_AI_CREDITS;
        const { reserveCredits, settleCredits, releaseCredits } = await import("@/lib/credits.server");
        let held: string | null;
        try { held = await reserveCredits(userId, price * 2, d.kind === "pdf" ? "Tableur · tableaux d'un PDF" : "Tableur · assistant IA"); }
        catch { return new Response(fr ? "Compte suspendu." : "Account suspended.", { status: 403 }); }
        if (!held) return new Response(fr ? `Crédits insuffisants : ${d.kind === "pdf" ? "la lecture d'un PDF" : "une demande à l'assistant"} coûte ${price} crédits.` : `Not enough credits: ${d.kind === "pdf" ? "reading a PDF" : "an assistant request"} costs ${price} credits.`, { status: 402 });
        const reservation = held;
        const startedAt = Date.now();
        const { orComplete, providerMessage, OpenRouterError } = await import("@/lib/openrouter.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        /** Bills the job (price, or the real cost when higher, within the reservation) and records it. */
        const bill = async (r: { inputTokens: number; outputTokens: number; costUsd: number }) => {
          const credits = Math.min(price * 2, Math.max(price, Math.ceil((r.costUsd || 0) * 1200)));
          await settleCredits(reservation, credits);
          await supabaseAdmin.from("usage_logs").insert({ owner_id: userId, model: "Tableur · assistant IA", input_tokens: r.inputTokens, output_tokens: r.outputTokens, credits, latency_ms: Date.now() - startedAt });
          await supabaseAdmin.from("chat_engine_costs").insert({ owner_id: userId, mode: "sheet", engine: MODEL, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.costUsd || null, credits });
          return credits;
        };
        try {
          if (d.kind === "pdf") {
            if (!/^data:application\/pdf;base64,/.test(d.data)) return new Response("Invalid file", { status: 400 });
            const r = await orComplete({
              model: MODEL, maxTokens: 8000, temperature: 0, signal: request.signal, timeoutMs: 90_000,
              messages: [
                { role: "system", content: "Extract every table of this PDF so it can be edited in a spreadsheet. Reply ONLY with JSON: {\"sheets\":[{\"name\":string (max 30 chars),\"rows\":string[][]}]}. One sheet per table (or per page when tables continue). Keep the header row, the cell text exactly as printed (numbers as printed, without currency words), empty strings for empty cells. If the PDF has no table, return the text as one column, one line per row. Never invent values." },
                { role: "user", content: [{ type: "file", file: { filename: d.name.replace(/[^\w.\- ]/g, "") || "document.pdf", file_data: d.data } }, { type: "text", text: "Extract the tables." }] },
              ],
            });
            const s = r.content.indexOf("{"), e = r.content.lastIndexOf("}");
            const json = z.object({ sheets: z.array(z.object({ name: z.string().max(60), rows: z.array(z.array(z.union([z.string(), z.number()]).transform(String)).max(60)).max(2000) })).min(1).max(20) }).parse(JSON.parse(r.content.slice(s, e + 1)));
            const credits = await bill(r);
            return Response.json({ ...json, credits });
          }
          const { sheetActions } = await import("@/lib/sheet/ai-actions");
          const r = await orComplete({
            model: MODEL, maxTokens: 6000, temperature: 0.3, signal: request.signal, timeoutMs: 60_000,
            messages: [
              { role: "system", content: SYSTEM(fr) },
              ...d.history.map((h) => ({ role: h.role, content: h.content })),
              { role: "user", content: `Workbook "${d.title}" — sheets: ${d.sheets.join(", ")} — active sheet "${d.sheet}", selection ${d.selection}.\nActive sheet content:\n${d.context || "(empty sheet)"}\n\nRequest: ${d.message}` },
            ],
          });
          const s = r.content.indexOf("{"), e = r.content.lastIndexOf("}");
          let reply = "", actions: unknown[] = [];
          try {
            const json = JSON.parse(r.content.slice(s, e + 1)) as { reply?: unknown; actions?: unknown };
            reply = typeof json.reply === "string" ? json.reply : "";
            actions = Array.isArray(json.actions) ? json.actions : [];
          } catch { reply = r.content.trim().slice(0, 3000); }
          // Keep the valid actions only; cap the cells written in one answer.
          const valid = actions.map((a) => sheetActions.element.safeParse(a)).filter((x) => x.success).map((x) => x.data);
          let cells = 0;
          const capped = valid.filter((a) => { if (a.type !== "set") return true; cells += Object.keys(a.cells).length; return cells <= 400; });
          if (!reply && !capped.length) throw new Error("empty");
          const credits = await bill(r);
          return Response.json({ reply: reply || (fr ? "Voici ma proposition." : "Here is my proposal."), actions: capped, credits });
        } catch (e) {
          await releaseCredits(reservation);
          if (e instanceof OpenRouterError) return new Response(providerMessage(e.status), { status: 502 });
          return new Response(fr ? "L'assistant n'a pas pu répondre. Réessayez dans un instant : aucun crédit n'a été prélevé." : "The assistant could not answer. Try again in a moment: no credit was charged.", { status: 502 });
        }
      },
    },
  },
});
