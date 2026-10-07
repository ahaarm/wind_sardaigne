import type { Spot } from "./spots";
import { dirQuality, type DirQuality } from "./wind";
import { localParts } from "./time";

export type Profile = "debutante" | "freefly" | "duo" | "plage";

export const PROFILES: { id: Profile; label: string; emoji: string; help: string }[] = [
  {
    id: "debutante",
    label: "Débutante",
    emoji: "🌱",
    help: "Vent établi ≥ 10 nds (idéal 13–18), régulier, pas offshore, eau plate ou petites vagues, spot adapté aux débutants.",
  },
  {
    id: "freefly",
    label: "Freefly / vague",
    emoji: "🌊",
    help: "Vent ≥ 10 nds (idéal 14–26), houle 0,8–2,5 m, spot à vagues ; offshore exclu.",
  },
  {
    id: "duo",
    label: "Les deux",
    emoji: "👫",
    help: "Spot où vous pouvez naviguer tous les deux le même jour (moyenne géométrique des deux scores).",
  },
  {
    id: "plage",
    label: "Famille / beau temps",
    emoji: "☀️",
    help: "Soleil, pas de pluie, températures douces, vent modéré – journée plage avec le petit.",
  },
];

export interface HourInput {
  w: number | null;
  g: number | null;
  d: number | null;
  wave: number | null;
  cloud: number | null;
  precip: number | null;
  temp: number | null;
}

