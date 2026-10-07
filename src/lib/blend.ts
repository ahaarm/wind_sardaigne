import type { ModelDef } from "./models";
import type { PointSeries, Series } from "./openmeteo";
import { meanDirection } from "./wind";

export const HOUR = 3600;

export function floorHour(unix: number): number {
  return Math.floor(unix / HOUR) * HOUR;
}

/** Grille horaire commune (unix s) : de `start` à `start + hours`. */
export function buildGrid(start: number, hours: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < hours; i++) out.push(start + i * HOUR);
  return out;
}

/** Réaligne une série sur la grille (null si absente). */
export function align(p: PointSeries | null | undefined, key: string, grid: number[]): Series {
  if (!p || !p.vars[key]) return grid.map(() => null);
  const idx = new Map<number, number>();
  p.time.forEach((t, i) => idx.set(t, i));
  const s = p.vars[key];
  return grid.map((t) => {
    const i = idx.get(t);
    if (i === undefined) return null;
    const v = s[i];
    return v == null || Number.isNaN(v) ? null : v;
  });
}

export interface ModelSeries {
  model: ModelDef;
  w: Series;
  g: Series;
  d: Series;
  temp: Series;
  cloud: Series;
  precip: Series;
}

export function modelSeries(model: ModelDef, p: PointSeries | null, grid: number[]): ModelSeries {
  return {
    model,
    w: align(p, "wind_speed_10m", grid),
    g: align(p, "wind_gusts_10m", grid),
    d: align(p, "wind_direction_10m", grid),
    temp: align(p, "temperature_2m", grid),
    cloud: align(p, "cloud_cover", grid),
    precip: align(p, "precipitation", grid),
  };
}

export interface Blended {
  /** Vent moyen (nœuds). */
  w: Series;
  /** Rafales (nœuds). */
  g: Series;
  /** Direction d'où vient le vent (°). */
  d: Series;
  /** Écart max–min entre modèles pondérés (nœuds) : indicateur d'incertitude. */
  spread: Series;
  /** Nombre de modèles dans le mix à cette heure. */
  n: number[];
  temp: Series;
  cloud: Series;
  precip: Series;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function weightedMean(values: Series, weights: number[]): number | null {
  let s = 0;
  let ws = 0;
  values.forEach((v, i) => {
    if (v != null && weights[i] > 0) {
      s += v * weights[i];
      ws += weights[i];
    }
  });
  return ws > 0 ? s / ws : null;
}

/**
 * Mix pondéré multi-modèles : à chaque heure, chaque modèle reçoit un poids
 * qui dépend de l'échéance (cf. `ModelDef.weight`). Les modèles sans donnée sont ignorés.
 */
export function blend(models: ModelSeries[], grid: number[], now: number): Blended {
  const out: Blended = { w: [], g: [], d: [], spread: [], n: [], temp: [], cloud: [], precip: [] };
  grid.forEach((t, i) => {
    const lead = Math.max(0, (t - now) / HOUR);
    const weights = models.map((m) => (m.w[i] != null ? m.model.weight(lead) : 0));
    const active = models.filter((_, k) => weights[k] > 0);
    const n = active.length;
    out.n.push(n);
    if (n === 0) {
      out.w.push(null);
      out.g.push(null);
      out.d.push(null);
      out.spread.push(null);
      out.temp.push(null);
      out.cloud.push(null);
      out.precip.push(null);
      return;
    }
    const col = (key: keyof Omit<ModelSeries, "model">) => models.map((m) => m[key][i]);
    const w = weightedMean(col("w"), weights);
    out.w.push(w == null ? null : r1(w));
    const g = weightedMean(col("g"), weights);
    out.g.push(g == null ? null : r1(g));
    const dirs: number[] = [];
    const dw: number[] = [];
    models.forEach((m, k) => {
      const dv = m.d[i];
      const wv = m.w[i];
      if (dv != null && wv != null && weights[k] > 0) {
        dirs.push(dv);
        dw.push(weights[k] * Math.max(wv, 1));
      }
    });
    const d = meanDirection(dirs, dw);
    out.d.push(d == null ? null : Math.round(d));
    const ws = active.map((m) => m.w[i] as number);
    out.spread.push(n >= 2 ? r1(Math.max(...ws) - Math.min(...ws)) : null);
    const temp = weightedMean(col("temp"), weights);
    out.temp.push(temp == null ? null : r1(temp));
    const cloud = weightedMean(col("cloud"), weights);
    out.cloud.push(cloud == null ? null : Math.round(cloud));
    const precip = weightedMean(col("precip"), weights);
    out.precip.push(precip == null ? null : r1(precip));
  });
  return out;
}

export function round1(s: Series): Series {
  return s.map((v) => (v == null ? null : r1(v)));
}
