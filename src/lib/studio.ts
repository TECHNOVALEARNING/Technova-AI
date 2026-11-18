/** TechNova Studio price per stage, in credits (fixed; the build covers a full multi-file site). */
export const STUDIO_COST = { intent: 0, questions: 3, plan: 80, build: 250 } as const;

export type StudioQuestion = { id: string; question: string; choices: string[] };
export type StudioPlanData = {
  title: string;
  summary: string;
  goals: string[];
  features: string[];
  files: string[];
  imageSearches?: string[];
  database?: { needed: boolean; tables: string[]; sql: string };
  /** A modification of an existing project: only the listed files change, the rest is kept. */
  edit?: boolean;
  /** The chat message (sdk_id) of the build being modified, in the same conversation. */
  base?: string;
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
  // A tag ends at its own closing tag or, when the model forgot or mistyped it (e.g. a file closed with </step>),
  // where the next <step>, <file> or <sql> begins — those are never HTML elements, so a page cannot contain them.
  const open = /<(step|file|sql)(?:\s+(?:title|path)="([^"]*)")?>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(text))) {
    const [whole, tag = "", attr = ""] = m;
    const start = m.index + whole.length;
    const closeAt = text.indexOf(`</${tag}>`, start);
    open.lastIndex = start;
    const next = open.exec(text);
    const nextAt = next ? next.index : -1;
    let end: number, after: number, closed: boolean;
    if (closeAt >= 0 && (nextAt < 0 || closeAt < nextAt)) { end = closeAt; after = closeAt + tag.length + 3; closed = true; }
    else if (nextAt >= 0) { end = nextAt; after = nextAt; closed = true; }
    else { end = text.length; after = text.length; closed = false; }
    let inner = text.slice(start, end);
    if (closeAt !== end) inner = inner.replace(/\s*<\/(step|file|sql)>\s*$/, "\n");
    const done = closed || finished;
    if (tag === "step") {
      const file = attr.match(/(?:Écriture de|Création de|Writing|Creating|Generating)\s+(.+)$/i)?.[1]?.trim();
      steps.push({ title: attr, detail: inner.trim(), ...(file ? { file } : {}), done });
    } else if (tag === "file") {
      // A later file with the same path replaces the earlier one (the automatic repair appends fixed files).
      const file = { path: attr, content: inner.replace(/^\n/, ""), done };
      const at = files.findIndex((f) => f.path === attr);
      if (at >= 0) files[at] = file; else files.push(file);
    } else sql = inner.trim();
    if (!closed) break;
    open.lastIndex = after;
  }
  return { steps, files, sql, done: finished };
}

/** Runs first in every preview (Studio panel, shared preview, published site). The page lives in a sandboxed
 *  iframe without same-origin, so: (1) storage and cookies are replaced by in-memory versions instead of throwing
 *  (sites that save a cart or a theme keep working); (2) every navigation — links, target=_blank, forms, JavaScript
 *  location changes — is caught: "#section" links scroll inside the page (in a srcdoc frame they would otherwise
 *  resolve against TechNova's own URL), internal pages are relayed to the parent viewer, external sites open in a
 *  new tab, so the iframe never loads TechNova itself (which cannot run sandboxed). Site scripts run first: a link
 *  or form their own code already handles (preventDefault) is left alone; (3) JavaScript errors are reported to the
 *  parent so they can be shown to the user. */