/** Interpolation linéaire par morceaux sur des points (x croissants). */
export function ramp(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

const DIR_FACTOR_BEGINNER: Record<DirQuality, number> = { good: 1, ok: 0.75, poor: 0.25, offshore: 0 };
const DIR_FACTOR_FREEFLY: Record<DirQuality, number> = { good: 1, ok: 0.8, poor: 0.4, offshore: 0.1 };

/** Rafales : gust estimé à 1,35× le vent moyen si le modèle ne le fournit pas. */
function gustOf(h: HourInput): number {
  return h.g ?? (h.w ?? 0) * 1.35;
}

/** Vent établi minimum pour naviguer (nœuds). */
export const MIN_WIND = 10;

export function beginnerScore(spot: Spot, h: HourInput): number {
  if (h.w == null || h.d == null) return 0;
  const wind = ramp(h.w, [
    [MIN_WIND - 0.5, 0],
    [MIN_WIND, 0.5],
    [13, 1],
    [18, 1],
    [22, 0.4],
    [25, 0],
  ]);
  const g = gustOf(h);
  // écart rafales/vent moyen (vent irrégulier) et rafales absolues trop fortes
  const gustFactor =
    ramp(g - h.w, [
      [6, 1],
      [10, 0.75],
      [15, 0.4],
    ]) *
    ramp(g, [
      [25, 1],
      [31, 0],
    ]);
  const dir = DIR_FACTOR_BEGINNER[dirQuality(spot, h.d)];
  const level = spot.beginner === "ideal" ? 1 : spot.beginner === "ok" ? 0.75 : 0.15;
  const waves = spot.flatWater || h.wave == null ? 1 : ramp(h.wave, [
    [0.5, 1],
    [1.2, 0.35],
    [2, 0.15],
  ]);
  return 100 * wind * gustFactor * dir * level * waves;
}

export function freeflyScore(spot: Spot, h: HourInput): number {
  if (h.w == null || h.d == null) return 0;
  const wind = ramp(h.w, [
    [MIN_WIND - 0.5, 0],
    [MIN_WIND, 0.35],
    [14, 1],
    [26, 1],
    [32, 0.4],
    [36, 0],
  ]);
  const dir = DIR_FACTOR_FREEFLY[dirQuality(spot, h.d)];
  const type = spot.freefly === "top" ? 1 : spot.freefly === "ok" ? 0.75 : 0.45;
  let waves: number;
  if (spot.flatWater) waves = 0.6;
  else if (h.wave == null) waves = 0.6;
  else
    waves = ramp(h.wave, [
      [0.2, 0.35],
      [0.8, 1],
      [2.5, 1],
      [3.5, 0.6],
      [5, 0.3],
    ]);
  return 100 * wind * dir * type * waves;
}

export function weatherScore(h: HourInput): number {
  const cloud = h.cloud == null ? 0.7 : ramp(h.cloud, [
    [25, 1],
    [60, 0.65],
    [90, 0.35],
  ]);
  const rain = h.precip == null ? 1 : ramp(h.precip, [
    [0.1, 1],
    [0.5, 0.4],
    [2, 0.1],
  ]);
  const temp = h.temp == null ? 0.8 : ramp(h.temp, [
    [15, 0.5],
    [19, 0.8],
    [22, 1],
  ]);
  const wind = h.w == null ? 1 : ramp(h.w, [
    [15, 1],
    [25, 0.6],
    [35, 0.3],
  ]);
  return 100 * cloud * rain * temp * wind;
}

export function hourScore(profile: Profile, spot: Spot, h: HourInput): number {
  switch (profile) {
    case "debutante":
      return beginnerScore(spot, h);
    case "freefly":
      return freeflyScore(spot, h);
    case "duo":
      return Math.sqrt(beginnerScore(spot, h) * freeflyScore(spot, h));
    case "plage":
      return weatherScore(h);
  }
}

export interface SpotHourly {
  time: number[];
  w: (number | null)[];
  g: (number | null)[];
  d: (number | null)[];
  spread: (number | null)[];
  n: number[];
  temp: (number | null)[];
  cloud: (number | null)[];
  precip: (number | null)[];
  wave: (number | null)[];
  wavePer: (number | null)[];
  waveDir: (number | null)[];
  swell: (number | null)[];
  sst: (number | null)[];
}

/**
 * Correction « thermique » optionnelle : sur les spots à brise thermique, entre 12h et 18h,
 * le vent prévu est majoré de `thermalBoost` (ex. 0,15 = +15 %). Le guide Inside Sardinia note que
 * 12–18 nds prévus le matin donnent souvent 18–25 nds sur l'eau vers 15h.
 */
export function hourInput(s: SpotHourly, i: number, spot?: Spot, thermalBoost = 0): HourInput {
  let k = 1;
  if (thermalBoost > 0 && spot?.thermal) {
    const h = localParts(s.time[i]).hour;
    if (h >= 12 && h <= 18) k = 1 + thermalBoost;
  }
  const mul = (v: number | null) => (v == null ? null : v * k);
  return { w: mul(s.w[i]), g: mul(s.g[i]), d: s.d[i], wave: s.wave[i], cloud: s.cloud[i], precip: s.precip[i], temp: s.temp[i] };
}

/** Heures de navigation prises en compte pour la note du jour (heure locale). */
export const RIDE_HOURS = { from: 10, to: 18 };

export interface DaySummary {
  date: string;
  /** Note 0–100 : moyenne des 3 meilleures heures de la journée. */
  score: number | null;
  /** Heures navigables (note horaire ≥ 50). */
  goodHours: number;
  /** Vent moyen / rafales sur 12h–17h. */
  wind: number | null;
  gust: number | null;
  dir: number | null;
  wave: number | null;
  cloud: number | null;
  precip: number;
  tempMax: number | null;
  spread: number | null;
  /** Fenêtre de meilleures heures, ex. « 13h–17h ». */
  window: string | null;
  bestHour: number | null;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function summarizeDays(spot: Spot, s: SpotHourly, profile: Profile, thermalBoost = 0): DaySummary[] {
  const byDate = new Map<string, number[]>();
  s.time.forEach((t, i) => {
    const { date, hour } = localParts(t);
    if (hour < RIDE_HOURS.from || hour > RIDE_HOURS.to) return;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(i);
  });
  const out: DaySummary[] = [];
  for (const [date, idxs] of byDate) {
    const valid = idxs.filter((i) => s.w[i] != null);
    if (valid.length < 3) {
      out.push({
        date, score: null, goodHours: 0, wind: null, gust: null, dir: null, wave: null, cloud: null,
        precip: 0, tempMax: null, spread: null, window: null, bestHour: null,
      });
      continue;
    }
    const scored = valid.map((i) => ({ i, sc: hourScore(profile, spot, hourInput(s, i, spot, thermalBoost)) }));
    const top = [...scored].sort((a, b) => b.sc - a.sc).slice(0, 3);
    const score = Math.round(mean(top.map((x) => x.sc)) ?? 0);
    const good = scored.filter((x) => x.sc >= 50);
    const aft = valid.filter((i) => {
      const h = localParts(s.time[i]).hour;
      return h >= 12 && h <= 17;
    });
    const pick = (arr: (number | null)[], idx: number[]) =>
      idx.map((i) => arr[i]).filter((v): v is number => v != null);
    const dirs = pick(s.d, aft);
    const ws = pick(s.w, aft);
    let dir: number | null = null;
    if (dirs.length) {
      let x = 0;
      let y = 0;
      dirs.forEach((dd, k) => {
        const r = (dd * Math.PI) / 180;
        x += Math.sin(r) * (ws[k] ?? 1);
        y += Math.cos(r) * (ws[k] ?? 1);
      });
      dir = Math.round(((Math.atan2(x, y) * 180) / Math.PI + 360) % 360);
    }
    const hours = good.map((x) => localParts(s.time[x.i]).hour);
    const r1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);
    out.push({
      date,
      score,
      goodHours: good.length,
      wind: r1(mean(ws)),
      gust: r1(mean(pick(s.g, aft))),
      dir,
      wave: r1(mean(pick(s.wave, aft))),
      cloud: (() => {
        const c = mean(pick(s.cloud, valid));
        return c == null ? null : Math.round(c);
      })(),
      precip: r1(pick(s.precip, valid).reduce((a, b) => a + b, 0)) ?? 0,
      tempMax: (() => {
        const t = pick(s.temp, valid);
        return t.length ? Math.round(Math.max(...t)) : null;
      })(),
      spread: r1(mean(pick(s.spread, aft))),
      window: hours.length ? `${Math.min(...hours)}h–${Math.max(...hours) + 1}h` : null,
      bestHour: top.length ? localParts(s.time[top[0].i]).hour : null,
    });
  }
  return out;
}

export function confidenceLabel(spread: number | null, leadDays: number): { label: string; level: 0 | 1 | 2 } {
  if (spread == null) return leadDays > 5 ? { label: "faible", level: 0 } : { label: "?", level: 1 };
  if (spread <= 4 && leadDays <= 2) return { label: "bonne", level: 2 };
  if (spread <= 7 && leadDays <= 5) return { label: "moyenne", level: 1 };
  return { label: "faible", level: 0 };
}
