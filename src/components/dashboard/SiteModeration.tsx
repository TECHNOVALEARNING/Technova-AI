import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminListSiteReports, adminSetSiteSuspension } from "@/lib/admin.functions";

type Row = Awaited<ReturnType<typeof adminListSiteReports>>[number];
const REASON: Record<string, [string, string]> = {
  phishing: ["Hameçonnage", "Phishing"], scam: ["Arnaque", "Scam"], malware: ["Malveillant", "Malware"], illegal: ["Illégal", "Illegal"], other: ["Autre", "Other"],
};

/** Admin: reported or suspended published sites, with suspend / reinstate. */
export function SiteModeration({ fr }: { fr: boolean }) {
  const loc = fr ? "fr-FR" : "en-US";
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => { adminListSiteReports().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  async function act(slug: string, suspend: boolean) {
    setBusy(slug);
    try { await adminSetSiteSuspension({ data: { slug, suspend, reason: suspend ? "admin" : "" } }); toast.success(suspend ? (fr ? "Site suspendu." : "Site suspended.") : (fr ? "Site rétabli." : "Site reinstated.")); load(); }
    catch (e) { toast.error(String((e as Error)?.message ?? e)); }
    setBusy(null);
  }
  return <section className="mt-6">
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Flag className="size-4" />{fr ? "Sites signalés" : "Reported sites"}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{fr ? "3 signalements de visiteurs différents en 7 jours suspendent un site automatiquement. Vérifiez puis rétablissez-le ou laissez-le suspendu." : "3 reports from different visitors within 7 days suspend a site automatically. Review, then reinstate or keep it suspended."}</p>
    <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-card/90">
      <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>
        <th className="p-3">Site</th><th className="p-3">{fr ? "Signalements" : "Reports"}</th><th className="p-3">{fr ? "Motifs" : "Reasons"}</th><th className="p-3">{fr ? "État" : "Status"}</th><th className="p-3" />
      </tr></thead>
      <tbody>{rows === null ? <tr><td colSpan={5} className="p-3 text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</td></tr>
        : rows.length === 0 ? <tr><td colSpan={5} className="p-3 text-muted-foreground">{fr ? "Aucun site signalé." : "No reported sites."}</td></tr>
        : rows.map((r) => <tr key={r.id} className="border-t border-border align-top">
          <td className="p-3"><a href={`/s/${r.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">/s/{r.slug}<ExternalLink className="size-3" /></a><p className="text-xs text-muted-foreground">{r.title}</p>{r.lastDetails && <p className="mt-1 max-w-xs text-xs italic text-muted-foreground">« {r.lastDetails} »</p>}</td>
          <td className="p-3 tabular-nums">{r.reports}{r.lastReport && <p className="text-xs text-muted-foreground">{new Date(r.lastReport).toLocaleDateString(loc)}</p>}</td>
          <td className="p-3 text-xs">{r.reasons.map((x) => (REASON[x] ?? [x, x])[fr ? 0 : 1]).join(", ") || "—"}</td>
          <td className="p-3 text-xs">{r.disabled_at ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">{fr ? "Suspendu" : "Suspended"}</span> : <span className="rounded-full bg-secondary px-2 py-0.5">{fr ? "En ligne" : "Online"}</span>}{r.disabled_reason && <p className="mt-1 text-muted-foreground">{r.disabled_reason}</p>}</td>
          <td className="p-3 text-right">{busy === r.slug ? <Loader2 className="ml-auto size-4 animate-spin" /> : r.disabled_at
            ? <Button size="sm" variant="outline" onClick={() => void act(r.slug, false)}>{fr ? "Rétablir" : "Reinstate"}</Button>
            : <Button size="sm" variant="destructive" onClick={() => void act(r.slug, true)}>{fr ? "Suspendre" : "Suspend"}</Button>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
