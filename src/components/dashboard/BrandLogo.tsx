import "@/lib/fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faNotion, faStripeS } from "@fortawesome/free-brands-svg-icons";

// Logos of the connectable services, in their own colours (Font Awesome brands where it has them, the Google
// Drive and Vercel marks drawn here). Used on the Connections page, one tile per service.
export function BrandLogo({ id }: { id: string }) {
  const tile = "grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-white shadow-sm dark:bg-white/95";
  if (id === "github") return <span className={tile}><FontAwesomeIcon icon={faGithub} className="size-5 text-[#181717]" /></span>;
  if (id === "notion") return <span className={tile}><FontAwesomeIcon icon={faNotion} className="size-5 text-black" /></span>;
  if (id === "stripe") return <span className={`${tile} !bg-[#635BFF] border-transparent`}><FontAwesomeIcon icon={faStripeS} className="size-5 text-white" /></span>;
  if (id === "vercel") return <span className={`${tile} !bg-black border-transparent`}><svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path d="M12 2 23 21H1z" fill="#fff" /></svg></span>;
  if (id === "netlify") return <span className={tile}><svg viewBox="0 0 40 40" className="size-6" aria-hidden="true"><path d="M20 3 37 20 20 37 3 20Z" fill="#05bdba" /><path d="M13 20h14M20 13v14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><circle cx="20" cy="20" r="3" fill="#014847" /></svg></span>;
  if (id === "google_drive") return <span className={tile}><svg viewBox="0 0 87.3 78" className="size-5" aria-hidden="true">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg></span>;
  return <span className={`${tile} font-display text-sm font-bold text-neutral-800`}>{id.slice(0, 2).toUpperCase()}</span>;
}
