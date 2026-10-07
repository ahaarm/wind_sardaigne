"use client";

import type { VerificationData, ModelVerification } from "@/lib/server/observations";
import { STATION_BY_ID } from "@/lib/metar";
import { formatDateTime } from "@/lib/time";
import { StaleBanner } from "./ui";
import { useApi } from "./useApi";

function maeColor(mae: number | null): string {
  if (mae == null) return "transparent";
  // séquentiel : plus c'est foncé, plus l'erreur est grande
  const l = Math.max(45, 95 - mae * 7);
  return `hsl(25 80% ${l}%)`;
}

export default function Verification() {
  const { data, error, loading, stale } = useApi<VerificationData>("/api/verification");
  const ranked: ModelVerification[] = data
    ? [...data.models].sort((a, b) => (a.byLead["1"]?.mae ?? 99) - (b.byLead["1"]?.mae ?? 99))
    : [];
  return (
    <div>
      <StaleBanner stale={stale} error={error} generatedAt={data?.generatedAt} />
      {loading && !data && <div className="card muted">Calcul en cours (prévisions passées vs METAR)…</div>}
      {data && (
        <>
          <p className="small muted">
            Sur les {data.days} derniers jours, en journée (9h–19h), aux balises :{" "}
            {data.stationsUsed.map((id) => STATION_BY_ID[id]?.name ?? id).join(", ") || "aucune"}. MAE = erreur moyenne
            en nœuds (plus c&apos;est bas, mieux c&apos;est). Biais &gt; 0 : le modèle surestime. « Bon tri » = % d&apos;heures
            où le modèle a correctement prévu ≥ 10 nds ou non. Calculé le {formatDateTime(data.generatedAt)}.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sticky-col">Modèle</th>
                  <th>MAE J-1</th>
                  <th>Biais J-1</th>
                  <th>Bon tri J-1</th>
                  <th>MAE J-2</th>
                  <th>MAE J-3</th>
                  <th>n</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((m) => {
                  const l1 = m.byLead["1"];
                  return (
                    <tr key={m.id}>
                      <td className="sticky-col">
                        <span className="swatch" style={{ background: m.color }} />
                        {m.short}
                        {m.error && (
                          <div className="tiny muted" style={{ whiteSpace: "normal", maxWidth: 220 }}>
                            indisponible
                          </div>
                        )}
                      </td>
                      <td style={{ background: maeColor(l1?.mae ?? null), fontWeight: 700 }}>{l1?.mae ?? "–"}</td>
                      <td>{l1?.bias != null ? (l1.bias > 0 ? `+${l1.bias}` : l1.bias) : "–"}</td>
                      <td>{l1?.hit != null ? `${l1.hit}%` : "–"}</td>
                      <td style={{ background: maeColor(m.byLead["2"]?.mae ?? null) }}>{m.byLead["2"]?.mae ?? "–"}</td>
                      <td style={{ background: maeColor(m.byLead["3"]?.mae ?? null) }}>{m.byLead["3"]?.mae ?? "–"}</td>
                      <td className="tiny muted">{l1?.n ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary className="small">Détail par balise (MAE J-1)</summary>
            <div className="table-wrap" style={{ marginTop: 6 }}>
              <table>
                <thead>
                  <tr>
                    <th className="sticky-col">Modèle</th>
                    {data.stationsUsed.map((id) => (
                      <th key={id} title={STATION_BY_ID[id]?.name}>
                        {id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((m) => (
                    <tr key={m.id}>
                      <td className="sticky-col">{m.short}</td>
                      {data.stationsUsed.map((id) => {
                        const s = m.byStation[id];
                        return (
                          <td key={id} style={{ background: maeColor(s?.mae ?? null) }} title={s ? `biais ${s.bias} · n=${s.n}` : undefined}>
                            {s?.mae ?? "–"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="tiny muted">
            Limites : les balises METAR sont surtout des aéroports, pas des spots ; 7 jours, c&apos;est un petit échantillon
            (dépend de la météo de la semaine). Utilisez-le comme indice, en complément de la règle générale ci-dessus.
          </p>
        </>
      )}
    </div>
  );
}