const PREVIEW_BRIDGE = `<script>(function(){
var post=function(m){try{parent.postMessage(m,'*')}catch(_){}};
function mem(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
['localStorage','sessionStorage'].forEach(function(n){var ok=true;try{window[n].getItem('x')}catch(_){ok=false}if(!ok){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}});
try{document.cookie}catch(_){var jar='';try{Object.defineProperty(document,'cookie',{get:function(){return jar},set:function(v){var p=String(v).split(';')[0];jar=jar?jar+'; '+p:p},configurable:true})}catch(__){}}
var sent=0;function report(msg,line){if(sent++<20)post({type:'technova-preview-error',message:String(msg||'Error').slice(0,300),line:line||0})}
function name(el){var n=el.tagName.toLowerCase();if(el.id)return n+'#'+el.id;var c=typeof el.className==='string'?el.className.trim().split(/ +/)[0]:'';return c?n+'.'+c:n}
function layout(){var d=document.documentElement,b=document.body;if(!b)return;var w=d.clientWidth,over=d.scrollWidth-w;if(over<=4){post({type:'technova-preview-layout',width:w,overflow:0});return}
var all=b.getElementsByTagName('*'),el='';for(var i=0;i<all.length&&i<5000;i++){var r=all[i].getBoundingClientRect(),p=all[i].parentElement;if(r.width>0&&r.right>w+4){var pr=p?p.getBoundingClientRect().right:0;if(!p||pr<=w+4||p===b){el=name(all[i]);break}}}
post({type:'technova-preview-layout',width:w,overflow:over,element:el})}
var lt;function later(){clearTimeout(lt);lt=setTimeout(layout,500)}
window.addEventListener('load',later);window.addEventListener('resize',later);
window.addEventListener('error',function(e){report(e.message,e.lineno)});
window.addEventListener('unhandledrejection',function(e){var r=e.reason;report(r&&r.message?r.message:r)});
var EXT=/^(https?:)?[/][/]/i,SPECIAL=/^(mailto:|tel:|sms:|javascript:|data:|blob:)/i;
var baseDir=function(){try{var u=new URL(document.baseURI);return u.origin+u.pathname.replace(/[^/]*$/,'')}catch(_){return''}};
function inner(href){post({type:'technova-preview-navigate',path:href})}
function jump(hash){var id=decodeURIComponent(hash.replace(/^#/,''));var el=id&&(document.getElementById(id)||document.getElementsByName(id)[0]);if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});else if(!id||id==='top')window.scrollTo({top:0,behavior:'smooth'})}
window.addEventListener('click',function(e){
  if(e.defaultPrevented||e.button!==0)return;var t=e.target;var a=t&&t.closest?t.closest('a[href]'):null;if(!a||a.hasAttribute('download'))return;
  var href=a.getAttribute('href')||'';if(SPECIAL.test(href))return;
  e.preventDefault();
  if(!href||href.charAt(0)==='#'){jump(href);return}
  if(EXT.test(href)){window.open(a.href,'_blank','noopener');return}
  inner(href);
});
window.addEventListener('submit',function(e){
  if(e.defaultPrevented)return;var f=e.target;var act=(f&&f.getAttribute&&f.getAttribute('action'))||'';
  if(EXT.test(act)){f.setAttribute('target','_blank');return}
  e.preventDefault();post({type:'technova-preview-form'});
});
var nav=window.navigation;
if(nav&&nav.addEventListener)nav.addEventListener('navigate',function(e){
  if(e.hashChange||e.downloadRequest||!e.cancelable)return;var url=e.destination&&e.destination.url||'';
  if(/^(about|javascript|data|blob):/i.test(url))return;
  e.preventDefault();
  if(e.formData){post({type:'technova-preview-form'});return}
  var cut=url.indexOf('#');if(cut>=0&&url.slice(0,cut)===String(document.baseURI).split('#')[0]){jump(url.slice(cut));return}
  var dir=baseDir();
  if(dir&&url.indexOf(dir)===0){inner(url.slice(dir.length)||'index.html');return}
  try{var u=new URL(url),b=new URL(document.baseURI);if(u.origin===b.origin){inner(u.pathname);return}}catch(_){}
  window.open(url,'_blank','noopener');
});
})();</script>`;

