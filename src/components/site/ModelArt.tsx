import { memo, useId } from "react";

// A cover drawn for each model, so no two cards look alike without shipping hundreds of pictures:
// the provider gives the colour family, the model name seeds the composition, and the model's
// strength picks the motif (reasoning → a node network, code → lines of code, vision → a lens,
// speed → light streaks, long context → long waves, otherwise glass orbs).

export type ArtMotif = "reasoning" | "coding" | "vision" | "fast" | "long" | "orbs" | "prism" | "horizon" | "dust";
export const GENERIC_MOTIFS: ArtMotif[] = ["orbs", "prism", "horizon", "dust"];

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5; let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 640, H = 400;

export const ModelArt = memo(function ModelArt({ name, hue, motif }: { name: string; hue: number; motif: ArtMotif }) {
  const uid = useId().replace(/:/g, "");
  const r = rng(name);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!;
  const h2 = (hue + 30 + r() * 120) % 360;
  const h3 = (hue + 180 + r() * 60) % 360;
  const dark = `oklch(${0.13 + r() * 0.06} ${0.02 + r() * 0.03} ${hue})`;
  const c1 = `oklch(${0.62 + r() * 0.12} ${0.14 + r() * 0.08} ${hue})`;
  const c2 = `oklch(${0.55 + r() * 0.15} ${0.12 + r() * 0.1} ${h2})`;
  const c3 = `oklch(${0.7 + r() * 0.1} ${0.08 + r() * 0.08} ${h3})`;
  const glowX = 120 + r() * 400, glowY = 40 + r() * 200;
  const tilt = -25 + r() * 50;

  const layers: React.ReactNode[] = [];
  if (motif === "reasoning") {
    const pts = Array.from({ length: 14 }, () => [80 + r() * 520, 40 + r() * 320] as const);
    pts.forEach(([x, y], i) => pts.slice(i + 1).forEach(([x2, y2], j) => {
      if (Math.hypot(x - x2, y - y2) < 170) layers.push(<line key={`l${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke={c3} strokeOpacity={0.35} strokeWidth={1.2} />);
    }));
    pts.forEach(([x, y], i) => layers.push(<circle key={`n${i}`} cx={x} cy={y} r={2.5 + r() * 6} fill={i % 3 ? c1 : c3} filter={`url(#g${uid})`} />));
  } else if (motif === "coding") {
    for (let i = 0; i < 13; i++) {
      const y = 60 + i * 24, indent = Math.floor(r() * 4) * 26;
      let x = 300 + indent;
      for (let k = 0; k < 2 + Math.floor(r() * 4); k++) {
        const w = 20 + r() * 80;
        if (x + w > 610) break;
        layers.push(<rect key={`c${i}-${k}`} x={x} y={y} width={w} height={9} rx={4.5} fill={pick([c1, c2, c3])} opacity={0.35 + r() * 0.5} />);
        x += w + 10;
      }
    }
    layers.push(<rect key="win" x={280} y={36} width={340} height={336} rx={18} fill="none" stroke={c3} strokeOpacity={0.25} />);
  } else if (motif === "vision") {
    const cx = 300 + r() * 180, cy = 150 + r() * 100;
    for (let i = 0; i < 7; i++) layers.push(<circle key={`v${i}`} cx={cx} cy={cy} r={30 + i * 26} fill="none" stroke={i % 2 ? c1 : c3} strokeOpacity={0.55 - i * 0.06} strokeWidth={i === 0 ? 10 : 2} />);
    layers.push(<circle key="pupil" cx={cx} cy={cy} r={22} fill={c2} filter={`url(#g${uid})`} />);
    layers.push(<circle key="spec" cx={cx - 8} cy={cy - 9} r={6} fill="white" opacity={0.85} />);
  } else if (motif === "fast") {
    for (let i = 0; i < 16; i++) {
      const y = 40 + r() * 320, x = r() * 380, w = 120 + r() * 300;
      layers.push(<rect key={`s${i}`} x={x} y={y} width={w} height={2 + r() * 5} rx={3} fill={`url(#s${uid})`} opacity={0.4 + r() * 0.6} />);
    }
  } else if (motif === "long") {
    for (let i = 0; i < 9; i++) {
      const amp = 20 + r() * 50, y0 = 80 + i * 30, ph = r() * 6;
      const d = Array.from({ length: 33 }, (_, k) => { const x = k * 20; return `${k ? "L" : "M"}${x} ${(y0 + Math.sin(k / 3 + ph) * amp).toFixed(1)}`; }).join(" ");
      layers.push(<path key={`w${i}`} d={d} fill="none" stroke={i % 2 ? c1 : c3} strokeOpacity={0.25 + i * 0.06} strokeWidth={1.5} />);
    }
  } else if (motif === "prism") {
    for (let i = 0; i < 5; i++) {
      const cx = 160 + r() * 340, cy = 90 + r() * 220, s = 50 + r() * 90, a = r() * Math.PI;
      const pts = [0, 1, 2].map((k) => `${(cx + Math.cos(a + (k * 2 * Math.PI) / 3) * s).toFixed(1)},${(cy + Math.sin(a + (k * 2 * Math.PI) / 3) * s).toFixed(1)}`).join(" ");
      layers.push(<polygon key={`p${i}`} points={pts} fill={`url(#o${uid})`} opacity={0.22 + r() * 0.35} stroke={c3} strokeOpacity={0.5} strokeWidth={1} />);
    }
  } else if (motif === "horizon") {
    const hy = 200 + r() * 80;
    layers.push(<circle key="sun" cx={200 + r() * 240} cy={hy} r={60 + r() * 50} fill={`url(#o${uid})`} />);
    layers.push(<rect key="ground" x={0} y={hy} width={W} height={H - hy} fill={dark} opacity={0.85} />);
    for (let i = 0; i < 9; i++) layers.push(<line key={`hl${i}`} x1={0} x2={W} y1={hy + 6 + i * i * 2.4} y2={hy + 6 + i * i * 2.4} stroke={c1} strokeOpacity={0.5 - i * 0.04} />);
    for (let i = -8; i <= 8; i++) layers.push(<line key={`hv${i}`} x1={W / 2 + i * 14} y1={hy} x2={W / 2 + i * 90} y2={H} stroke={c1} strokeOpacity={0.25} />);
  } else if (motif === "dust") {
    for (let i = 0; i < 140; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 230;
      layers.push(<circle key={`d${i}`} cx={W / 2 + Math.cos(a) * d * 1.3} cy={H / 2 + Math.sin(a) * d * 0.7} r={0.8 + r() * 2.4} fill={pick([c1, c3, "white"])} opacity={0.3 + r() * 0.7} />);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const cx = 140 + r() * 400, cy = 80 + r() * 240, rr = 40 + r() * 90;
      layers.push(<circle key={`o${i}`} cx={cx} cy={cy} r={rr} fill={`url(#o${uid})`} opacity={0.75} />);
      layers.push(<ellipse key={`h${i}`} cx={cx - rr * 0.3} cy={cy - rr * 0.4} rx={rr * 0.35} ry={rr * 0.18} fill="white" opacity={0.25} />);
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`bg${uid}`} cx={glowX / W} cy={glowY / H} r="0.9">
          <stop offset="0" stopColor={c1} stopOpacity="0.55" />
          <stop offset="0.45" stopColor={c2} stopOpacity="0.18" />
          <stop offset="1" stopColor={dark} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`o${uid}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={c3} />
          <stop offset="0.55" stopColor={c1} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`s${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor={c1} stopOpacity="0" />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
        <filter id={`g${uid}`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id={`b${uid}`}><feGaussianBlur stdDeviation="40" /></filter>
      </defs>
      <rect width={W} height={H} fill={dark} />
      <rect width={W} height={H} fill={`url(#bg${uid})`} />
      <circle cx={W - glowX} cy={H - glowY / 2} r={110 + r() * 60} fill={c2} opacity={0.35} filter={`url(#b${uid})`} />
      <g transform={`rotate(${tilt * 0.15} ${W / 2} ${H / 2})`}>{layers}</g>
    </svg>
  );
});
