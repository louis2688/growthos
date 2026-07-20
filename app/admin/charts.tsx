/**
 * Dependency-free SVG charts for the founders-only admin page. Server-rendered, static —
 * no tooltips or interactivity, which is the right trade for an ops glance page and keeps
 * a chart library out of the bundle. ponytail: reach for a real charting lib when the page
 * needs hover detail or zoom.
 */

/** Cobalt-family ramp + semantics that read on both themes. */
export const CHART_COLORS = ["#0064e0", "#0091ff", "#22c55e", "#eab308", "#a855f7", "#64748b"];

export function Sparkline({ points, color = "#0064e0" }: { points: number[]; color?: string }) {
  const w = 120;
  const h = 32;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const xy = points.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={xy.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function AreaChart({
  series,
  labels,
}: {
  /** Named daily series drawn oldest → newest on a shared scale. First series gets the area fill. */
  series: { name: string; color: string; points: number[] }[];
  labels: string[];
}) {
  const w = 640;
  const h = 220;
  const pad = { top: 10, right: 8, bottom: 22, left: 30 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const n = Math.max(2, series[0]?.points.length ?? 2);
  const x = (i: number) => pad.left + (i / (n - 1)) * iw;
  const y = (v: number) => pad.top + ih - (v / max) * ih;
  const line = (points: number[]) => points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Daily activity chart">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeDasharray="3 4"
            />
            <text x={pad.left - 6} y={y(max * t) + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.55">
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        {series[0] && (
          <polygon
            points={`${x(0)},${y(0)} ${line(series[0].points)} ${x(n - 1)},${y(0)}`}
            fill={series[0].color}
            fillOpacity="0.12"
          />
        )}
        {series.map((s) => (
          <polyline key={s.name} points={line(s.points)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {labels.map((label, i) =>
          label ? (
            <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.55">
              {label}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-2 flex gap-4 text-[12px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = Math.max(
    1,
    slices.reduce((s, x) => s + x.value, 0),
  );
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0" role="img" aria-label="Runs by agent">
        {slices.map((s) => {
          const frac = s.value / total;
          const el = (
            <circle
              key={s.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${(frac * c).toFixed(2)} ${c.toFixed(2)}`}
              strokeDashoffset={(-offset * c).toFixed(2)}
              transform="rotate(-90 50 50)"
            />
          );
          offset += frac;
          return el;
        })}
        <text x="50" y="47" textAnchor="middle" fontSize="16" fontWeight="500" fill="currentColor">
          {total}
        </text>
        <text x="50" y="60" textAnchor="middle" fontSize="7" fill="currentColor" fillOpacity="0.6">
          runs
        </text>
      </svg>
      <ul className="space-y-1.5 text-[13px]">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto pl-4 font-medium">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GoalBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {value} of {target}
      </p>
    </div>
  );
}
