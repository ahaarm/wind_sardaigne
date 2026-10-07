"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OverviewData } from "@/lib/server/forecast";
import { PROFILES, summarizeDays, type DaySummary, type Profile, type SpotHourly } from "@/lib/scoring";
import { REGIONS, SPOTS, type RegionId, type Spot } from "@/lib/spots";
import { formatDay, todayLocal } from "@/lib/time";
import { TRIP } from "@/lib/trip";
import { scoreColor, scoreTextColor, compassFr } from "@/lib/wind";
import { DirArrow, ScoreDot, ScoreLegend, SpotBadges, StaleBanner } from "./ui";
import { useApi } from "./useApi";


function usePersistent<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setV(s as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  return [
    v,
    (nv: T) => {
      setV(nv);
      try {
        localStorage.setItem(key, nv);
      } catch {
        /* ignore */
      }
    },
  ];
}

export function spotHourlyFrom(data: OverviewData, id: string): SpotHourly {
  return { time: data.time, ...data.spots[id] };
}

export default function Planner() {
  const { data, error, loading, stale } = useApi<OverviewData>("/api/overview");
  const [profile, setProfile] = usePersistent<Profile>("wind-sar:profile", "duo");
  const [region, setRegion] = usePersistent<RegionId | "all">("wind-sar:region", "all");

  const summaries = useMemo(() => {
    if (!data) return null;
    const out: Record<string, Map<string, DaySummary>> = {};
    for (const s of SPOTS) {
      if (!data.spots[s.id]) continue;
      out[s.id] = new Map(summarizeDays(s, spotHourlyFrom(data, s.id), profile).map((d) => [d.date, d]));
    }
    return out;
  }, [data, profile]);

  const today = todayLocal();
  const dates = useMemo(() => {
    if (!summaries) return [];
    const set = new Set<string>();
    for (const m of Object.values(summaries)) for (const [d, s] of m) if (s.score != null && d >= today) set.add(d);
    return [...set].sort().slice(0, 10);
  }, [summaries, today]);

  const visibleSpots = SPOTS.filter((s) => region === "all" || s.region === region);
  const regionsInOrder = (Object.keys(REGIONS) as RegionId[]).filter((r) => region === "all" || r === region);

  const topByDay = useMemo(() => {
    if (!summaries) return [];
    return dates.map((date) => {
      const ranked = visibleSpots
        .map((s) => ({ spot: s, sum: summaries[s.id]?.get(date) }))
        .filter((x): x is { spot: Spot; sum: DaySummary } => x.sum?.score != null && x.sum.score >= 10)
        .sort((a, b) => (b.sum.score ?? 0) - (a.sum.score ?? 0))
        .slice(0, 3);
      return { date, ranked };
    });
  }, [summaries, dates, visibleSpots]);

  const daysToTrip = Math.round((Date.parse(TRIP.start) - Date.parse(today)) / 86400000);
  const prof = PROFILES.find((p) => p.id === profile)!;
  const failedModels = data?.models.filter((m) => m.coverage === 0) ?? [];

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
        <h1 style={{ margin: 0 }}>Où naviguer ?</h1>
        <span className="muted small">
          {daysToTrip > 0
            ? `Départ dans ${daysToTrip} j (9 → 25 oct.)`
            : today <= TRIP.end
              ? `Jour ${-daysToTrip + 1} du voyage`
              : "Voyage terminé"}
        </span>
      </div>

      <div className="chips" role="group" aria-label="Profil">
        {PROFILES.map((p) => (
          <button key={p.id} className="chip" aria-pressed={profile === p.id} onClick={() => setProfile(p.id)}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
      <p className="muted small" style={{ margin: "0 0 4px" }}>
        {prof.help} Note = moyenne des 3 meilleures heures entre 10h et 18h.
      </p>
      <div className="chips" role="group" aria-label="Région">
        <button className="chip" aria-pressed={region === "all"} onClick={() => setRegion("all")}>
          Toute l&apos;île
        </button>
        {(Object.keys(REGIONS) as RegionId[]).map((r) => (
          <button key={r} className="chip" aria-pressed={region === r} onClick={() => setRegion(r)}>
            {REGIONS[r].short}
          </button>
        ))}
      </div>

      <StaleBanner stale={stale} error={error} generatedAt={data?.generatedAt} />
      {loading && !data && <div className="card muted">Chargement des modèles (AROME, ICON-2I, ICON-EU, ECMWF…)…</div>}
      {failedModels.length > 0 && (
        <div className="banner warn small">
          Modèle(s) indisponible(s) pour l&apos;instant : {failedModels.map((m) => m.short).join(", ")} – le mix utilise
          les autres. Détail sur la page <Link href="/modeles">Modèles</Link>.
        </div>
      )}
      {data?.marineError && <div className="banner warn small">Houle indisponible : {data.marineError}</div>}

      {summaries && (
        <>
          <h2>Meilleurs choix par jour</h2>
          <div className="days-scroller">
            {topByDay.map(({ date, ranked }) => (
              <div key={date} className="day-card" style={date < TRIP.start || date > TRIP.end ? { opacity: 0.7 } : undefined}>
                <h3>
                  {formatDay(date)}
                  {date === today && <span className="badge badge-flat" style={{ marginLeft: 6 }}>aujourd&apos;hui</span>}
                </h3>
                {ranked.length === 0 && <div className="muted small">Rien d&apos;intéressant pour ce profil – journée plage / visite ?</div>}
                {ranked.map(({ spot, sum }) => (
                  <Link key={spot.id} className="pick" href={`/spot/${spot.id}?d=${date}`}>
                    <ScoreDot score={sum.score} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {spot.name}
                      </span>
                      <span className="muted tiny">
                        {sum.wind != null ? `${Math.round(sum.wind)} nds ` : ""}
                        {sum.dir != null ? compassFr(sum.dir) : ""}
                        {sum.wave != null ? ` · ${sum.wave} m` : ""}
                        {sum.window ? ` · ${sum.window}` : ""}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <h2>Tous les spots</h2>
          <ScoreLegend />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th className="sticky-col">Spot</th>
                  {dates.map((d) => (
                    <th key={d} className={d === today ? "today-col" : undefined} style={{ textTransform: "capitalize" }}>
                      {formatDay(d, true)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regionsInOrder.map((r) => (
                  <RegionRows key={r} region={r} spots={visibleSpots} dates={dates} summaries={summaries} profile={profile} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted tiny">
            Chaque case : note du jour, vent moyen 12h–17h (nœuds) et direction{profile === "freefly" ? ", hauteur de vagues" : ""}.
            Prévision = mix pondéré des modèles selon l&apos;échéance (voir <Link href="/modeles">Modèles</Link>). Au-delà
            de J+5, regardez plutôt la <Link href="/tendance">tendance d&apos;ensemble</Link>.
          </p>
        </>
      )}
    </div>
  );
}

function RegionRows({
  region,
  spots,
  dates,
  summaries,
  profile,
}: {
  region: RegionId;
  spots: Spot[];
  dates: string[];
  summaries: Record<string, Map<string, DaySummary>>;
  profile: Profile;
}) {
  const list = spots.filter((s) => s.region === region);
  if (!list.length) return null;
  return (
    <>
      <tr className="region-row">
        <td className="sticky-col" colSpan={1}>
          {REGIONS[region].short}
        </td>
        <td colSpan={dates.length} />
      </tr>
      {list.map((s) => (
        <tr key={s.id}>
          <td className="sticky-col spot-col">
            <Link className="spot-link" href={`/spot/${s.id}`}>
              {s.name}
            </Link>
            <div style={{ marginTop: 2 }}>
              <SpotBadges spot={s} />
            </div>
          </td>
          {dates.map((d) => {
            const sum = summaries[s.id]?.get(d);
            return (
              <td key={d}>
                <Link
                  className="cell-btn"
                  href={`/spot/${s.id}?d=${d}`}
                  style={{ background: scoreColor(sum?.score), color: scoreTextColor(sum?.score) }}
                  title={sum?.window ? `Meilleures heures : ${sum.window}` : undefined}
                >
                  <div className="cell-score">{sum?.score ?? "–"}</div>
                  <div className="cell-sub">
                    {sum?.wind != null ? Math.round(sum.wind) : "–"} <DirArrow deg={sum?.dir} size={11} />
                    {profile === "freefly" && sum?.wave != null ? ` ${sum.wave}m` : ""}
                  </div>
                </Link>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
