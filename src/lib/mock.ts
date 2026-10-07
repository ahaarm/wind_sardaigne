/**
 * Données simulées (MOCK_DATA=1) pour développer / tester l'interface sans accès réseau.
 * Les réponses imitent le format des APIs Open-Meteo et aviationweather.gov.
 */

const EPOCH = Date.UTC(2026, 9, 7) / 1000; // 7 oct. 2026

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Bruit déterministe dans [-1, 1]. */
function noise(...parts: (string | number)[]): number {
  return (hash(parts.join("|")) / 0xffffffff) * 2 - 1;
}

/** Bruit lissé dans le temps (interpolation entre valeurs toutes les 6 h). */
function smoothNoise(key: string, t: number): number {
  const step = 6 * 3600;
  const a = Math.floor(t / step);
  const f = (t - a * step) / step;
  return noise(key, a) * (1 - f) + noise(key, a + 1) * f;
}

const EPISODES = [
  { day: 2.6, width: 0.9, peak: 24, dir: 310 },
  { day: 6.5, width: 1.2, peak: 30, dir: 315 },
  { day: 10.4, width: 0.8, peak: 18, dir: 125 },
  { day: 13.5, width: 1.1, peak: 22, dir: 300 },
];

/** « Vérité » synthétique : vent (nds) et direction en un point. */
export function truth(lat: number, lon: number, t: number): { w: number; d: number } {
  const day = (t - EPOCH) / 86400;
  const hourUtc = ((t / 3600) % 24 + 24) % 24;
  let w = 5;
  let x = 0;
  let y = 0;
  for (const e of EPISODES) {
    const s = e.peak * Math.exp(-(((day - e.day) / e.width) ** 2));
    const r = (e.dir * Math.PI) / 180;
    // exposition : la côte ouest / les Bouches prennent le Mistral, l'est est sous le vent
    let k = 1;
    if (e.dir > 250) k = (lon < 8.7 ? 1.15 : 0.75) * (lat > 41.1 ? 1.3 : 1);
    else k = lon > 9 ? 1.2 : 0.8;
    x += Math.sin(r) * s * k;
    y += Math.cos(r) * s * k;
  }
  const thermal = 6 * Math.max(0, Math.sin(((hourUtc - 8) / 12) * Math.PI));
  const tr = (200 * Math.PI) / 180;
  x += Math.sin(tr) * thermal;
  y += Math.cos(tr) * thermal;
  w = Math.max(1, Math.hypot(x, y) + 2 * smoothNoise(`t${lat}${lon}`, t));
  const d = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
  return { w, d };
}

const MODEL_BIAS: Record<string, number> = {
  meteofrance_arome_france_hd: 0.5,
  meteofrance_arome_france: 0,
  italia_meteo_arpae_icon_2i: -0.5,
  icon_eu: -2,
  meteofrance_arpege_europe: -1.5,
  ecmwf_ifs025: -1.5,
  ecmwf_aifs025: -3,
  gfs_seamless: -2.5,
};
const MODEL_HORIZON_H: Record<string, number> = {
  meteofrance_arome_france_hd: 48,
  meteofrance_arome_france: 48,
  italia_meteo_arpae_icon_2i: 72,
  icon_eu: 120,
  meteofrance_arpege_europe: 102,
};
/** Identifiants « inconnus » pour tester le repli sur le candidat suivant. */
const UNKNOWN = new Set(["ecmwf_ifs", "ecmwf_aifs025_single"]);

function modelWind(model: string, lat: number, lon: number, t: number, leadH: number) {
  const tr = truth(lat, lon, t);
  const err = (1.5 + leadH / 30) * smoothNoise(`${model}${lat}${lon}`, t);
  const w = Math.max(0, tr.w + (MODEL_BIAS[model] ?? 0) + err);
  const d = (tr.d + 12 * smoothNoise(`d${model}`, t) + 360) % 360;
  return { w, d };
}

function list(param: string | null): number[] {
  return (param ?? "").split(",").filter(Boolean).map(Number);
}

function startOfTodayUtc(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) / 1000;
}

function hours(start: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + i * 3600);
}

function forecast(u: URL, previous = false): unknown {
  const lats = list(u.searchParams.get("latitude"));
  const lons = list(u.searchParams.get("longitude"));
  const vars = (u.searchParams.get("hourly") ?? "").split(",");
  const model = u.searchParams.get("models") ?? "best_match";
  if (UNKNOWN.has(model)) throw new Error(`HTTP 400 – Invalid model '${model}' (mock)`);
  const pastDays = Number(u.searchParams.get("past_days") ?? 0);
  const days = Number(u.searchParams.get("forecast_days") ?? 7);
  const start = startOfTodayUtc() - pastDays * 86400;
  const time = hours(start, (pastDays + days) * 24);
  const now = Date.now() / 1000;
  const horizon = MODEL_HORIZON_H[model] ?? 24 * 16;
  const res = lats.map((lat, k) => {
    const lon = lons[k];
    const hourly: Record<string, unknown> = { time };
    for (const v of vars) {
      hourly[v] = time.map((t) => {
        const lead = previous ? Number(v.match(/previous_day(\d)/)?.[1] ?? 0) * 24 + 12 : Math.max(0, (t - now) / 3600);
        if (!previous && t - startOfTodayUtc() > horizon * 3600) return null;
        if (previous && lead > horizon) return null;
        const mw = modelWind(model, lat, lon, t, lead);
        const r1 = (x: number) => Math.round(x * 10) / 10;
        if (v.startsWith("wind_speed_10m")) return r1(mw.w);
        if (v === "wind_direction_10m") return Math.round(mw.d);
        if (v === "wind_gusts_10m") return model === "meteofrance_arome_france_hd" ? null : r1(mw.w * 1.3 + 2);
        if (v === "temperature_2m") return r1(21 + 4 * Math.sin((((t / 3600) % 24) - 8) / 24 * 2 * Math.PI) - mw.w / 10);
        if (v === "cloud_cover") return Math.round(Math.max(0, Math.min(100, 40 + 50 * smoothNoise(`c${lat}`, t))));
        if (v === "precipitation") return Math.max(0, r1(1.5 * smoothNoise(`p${lon}`, t) - 0.8));
        return null;
      });
    }
    return { latitude: lat, longitude: lon, utc_offset_seconds: 0, timezone: "GMT", hourly };
  });
  return res.length === 1 ? res[0] : res;
}

