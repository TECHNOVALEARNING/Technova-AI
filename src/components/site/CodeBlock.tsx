import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

// Code shown as a macOS window (red, yellow and green buttons, centred title) with syntax colours from
// Xcode's default dark theme: keywords pink, strings coral, numbers yellow, comments grey, function calls teal,
// object keys and shell flags violet, variables blue. A small tokenizer covers JS/TS, Python, PHP, JSON and shell.

const KEYWORDS = new Set(("const let var function return await async new import from export default if else for while in of try catch " +
  "throw class extends def print with as lambda None True False true false null undefined echo elif except pass raise yield " +
  "public private static array fn use namespace require include curl").split(" "));

const COLORS = {
  keyword: "#FC5FA3", string: "#FC6A5D", number: "#D0BF69", comment: "#7F8C98", fn: "#67B7A4", key: "#BF85FC", variable: "#5DD8FF", plain: "#E6E6E6",
} as const;
type Kind = keyof typeof COLORS;

const TOKEN = /((?<![:\w"\x27])\/\/[^\n]*|(?<=^|\s)#(?!!)[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\$\{?[A-Za-z_][\w]*\}?)|(\b\d+(?:\.\d+)?\b)|(--?[A-Za-z][\w-]*)|([A-Za-z_][\w]*)(?=\s*\()|([A-Za-z_][\w]*)/g;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, i = 0;
  for (const m of code.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(code.slice(last, start));
    const [text, comment, str, variable, num, flag, fn, word] = m;
    let kind: Kind = "plain";
    if (comment) kind = "comment";
    else if (str) kind = /^\s*(?::(?!:)|=>)/.test(code.slice(start + text.length, start + text.length + 4)) ? "key" : "string";
    else if (variable) kind = "variable";
    else if (num) kind = "number";
    else if (flag) kind = /\s$/.test(code.slice(Math.max(0, start - 1), start)) || start === 0 ? "key" : "plain";
    else if (fn) kind = KEYWORDS.has(fn) ? "keyword" : "fn";
    else if (word) kind = KEYWORDS.has(word) ? "keyword" : "plain";
    out.push(kind === "plain" ? text : <span key={i++} style={{ color: COLORS[kind] }}>{text}</span>);
    last = start + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-window overflow-hidden rounded-[14px] border border-white/10 bg-[#1f1f24] text-[#e6e6e6] shadow-lift">
      <div className="relative flex items-center border-b border-black/40 bg-[#2a2a30] px-3.5 py-2.5 text-xs text-white/55">
        <span className="flex items-center gap-2" aria-hidden="true">
          <span className="size-3 rounded-full border border-black/20 bg-[#FF5F57]" />
          <span className="size-3 rounded-full border border-black/20 bg-[#FEBC2E]" />
          <span className="size-3 rounded-full border border-black/20 bg-[#28C840]" />
        </span>
        {label && <span className="pointer-events-none absolute inset-x-24 truncate text-center font-medium">{label}</span>}
        <button type="button" aria-label="Copy" onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="ml-auto grid size-7 place-items-center rounded-md transition hover:bg-white/10">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed"><code>{highlight(code)}</code></pre>
    </div>
  );
}
