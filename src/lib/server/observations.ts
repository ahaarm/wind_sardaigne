import { fetchStationObs, STATIONS, type Obs, type Station } from "../metar";
import { MODELS } from "../models";
import { fetchPreviousRuns, type PointSeries } from "../openmeteo";
import { localParts } from "../time";

export interface StationObs {
  station: Station;
  obs: Obs[];
}

export async function getObservations(hours = 26): Promise<{ generatedAt: number; stations: StationObs[] }> {
  const stations = await Promise.all(
    STATIONS.map(async (station) => ({ station, obs: await fetchStationObs(station.id, hours, 600) })),
  );
  return { generatedAt: Math.floor(Date.now() / 1000), stations };
}

// ------------------------------------------------------------------------------------------
// Vérification : prévisions des runs précédents vs vent mesuré aux balises.
// ------------------------------------------------------------------------------------------

export interface ErrorStats {
  n: number;
  /** Erreur absolue moyenne (nœuds). */
  mae: number | null;
  /** Biais moyen prévision − mesure (nœuds) : > 0 = le modèle surestime. */
  bias: number | null;
  /** % d'heures où le modèle a bien prévu « navigable » (≥ 12 nds) ou non. */
  hit: number | null;
}

export interface ModelVerification {
  id: string;
  name: string;
  short: string;
  color: string;
  omId: string | null;
  error: string | null;
  /** Clés : 1, 2, 3 = prévision émise 1, 2, 3 jours avant. */
  byLead: Record<string, ErrorStats>;
  /** Par station, pour l'échéance J-1. */
  byStation: Record<string, ErrorStats>;
}

export interface VerificationData {
  generatedAt: number;
  days: number;
  stationsUsed: string[];
  models: ModelVerification[];
}

const THRESHOLD = 12;

function stats(pairs: [number, number][]): ErrorStats {
  if (!pairs.length) return { n: 0, mae: null, bias: null, hit: null };
  let ae = 0;
  let b = 0;
  let hit = 0;
  for (const [f, o] of pairs) {
    ae += Math.abs(f - o);
    b += f - o;
    if (f >= THRESHOLD === o >= THRESHOLD) hit++;
  }
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { n: pairs.length, mae: r1(ae / pairs.length), bias: r1(b / pairs.length), hit: Math.round((100 * hit) / pairs.length) };
}

/** Une mesure par heure pleine (celle la plus proche, à ±20 min), uniquement en journée (9h–19h locale). */
export function hourlyObs(obs: Obs[]): Map<number, number> {
  const best = new Map<number, { dt: number; v: number }>();
  for (const o of obs) {
    if (o.speed == null) continue;
    const h = Math.round(o.time / 3600) * 3600;
    const dt = Math.abs(o.time - h);
    if (dt > 20 * 60) continue;
    const lh = localParts(h).hour;
    if (lh < 9 || lh > 19) continue;
    const cur = best.get(h);
    if (!cur || dt < cur.dt) best.set(h, { dt, v: o.speed });
  }
  return new Map([...best].map(([h, x]) => [h, x.v]));
}

export function pairsFor(series: PointSeries, key: string, obsByHour: Map<number, number>): [number, number][] {
  const s = series.vars[key];
  if (!s) return [];
  const out: [number, number][] = [];
  series.time.forEach((t, i) => {
    const f = s[i];
    const o = obsByHour.get(t);
    if (f != null && o != null) out.push([f, o]);
  });
  return out;
}

export async function getVerification(days = 7): Promise<VerificationData> {
  const obsList = await Promise.all(
    STATIONS.map(async (s) => ({ s, obs: hourlyObs(await fetchStationObs(s.id, days * 24, 3600)) })),
  );
  const used = obsList.filter((x) => x.obs.size >= 10);
  const points = used.map((x) => ({ lat: x.s.lat, lon: x.s.lon }));

  const models = await Promise.all(
    MODELS.map(async (m): Promise<ModelVerification> => {
      const base = { id: m.id, name: m.name, short: m.short, color: m.color };
      if (!points.length) return { ...base, omId: null, error: "Aucune balise disponible", byLead: {}, byStation: {} };
      const errors: string[] = [];
      for (const omId of m.candidates) {
        try {
          const series = await fetchPreviousRuns(omId, points, days);
          const byLead: Record<string, ErrorStats> = {};
          const byStation: Record<string, ErrorStats> = {};
          for (const lead of [1, 2, 3]) {
            const all: [number, number][] = [];
            used.forEach((u, k) => {
              const p = pairsFor(series[k], `wind_speed_10m_previous_day${lead}`, u.obs);
              all.push(...p);
              if (lead === 1) byStation[u.s.id] = stats(p);
            });
            byLead[String(lead)] = stats(all);
          }
          return { ...base, omId, error: null, byLead, byStation };
        } catch (e) {
          errors.push(`${omId}: ${(e as Error).message}`);
        }
      }
      return { ...base, omId: null, error: errors.join(" | "), byLead: {}, byStation: {} };
    }),
  );
  return { generatedAt: Math.floor(Date.now() / 1000), days, stationsUsed: used.map((u) => u.s.id), models };
}
