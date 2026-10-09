"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { CAMPINGS, STATUS_LABEL } from "@/lib/campings";
import type { OverviewData } from "@/lib/server/forecast";
import { PROFILES, summarizeDays, type DaySummary, type Profile } from "@/lib/scoring";
import { SPOTS, type Spot } from "@/lib/spots";
import { formatDay, todayLocal } from "@/lib/time";
import { TRIP } from "@/lib/trip";
import { compassFr, scoreColor, scoreTextColor, windName } from "@/lib/wind";
import { wingPlan } from "@/lib/wings";
import { spotHourlyFrom } from "./Planner";
import { ScoreDot, ScoreLegend, StaleBanner } from "./ui";
import { useApi } from "./useApi";
import { boostValue, usePersistent, type BoostId } from "./usePersistent";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function spotIcon(score: number | null, dir: number | null): string {
  const bg = scoreColor(score);
  const fg = scoreTextColor(score);
  const arrow =
    dir == null
      ? ""
      : `<svg class="mk-arrow" viewBox="0 0 20 20" style="transform:rotate(${dir + 180}deg)"><line x1="10" y1="18" x2="10" y2="6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M10 1 L15.5 9 L4.5 9 Z" fill="currentColor"/></svg>`;
  const low = score == null || score < 20;
  return `<div class="mk${low ? " mk-low" : ""}" style="background:${bg};color:${fg}">${score ?? "–"}</div>${low ? "" : arrow}`;
}

