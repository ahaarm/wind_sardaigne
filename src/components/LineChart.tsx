"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateTime, localParts, formatDay } from "@/lib/time";

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  values: (number | null)[];
  width?: number;
  dashed?: boolean;
}

interface Props {
  time: number[];
  series: ChartSeries[];
  /** Zone min–max (ex. dispersion des modèles). */
  band?: { lo: (number | null)[]; hi: (number | null)[]; label: string };
  unit: string;
  height?: number;
  now?: number;
  /** Lignes horizontales de repère (ex. 12 nds). */
  refLines?: { y: number; label: string }[];
}

const PAD = { l: 34, r: 10, t: 10, b: 26 };

export default function LineChart({ time, series, band, unit, height = 240, now, refLines = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { yMax, x, y } = useMemo(() => {
    let max = 10;
    for (const s of series) for (const v of s.values) if (v != null && v > max) max = v;
    if (band) for (const v of band.hi) if (v != null && v > max) max = v;
    const yMax = Math.ceil((max * 1.08) / 5) * 5;
    const n = Math.max(1, time.length - 1);
    const x = (i: number) => PAD.l + ((width - PAD.l - PAD.r) * i) / n;
    const y = (v: number) => PAD.t + (height - PAD.t - PAD.b) * (1 - v / yMax);
    return { yMax, x, y };
  }, [series, band, time.length, width, height]);

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const bandPath = useMemo(() => {
    if (!band) return "";
    const segs: string[] = [];
    let cur: number[] = [];
    const flush = () => {
      if (cur.length > 1) {
        const top = cur.map((i) => `${x(i).toFixed(1)},${y(band.hi[i] as number).toFixed(1)}`);
        const bot = [...cur].reverse().map((i) => `${x(i).toFixed(1)},${y(band.lo[i] as number).toFixed(1)}`);
        segs.push(`M${top.join("L")}L${bot.join("L")}Z`);
      }
      cur = [];
    };
    time.forEach((_, i) => {
      if (band.lo[i] != null && band.hi[i] != null) cur.push(i);
      else flush();
    });
    flush();
    return segs.join("");
  }, [band, time, x, y]);

  // Séparateurs de jours (minuit local)
  const dayMarks = useMemo(() => {
    const out: { i: number; label: string }[] = [];
    let prev: string | null = null;
    time.forEach((t, i) => {
      const p = localParts(t);
      if (prev !== null && p.date !== prev) out.push({ i, label: formatDay(p.date, true) });
      prev = p.date;
    });
    return out;
  }, [time]);

  const yTicks = [];
  for (let v = 0; v <= yMax; v += yMax > 30 ? 10 : 5) yTicks.push(v);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const n = time.length - 1;
    const i = Math.round(((px - PAD.l) / (width - PAD.l - PAD.r)) * n);
    setHover(i >= 0 && i <= n ? i : null);
  };

  const nowIdx = now != null ? time.findIndex((t) => t >= now) : -1;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <svg
        width={width}
        height={height}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        style={{ display: "block", touchAction: "pan-y" }}
        role="img"
        aria-label={`Graphique ${series.map((s) => s.label).join(", ")}`}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
              {v}
            </text>
          </g>
        ))}
        <text x={PAD.l + 4} y={PAD.t + 2} fontSize={10} fill="var(--muted)" dominantBaseline="hanging">
          {unit}
        </text>
        {dayMarks.map((m) => (
          <g key={m.i}>
            <line x1={x(m.i)} x2={x(m.i)} y1={PAD.t} y2={height - PAD.b} stroke="var(--grid)" strokeWidth={1} />
            <text x={x(m.i) + 3} y={height - 8} fontSize={10} fill="var(--muted)">
              {m.label}
            </text>
          </g>
        ))}
        {refLines.map((r) => (
          <g key={r.label}>
            <line
              x1={PAD.l}
              x2={width - PAD.r}
              y1={y(r.y)}
              y2={y(r.y)}
              stroke="var(--text-2)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <text x={width - PAD.r - 2} y={y(r.y) - 3} textAnchor="end" fontSize={10} fill="var(--text-2)">
              {r.label}
            </text>
          </g>
        ))}
        {nowIdx > 0 && (
          <line x1={x(nowIdx)} x2={x(nowIdx)} y1={PAD.t} y2={height - PAD.b} stroke="var(--accent)" strokeWidth={1.5} />
        )}
        {band && <path d={bandPath} fill="var(--text-2)" opacity={0.12} />}
        {series.map((s) => (
          <path
            key={s.id}
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={height - PAD.b} stroke="var(--text-2)" strokeWidth={1} />
            {series.map((s) =>
              s.values[hover] != null ? (
                <circle
                  key={s.id}
                  cx={x(hover)}
                  cy={y(s.values[hover] as number)}
                  r={4}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ) : null,
            )}
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(Math.max(0, x(hover) + 10), width - 170),
            top: 8,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{formatDateTime(time[hover])}</div>
          {series.map((s) => (
            <div key={s.id} className="ttrow">
              <span>
                <span className="swatch" style={{ background: s.color }} />
                {s.label}
              </span>
              <strong>{s.values[hover] == null ? "–" : `${Math.round(s.values[hover] as number)} ${unit}`}</strong>
            </div>
          ))}
          {band && band.lo[hover] != null && (
            <div className="ttrow muted">
              <span>{band.label}</span>
              <span>
                {Math.round(band.lo[hover] as number)}–{Math.round(band.hi[hover] as number)}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="legend" style={{ marginTop: 4 }}>
        {series.map((s) => (
          <span key={s.id}>
            <span className="swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {band && (
          <span>
            <span className="swatch" style={{ background: "var(--text-2)", opacity: 0.25 }} />
            {band.label}
          </span>
        )}
      </div>
    </div>
  );
}
