import { useId, type SVGProps } from "react";

/** TechNova's mark (the "T" and the iris dot of the favicon) drawn as an icon: it takes the text colour like
 *  the lucide icons it replaces, so it reads on light and dark surfaces. Used instead of generic AI stars. */
export function TechNovaMark({ size = 24, className, ...rest }: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }) {
  const id = useId();
  const { strokeWidth: _ignored, ...svg } = rest;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className} {...svg}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7b6d2" />
          <stop offset="0.5" stopColor="#a9d3f5" />
          <stop offset="1" stopColor="#f3e08a" />
        </linearGradient>
      </defs>
      <path d="M10 12h40v10H35v32H25V22H10z" fill="currentColor" />
      <circle cx="50" cy="46" r="7" fill={`url(#${id})`} />
    </svg>
  );
}