export default function MapView() {
  const { data, error, loading, stale } = useApi<OverviewData>("/api/overview");
  const [profile, setProfile] = usePersistent<Profile>("wind-sar:profile", "duo");
  const [boostId] = usePersistent<BoostId>("wind-sar:boost", "0");
  const boost = boostValue(boostId);
  const [showCampings, setShowCampings] = useState(true);
  const [date, setDate] = useState<string | null>(null);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);

  const summaries = useMemo(() => {
    if (!data) return null;
    const out: Record<string, Map<string, DaySummary>> = {};
    for (const s of SPOTS) {
      if (!data.spots[s.id]) continue;
      out[s.id] = new Map(summarizeDays(s, spotHourlyFrom(data, s.id), profile, boost).map((d) => [d.date, d]));
    }
    return out;
  }, [data, profile, boost]);

  const today = todayLocal();
  const dates = useMemo(() => {
    if (!summaries) return [];
    const set = new Set<string>();
    for (const m of Object.values(summaries)) for (const [d, s] of m) if (s.score != null && d >= today) set.add(d);
    return [...set].sort().slice(0, 10);
  }, [summaries, today]);
  const day = date && dates.includes(date) ? date : dates[0] ?? null;

  const ranked = useMemo(() => {
    if (!summaries || !day) return [];
    return SPOTS.map((spot) => ({ spot, sum: summaries[spot.id]?.get(day) }))
      .filter((x): x is { spot: Spot; sum: DaySummary } => x.sum?.score != null)
      .sort((a, b) => (b.sum.score ?? 0) - (a.sum.score ?? 0));
  }, [summaries, day]);

  // Initialisation de la carte (Leaflet, côté client uniquement)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDiv.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapDiv.current, { zoomControl: true, scrollWheelZoom: false, zoomSnap: 0.25 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.fitBounds(L.latLngBounds(SPOTS.map((s) => [s.lat, s.lon] as [number, number])), { padding: [24, 24] });
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Marqueurs : spots du jour choisi + campings ouverts cette nuit-là
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    for (const spot of SPOTS) {
      const sum = day ? summaries?.[spot.id]?.get(day) : undefined;
      const score = sum?.score ?? null;
      const low = score == null || score < 20;
      const icon = L.divIcon({
        className: "mk-wrap",
        html: spotIcon(score, sum?.dir ?? null),
        iconSize: low ? [22, 22] : [34, 34],
        iconAnchor: low ? [11, 11] : [17, 17],
      });
      const lines = [
        `<strong>${esc(spot.name)}</strong>`,
        sum?.wind != null
          ? `${Math.round(sum.wind)} nds${sum.gust != null ? ` (raf. ${Math.round(sum.gust)})` : ""}${
              sum.dir != null ? ` · ${compassFr(sum.dir)} – ${windName(sum.dir)}` : ""
            }`
          : "Pas de prévision",
        sum?.wave != null ? `Vagues ${sum.wave} m` : "",
        sum?.window ? `Meilleures heures : ${sum.window}` : "",
        sum?.wind != null && sum.wind >= 10 ? `🪁 ${esc(wingPlan(sum.wind, sum.gust).text)}` : "",
        `<a href="/spot/${spot.id}${day ? `?d=${day}` : ""}">Détail du spot →</a>`,
      ].filter(Boolean);
      L.marker([spot.lat, spot.lon], { icon, zIndexOffset: (score ?? 0) * 10, title: spot.name })
        .bindPopup(`<div class="mk-pop">${lines.join("<br/>")}</div>`)
        .addTo(layer);
    }
    if (showCampings && day) {
      for (const c of CAMPINGS) {
        if (c.closes && c.closes <= day) continue;
        const icon = L.divIcon({
          className: "mk-wrap",
          html: `<div class="mk-camp" title="${esc(c.name)}">${c.type === "parking" ? "P" : "⛺"}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker([c.lat, c.lon], { icon, zIndexOffset: -1000, title: c.name })
          .bindPopup(
            `<div class="mk-pop"><strong>${esc(c.name)}</strong><br/>${esc(c.town)}<br/>${esc(STATUS_LABEL[c.status])} · ${esc(
              c.opening,
            )}${c.phone ? `<br/><a href="tel:${c.phone.replace(/[^+\d]/g, "")}">📞 ${esc(c.phone)}</a>` : ""}<br/><a href="/campings">Tous les campings →</a></div>`,
          )
          .addTo(layer);
      }
    }
  }, [ready, summaries, day, showCampings]);

  const prof = PROFILES.find((p) => p.id === profile)!;

  return (
    <div>
      <h1 style={{ marginTop: 12 }}>Carte des spots</h1>
      <div className="chips" role="group" aria-label="Profil">
        {PROFILES.map((p) => (
          <button key={p.id} className="chip" aria-pressed={profile === p.id} onClick={() => setProfile(p.id)}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Jour">
        {dates.map((d) => (
          <button
            key={d}
            className="chip"
            aria-pressed={d === day}
            onClick={() => setDate(d)}
            style={d < TRIP.start || d > TRIP.end ? { opacity: 0.6 } : undefined}
          >
            {formatDay(d, true)}
          </button>
        ))}
      </div>
      <StaleBanner stale={stale} error={error} generatedAt={data?.generatedAt} />
      {loading && !data && <div className="card muted">Chargement des prévisions…</div>}

      <div className="row small" style={{ justifyContent: "space-between", margin: "4px 0" }}>
        <ScoreLegend />
        <label className="row">
          <input type="checkbox" checked={showCampings} onChange={(e) => setShowCampings(e.target.checked)} /> ⛺ Campings
          ouverts cette nuit
        </label>
      </div>
      <div ref={mapDiv} className="map" role="region" aria-label={`Carte des spots – ${prof.label}`} />
      <p className="tiny muted">
        Pastille = note du jour ({prof.label.toLowerCase()}), flèche = direction du vent (vers où il souffle). Touchez un
        spot pour le détail.
      </p>

      {day && ranked.length > 0 && (
        <>
          <h2 style={{ textTransform: "capitalize" }}>Classement – {formatDay(day)}</h2>
          <div className="grid-cards">
            {ranked.slice(0, 6).map(({ spot, sum }) => (
              <Link key={spot.id} href={`/spot/${spot.id}?d=${day}`} className="card pick" style={{ margin: 0 }}>
                <ScoreDot score={sum.score} />
                <span>
                  <strong>{spot.name}</strong>
                  <br />
                  <span className="tiny muted">
                    {sum.wind != null ? `${Math.round(sum.wind)} nds ${sum.dir != null ? compassFr(sum.dir) : ""}` : ""}
                    {sum.window ? ` · ${sum.window}` : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
