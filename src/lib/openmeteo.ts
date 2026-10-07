import { getJson } from "./http";
import { FORECAST_VARS, MARINE_VARS, type ModelDef } from "./models";

export type Series = (number | null)[];

export interface PointSeries {
  /** Horodatages unix (secondes, UTC). */
  time: number[];
  vars: Record<string, Series>;
}

export interface LatLon {
  lat: number;
  lon: number;
}

interface OMResponse {
  latitude: number;
  longitude: number;
  hourly?: Record<string, (number | null)[]> & { time: number[] };
  error?: boolean;
  reason?: string;
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const ENSEMBLE_URL = "https://ensemble-api.open-meteo.com/v1/ensemble";
const PREVIOUS_RUNS_URL = "https://previous-runs-api.open-meteo.com/v1/forecast";

/** Durées de cache (secondes). */
export const CACHE = {
  forecast: 60 * 60,
  marine: 60 * 60,
  ensemble: 3 * 60 * 60,
  previousRuns: 3 * 60 * 60,
};

function coords(points: LatLon[]): string {
  const la = points.map((p) => p.lat.toFixed(4)).join(",");
  const lo = points.map((p) => p.lon.toFixed(4)).join(",");
  return `latitude=${la}&longitude=${lo}`;
}

/**
 * Normalise une réponse Open-Meteo (objet pour 1 point, tableau pour N points)
 * et retire un éventuel suffixe `_<modele>` des noms de variables.
 */
export function normalize(raw: unknown, modelId?: string): PointSeries[] {
  const arr = (Array.isArray(raw) ? raw : [raw]) as OMResponse[];
  return arr.map((r) => {
    if (r?.error) throw new Error(r.reason ?? "Erreur Open-Meteo");
    const hourly = r?.hourly;
    if (!hourly || !Array.isArray(hourly.time)) return { time: [], vars: {} };
    const vars: Record<string, Series> = {};
    for (const [k, v] of Object.entries(hourly)) {
      if (k === "time") continue;
      const key = modelId && k.endsWith(`_${modelId}`) ? k.slice(0, -modelId.length - 1) : k;
      vars[key] = v as Series;
    }
    return { time: hourly.time, vars };
  });
}

export function hasData(p: PointSeries, key = "wind_speed_10m"): boolean {
  const s = p.vars[key];
  return !!s && s.some((v) => v != null);
}

export interface ModelFetchResult {
  model: ModelDef;
  /** Identifiant Open-Meteo effectivement utilisé. */
  omId: string | null;
  points: PointSeries[] | null;
  error: string | null;
}

/** Récupère un modèle pour tous les points, en essayant les identifiants candidats dans l'ordre. */
export async function fetchModel(model: ModelDef, points: LatLon[]): Promise<ModelFetchResult> {
  const errors: string[] = [];
  for (const omId of model.candidates) {
    const url =
      `${FORECAST_URL}?${coords(points)}` +
      `&hourly=${FORECAST_VARS.join(",")}` +
      `&models=${omId}&forecast_days=${model.forecastDays}` +
      `&wind_speed_unit=kn&timeformat=unixtime&timezone=GMT&cell_selection=sea`;
    try {
      const pts = normalize(await getJson(url, CACHE.forecast), omId);
      return { model, omId, points: pts, error: null };
    } catch (e) {
      errors.push(`${omId}: ${(e as Error).message}`);
    }
  }
  return { model, omId: null, points: null, error: errors.join(" | ") };
}

export async function fetchMarine(points: LatLon[], days = 8): Promise<PointSeries[]> {
  const url =
    `${MARINE_URL}?${coords(points)}` +
    `&hourly=${MARINE_VARS.join(",")}&forecast_days=${days}&timeformat=unixtime&timezone=GMT`;
  return normalize(await getJson(url, CACHE.marine));
}

export const ENSEMBLE_CANDIDATES = ["ecmwf_ifs025", "ecmwf_ifs04"];

export async function fetchEnsemble(point: LatLon): Promise<{ omId: string; data: PointSeries }> {
  const errors: string[] = [];
  for (const omId of ENSEMBLE_CANDIDATES) {
    const url =
      `${ENSEMBLE_URL}?${coords([point])}` +
      `&hourly=wind_speed_10m,wind_direction_10m&models=${omId}&forecast_days=15` +
      `&wind_speed_unit=kn&timeformat=unixtime&timezone=GMT`;
    try {
      const [data] = normalize(await getJson(url, CACHE.ensemble), omId);
      return { omId, data };
    } catch (e) {
      errors.push(`${omId}: ${(e as Error).message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

/**
 * Prévisions issues des runs précédents (pour la vérification des modèles).
 * `wind_speed_10m_previous_dayN` = prévision émise ~N jours avant l'heure valide.
 */
export async function fetchPreviousRuns(
  omId: string,
  points: LatLon[],
  pastDays: number,
): Promise<PointSeries[]> {
  const url =
    `${PREVIOUS_RUNS_URL}?${coords(points)}` +
    `&hourly=wind_speed_10m_previous_day1,wind_speed_10m_previous_day2,wind_speed_10m_previous_day3` +
    `&models=${omId}&past_days=${pastDays}&forecast_days=1` +
    `&wind_speed_unit=kn&timeformat=unixtime&timezone=GMT`;
  return normalize(await getJson(url, CACHE.previousRuns), omId);
}
