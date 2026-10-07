import type { Spot } from "@/lib/spots";
import { COMPASS, dirQuality, DIR_QUALITY_LABEL, type DirQuality } from "@/lib/wind";

const COLORS: Record<DirQuality, string> = {
  good: "#1f9d55",
  ok: "#a3d977",
  poor: "#f2c46d",
  offshore: "#e5484d",
};

/** Rose des vents du spot : quelles directions de vent fonctionnent. */
export default function Compass({ spot, current, size = 170 }: { spot: Spot; current?: number | null; size?: number }) {
  const c = size / 2;
  const r = c - 18;
  const wedge = (i: number) => {
    const a0 = ((i * 22.5 - 11.25 - 90) * Math.PI) / 180;
    const a1 = ((i * 22.5 + 11.25 - 90) * Math.PI) / 180;
    const ri = r * 0.38;
    return `M${c + ri * Math.cos(a0)},${c + ri * Math.sin(a0)} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 0 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} L${c + ri * Math.cos(a1)},${c + ri * Math.sin(a1)} A${ri},${ri} 0 0 0 ${c + ri * Math.cos(a0)},${c + ri * Math.sin(a0)} Z`;
  };
  return (
    <div>
      <svg width={size} height={size} role="img" aria-label="Rose des vents du spot">
        {COMPASS.map((name, i) => {
          const q = dirQuality(spot, i * 22.5);
          return (
            <path key={name} d={wedge(i)} fill={COLORS[q]} stroke="var(--surface)" strokeWidth={2}>
              <title>{`Vent de ${name} : ${DIR_QUALITY_LABEL[q]}`}</title>
            </path>
          );
        })}
        {["N", "E", "S", "O"].map((l, i) => {
          const a = ((i * 90 - 90) * Math.PI) / 180;
          return (
            <text
              key={l}
              x={c + (r + 10) * Math.cos(a)}
              y={c + (r + 10) * Math.sin(a) + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="var(--text-2)"
            >
              {l}
            </text>
          );
        })}
        {current != null && (
          <g transform={`rotate(${current} ${c} ${c})`}>
            <line x1={c} y1={c - r} x2={c} y2={c + r * 0.3} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
            <path d={`M${c - 6},${c + r * 0.3 - 4} L${c},${c + r * 0.3 + 8} L${c + 6},${c + r * 0.3 - 4} Z`} fill="var(--text)" />
          </g>
        )}
      </svg>
      <div className="legend">
        {(Object.keys(COLORS) as DirQuality[]).map((q) => (
          <span key={q}>
            <span className="swatch" style={{ background: COLORS[q] }} />
            {DIR_QUALITY_LABEL[q]}
          </span>
        ))}
      </div>
    </div>
  );
}
