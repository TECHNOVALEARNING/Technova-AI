import { checkBuild, describeIssue, jsSyntaxIssues, parseBuild, STUDIO_COST, type StudioData, type StudioPlanData } from "@/lib/studio";
import { findStudioImages } from "@/lib/studio-images.server";

const BUILD_COST = STUDIO_COST.build;
const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 4;

const BUILD_PROMPT = `You are TechNova Studio, an expert designer and engineer. Implement the approved plan as a complete, polished, modern, responsive project.
Output ONLY this tagged format, nothing else:
<step title="Analyse de la demande">what you understood (2-4 lines)</step>
<step title="Analyse du design">palette, typography, layout decisions</step>
(if database) <step title="Conception de la base de données">tables and relations</step>
then for EACH file: <step title="Écriture de PATH">what this file does</step><file path="PATH">full file content</file>
(if database) <sql>full SQL with tables and row level security</sql>
<step title="Vérification">checks you made</step>
Visual direction: interpret the brief as an art director, not a generic template generator. Match the actual business and its audience in imagery, layout, typography, tone and content hierarchy. For image-led sites use the researched photos supplied below as the prominent hero and supporting imagery where relevant; do not use random remote links, SVG gradient backgrounds or empty image placeholders. Crop thoughtfully, preserve legibility and use responsive object-fit. Respect requested glass/frosted-glass styling where appropriate using translucent surfaces, subtle borders and backdrop-filter, while keeping text contrast and visual hierarchy; do not impose glass styling on every site. Make every section feel specific to this business, not interchangeable. Use only facts supplied by the request/answers. Never invent testimonials, customer identities, ratings, awards, numbers, addresses, prices or business claims. If the user provided real testimonials, reproduce them accurately. Otherwise replace testimonials with an honest product/process/values section. Public-domain reference photos must never be described as the actual client's premises, people or products. Include a small visible image credit linking to the Wikimedia Commons file pages when using these photos. If no suitable photos were found, design around typography/CSS and do not fabricate URLs.
Rules: always include a self-contained index.html runnable directly in a browser. Include a viewport meta tag and responsive layouts at 390px, 768px and desktop widths. Create real HTML files for every internal page linked in the site. Every navigation link must target an existing generated HTML file or an actual section id. Every button must have a working action; use plain browser-compatible JavaScript in a local .js file or inline script, not React/TSX, bare module imports or an unbundled framework. Forms should have a meaningful working action (mailto or a clearly labelled local confirmation) and never pretend to save to a server. Do not output placeholder links or dummy controls. Only generate SQL if the approved plan's database.needed is true; a static business site needs no database or Supabase connection. Use local CSS/JS referenced by relative paths. Avoid external dependencies where possible. Write step titles in the user's language. Never use markdown fences.`;

type Job = {
  id: string; owner_id: string; thread_id: string; message_id: string; request: string; answers: string;
  plan: unknown; lang: string; output: string; attempts: number; charged: boolean; reservation_id: string | null;
};

/** Gives back the credits held for a build that will never finish. */
async function releaseJobCredits(job: Job) {
  if (!job.reservation_id) return;
  const { releaseCredits } = await import("@/lib/credits.server");
  await releaseCredits(job.reservation_id);
}

