import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileSpreadsheet, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchDriveSheet, listDriveSheets } from "@/lib/sheet-drive.functions";
import type { Workbook } from "@/lib/sheet/model";

// Picker of the user's Google Drive spreadsheets for TechNova Tableur (needs the Google Drive connection).

type Lang = "fr" | "en";
const tx = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);
type DriveFile = { id: string; name: string; kind: string; modified: string | null };

export function DriveImport({ lang, open, onOpenChange, onBook }: { lang: Lang; open: boolean; onOpenChange: (o: boolean) => void; onBook: (wb: Workbook) => void }) {
  const [q, setQ] = useState("");
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = window.setTimeout(() => {
      listDriveSheets({ data: { q } }).then((r) => { if (!alive) return; setConnected(r.connected); setFiles(r.files); })
        .catch(() => { if (alive) { setFiles([]); toast.error(tx(lang, "Google Drive ne répond pas pour le moment.", "Google Drive is not responding right now.")); } });
    }, q ? 350 : 0);
    return () => { alive = false; window.clearTimeout(t); };
  }, [open, q, lang]);
  const pick = async (f: DriveFile) => {
    setLoading(f.id);
    try {
      const r = await fetchDriveSheet({ data: { id: f.id } });
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const { importFile, importXlsx } = await import("@/lib/sheet/sheet-io");
      onBook(r.kind === "csv" ? await importFile(new File([bin], `${r.name}.csv`, { type: "text/csv" })) : await importXlsx(bin.buffer, r.name));
      onOpenChange(false);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m.includes("TOO_BIG") ? tx(lang, "Fichier trop lourd (10 Mo au plus).", "File too large (10 MB max).") : tx(lang, "Ce fichier n'a pas pu être ouvert.", "This file could not be opened."));
    } finally { setLoading(null); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[520px] rounded-2xl">
      <DialogTitle>{tx(lang, "Ouvrir depuis Google Drive", "Open from Google Drive")}</DialogTitle>
      <DialogDescription>{tx(lang, "Vos feuilles Google Sheets, fichiers .xlsx et .csv. Le fichier est ouvert ici, rien n'est modifié dans votre Drive.", "Your Google Sheets, .xlsx and .csv files. The file opens here; nothing changes in your Drive.")}</DialogDescription>
      {!connected ? <div className="rounded-xl border border-border p-4 text-[13px]">
        <p>{tx(lang, "Connectez d'abord votre Google Drive (lecture seule) dans Connexions.", "First connect your Google Drive (read-only) in Connections.")}</p>
        <Link to="/dashboard/connexions" className="mt-3 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[12.5px] font-semibold text-background">{tx(lang, "Ouvrir Connexions", "Open Connections")}</Link>
      </div> : <>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(lang, "Rechercher un fichier", "Search a file")} className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-[13px] outline-none focus:border-foreground/40" /></div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {files === null ? <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            : !files.length ? <p className="py-8 text-center text-[13px] text-muted-foreground">{tx(lang, "Aucun tableur trouvé.", "No spreadsheet found.")}</p>
            : files.map((f) => <button key={f.id} type="button" disabled={!!loading} onClick={() => void pick(f)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-secondary disabled:opacity-60">
              <FileSpreadsheet className="size-5 shrink-0 text-[#1f7a5a]" />
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{f.name}</span><span className="block text-[11px] text-muted-foreground">{f.kind === "sheets" ? "Google Sheets" : f.kind.toUpperCase()}{f.modified ? ` · ${new Date(f.modified).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}` : ""}</span></span>
              {loading === f.id && <Loader2 className="size-4 animate-spin" />}
            </button>)}
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
