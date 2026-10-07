"use client";

import Link from "next/link";
import type { EnsembleDay, EnsembleRegion } from "@/lib/server/ensemble";
import { REGIONS, SPOTS } from "@/lib/spots";
import { formatDay, todayLocal } from "@/lib/time";
import { StaleBanner } from "./ui";
import { useApi } from "./useApi";
import { TRIP } from "@/lib/trip";

/** Couleur séquentielle (une teinte, clair → foncé) pour une probabilité 0–100. */
function probColor(p: number): string {
  const l = 96 - p * 0.55;
  return `hsl(186 70% ${l}%)`;
}
function probText(p: number): string {
  return p >= 60 ? "#fff" : "#10202f";
}

function dominant(d: EnsembleDay): { label: string; p: number } | null {
  const opts = [
    { label: "Mistral/Ponente", p: d.pMistral },
    { label: "Scirocco/Levante", p: d.pScirocco },
    { label: "Libeccio/Sud", p: d.pLibeccio },
  ].sort((a, b) => b.p - a.p);
  return opts[0].p >= 20 ? opts[0] : null;
}

export default function Trend() {
  const { data, error, loading, stale } = useApi<{ generatedAt: number; regions: EnsembleRegion[] }>("/api/ensemble");
  const today = todayLocal();
  const dates = [...new Set(data?.regions.flatMap((r) => r.days.map((d) => d.date)) ?? [])]
    .filter((d) => d >= today)
    .sort();

  return (
    <div>
      <h1 style={{ marginTop: 12 }}>Tendance à 15 jours (ensemble ECMWF)</h1>
      <p className="small muted">
        Au-delà de 4–5 jours, un seul modèle n&apos;est plus fiable. L&apos;ensemble ECMWF fait tourner ~51 scénarios légèrement
        différents : la proportion de scénarios venteux donne une <strong>probabilité</strong>. Calculé sur le vent moyen de
        11h à 17h, par région. Idéal pour décider vers quelle côte rouler.
      </p>
      <StaleBanner stale={stale} error={error} generatedAt={data?.generatedAt} />
      {loading && !data && <div className="card muted">Chargement des 51 scénarios…</div>}

      {data && (
        <>
          <h2>Probabilité de vent navigable (≥ 10 nds établis l&apos;après-midi)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sticky-col">Région</th>
                  {dates.map((d) => (
                    <th key={d} style={{ textTransform: "capitalize", opacity: d < TRIP.start || d > TRIP.end ? 0.6 : 1 }}>
                      {formatDay(d, true)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.regions.map((r) => (
                  <tr key={r.region}>
                    <td className="sticky-col">
                      <strong>{REGIONS[r.region].short}</strong>
                    </td>
                    {dates.map((date) => {
                      const d = r.days.find((x) => x.date === date);
                      if (!d) return <td key={date}>–</td>;
                      const dom = dominant(d);
                      return (
                        <td key={date}>
                          <span
                            className="cell-btn"
                            style={{ background: probColor(d.pRide), color: probText(d.pRide) }}
                            title={`Médiane ${d.p50} nds (P10 ${d.p10} – P90 ${d.p90}) · ≥18 nds : ${d.pOver18} %`}
                          >
                            <span className="cell-score">{d.pRide}%</span>
                            <span className="cell-sub" style={{ display: "block" }}>
                              {dom ? dom.label.split("/")[0] : "–"}
                            </span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="legend" style={{ marginTop: 6 }}>
            <span>Probabilité :</span>
            {[0, 20, 40, 60, 80, 100].map((p) => (
              <span key={p}>
                <span className="swatch" style={{ background: probColor(p) }} />
                {p}%
              </span>
            ))}
            <span>· sous le % : régime de vent dominant</span>
          </div>

          <h2>Détail par région</h2>
          <div className="grid-2">
            {data.regions.map((r) => (
              <div key={r.region} className="card" style={{ margin: 0 }}>
                <h3>{r.name}</h3>
                <p className="tiny muted" style={{ marginTop: 0 }}>
                  Spots :{" "}
                  {SPOTS.filter((s) => s.region === r.region).map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      <Link href={`/spot/${s.id}`}>{s.name}</Link>
                    </span>
                  ))}
                </p>
                {r.error && <div className="banner error small">{r.error}</div>}
                <div className="table-wrap" style={{ border: "none" }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Jour</th>
                        <th>Vent 11–17h (P10–P90)</th>
                        <th>≥10</th>
                        <th>≥18</th>
                        <th title="Secteur ouest à nord-ouest">Mistral</th>
                        <th title="Secteur est à sud-est">Sciro.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.days
                        .filter((d) => d.date >= today)
                        .map((d) => (
                          <tr key={d.date}>
                            <td style={{ textAlign: "left", textTransform: "capitalize" }}>{formatDay(d.date, true)}</td>
                            <td>
                              <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                                <div className="bar-track" style={{ flex: 1 }} title={`P10 ${d.p10} · médiane ${d.p50} · P90 ${d.p90}`}>
                                  <div
                                    className="bar-range"
                                    style={{ left: `${(Math.min(d.p10, 35) / 35) * 100}%`, width: `${((Math.min(d.p90, 35) - Math.min(d.p10, 35)) / 35) * 100}%` }}
                                  />
                                  <div className="bar-median" style={{ left: `calc(${(Math.min(d.p50, 35) / 35) * 100}% - 1px)` }} />
                                </div>
                                <span className="tiny" style={{ minWidth: 44 }}>
                                  {Math.round(d.p50)} nds
                                </span>
                              </div>
                            </td>
                            <td>{d.pRide}%</td>
                            <td>{d.pOver18}%</td>
                            <td>{d.pMistral}%</td>
                            <td>{d.pScirocco}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <p className="tiny muted">
            Barre : plage entre les 10 % de scénarios les moins ventés et les 10 % les plus ventés (échelle 0–35 nds), trait =
            médiane. Une barre large = forte incertitude. Les modèles globaux (~25 km) sous-estiment souvent les zones
            d&apos;accélération (Bouches de Bonifacio, caps) : raisonnez en tendance, pas en valeur exacte.
          </p>
        </>
      )}
    </div>
  );
}
