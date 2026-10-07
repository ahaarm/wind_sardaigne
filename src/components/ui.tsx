import { BEGINNER_LABEL, FREEFLY_LABEL, type Spot } from "@/lib/spots";
import { compassFr, windColor, windTextColor, scoreColor, scoreTextColor } from "@/lib/wind";
import { ago, formatDateTime } from "@/lib/time";

/** Flèche qui pointe vers où le vent VA (direction d'origine + 180°). */
export function DirArrow({ deg, size = 14, title }: { deg: number | null | undefined; size?: number; title?: string }) {
  if (deg == null) return <span className="muted">–</span>;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ transform: `rotate(${deg + 180}deg)`, verticalAlign: "-2px" }}
      aria-label={title ?? `vent de ${compassFr(deg)}`}
      role="img"
    >
      <line x1="10" y1="18" x2="10" y2="6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 1 L15.5 9 L4.5 9 Z" fill="currentColor" />
    </svg>
  );
}

export function WindBox({ kn, children }: { kn: number | null | undefined; children?: React.ReactNode }) {
  return (
    <span
      className="wind-cell"
      style={{
        background: windColor(kn),
        color: windTextColor(kn),
        borderRadius: 6,
        padding: "1px 5px",
        display: "inline-block",
        minWidth: 30,
      }}
    >
      {children ?? (kn == null ? "–" : Math.round(kn))}
    </span>
  );
}

export function ScoreDot({ score }: { score: number | null | undefined }) {
  return (
    <span className="score-dot" style={{ background: scoreColor(score), color: scoreTextColor(score) }}>
      {score == null ? "–" : score}
    </span>
  );
}

export function SpotBadges({ spot }: { spot: Spot }) {
  const b = spot.beginner;
  return (
    <span className="row" style={{ gap: 4, display: "inline-flex", flexWrap: "wrap" }}>
      <span className={`badge badge-${b}`} title={BEGINNER_LABEL[b]}>
        {b === "ideal" ? "🌱 débutant ++" : b === "ok" ? "🌱 débutant ok" : "⚠ confirmés"}
      </span>
      <span className={`badge ${spot.freefly === "flat" ? "badge-flat" : "badge-wave"}`} title={FREEFLY_LABEL[spot.freefly]}>
        {spot.freefly === "top" ? "🌊 vague/freefly" : spot.freefly === "ok" ? "🌊 houle possible" : "▭ eau plate"}
      </span>
      {spot.thermal && (
        <span className="badge badge-flat badge-extra" title="Brise thermique d'après-midi fréquente">
          ☀︎ thermique
        </span>
      )}
      {spot.guide && (
        <span className="badge badge-flat badge-extra" title="Spot du guide Inside Sardinia">
          ★ guide
        </span>
      )}
    </span>
  );
}

export function StaleBanner({ stale, error, generatedAt }: { stale: boolean; error: string | null; generatedAt?: number }) {
  if (error && !stale) return <div className="banner error">Erreur de chargement : {error}</div>;
  if (stale)
    return (
      <div className="banner warn">
        {error ? "Pas de réseau – " : "Mise à jour en cours… "}
        affichage des données enregistrées{generatedAt ? ` (${formatDateTime(generatedAt)}, ${ago(generatedAt)})` : ""}.
      </div>
    );
  return null;
}

export function WindLegend() {
  const steps = [5, 8, 11, 14, 17, 20, 23, 26, 30, 35];
  return (
    <div className="legend" aria-label="Échelle de vent en nœuds">
      <span>Vent (nds) :</span>
      {steps.map((s) => (
        <span key={s}>
          <span className="swatch" style={{ background: windColor(s) }} />
          {s}
        </span>
      ))}
    </div>
  );
}

export function ScoreLegend() {
  const steps: [number, string][] = [
    [0, "< 20 bof"],
    [20, "20–39"],
    [40, "40–59 jouable"],
    [60, "60–79 bien"],
    [80, "80+ top"],
  ];
  return (
    <div className="legend" aria-label="Échelle des notes">
      <span>Note :</span>
      {steps.map(([s, l]) => (
        <span key={s}>
          <span className="swatch" style={{ background: scoreColor(s) }} />
          {l}
        </span>
      ))}
    </div>
  );
}
