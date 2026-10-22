export type StudioQuestion = { id: string; question: string; choices: string[] };
export type StudioPlanData = {
  title: string;
  summary: string;
  goals: string[];
  features: string[];
  files: string[];
  imageSearches?: string[];
  database?: { needed: boolean; tables: string[]; sql: string };
};
export type StudioStep = { title: string; detail: string; file?: string; done: boolean };
export type StudioFile = { path: string; content: string; done: boolean };
export type StudioBuild = { steps: StudioStep[]; files: StudioFile[]; sql: string; done: boolean };

export type StudioData =
  | { kind: "questions"; request: string; intro: string; questions: StudioQuestion[]; answered?: string }
  | { kind: "plan"; request: string; answers: string; plan: StudioPlanData; status: "pending" | "approved" | "changed" }
  | { kind: "build"; request: string; build: StudioBuild; answers?: string; plan?: StudioPlanData; jobId?: string; jobStatus?: "running" | "done" | "failed"; jobError?: string };

/** Parses the tagged build stream, tolerating an unfinished last tag. */
export function parseBuild(text: string, finished: boolean): StudioBuild {
  const steps: StudioStep[] = [];
  const files: StudioFile[] = [];
  let sql = "";
  const re = /<(step|file|sql)(?:\s+(?:title|path)="([^"]*)")?>([\s\S]*?)(<\/\1>|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [, tag, attr = "", inner = "", close] = m;
    const done = Boolean(close) || finished;
    if (tag === "step") {
      const file = attr.match(/(?:Écriture de|Création de|Writing|Creating|Generating)\s+(.+)$/i)?.[1]?.trim();
      steps.push({ title: attr, detail: inner.trim(), ...(file ? { file } : {}), done });
    } else if (tag === "file") files.push({ path: attr, content: inner.replace(/^\n/, ""), done });
    else sql = inner.trim();
    if (!close) break;
  }
  return { steps, files, sql, done: finished };
}

/** Bundle local assets into a sandboxed page; navigation is relayed to the parent viewer. */
export function previewDoc(files: StudioFile[], page = "index.html") {
  const byName = new Map(files.map((f) => [f.path.replace(/^\.?\//, ""), f.content]));
  const content = byName.get(page);
  if (content === undefined) return null;
  const directory = page.includes("/") ? page.slice(0, page.lastIndexOf("/") + 1) : "";
  const asset = (src: string) => {
    const path = src.startsWith("/") ? src.slice(1) : directory + src;
    const parts: string[] = [];
    for (const part of path.split("/")) {
      if (part === "..") parts.pop();
      else if (part && part !== ".") parts.push(part);
    }
    return byName.get(parts.join("/"));
  };
  const html = content
    .replace(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (all, href: string) => {
      const css = asset(href);
      return css === undefined ? all : `<style>${css}</style>`;
    })
    .replace(/<script\b([^>]*)src=["']([^"']+\.js)["']([^>]*)><\/script>/gi, (all, before: string, src: string, after: string) => {
      const js = asset(src);
      return js === undefined ? all : `<script${before.replace(/\btype=["']module["']/i, "")}${after}>${js.replace(/<\/script/gi, "<\\/script")}</script>`;
    });
  const bridge = `<script>(function(){document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;var href=a.getAttribute('href');if(!href||href[0]==='#'||/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href))return;e.preventDefault();parent.postMessage({type:'technova-preview-navigate',path:href},'*')})})();</script>`;
  return /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${bridge}</body>`) : html + bridge;
}

export function resolvePreviewPage(files: StudioFile[], current: string, href: string) {
  const base = current.includes("/") ? current.slice(0, current.lastIndexOf("/") + 1) : "";
  const path = href.split(/[?#]/)[0];
  if (!path) return current;
  const parts: string[] = [];
  for (const part of (path.startsWith("/") ? path.slice(1) : base + path).split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  const target = parts.join("/");
  const available = new Set(files.map((f) => f.path.replace(/^\.?\//, "")));
  return [target, `${target}/index.html`, `${target}.html`, target || "index.html"].find((p) => available.has(p)) ?? null;
}
