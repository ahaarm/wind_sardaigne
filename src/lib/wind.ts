import type { Spot } from "./spots";

export const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

/** Libellés français (O = ouest). */
const COMPASS_FR: Record<string, string> = {
  N: "N", NNE: "NNE", NE: "NE", ENE: "ENE", E: "E", ESE: "ESE", SE: "SE", SSE: "SSE",
  S: "S", SSW: "SSO", SW: "SO", WSW: "OSO", W: "O", WNW: "ONO", NW: "NO", NNW: "NNO",
};

export function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

export function compassName(deg: number): string {
  return COMPASS[Math.round(normDeg(deg) / 22.5) % 16];
}

export function compassFr(deg: number): string {
  return COMPASS_FR[compassName(deg)];
}

export function angleDiff(a: number, b: number): number {
  const d = Math.abs(normDeg(a) - normDeg(b));
  return d > 180 ? 360 - d : d;
}

/** Nom local du vent en Sardaigne selon la direction d'où il vient. */
export function windName(deg: number): string {
  const d = normDeg(deg);
  if (d >= 292.5 && d < 337.5) return "Maestrale (Mistral)";
  if (d >= 247.5 && d < 292.5) return "Ponente";
  if (d >= 202.5 && d < 247.5) return "Libeccio";
  if (d >= 157.5 && d < 202.5) return "Ostro";
  if (d >= 112.5 && d < 157.5) return "Scirocco";
  if (d >= 67.5 && d < 112.5) return "Levante";
  if (d >= 22.5 && d < 67.5) return "Grecale";
  return "Tramontana";
}

export type DirQuality = "good" | "ok" | "poor" | "offshore";

/**
 * Qualité de la direction du vent pour un spot.
 * - side / side-on : good
 * - onshore pur : ok (sûr mais plus dur pour sortir)
 * - side-off : poor
 * - offshore : offshore (dangereux)
 */
export function dirQuality(spot: Spot, deg: number): DirQuality {
  const name = compassName(deg);
  if (spot.sectors) {
    if (spot.sectors.good.includes(name)) return "good";
    if (spot.sectors.ok?.includes(name)) return "ok";
    if (spot.sectors.offshore?.includes(name)) return "offshore";
    return "poor";
  }
  const diff = angleDiff(deg, spot.facing);
  if (diff <= 25) return "ok";
  if (diff <= 100) return "good";
  if (diff <= 135) return "poor";
  return "offshore";
}

export const DIR_QUALITY_LABEL: Record<DirQuality, string> = {
  good: "side / side-on",
  ok: "onshore",
  poor: "side-off",
  offshore: "offshore ⚠",
};

/** Échelle de couleurs type Windguru (nœuds). */
export function windColor(kn: number | null | undefined): string {
  if (kn == null || Number.isNaN(kn)) return "transparent";
  const stops: [number, string][] = [
    [0, "#f4f7fb"],
    [5, "#cfe8ff"],
    [8, "#9fd6ff"],
    [11, "#6fe0c8"],
    [14, "#56d35f"],
    [17, "#c4e83a"],
    [20, "#ffe03a"],
    [23, "#ffb02e"],
    [26, "#ff6b2e"],
    [30, "#e8304a"],
    [35, "#c02aa8"],
    [40, "#7a2ac0"],
  ];
  let c = stops[0][1];
  for (const [k, col] of stops) if (kn >= k) c = col;
  return c;
}

/** Texte lisible sur une couleur de vent. */
export function windTextColor(kn: number | null | undefined): string {
  if (kn == null) return "inherit";
  return kn >= 30 ? "#fff" : "#10202f";
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "transparent";
  if (score < 20) return "var(--surface-2)";
  if (score >= 80) return "#1f9d55";
  if (score >= 60) return "#5cc26b";
  if (score >= 40) return "#cfe36a";
  return "#f2d9a0";
}

export function scoreTextColor(score: number | null | undefined): string {
  if (score == null) return "inherit";
  if (score < 20) return "var(--muted)";
  return score >= 80 ? "#fff" : "#13202b";
}

/** Moyenne vectorielle de directions (pondérée). */
export function meanDirection(dirs: number[], weights?: number[]): number | null {
  let x = 0;
  let y = 0;
  let total = 0;
  for (let i = 0; i < dirs.length; i++) {
    const w = weights ? weights[i] : 1;
    total += Math.abs(w);
    const r = (dirs[i] * Math.PI) / 180;
    x += Math.sin(r) * w;
    y += Math.cos(r) * w;
  }
  if (Math.hypot(x, y) <= 1e-9 * Math.max(total, 1)) return null;
  return normDeg((Math.atan2(x, y) * 180) / Math.PI);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