/** Bundle local assets into a sandboxed page; navigation is relayed to the parent viewer. */
export function previewDoc(files: StudioFile[], page = "index.html") {
  const byName = new Map(files.map((f) => [f.path.replace(/^\.?\//, ""), f.content]));
  const content = byName.get(page);
  if (content === undefined) return null;
  const directory = page.includes("/") ? page.slice(0, page.lastIndexOf("/") + 1) : "";
  const asset = (src: string) => {
    const path = src.split(/[?#]/)[0]!.startsWith("/") ? src.split(/[?#]/)[0]!.slice(1) : directory + src.split(/[?#]/)[0]!;
    const parts: string[] = [];
    for (const part of path.split("/")) {
      if (part === "..") parts.pop();
      else if (part && part !== ".") parts.push(part);
    }
    return byName.get(parts.join("/"));
  };
  const html = content
    .replace(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi, (all, href: string) => {
      const css = asset(href);
      return css === undefined ? all : `<style>${css}</style>`;
    })
    .replace(/<script\b([^>]*)src=["']([^"']+\.m?js(?:\?[^"']*)?)["']([^>]*)><\/script>/gi, (all, before: string, src: string, after: string) => {
      const js = asset(src);
      return js === undefined ? all : `<script${before.replace(/\btype=["']module["']/i, "")}${after}>${js.replace(/<\/script/gi, "<\/script")}</script>`;
    });
  // The bridge must run before the site's own scripts: right after <head>, else at the very start.
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (m) => m + PREVIEW_BRIDGE);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (m) => m + PREVIEW_BRIDGE);
  return PREVIEW_BRIDGE + html;
}

/** A preview that escaped its bridge reports the full address it reached; turn it back into a path relative to
 *  the viewer page (the srcdoc frame resolves relative links against the viewer's own URL). */
export function escapedPreviewPath(href: string, viewer = typeof location === "undefined" ? "" : location.href) {
  try {
    const u = new URL(href), v = new URL(viewer);
    const dir = v.pathname.replace(/[^/]*$/, "");
    const path = u.origin === v.origin && u.pathname.startsWith(dir) ? u.pathname.slice(dir.length) : u.pathname;
    return (path || "index.html") + u.hash;
  } catch { return "index.html"; }
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

export type BuildIssue = { file: string; problem: "no_index" | "unfinished" | "truncated" | "missing_asset" | "missing_page" | "missing_anchor" | "syntax_error" | "no_viewport" | "not_responsive" | "fixed_width"; target?: string };

/** Static check of a finished build, run in the browser (free): entry page present, every file complete, every
 *  local stylesheet, script, image and internal page that the HTML points to really generated, every "#section"
 *  link pointing at an existing id. Shown in the Studio panel so the user sees what was really verified. */
export function checkBuild(files: StudioFile[]): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const norm = (p: string) => p.replace(/^\.?\//, "");
  const names = new Set(files.map((f) => norm(f.path)));
  if (!names.has("index.html")) issues.push({ file: "index.html", problem: "no_index" });
  const resolve = (from: string, ref: string) => {
    const dir = from.includes("/") ? from.slice(0, from.lastIndexOf("/") + 1) : "";
    const path = ref.split(/[?#]/)[0] ?? "";
    const parts: string[] = [];
    for (const part of (path.startsWith("/") ? path.slice(1) : dir + path).split("/")) {
      if (part === "..") parts.pop(); else if (part && part !== ".") parts.push(part);
    }
    return parts.join("/");
  };
  const external = (ref: string) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref) || ref.startsWith("{") || ref.includes("${");
  for (const f of files) {
    const path = norm(f.path);
    if (!f.done) { issues.push({ file: path, problem: "unfinished" }); continue; }
    if (!/\.html?$/i.test(path)) continue;
    const html = f.content;
    if (!/<\/html\s*>/i.test(html) && !/<\/body\s*>/i.test(html)) issues.push({ file: path, problem: "truncated" });
    const ids = new Set([...html.matchAll(/\b(?:id|name)=["']([^"']+)["']/gi)].map((m) => m[1]!));
    const seen = new Set<string>();
    const add = (issue: BuildIssue) => { const k = `${issue.problem}|${issue.target}`; if (!seen.has(k)) { seen.add(k); issues.push(issue); } };
    for (const m of html.matchAll(/<(link|script|img|source)\b[^>]*?\b(?:href|src)=["']([^"']+)["']/gi)) {
      const ref = m[2]!.trim();
      if (!ref || external(ref) || (m[1]!.toLowerCase() === "link" && !/\.css(\?|$)/i.test(ref))) continue;
      if (!names.has(resolve(path, ref))) add({ file: path, problem: "missing_asset", target: ref });
    }
    for (const m of html.matchAll(/<a\b[^>]*?\bhref=["']([^"']*)["']/gi)) {
      const ref = m[1]!.trim();
      if (!ref || external(ref)) continue;
      if (ref.startsWith("#")) {
        const id = decodeURIComponent(ref.slice(1));
        if (id && id !== "top" && !ids.has(id)) add({ file: path, problem: "missing_anchor", target: ref });
        continue;
      }
      const target = resolve(path, ref);
      if (![target, `${target}/index.html`, `${target}.html`, target || "index.html"].some((p) => names.has(p))) add({ file: path, problem: "missing_page", target: ref });
    }
    if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) add({ file: path, problem: "no_viewport" });
  }
  // Responsive design: some adaptive CSS must exist, and nothing may force a desktop width on a phone.
  const css = files.filter((f) => /\.css$/i.test(f.path)).map((f) => ({ file: norm(f.path), text: f.content }));
  for (const f of files) if (/\.html?$/i.test(f.path)) {
    for (const m of f.content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) css.push({ file: norm(f.path), text: m[1] ?? "" });
    for (const m of f.content.matchAll(/\bstyle=["']([^"']*)["']/gi)) css.push({ file: norm(f.path), text: `x{${m[1] ?? ""}}` });
  }
  const allCss = css.map((c) => c.text).join("\n");
  if (files.some((f) => /\.html?$/i.test(f.path)) && !/@media\b|clamp\(|auto-fit|auto-fill|flex-wrap\s*:\s*wrap|\bmin\(/i.test(allCss)) {
    issues.push({ file: css[0]?.file ?? "index.html", problem: "not_responsive" });
  }
  let fixed = 0;
  for (const c of css) {
    for (const m of outsideMedia(c.text).matchAll(/([^{};]*)\{([^{}]*)\}/g)) {
      const width = /(?:^|;)\s*(min-width|width)\s*:\s*(\d{3,})px/i.exec(m[2] ?? "");
      if (width && Number(width[2]) >= 480 && fixed < 5 && !/max-width\s*:\s*100(%|vw)/i.test(m[2] ?? "")) { fixed++; issues.push({ file: c.file, problem: "fixed_width", target: `${(m[1] ?? "").trim().slice(0, 60) || "style"} { ${width[1]}: ${width[2]}px }` }); }
    }
  }
  return issues;
}

/** The CSS without its @media blocks (rules inside them are allowed to be wide). */
function outsideMedia(css: string) {
  let out = "", i = 0;
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  while (i < text.length) {
    const at = text.indexOf("@media", i);
    if (at < 0) { out += text.slice(i); break; }
    out += text.slice(i, at);
    const open = text.indexOf("{", at);
    if (open < 0) break;
    let depth = 0, j = open;
    for (; j < text.length; j++) { if (text[j] === "{") depth++; else if (text[j] === "}" && --depth === 0) break; }
    i = j + 1;
  }
  return out;
}

/** JavaScript that cannot even be parsed (classic scripts only: .js files and inline <script> blocks without
 *  modules). Compiles with new Function, never runs the code. */
export function jsSyntaxIssues(files: StudioFile[]): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const check = (file: string, code: string) => {
    if (!code.trim() || /^\s*(import|export)\s/m.test(code)) return;
    try { new Function(code); } catch (e) { if (e instanceof SyntaxError) issues.push({ file, problem: "syntax_error", target: e.message.slice(0, 160) }); }
  };
  for (const f of files) {
    const path = f.path.replace(/^\.?\//, "");
    if (/\.c?js$/i.test(path)) check(path, f.content);
    else if (/\.html?$/i.test(path)) {
      for (const m of f.content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const attrs = m[1] ?? "";
        if (/\bsrc=/i.test(attrs) || /type=["'](?!text\/javascript|application\/javascript)[^"']+["']/i.test(attrs)) continue;
        check(path, m[2] ?? "");
      }
    }
  }
  return issues;
}

/** One readable line per issue, for the Studio panel and the automatic repair prompt. */
export function describeIssue(lang: "fr" | "en", i: BuildIssue): string {
  const fr = lang === "fr";
  const t = i.target ? ` « ${i.target} »` : "";
  switch (i.problem) {
    case "no_index": return fr ? "Il manque la page d'accueil index.html." : "The index.html home page is missing.";
    case "unfinished": return fr ? `${i.file} n'a pas été écrit jusqu'au bout.` : `${i.file} was not written to the end.`;
    case "truncated": return fr ? `${i.file} semble coupé (fin de page absente).` : `${i.file} looks cut off (no page end).`;
    case "missing_asset": return fr ? `${i.file} charge${t}, qui n'a pas été généré.` : `${i.file} loads${t}, which was not generated.`;
    case "missing_page": return fr ? `${i.file} a un lien vers${t}, une page qui n'existe pas.` : `${i.file} links to${t}, a page that does not exist.`;
    case "missing_anchor": return fr ? `${i.file} a un lien vers la section${t}, introuvable dans la page.` : `${i.file} links to the section${t}, not found on the page.`;
    case "syntax_error": return fr ? `${i.file} contient du JavaScript invalide :${t}.` : `${i.file} contains invalid JavaScript:${t}.`;
    case "no_viewport": return fr ? `${i.file} n'a pas la balise viewport : sur téléphone, la page s'affiche en tout petit.` : `${i.file} has no viewport tag: on a phone the page shows tiny.`;
    case "not_responsive": return fr ? "Le site n'a aucune règle d'adaptation aux écrans (aucun @media) : il ne s'adapte ni à la tablette ni au téléphone." : "The site has no screen-adaptation rule (no @media): it does not adapt to tablets or phones.";
    case "fixed_width": return fr ? `${i.file} impose une largeur fixe${t}, trop large pour un téléphone.` : `${i.file} forces a fixed width${t}, too wide for a phone.`;
  }
}
