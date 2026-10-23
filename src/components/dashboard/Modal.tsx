import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dashboard dialog rendered at the root of the dashboard (portal), so no blurred or layered
 * page section can crop it or sit above it. The backdrop covers the whole screen and the
 * dialog scrolls as a whole when its content is taller than the window.
 */
export function Modal({ onClose, children, label, closeOnBackdrop = true, showClose = true, className }: {
  onClose: () => void; children: ReactNode; label: string; closeOnBackdrop?: boolean; showClose?: boolean; className?: string;
}) {
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => { setHost(document.querySelector(".dashboard-shell") ?? document.body); }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  if (!host) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-ink/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={label}
      onClick={closeOnBackdrop ? onClose : undefined}>
      <div className="flex min-h-full items-start justify-center p-3 sm:items-center sm:p-8">
        <div className={cn("relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:p-6", className)} onClick={(e) => e.stopPropagation()}>
          {showClose && <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full hover:bg-secondary"><X className="size-4" /></button>}
          {children}
        </div>
      </div>
    </div>,
    host,
  );
}
