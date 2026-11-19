import { useRef } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, GripHorizontal, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon, Trash2, Pencil } from "lucide-react";
import { CHART_COLORS, type ChartData } from "@/lib/sheet/chart-data";
import type { ChartKind, SheetChart as Chart } from "@/lib/sheet/model";

// A chart floating over the grid, like in Excel: drag it by its bar, resize from the corner, change its kind,
// rename or delete it. Drawn with recharts (SVG), which the PDF print and the .xlsx export reuse.

const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }));
const KINDS: [ChartKind, typeof BarChart3, string][] = [["bar", BarChart3, "Barres"], ["line", LineIcon, "Lignes"], ["area", AreaIcon, "Aires"], ["pie", PieIcon, "Secteurs"]];

export function SheetChartView({ chart, data, left, top, selected, onSelect, onChange, onDelete, onRename, onEditRange }: {
  chart: Chart; data: ChartData; left: number; top: number; selected: boolean;
  onSelect: () => void; onChange: (patch: Partial<Chart>, commit: boolean) => void; onDelete: () => void; onRename: () => void; onEditRange: () => void;
}) {
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; ow: number; oh: number; mode: "move" | "size" } | null>(null);
  const start = (e: React.PointerEvent, mode: "move" | "size") => {
    e.preventDefault(); e.stopPropagation(); onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: chart.x, oy: chart.y, ow: chart.w, oh: chart.h, mode };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (d.mode === "move") onChange({ x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) }, false);
    else onChange({ w: Math.max(240, d.ow + dx), h: Math.max(180, d.oh + dy) }, false);
  };
  const end = () => { if (drag.current) { drag.current = null; onChange({}, true); } };
  const series = data.series.filter((s) => data.rows.some((r) => typeof r[s] === "number"));
  const axis = { fontSize: 11, fill: "#6b7280" };
  const body = !data.rows.length || !series.length
    ? <div className="grid h-full place-items-center px-4 text-center text-[12px] text-muted-foreground">Sélectionnez des étiquettes et des nombres pour ce graphique (plage {chart.range}).</div>
    : <ResponsiveContainer width="100%" height="100%">
      {chart.kind === "pie" ? (
        <PieChart>
          <Pie data={data.rows} dataKey={series[0]!} nameKey="label" innerRadius="45%" outerRadius="78%" paddingAngle={2} isAnimationActive={false}>
            {data.rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      ) : chart.kind === "line" ? (
        <LineChart data={data.rows} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#eef0f3" vertical={false} /><XAxis dataKey="label" tick={axis} /><YAxis tick={axis} tickFormatter={fmt} width={64} />
          <Tooltip formatter={(v) => fmt(Number(v))} />{series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.4} dot={{ r: 3 }} isAnimationActive={false} />)}
        </LineChart>
      ) : chart.kind === "area" ? (
        <AreaChart data={data.rows} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#eef0f3" vertical={false} /><XAxis dataKey="label" tick={axis} /><YAxis tick={axis} tickFormatter={fmt} width={64} />
          <Tooltip formatter={(v) => fmt(Number(v))} />{series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => <Area key={s} type="monotone" dataKey={s} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.18} strokeWidth={2.2} isAnimationActive={false} />)}
        </AreaChart>
      ) : (
        <BarChart data={data.rows} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#eef0f3" vertical={false} /><XAxis dataKey="label" tick={axis} interval={0} /><YAxis tick={axis} tickFormatter={fmt} width={64} />
          <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: "#f4f4f5" }} />{series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => <Bar key={s} dataKey={s} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[5, 5, 0, 0]} maxBarSize={46} isAnimationActive={false} />)}
        </BarChart>
      )}
    </ResponsiveContainer>;
  return <div data-sheet-chart={chart.id} onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}
    className={`absolute z-20 flex flex-col overflow-hidden rounded-xl border bg-white shadow-[0_10px_30px_-14px_rgba(0,0,0,.35)] ${selected ? "border-[#1f7a5a] ring-2 ring-[#1f7a5a]/25" : "border-zinc-200"}`}
    style={{ left, top, width: chart.w, height: chart.h }}>
    <div className="flex h-9 shrink-0 cursor-move items-center gap-1.5 border-b border-zinc-100 px-2" onPointerDown={(e) => start(e, "move")} onPointerMove={move} onPointerUp={end}>
      <GripHorizontal className="size-3.5 shrink-0 text-zinc-400" />
      <strong data-chart-title className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-900" onDoubleClick={onRename}>{chart.title}</strong>
      {selected && <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
        {KINDS.map(([k, Icon, label]) => <button key={k} type="button" title={label} aria-label={label} aria-pressed={chart.kind === k} onClick={() => onChange({ kind: k }, true)}
          className={`grid size-6 place-items-center rounded-md ${chart.kind === k ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}><Icon className="size-3.5" /></button>)}
        <button type="button" title="Titre et plage" aria-label="Modifier le titre" onClick={onRename} className="grid size-6 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100"><Pencil className="size-3.5" /></button>
        <button type="button" title={`Plage : ${chart.range}`} onClick={onEditRange} className="rounded-md px-1.5 text-[10.5px] font-medium text-zinc-500 hover:bg-zinc-100">{chart.range.length > 14 ? "Plage" : chart.range}</button>
        <button type="button" title="Supprimer" aria-label="Supprimer le graphique" onClick={onDelete} className="grid size-6 place-items-center rounded-md text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /></button>
      </div>}
    </div>
    <div className="min-h-0 flex-1 p-2">{body}</div>
    <div className="absolute bottom-0 right-0 size-4 cursor-nwse-resize" onPointerDown={(e) => start(e, "size")} onPointerMove={move} onPointerUp={end}>
      <svg viewBox="0 0 10 10" className="size-4 text-zinc-400"><path d="M9 3 3 9M9 6 6 9" stroke="currentColor" strokeWidth="1.2" /></svg>
    </div>
  </div>;
}
