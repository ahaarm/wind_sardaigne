import { blend, buildGrid, floorHour, HOUR, modelSeries, align, round1, type ModelSeries } from "../blend";
import { MODELS } from "../models";
import { fetchMarine, fetchModel, hasData, type ModelFetchResult, type PointSeries } from "../openmeteo";
import type { SpotHourly } from "../scoring";
import { SPOTS, type Spot } from "../spots";

export const HOURS_BEFORE = 12;
export const HOURS_AFTER = 240;

export interface ModelStatus {
  id: string;
  name: string;
  short: string;
  color: string;
  omId: string | null;
  error: string | null;
  /** Nombre de spots pour lesquels le modèle a des données. */
  coverage: number;
}

export interface OverviewData {
  generatedAt: number;
  now: number;
  time: number[];
  models: ModelStatus[];
  marineError: string | null;
  spots: Record<string, Omit<SpotHourly, "time">>;
}

export interface RawBundle {
  now: number;
  grid: number[];
  results: ModelFetchResult[];
  marine: PointSeries[] | null;
  marineError: string | null;
}

/** Récupère tous les modèles + la houle pour tous les spots (requêtes multi-points, mises en cache). */
export async function fetchBundle(): Promise<RawBundle> {
  const now = Math.floor(Date.now() / 1000);
  const start = floorHour(now) - HOURS_BEFORE * HOUR;
  const grid = buildGrid(start, HOURS_BEFORE + HOURS_AFTER);
  const points = SPOTS.map((s) => ({ lat: s.lat, lon: s.lon }));
  const [results, marineRes] = await Promise.all([
    Promise.all(MODELS.map((m) => fetchModel(m, points))),
    fetchMarine(points).then(
      (m) => ({ m, e: null as string | null }),
      (e: Error) => ({ m: null, e: e.message }),
    ),
  ]);
  return { now, grid, results, marine: marineRes.m, marineError: marineRes.e };
}

export function modelStatuses(b: RawBundle): ModelStatus[] {
  return b.results.map((r) => ({
    id: r.model.id,
    name: r.model.name,
    short: r.model.short,
    color: r.model.color,
    omId: r.omId,
    error: r.error,
    coverage: r.points ? r.points.filter((p) => hasData(p)).length : 0,
  }));
}

export function spotModels(b: RawBundle, spotIndex: number): ModelSeries[] {
  return b.results.map((r) => modelSeries(r.model, r.points?.[spotIndex] ?? null, b.grid));
}

export function spotHourly(b: RawBundle, spotIndex: number): Omit<SpotHourly, "time"> {
  const bl = blend(spotModels(b, spotIndex), b.grid, b.now);
  const m = b.marine?.[spotIndex] ?? null;
  return {
    ...bl,
    wave: round1(align(m, "wave_height", b.grid)),
    wavePer: round1(align(m, "wave_period", b.grid)),
    waveDir: align(m, "wave_direction", b.grid),
    swell: round1(align(m, "swell_wave_height", b.grid)),
    sst: round1(align(m, "sea_surface_temperature", b.grid)),
  };
}

export async function getOverview(): Promise<OverviewData> {
  const b = await fetchBundle();
  const spots: OverviewData["spots"] = {};
  SPOTS.forEach((s, i) => {
    spots[s.id] = spotHourly(b, i);
  });
  return {
    generatedAt: Math.floor(Date.now() / 1000),
    now: b.now,
    time: b.grid,
    models: modelStatuses(b),
    marineError: b.marineError,
    spots,
  };
}

export interface SpotDetailData {
  generatedAt: number;
  now: number;
  spotId: string;
  time: number[];
  blended: Omit<SpotHourly, "time">;
  models: (ModelStatus & {
    w: (number | null)[];
    g: (number | null)[];
    d: (number | null)[];
    temp: (number | null)[];
    cloud: (number | null)[];
    precip: (number | null)[];
  })[];
}

export async function getSpotDetail(spot: Spot): Promise<SpotDetailData> {
  const b = await fetchBundle();
  const idx = SPOTS.findIndex((s) => s.id === spot.id);
  const statuses = modelStatuses(b);
  const ms = spotModels(b, idx);
  return {
    generatedAt: Math.floor(Date.now() / 1000),
    now: b.now,
    spotId: spot.id,
    time: b.grid,
    blended: spotHourly(b, idx),
    models: ms.map((m, k) => ({
      ...statuses[k],
      w: round1(m.w),
      g: round1(m.g),
      d: m.d.map((v) => (v == null ? null : Math.round(v))),
      temp: round1(m.temp),
      cloud: m.cloud.map((v) => (v == null ? null : Math.round(v))),
      precip: round1(m.precip),
    })),
  };
}
