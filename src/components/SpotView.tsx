"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SpotDetailData } from "@/lib/server/forecast";
import type { StationObs } from "@/lib/server/observations";
import { STATIONS } from "@/lib/metar";
import { MODEL_BY_ID } from "@/lib/models";
import {
  beginnerScore,
  freeflyScore,
  hourInput,
  summarizeDays,
  weatherScore,
  PROFILES,
  type SpotHourly,
} from "@/lib/scoring";
import { REGIONS, SPOT_BY_ID } from "@/lib/spots";
import { ago, formatDay, localParts, todayLocal } from "@/lib/time";
import { compassFr, dirQuality, DIR_QUALITY_LABEL, haversineKm, windName, scoreColor, scoreTextColor } from "@/lib/wind";
import Compass from "./Compass";
import LineChart, { type ChartSeries } from "./LineChart";
import { DirArrow, ScoreDot, SpotBadges, StaleBanner, WindBox, WindLegend } from "./ui";
import { useApi } from "./useApi";

const MAIN_MODELS = ["arome_hd", "icon_2i", "icon_eu", "ecmwf"];

export default function SpotView({ id, initialDate }: { id: string; initialDate: string | null }) {
  const spot = SPOT_BY_ID[id];
  const { data, error, loading, stale } = useApi<SpotDetailData>(`/api/spot/${id}`);
  const obsApi = useApi<{ generatedAt: number; stations: StationObs[] }>("/api/observations");
  const [allModels, setAllModels] = useState(false);
  const today = todayLocal();

  const hourly: SpotHourly | null = useMemo(() => (data ? { time: data.time, ...data.blended } : null), [data]);

  const dates = useMemo(() => {
    if (!hourly) return [];
    const set = new Set<string>();
    hourly.time.forEach((t, i) => {
      const { date } = localParts(t);
      if (date >= today && hourly.w[i] != null) set.add(date);
    });
    return [...set].sort();
  }, [hourly, today]);

  const [date, setDate] = useState<string | null>(initialDate);
  const day = date && dates.includes(date) ? date : dates[0] ?? null;

  const daySummaries = useMemo(() => {
    if (!hourly) return null;
    return Object.fromEntries(
      PROFILES.map((p) => [p.id, new Map(summarizeDays(spot, hourly, p.id).map((d) => [d.date, d]))]),
    );
  }, [hourly, spot]);

  const hoursIdx = useMemo(() => {
    if (!hourly || !day) return [];
    return hourly.time
      .map((t, i) => ({ i, p: localParts(t) }))
      .filter(({ p }) => p.date === day && p.hour >= 7 && p.hour <= 21)
      .map(({ i }) => i);
  }, [hourly, day]);

  const nearest = useMemo(
    () =>
      STATIONS.map((s) => ({ s, km: haversineKm(spot.lat, spot.lon, s.lat, s.lon) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 3),
    [spot],
  );

  // Graphique : de maintenant -6 h à +5 jours
  const chart = useMemo(() => {
    if (!data || !hourly) return null;
    const startI = Math.max(0, data.time.findIndex((t) => t >= data.now - 6 * 3600));
    const endI = Math.min(data.time.length, startI + 6 + 24 * 5);
    const sl = <T,>(a: T[]) => a.slice(startI, endI);
    const models = data.models.filter((m) => m.coverage > 0 && (allModels || MAIN_MODELS.includes(m.id)));
    const series: ChartSeries[] = models
      .filter((m) => m.w.some((v) => v != null))
      .map((m) => ({ id: m.id, label: m.short, color: m.color, values: sl(m.w), width: 1.5 }));
    series.unshift({ id: "mix", label: "Mix pondéré", color: "var(--text)", values: sl(hourly.w), width: 3 });
    const lo: (number | null)[] = [];
    const hi: (number | null)[] = [];
    for (let i = startI; i < endI; i++) {
      const vals = data.models.filter((m) => m.coverage > 0 && m.id !== "aifs").map((m) => m.w[i]).filter((v): v is number => v != null);
      lo.push(vals.length >= 2 ? Math.min(...vals) : null);
      hi.push(vals.length >= 2 ? Math.max(...vals) : null);
    }
    return { time: sl(data.time), series, band: { lo, hi, label: "Écart entre modèles" } };
  }, [data, hourly, allModels]);

  const nowIdx = data ? data.time.findIndex((t) => t >= data.now) : -1;
  const nowDir = hourly && nowIdx >= 0 ? hourly.d[nowIdx] : null;

  return (
    <div>
      <p className="small" style={{ marginTop: 12 }}>
        <Link href="/">← Planning</Link> · {REGIONS[spot.region].name}
      </p>
      <h1>{spot.name}</h1>
      <SpotBadges spot={spot} />

      <div className="grid-2">
        <div className="card">
          <dl className="kv">
            <dt>Plan d&apos;eau</dt>
            <dd>{spot.water}</dd>
            <dt>Bons vents</dt>
            <dd>{spot.bestWinds}</dd>
          </dl>
          <h3 style={{ marginTop: 10 }}>À savoir</h3>
          <ul className="clean small">
            {spot.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <h3>Dangers</h3>
          <ul className="clean small">
            {spot.hazards.map((n) => (
              <li key={n}>⚠ {n}</li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 10 }}>
            <a className="btn" href={`https://www.windy.com/?${spot.lat},${spot.lon},11`} target="_blank" rel="noreferrer">
              Windy (balises)
            </a>
            <a className="btn" href={`https://www.windfinder.com/#12/${spot.lat}/${spot.lon}`} target="_blank" rel="noreferrer">
              Windfinder
            </a>
            <a className="btn" href="https://holfuy.com/en/map" target="_blank" rel="noreferrer">
              Holfuy
            </a>
            <a
              className="btn"
              href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              Itinéraire
            </a>
            <a
              className="btn"
              href={`https://www.google.com/maps/search/camping/@${spot.lat},${spot.lon},12z`}
              target="_blank"
              rel="noreferrer"
            >
              Campings autour
            </a>
          </div>
        </div>
        <div className="card row" style={{ alignItems: "flex-start", justifyContent: "space-around" }}>
          <div>
            <h3>Directions de vent</h3>
            <Compass spot={spot} current={nowDir} />
          </div>
          <div style={{ minWidth: 150 }}>
            <h3>Maintenant (prévision)</h3>
            {hourly && nowIdx >= 0 ? (
              <>
                <div className="big-wind">
                  {hourly.w[nowIdx] != null ? Math.round(hourly.w[nowIdx] as number) : "–"} <span className="small">nds</span>
                </div>
                <div className="small">
                  rafales {hourly.g[nowIdx] != null ? Math.round(hourly.g[nowIdx] as number) : "?"} nds
                  {nowDir != null && (
                    <>
                      <br />
                      {compassFr(nowDir)} – {windName(nowDir)}
                      <br />
                      <span className="muted">{DIR_QUALITY_LABEL[dirQuality(spot, nowDir)]}</span>
                    </>
                  )}
                  {hourly.wave[nowIdx] != null && (
                    <>
                      <br />
                      Vagues {hourly.wave[nowIdx]} m
                      {hourly.wavePer[nowIdx] != null ? ` / ${hourly.wavePer[nowIdx]} s` : ""}
                    </>
                  )}
                  {hourly.sst[nowIdx] != null && (
                    <>
                      <br />
                      Eau {Math.round(hourly.sst[nowIdx] as number)} °C
                    </>
                  )}
                </div>
              </>
            ) : (
              <span className="muted">–</span>
            )}
          </div>
        </div>
      </div>

      <StaleBanner stale={stale} error={error} generatedAt={data?.generatedAt} />
      {loading && !data && <div className="card muted">Chargement…</div>}

      <h2>Balises proches (mesuré)</h2>
      <div className="grid-cards">
        {nearest.map(({ s, km }) => {
          const st = obsApi.data?.stations.find((x) => x.station.id === s.id);
          const last = st?.obs[st.obs.length - 1];
          return (
            <div key={s.id} className="card" style={{ margin: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{s.name}</strong>
                <span className="muted tiny">
                  {s.id} · {Math.round(km)} km
                </span>
              </div>
              {last ? (
                <div className="row" style={{ marginTop: 4 }}>
                  <WindBox kn={last.speed} />
                  {last.gust != null && <span className="small">raf. {last.gust}</span>}
                  <DirArrow deg={last.dir} /> <span className="small">{last.dir != null ? compassFr(last.dir) : "var."}</span>
                  <span className="muted tiny">{ago(last.time)}</span>
                </div>
              ) : (
                <div className="muted small">{obsApi.loading ? "…" : "pas de mesure récente"}</div>
              )}
              <div className="muted tiny">{s.note}</div>
            </div>
          );
        })}
      </div>

      {hourly && daySummaries && (
        <>
          <h2>Heure par heure</h2>
          <div className="chips" role="group" aria-label="Jour">
            {dates.map((d) => (
              <button key={d} className="chip" aria-pressed={d === day} onClick={() => setDate(d)}>
                {formatDay(d, true)}
              </button>
            ))}
          </div>
          {day && (
            <div className="row small" style={{ marginBottom: 8 }}>
              {PROFILES.map((p) => {
                const s = daySummaries[p.id]?.get(day);
                return (
                  <span key={p.id} className="row" style={{ gap: 4 }}>
                    <ScoreDot score={s?.score} /> {p.emoji} {p.label}
                    {s?.window ? <span className="muted tiny">({s.window})</span> : null}
                  </span>
                );
              })}
            </div>
          )}
          <WindLegend />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th className="sticky-col">Heure</th>
                  {hoursIdx.map((i) => (
                    <th key={i}>{localParts(hourly.time[i]).hour}h</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky-col">
                    <strong>Mix</strong> vent
                  </td>
                  {hoursIdx.map((i) => (
                    <td key={i}>
                      <WindBox kn={hourly.w[i]} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky-col">Rafales</td>
                  {hoursIdx.map((i) => (
                    <td key={i}>
                      <WindBox kn={hourly.g[i]} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky-col">Direction</td>
                  {hoursIdx.map((i) => {
                    const d = hourly.d[i];
                    const q = d == null ? null : dirQuality(spot, d);
                    return (
                      <td
                        key={i}
                        title={q ? DIR_QUALITY_LABEL[q] : undefined}
                        style={{ color: q === "offshore" ? "var(--danger)" : q === "poor" ? "var(--warn)" : undefined }}
                      >
                        <DirArrow deg={d} />
                        <div className="tiny">{d != null ? compassFr(d) : ""}</div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky-col">Écart modèles</td>
                  {hoursIdx.map((i) => (
                    <td key={i} className="tiny muted">
                      {hourly.spread[i] != null ? `±${Math.round((hourly.spread[i] as number) / 2)}` : "–"}
                    </td>
                  ))}
                </tr>
                {data!.models
                  .filter((m) => hoursIdx.some((i) => m.w[i] != null))
                  .map((m) => (
                    <tr key={m.id}>
                      <td className="sticky-col small" title={MODEL_BY_ID[m.id]?.name}>
                        <span className="swatch" style={{ background: m.color }} />
                        {m.short}
                      </td>
                      {hoursIdx.map((i) => (
                        <td key={i} className="small">
                          {m.w[i] == null ? (
                            <span className="muted">·</span>
                          ) : (
                            <span title={m.d[i] != null ? compassFr(m.d[i] as number) : undefined}>
                              <WindBox kn={m.w[i]} />
                              {m.g[i] != null && <div className="tiny muted">{Math.round(m.g[i] as number)}</div>}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                <tr>
                  <td className="sticky-col">Vagues (m)</td>
                  {hoursIdx.map((i) => (
                    <td key={i} className="small">
                      {hourly.wave[i] ?? "–"}
                      {hourly.wavePer[i] != null && <div className="tiny muted">{Math.round(hourly.wavePer[i] as number)} s</div>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky-col">Nuages</td>
                  {hoursIdx.map((i) => (
                    <td key={i} className="small">
                      {cloudIcon(hourly.cloud[i], hourly.precip[i])}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky-col">Pluie (mm)</td>
                  {hoursIdx.map((i) => (
                    <td key={i} className="small" style={{ color: (hourly.precip[i] ?? 0) > 0.2 ? "#2563eb" : "var(--muted)" }}>
                      {(hourly.precip[i] ?? 0) > 0.05 ? hourly.precip[i] : "·"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky-col">Temp. (°C)</td>
                  {hoursIdx.map((i) => (
                    <td key={i} className="small">
                      {hourly.temp[i] != null ? Math.round(hourly.temp[i] as number) : "–"}
                    </td>
                  ))}
                </tr>
                {(
                  [
                    ["🌱 Débutante", (i: number) => beginnerScore(spot, hourInput(hourly, i))],
                    ["🌊 Freefly", (i: number) => freeflyScore(spot, hourInput(hourly, i))],
                    ["☀️ Plage", (i: number) => weatherScore(hourInput(hourly, i))],
                  ] as const
                ).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="sticky-col small">{label}</td>
                    {hoursIdx.map((i) => {
                      const sc = Math.round(fn(i));
                      return (
                        <td key={i}>
                          <span
                            className="score-dot"
                            style={{ background: scoreColor(sc), color: scoreTextColor(sc), minWidth: 28, height: 22, fontSize: "0.75rem" }}
                          >
                            {sc}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted tiny">
            Petits chiffres sous les modèles = rafales. Le « mix » combine les modèles selon l&apos;échéance (AROME + ICON-2I
            à court terme, ICON-EU + ECMWF ensuite).
          </p>
        </>
      )}

      {chart && (
        <>
          <h2>Vent sur 5 jours – comparaison des modèles</h2>
          <div className="card">
            <label className="small row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={allModels} onChange={(e) => setAllModels(e.target.checked)} /> Afficher tous
              les modèles
            </label>
            <LineChart
              time={chart.time}
              series={chart.series}
              band={chart.band}
              unit="nds"
              now={data?.now}
              refLines={[
                { y: 12, label: "12 nds" },
                { y: 20, label: "20 nds" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

function cloudIcon(cloud: number | null, precip: number | null): string {
  if ((precip ?? 0) >= 0.5) return "🌧";
  if ((precip ?? 0) > 0.1) return "🌦";
  if (cloud == null) return "–";
  if (cloud < 20) return "☀️";
  if (cloud < 50) return "🌤";
  if (cloud < 80) return "⛅";
  return "☁️";
}

