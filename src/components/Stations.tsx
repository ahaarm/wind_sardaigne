"use client";

import type { StationObs } from "@/lib/server/observations";
import { ago, formatTime } from "@/lib/time";
import { compassFr, windName } from "@/lib/wind";
import LineChart from "./LineChart";
import { DirArrow, StaleBanner, WindBox, WindLegend } from "./ui";
import { useApi } from "./useApi";

export default function Stations() {
  const { data, error, loading, stale } = useApi<{ generatedAt: number; stations: StationObs[] }>("/api/observations");
  return (
    <div>
      <h1 style={{ marginTop: 12 }}>Balises – vent mesuré</h1>
      <p className="small muted">
        Stations METAR officielles (aéroports et caps de l&apos;Aeronautica Militare) mises à jour toutes les 30–60 min.
        Les aéroports sont souvent un peu abrités : sur un spot exposé, le vent réel est généralement plus fort. Pour les
        balises directement sur les spots (Holfuy, Windguru, Pioupiou…), utilisez les liens Windy / Holfuy de chaque spot.
      </p>
      <StaleBanner stale={stale} error={error} generatedAt={data?.generatedAt} />
      {loading && !data && <div className="card muted">Chargement…</div>}
      <WindLegend />
      <div className="grid-cards" style={{ marginTop: 10 }}>
        {data?.stations.map(({ station, obs }) => {
          const last = obs[obs.length - 1];
          const recent = obs.filter((o) => o.time >= Date.now() / 1000 - 24 * 3600);
          return (
            <div key={station.id} className="card" style={{ margin: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{station.name}</strong>
                <span className="muted tiny">{station.id}</span>
              </div>
              <div className="muted tiny">{station.note}</div>
              {last ? (
                <>
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="big-wind">
                      <WindBox kn={last.speed} />
                    </span>
                    <span className="small">
                      {last.gust != null ? `rafales ${last.gust} nds` : "pas de rafales"}
                      <br />
                      <DirArrow deg={last.dir} /> {last.dir != null ? `${compassFr(last.dir)} – ${windName(last.dir)}` : "variable"}
                    </span>
                  </div>
                  <div className="muted tiny">
                    {formatTime(last.time)} ({ago(last.time)})
                  </div>
                  {recent.length > 3 && (
                    <LineChart
                      time={recent.map((o) => o.time)}
                      series={[
                        { id: "w", label: "Vent", color: "#2a78d6", values: recent.map((o) => o.speed) },
                        { id: "g", label: "Rafales", color: "#eb6834", values: recent.map((o) => o.gust), dashed: true, width: 1.5 },
                      ]}
                      unit="nds"
                      height={130}
                    />
                  )}
                  <details className="tiny muted">
                    <summary>METAR brut</summary>
                    <code style={{ whiteSpace: "pre-wrap" }}>{last.raw}</code>
                  </details>
                </>
              ) : (
                <div className="muted small" style={{ marginTop: 6 }}>
                  Pas de mesure sur les dernières 24 h (station non automatique ou hors service).
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
