import { fetchEnsemble, type PointSeries } from "../openmeteo";
import { REGIONS, type RegionId } from "../spots";
import { localParts } from "../time";

export interface EnsembleDay {
  date: string;
  members: number;
  /** Percentiles du vent moyen de l'après-midi (11h–17h), nœuds. */
  p10: number;
  p50: number;
  p90: number;
  /** Probabilités (0–100). */
  pOver12: number;
  pOver18: number;
  /** Secteur W–NW (Ponente/Mistral) avec ≥ 12 nds. */
  pMistral: number;
  /** Secteur E–SE (Levante/Scirocco) avec ≥ 12 nds. */
  pScirocco: number;
  /** Secteur S–SW (Ostro/Libeccio) avec ≥ 12 nds. */
  pLibeccio: number;
}

export interface EnsembleRegion {
  region: RegionId;
  name: string;
  omId: string | null;
  error: string | null;
  days: EnsembleDay[];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Regroupe les membres d'ensemble : `wind_speed_10m` (contrôle) + `wind_speed_10m_memberNN`. */
export function memberKeys(p: PointSeries, base: string): string[] {
  return Object.keys(p.vars).filter((k) => k === base || k.startsWith(`${base}_member`));
}

export function summarizeEnsemble(p: PointSeries): EnsembleDay[] {
  const speedKeys = memberKeys(p, "wind_speed_10m");
  const byDate = new Map<string, number[]>();
  p.time.forEach((t, i) => {
    const { date, hour } = localParts(t);
    if (hour < 11 || hour > 17) return;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(i);
  });
  const days: EnsembleDay[] = [];
  for (const [date, idxs] of byDate) {
    const means: { w: number; d: number | null }[] = [];
    for (const sk of speedKeys) {
      const dk = sk.replace("wind_speed_10m", "wind_direction_10m");
      const ws = p.vars[sk];
      const ds = p.vars[dk];
      let sum = 0;
      let n = 0;
      let x = 0;
      let y = 0;
      for (const i of idxs) {
        const w = ws?.[i];
        if (w == null) continue;
        sum += w;
        n++;
        const d = ds?.[i];
        if (d != null) {
          const r = (d * Math.PI) / 180;
          x += Math.sin(r) * w;
          y += Math.cos(r) * w;
        }
      }
      if (!n) continue;
      const dir = x === 0 && y === 0 ? null : ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
      means.push({ w: sum / n, d: dir });
    }
    if (means.length < 5) continue;
    const sorted = means.map((m) => m.w).sort((a, b) => a - b);
    const pct = (f: (m: { w: number; d: number | null }) => boolean) =>
      Math.round((100 * means.filter(f).length) / means.length);
    const inSector = (d: number | null, a: number, b: number) => d != null && d >= a && d < b;
    days.push({
      date,
      members: means.length,
      p10: Math.round(percentile(sorted, 0.1) * 10) / 10,
      p50: Math.round(percentile(sorted, 0.5) * 10) / 10,
      p90: Math.round(percentile(sorted, 0.9) * 10) / 10,
      pOver12: pct((m) => m.w >= 12),
      pOver18: pct((m) => m.w >= 18),
      pMistral: pct((m) => m.w >= 12 && inSector(m.d, 247.5, 360)),
      pScirocco: pct((m) => m.w >= 12 && inSector(m.d, 67.5, 157.5)),
      pLibeccio: pct((m) => m.w >= 12 && inSector(m.d, 157.5, 247.5)),
    });
  }
  return days;
}

export async function getEnsemble(): Promise<{ generatedAt: number; regions: EnsembleRegion[] }> {
  const ids = Object.keys(REGIONS) as RegionId[];
  const regions = await Promise.all(
    ids.map(async (id): Promise<EnsembleRegion> => {
      const r = REGIONS[id];
      try {
        const { omId, data } = await fetchEnsemble({ lat: r.lat, lon: r.lon });
        return { region: id, name: r.name, omId, error: null, days: summarizeEnsemble(data) };
      } catch (e) {
        return { region: id, name: r.name, omId: null, error: (e as Error).message, days: [] };
      }
    }),
  );
  return { generatedAt: Math.floor(Date.now() / 1000), regions };
}
