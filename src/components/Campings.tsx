"use client";

import { useState } from "react";
import { CAMPINGS, RULES } from "@/lib/campings";
import { REGIONS, type RegionId } from "@/lib/spots";
import { formatDay } from "@/lib/time";
import { TRIP } from "@/lib/trip";
import CampingCard from "./CampingCard";

const ORDER = { ouvert: 0, probable: 1, partiel: 2, incertain: 3 } as const;

export default function Campings() {
  const [region, setRegion] = useState<RegionId | "all">("all");
  const [night, setNight] = useState<string>("");
  const list = CAMPINGS.filter((c) => region === "all" || c.region === region)
    .filter((c) => !night || !c.closes || c.closes > night)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div>
      <h1 style={{ marginTop: 12 }}>Où dormir (ouvert en octobre)</h1>
      <div className="banner warn small">
        Recherche du 7 oct. 2026 à partir d&apos;annuaires (Campercontact, park4night, ACSI, Alan Rogers…) : les sites
        officiels n&apos;étaient pas consultables et les dates divergent souvent. <strong>Appelez avant chaque nuit</strong>,
        et vérifiez l&apos;emplacement exact (coordonnées approximatives).
      </div>
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
      <label className="small row" style={{ marginBottom: 8 }}>
        Ouvert la nuit du :
        <input
          type="date"
          min={TRIP.start}
          max={TRIP.end}
          value={night}
          onChange={(e) => setNight(e.target.value)}
          style={{ font: "inherit", padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
        />
        {night && (
          <button className="chip" style={{ padding: "2px 8px" }} onClick={() => setNight("")}>
            {formatDay(night)} ✕
          </button>
        )}
      </label>

      {(Object.keys(REGIONS) as RegionId[])
        .filter((r) => list.some((c) => c.region === r))
        .map((r) => (
          <section key={r}>
            <h2>{REGIONS[r].name}</h2>
            <div className="grid-cards">
              {list
                .filter((c) => c.region === r)
                .map((c) => (
                  <CampingCard key={c.id} c={c} />
                ))}
            </div>
          </section>
        ))}

      <h2>Règles pour dormir dans le van</h2>
      <div className="grid-2">
        {RULES.map((r) => (
          <div key={r.title} className="card" style={{ margin: 0 }}>
            <h3>{r.title}</h3>
            <p className="small" style={{ margin: 0 }}>
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
