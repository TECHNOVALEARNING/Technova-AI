import type { ReactNode } from "react";

// Syntax colours for the Studio code view (Code, SQL and Activity tabs), in the same Xcode dark palette as the
// documentation's CodeBlock: tags and keywords pink, attributes and CSS properties violet, strings coral, numbers
// and colours yellow, comments grey, selectors and function calls teal. Small built-in tokenizers for HTML (with
// its <style> and <script> blocks), CSS, JavaScript/TypeScript, JSON and SQL — no highlighting library.

export const CODE_COLORS = {
  keyword: "#FC5FA3", tag: "#FC5FA3", attr: "#BF85FC", string: "#FC6A5D", number: "#D0BF69", comment: "#7F8C98",
  fn: "#67B7A4", selector: "#67B7A4", prop: "#BF85FC", punct: "#A6A6B0", plain: "#E6E6E6",
} as const;
type Kind = keyof typeof CODE_COLORS;
type Out = { push: (text: string, kind?: Kind) => void; nodes: ReactNode[] };

function out(): Out {
  const nodes: ReactNode[] = [];
  let i = 0;
  return { nodes, push: (text, kind = "plain") => { if (!text) return; nodes.push(kind === "plain" ? text : <span key={i++} style={{ color: CODE_COLORS[kind] }}>{text}</span>); } };
}

const JS_KEYWORDS = new Set(("const let var function return await async new import from export default if else for while do in of try catch finally " +
  "throw class extends super this typeof instanceof switch case break continue null undefined true false void delete yield static get set " +
  "interface type enum implements public private protected readonly as").split(" "));
const JS_TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|([{}()[\];,.=<>+\-*/!&|?:])/g;

function js(code: string, o: Out) {
  let last = 0;
  for (const m of code.matchAll(JS_TOKEN)) {
    const start = m.index ?? 0;
    o.push(code.slice(last, start));
    const [text, comment, str, num, fn, word, punct] = m;
    o.push(text, comment ? "comment" : str ? (/^\s*:/.test(code.slice(start + text.length, start + text.length + 3)) ? "attr" : "string")
      : num ? "number" : fn ? (JS_KEYWORDS.has(fn) ? "keyword" : "fn") : word ? (JS_KEYWORDS.has(word) ? "keyword" : "plain") : punct ? "punct" : "plain");
    last = start + text.length;
  }
  o.push(code.slice(last));
}

const CSS_VALUE = /(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[0-9a-fA-F]{3,8}\b)|(-?(?:\d*\.)?\d+(?:[a-z%]+)?)|([\w-]+)(?=\()|(!important)/g;
function cssValue(text: string, o: Out) {
  let last = 0;
  for (const m of text.matchAll(CSS_VALUE)) {
    const start = m.index ?? 0;
    o.push(text.slice(last, start));
    const [t, comment, str, hex, num, fn, imp] = m;
    o.push(t, comment ? "comment" : str ? "string" : hex || num ? "number" : fn ? "fn" : imp ? "keyword" : "plain");
    last = start + t.length;
  }
  o.push(text.slice(last));
}
function css(code: string, o: Out) {
  // Split into comments, braces/semicolons and the text between them; text before "{" is a selector or at-rule,
  // text before ";" or "}" is a declaration (property: value).
  const parts = code.split(/(\/\*[\s\S]*?\*\/|[{};])/);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (!p) continue;
    if (p.startsWith("/*")) { o.push(p, "comment"); continue; }
    if (p === "{" || p === "}" || p === ";") { o.push(p, "punct"); continue; }
    let next = "";
    for (let j = i + 1; j < parts.length; j++) { const q = parts[j]!; if (q === "{" || q === "}" || q === ";") { next = q; break; } if (q && !q.startsWith("/*") && q.trim()) break; }
    if (next === "{" || (!next && !p.includes(":"))) {
      const lead = p.match(/^\s*/)![0];
      const body = p.slice(lead.length);
      o.push(lead);
      if (body.startsWith("@")) { const at = body.match(/^@[\w-]+/)![0]; o.push(at, "keyword"); cssValue(body.slice(at.length), o); }
      else o.push(body, "selector");
      continue;
    }
    const colon = p.indexOf(":");
    if (colon < 0) { o.push(p); continue; }
    const name = p.slice(0, colon);
    const lead = name.match(/^\s*/)![0];
    o.push(lead); o.push(name.slice(lead.length), "prop"); o.push(":", "punct");
    cssValue(p.slice(colon + 1), o);
  }
}