function marine(u: URL): unknown {
  const lats = list(u.searchParams.get("latitude"));
  const lons = list(u.searchParams.get("longitude"));
  const days = Number(u.searchParams.get("forecast_days") ?? 7);
  const time = hours(startOfTodayUtc(), days * 24);
  const res = lats.map((lat, k) => {
    const lon = lons[k];
    const wave = time.map((t) => {
      const tr = truth(lat, lon, t - 6 * 3600);
      const exposure = tr.d > 250 ? (lon < 8.7 || lat > 41.1 ? 1 : 0.3) : lon > 9 ? 1 : 0.4;
      return Math.round(Math.max(0.1, (tr.w / 10) ** 1.6 * exposure) * 10) / 10;
    });
    return {
      latitude: lat,
      longitude: lon,
      hourly: {
        time,
        wave_height: wave,
        wave_period: wave.map((h) => Math.round((4 + h * 2.2) * 10) / 10),
        wave_direction: time.map((t) => Math.round(truth(lat, lon, t).d)),
        swell_wave_height: wave.map((h) => Math.round(h * 0.6 * 10) / 10),
        swell_wave_period: wave.map((h) => Math.round((6 + h * 2) * 10) / 10),
        sea_surface_temperature: time.map(() => 22.4),
      },
    };
  });
  return res.length === 1 ? res[0] : res;
}

function ensemble(u: URL): unknown {
  const lat = Number(u.searchParams.get("latitude"));
  const lon = Number(u.searchParams.get("longitude"));
  const time = hours(startOfTodayUtc(), 15 * 24);
  const hourly: Record<string, unknown> = { time };
  for (let m = 0; m <= 50; m++) {
    const suffix = m === 0 ? "" : `_member${String(m).padStart(2, "0")}`;
    const shift = noise("shift", m) * 18 * 3600;
    const amp = 1 + 0.35 * noise("amp", m);
    hourly[`wind_speed_10m${suffix}`] = time.map((t) => {
      const spread = Math.min(1, (t - Date.now() / 1000) / (10 * 86400));
      return Math.round(truth(lat, lon, t + shift * spread).w * (1 + (amp - 1) * spread) * 10) / 10;
    });
    hourly[`wind_direction_10m${suffix}`] = time.map((t) => Math.round(truth(lat, lon, t + shift).d));
  }
  return { latitude: lat, longitude: lon, hourly };
}

function metarJson(u: URL): unknown {
  const id = u.searchParams.get("ids") ?? "XXXX";
  if (id === "LIEH" || id === "LIEF") return [];
  const st: Record<string, [number, number]> = {
    LFKF: [41.5, 9.1], LIEO: [40.9, 9.52], LIEA: [40.63, 8.29], LIER: [39.9, 8.64], LIED: [39.35, 8.97],
    LIEE: [39.25, 9.05], LIEC: [39.1, 9.51], LIEB: [39.93, 9.71], LIET: [39.92, 9.68],
  };
  const [lat, lon] = st[id] ?? [40, 9];
  const h = Number(u.searchParams.get("hours") ?? 2);
  const now = Math.floor(Date.now() / 1000 / 1800) * 1800 - 600;
  const out = [];
  for (let t = now; t > now - h * 3600; t -= 1800) {
    const tr = truth(lat, lon, t);
    const wspd = Math.round(tr.w * 0.85);
    const wdir = Math.round(tr.d / 10) * 10;
    const wgst = wspd > 14 ? wspd + 8 : null;
    const dd = new Date(t * 1000);
    const z = `${String(dd.getUTCDate()).padStart(2, "0")}${String(dd.getUTCHours()).padStart(2, "0")}${String(dd.getUTCMinutes()).padStart(2, "0")}Z`;
    out.push({
      icaoId: id,
      obsTime: t,
      wdir,
      wspd,
      wgst,
      temp: 20,
      rawOb: `${id} ${z} ${String(wdir).padStart(3, "0")}${String(wspd).padStart(2, "0")}${wgst ? `G${wgst}` : ""}KT 9999 FEW030 20/12 Q1015`,
    });
  }
  return out;
}

export function mockResponse(url: string): unknown {
  const u = new URL(url);
  if (u.hostname === "api.open-meteo.com") return forecast(u);
  if (u.hostname === "previous-runs-api.open-meteo.com") return forecast(u, true);
  if (u.hostname === "marine-api.open-meteo.com") return marine(u);
  if (u.hostname === "ensemble-api.open-meteo.com") return ensemble(u);
  if (u.hostname === "aviationweather.gov") return metarJson(u);
  if (u.hostname.includes("noaa.gov")) return "";
  throw new Error(`mock: URL inconnue ${url}`);
}