/** Keeps only fully closed tags so a resumed run continues from a clean boundary. */
function trimToComplete(text: string) {
  const ends = [...text.matchAll(/<\/(step|file|sql)>/g)];
  const last = ends[ends.length - 1];
  return last ? text.slice(0, (last.index ?? 0) + last[0].length) : "";
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function writeMessage(job: Job, output: string, finished: boolean, status: "running" | "done" | "failed", error?: string) {
  const db = await admin();
  const data: StudioData = {
    kind: "build", request: job.request, answers: job.answers, plan: job.plan as StudioPlanData,
    build: parseBuild(output, finished), jobId: job.id, jobStatus: status, ...(error ? { jobError: error } : {}),
  };
  await db.from("chat_messages").update({ parts: [{ type: "data-studio", data }] as never }).eq("thread_id", job.thread_id).eq("sdk_id", job.message_id);
}

export const REPAIR_TITLE = { fr: "Vérification automatique", en: "Automatic check" } as const;
const REPAIR_MAX_TOKENS = 16000;
const REPAIR_PROMPT = `You are TechNova Studio's quality pass. A website was just generated; an automatic check found real problems, listed below with the project files.
Fix exactly these problems and nothing else: create every missing page, stylesheet or script with content that fits the site (same design, header, footer and navigation as the existing pages), complete any cut-off file, make every "#section" link point at an existing id (add the section or fix the link), and fix invalid JavaScript.
Output ONLY the files you create or change, each as <file path="PATH">full file content</file>, with no other text. Never output a file you did not change.`;

/** After the build: checks the site (missing pages, assets, anchors, cut files, invalid JavaScript) and, if
 *  something is wrong, asks the model once to rewrite only the faulty or missing files. The fixes are appended
 *  to the output (a later <file> with the same path replaces the earlier one) after a visible step listing what
 *  was found and what was fixed. Included in the build price; runs once per build. */
async function autoRepair(job: Job, out: string, langRule: string, keepAlive: () => Promise<void>): Promise<string> {
  const lang = job.lang === "en" ? "en" : "fr";
  const title = REPAIR_TITLE[lang];
  if (out.includes(`<step title="${title}">`)) return out;
  const build = parseBuild(out, true);
  if (!build.files.length) return out;
  const found = [...checkBuild(build.files), ...jsSyntaxIssues(build.files)].filter((i) => i.problem !== "unfinished");
  if (!found.length) {
    return `${out}\n<step title="${title}">${lang === "fr" ? "Pages, liens, sections, styles et scripts vérifiés : aucun problème trouvé." : "Pages, links, sections, styles and scripts checked: no problem found."}</step>`;
  }
  const lines = found.slice(0, 40).map((i) => `- ${describeIssue(lang, i)}`).join("\n");
  // Shown in the chat while the repair runs (not saved in the job output: a resumed run starts from the build).
  await writeMessage(job, `${out}\n<step title="${title}">${lang === "fr" ? `${found.length} problème(s) trouvé(s), correction en cours…` : `${found.length} problem(s) found, fixing…`}\n${lines}`, false, "running");
  const project = build.files.map((f) => `<file path="${f.path}">\n${f.content}</file>`).join("\n").slice(0, 240_000);
  const { studioStream } = await import("@/lib/studio-gateway.server");
  let text = "";
  try {
    const run = studioStream(null, `${REPAIR_PROMPT} ${langRule}`, [{ role: "user", content: `Problems found:\n${lines}\n\nProject files:\n${project}` }], REPAIR_MAX_TOKENS);
    let last = Date.now();
    for await (const delta of run.textStream) { text += delta; if (Date.now() - last > 10_000) { last = Date.now(); await keepAlive(); } }
  } catch (e) {
    console.error("studio auto-repair failed", (e as Error)?.message?.slice(0, 200));
  }
  const fixes = parseBuild(text, true).files.filter((f) => f.path && f.content.trim() && !/^\s*$/.test(f.content));
  const merged = parseBuild(`${out}\n${fixes.map((f) => `<file path="${f.path}">\n${f.content}</file>`).join("\n")}`, true).files;
  const left = [...checkBuild(merged), ...jsSyntaxIssues(merged)].filter((i) => i.problem !== "unfinished");
  const fixedCount = Math.max(0, found.length - left.length);
  const summary = lang === "fr"
    ? `${found.length} problème(s) trouvé(s) :\n${lines}\n\n${fixes.length ? `${fixedCount} corrigé(s) en réécrivant ${fixes.map((f) => f.path).join(", ")}.` : "La correction automatique n'a pas abouti."}${left.length ? `\nReste à corriger :\n${left.slice(0, 20).map((i) => `- ${describeIssue(lang, i)}`).join("\n")}` : ""}`
    : `${found.length} problem(s) found:\n${lines}\n\n${fixes.length ? `${fixedCount} fixed by rewriting ${fixes.map((f) => f.path).join(", ")}.` : "The automatic fix did not succeed."}${left.length ? `\nStill to fix:\n${left.slice(0, 20).map((i) => `- ${describeIssue(lang, i)}`).join("\n")}` : ""}`;
  return `${out}\n<step title="${title}">${summary}</step>\n${fixes.map((f) => `<file path="${f.path}">\n${f.content}</file>`).join("\n")}`;
}

/** Runs (or resumes) one build job; safe to call concurrently thanks to the lease claim. */
export async function runStudioJob(jobId: string) {
  const db = await admin();
  const now = new Date().toISOString();
  const { data: claimed } = await db.from("studio_jobs")
    .select("*").eq("id", jobId).eq("status", "running").or(`lease_until.is.null,lease_until.lt.${now}`).maybeSingle();
  if (!claimed) return;
  if (claimed.attempts >= MAX_ATTEMPTS) {
    await db.from("studio_jobs").update({ status: "failed", error: "attempts" }).eq("id", jobId);
    await releaseJobCredits(claimed as Job);
    await writeMessage(claimed as Job, claimed.output, true, "failed", "attempts");
    return;
  }
  const lease = () => new Date(Date.now() + LEASE_MS).toISOString();
  const { data: won } = await db.from("studio_jobs")
    .update({ lease_until: lease(), attempts: claimed.attempts + 1, updated_at: now })
    .eq("id", jobId).eq("attempts", claimed.attempts).select("*").maybeSingle();
  if (!won) return;
  const job = won as Job;

  const base = trimToComplete(job.output);
  const langRule = job.lang === "en" ? "Always write everything in English." : "Écris toujours tout en français.";
  let content = `Request:\n${job.request}\n\nAnswers:\n${job.answers}\n\nApproved plan:\n${JSON.stringify(job.plan)}`;
  const plan = job.plan as StudioPlanData;
  const images = await findStudioImages(Array.isArray(plan.imageSearches) ? plan.imageSearches.filter((s): s is string => typeof s === "string") : []);
  content += `\n\nResearched public-domain photographs (use only these exact URLs if appropriate; show a discreet attribution link to the Commons page for each used image):\n${JSON.stringify(images.map(({ title, url, subject, width, height }) => ({ subject, url, creditUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`, width, height })))}. Photos are illustrative, not verified pictures of the client's business. If list is empty, do not invent image URLs.`;
  if (base) content += `\n\nYou were interrupted. This output is already written:\n${base}\n\nContinue EXACTLY after it in the same tagged format. Do not repeat finished steps or files.`;

  let out = base;
  let lastWrite = 0;
  const flush = async (force = false) => {
    if (!force && Date.now() - lastWrite < 3000) return;
    lastWrite = Date.now();
    await db.from("studio_jobs").update({ output: out, lease_until: lease(), updated_at: new Date().toISOString() }).eq("id", job.id);
    await writeMessage(job, out, false, "running");
  };
  const started = Date.now();
  const { studioStream, studioErrorStatus, STUDIO_MAX_TOKENS } = await import("@/lib/studio-gateway.server");
  let result: ReturnType<typeof studioStream> | null = null;
  try {
    result = studioStream(null, `${BUILD_PROMPT} ${langRule}`, [{ role: "user", content }], STUDIO_MAX_TOKENS.build);
    for await (const delta of result.textStream) { out += delta; await flush(); }
    // Quality pass: check the finished site and fix what is missing or broken before handing it over.
    await flush(true);
    // Only the lease is extended while it runs: the chat shows the "checking" step written by autoRepair.
    out = await autoRepair(job, out, langRule, async () => { await db.from("studio_jobs").update({ lease_until: lease(), updated_at: new Date().toISOString() }).eq("id", job.id); });
    await db.from("studio_jobs").update({ output: out, status: "done", lease_until: null, updated_at: new Date().toISOString() }).eq("id", job.id);
    await writeMessage(job, out, true, "done");
    if (!job.charged) {
      const { data: mark } = await db.from("studio_jobs").update({ charged: true }).eq("id", job.id).eq("charged", false).select("id").maybeSingle();
      if (mark) {
        await db.from("usage_logs").insert({ owner_id: job.owner_id, model: "TechNova Studio", input_tokens: Math.ceil(content.length / 4), output_tokens: Math.ceil(out.length / 4), credits: BUILD_COST, latency_ms: Date.now() - started });
        if (job.reservation_id) {
          const { settleCredits } = await import("@/lib/credits.server");
          await settleCredits(job.reservation_id, BUILD_COST);
        } else {
          await db.from("credit_transactions").insert({ owner_id: job.owner_id, amount: -BUILD_COST, kind: "usage", label: "TechNova Studio · build" });
        }
      }
    }
  } catch (e) {
    const status = studioErrorStatus(e, result?.providerError());
    const terminal = status === 400 || status === 401 || status === 402 || status === 403;
    const msg = status === 402 ? "credits" : status === 403 ? "denied" : "interrupted";
    if (terminal) {
      await db.from("studio_jobs").update({ output: out, status: "failed", error: msg, lease_until: null }).eq("id", job.id);
      await releaseJobCredits(job);
      await writeMessage(job, out, false, "failed", msg);
    } else {
      // Release the lease so the background worker resumes it on its next run.
      await db.from("studio_jobs").update({ output: out, lease_until: new Date().toISOString(), error: msg }).eq("id", job.id);
      await writeMessage(job, out, false, "running");
    }
  }
}

export async function pendingStudioJobs(limit: number) {
  const db = await admin();
  const { data } = await db.from("studio_jobs").select("id").eq("status", "running")
    .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`).order("updated_at").limit(limit);
  return (data ?? []).map((r) => r.id);
}

export { BUILD_COST };