const ATTR = /([^\s=]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s"'>]+)?/g;
function attrs(text: string, o: Out) {
  let last = 0;
  for (const m of text.matchAll(ATTR)) {
    const start = m.index ?? 0;
    o.push(text.slice(last, start));
    const [, name, eq, value] = m;
    o.push(name!, "attr");
    if (eq) o.push(eq, "punct");
    if (value) o.push(value, "string");
    last = start + m[0].length;
  }
  o.push(text.slice(last));
}
const HTML_TOKEN = /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>)|(<\/?)([A-Za-z][\w:-]*)([^>]*?)(\/?>)/gi;
function html(code: string, o: Out) {
  let last = 0;
  HTML_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HTML_TOKEN.exec(code))) {
    o.push(code.slice(last, m.index));
    const [text, comment, doctype, open, name, rest, close] = m;
    last = m.index + text.length;
    if (comment) { o.push(comment, "comment"); continue; }
    if (doctype) { o.push(doctype, "comment"); continue; }
    o.push(open!, "punct"); o.push(name!, "tag"); attrs(rest!, o); o.push(close!, "punct");
    const tag = name!.toLowerCase();
    if (open === "<" && (tag === "style" || tag === "script") && close === ">") {
      const end = code.toLowerCase().indexOf(`</${tag}`, last);
      const inner = code.slice(last, end < 0 ? code.length : end);
      if (tag === "style") css(inner, o); else js(inner, o);
      last += inner.length;
      HTML_TOKEN.lastIndex = last;
    }
  }
  o.push(code.slice(last));
}

const SQL_KEYWORDS = new Set(("select from where and or not insert into values update set delete create table alter add drop index on primary key " +
  "foreign references unique default null is in as join left right inner outer group by order having limit offset returning grant revoke to " +
  "enable row level security policy for using with check function returns language begin end if exists then else case when trigger execute " +
  "procedure declare return boolean text integer int bigint uuid timestamptz timestamp numeric serial jsonb json varchar date true false cascade view replace").split(" "));
const SQL_TOKEN = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)(?=\s*\()|([A-Za-z_][\w]*)/g;
function sql(code: string, o: Out) {
  let last = 0;
  for (const m of code.matchAll(SQL_TOKEN)) {
    const start = m.index ?? 0;
    o.push(code.slice(last, start));
    const [text, comment, str, num, fn, word] = m;
    o.push(text, comment ? "comment" : str ? "string" : num ? "number" : fn ? (SQL_KEYWORDS.has(fn.toLowerCase()) ? "keyword" : "fn") : word && SQL_KEYWORDS.has(word.toLowerCase()) ? "keyword" : "plain");
    last = start + text.length;
  }
  o.push(code.slice(last));
}

/** Coloured nodes for a file, the language picked from its name (or "sql"). Very large files stay plain. */
export function highlightCode(code: string, path: string): ReactNode[] {
  if (code.length > 400_000) return [code];
  const o = out();
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "html" || ext === "htm" || ext === "svg" || ext === "xml" || ext === "vue") html(code, o);
  else if (ext === "css" || ext === "scss") css(code, o);
  else if (ext === "sql" || path === "sql") sql(code, o);
  else if (["js", "mjs", "cjs", "ts", "tsx", "jsx", "json"].includes(ext)) js(code, o);
  else return [code];
  return o.nodes;
}
