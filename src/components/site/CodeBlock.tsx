import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-[22px] border border-ink-foreground/10 bg-ink text-ink-foreground shadow-lift">
      <div className="flex items-center justify-between border-b border-ink-foreground/10 px-4 py-2.5 text-xs text-ink-foreground/60">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ink-foreground/20" /><span className="size-2.5 rounded-full bg-ink-foreground/20" /><span className="size-2.5 rounded-full bg-ink-foreground/20" /><span className="ml-2">{label}</span></span>
        <button type="button" aria-label="Copy" onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="grid size-7 place-items-center rounded-full transition hover:bg-ink-foreground/10">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12.5px] leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}
