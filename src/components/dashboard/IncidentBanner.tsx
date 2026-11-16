import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getIncidentAlert } from "@/lib/incidents.functions";
import { hoursLeft } from "@/lib/incident-texts";

/** Admins only: red banner on every dashboard page while a security incident waits for a decision (72-hour window). */
export function IncidentBanner({ fr }: { fr: boolean }) {
  const [alert, setAlert] = useState<{ open: number; oldest: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => getIncidentAlert().then((r) => { if (live) setAlert(r); }).catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  if (!alert?.open || !alert.oldest) return null;
  const h = hoursLeft(alert.oldest);
  const left = h < 0
    ? (fr ? `le délai de 72 h est dépassé de ${Math.ceil(-h)} h` : `the 72-hour window passed ${Math.ceil(-h)} h ago`)
    : (fr ? `il reste ${Math.floor(h)} h pour prévenir l'autorité si c'est une violation de données` : `${Math.floor(h)} h left to inform the authority if it is a data breach`);
  return (
    <a href="/dashboard/admin#incidents" onClick={() => { if (location.pathname === "/dashboard/admin") setTimeout(() => location.reload(), 0); }}
      role="alert" className="mb-5 flex items-center gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-[13px] transition hover:bg-destructive/15">
      <ShieldAlert className="size-4 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1"><b>{fr ? `${alert.open} incident(s) de sécurité à qualifier` : `${alert.open} security incident(s) to review`}</b> — {left}.</span>
      <span className="shrink-0 font-medium text-destructive">{fr ? "Ouvrir" : "Open"}</span>
    </a>
  );
}
