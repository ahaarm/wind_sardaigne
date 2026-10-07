import { getJson, getText } from "./http";

/**
 * Balises : stations METAR (aéroports et caps de l'Aeronautica Militare) en Sardaigne
 * + Figari (Corse) pour les Bouches de Bonifacio.
 * Les caps (Capo Carbonara, Capo Caccia, Capo Bellavista…) sont souvent automatiques et
 * peuvent ne pas émettre en continu : la page l'indique simplement.
 */
export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  note: string;
}

export const STATIONS: Station[] = [
  { id: "LFKF", name: "Figari (Corse)", lat: 41.5, lon: 9.098, note: "Côté corse des Bouches de Bonifacio – indicateur du Ponente/Mistral pour Porto Pollo" },
  { id: "LIEO", name: "Olbia Costa Smeralda", lat: 40.899, lon: 9.518, note: "Aéroport, abrité du Mistral" },
  { id: "LIEA", name: "Alghero Fertilia", lat: 40.632, lon: 8.291, note: "Aéroport proche de la côte ouest" },
  { id: "LIEH", name: "Capo Caccia", lat: 40.561, lon: 8.163, note: "Cap exposé (station militaire automatique)" },
  { id: "LIEF", name: "Capo Frasca", lat: 39.75, lon: 8.463, note: "Cap du golfe d'Oristano (militaire)" },
  { id: "LIER", name: "Oristano Fenosu", lat: 39.895, lon: 8.643, note: "Petit aérodrome" },
  { id: "LIED", name: "Decimomannu", lat: 39.354, lon: 8.972, note: "Base aérienne, plaine du Campidano" },
  { id: "LIEE", name: "Cagliari Elmas", lat: 39.251, lon: 9.054, note: "Aéroport, en bord de lagune" },
  { id: "LIEC", name: "Capo Carbonara", lat: 39.103, lon: 9.513, note: "Cap très exposé (Villasimius)" },
  { id: "LIEB", name: "Capo Bellavista", lat: 39.932, lon: 9.712, note: "Cap côte est (Arbatax)" },
  { id: "LIET", name: "Tortolì Arbatax", lat: 39.918, lon: 9.683, note: "Aérodrome côte est" },
];

export const STATION_BY_ID: Record<string, Station> = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

export interface Obs {
  time: number;
  /** Direction d'où vient le vent (°), null si variable. */
  dir: number | null;
  /** Vent moyen (nœuds). */
  speed: number | null;
  gust: number | null;
  temp: number | null;
  raw: string;
}

const KMH_TO_KN = 1 / 1.852;
const MPS_TO_KN = 1.943844;

/** Décode le groupe vent et l'heure d'un METAR brut. */
export function parseRawMetar(raw: string, now = Date.now()): Obs | null {
  const timeM = raw.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
  const windM = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)\b/);
  if (!timeM) return null;
  const d = new Date(now);
  const day = Number(timeM[1]);
  let y = d.getUTCFullYear();
  let mo = d.getUTCMonth();
  if (day > d.getUTCDate() + 1) {
    mo -= 1;
    if (mo < 0) {
      mo = 11;
      y -= 1;
    }
  }
  const time = Date.UTC(y, mo, day, Number(timeM[2]), Number(timeM[3])) / 1000;
  const tempM = raw.match(/\s(M?\d{2})\/(M?\d{2})?\s/);
  const temp = tempM ? Number(tempM[1].replace("M", "-")) : null;
  if (!windM) return { time, dir: null, speed: null, gust: null, temp, raw };
  const unit = windM[4] === "MPS" ? MPS_TO_KN : windM[4] === "KMH" ? KMH_TO_KN : 1;
  return {
    time,
    dir: windM[1] === "VRB" ? null : Number(windM[1]),
    speed: Math.round(Number(windM[2]) * unit),
    gust: windM[3] ? Math.round(Number(windM[3]) * unit) : null,
    temp,
    raw,
  };
}

interface AwcMetar {
  icaoId?: string;
  obsTime?: number;
  reportTime?: string;
  wdir?: number | string | null;
  wspd?: number | null;
  wgst?: number | null;
  temp?: number | null;
  rawOb?: string;
}

function fromAwc(m: AwcMetar): Obs | null {
  const raw = m.rawOb ?? "";
  const parsed = raw ? parseRawMetar(raw) : null;
  const time = typeof m.obsTime === "number" ? m.obsTime : parsed?.time ?? (m.reportTime ? Date.parse(m.reportTime) / 1000 : NaN);
  if (!Number.isFinite(time)) return null;
  const dir = typeof m.wdir === "number" ? m.wdir : parsed?.dir ?? null;
  const speed = typeof m.wspd === "number" ? m.wspd : parsed?.speed ?? null;
  const gust = typeof m.wgst === "number" ? m.wgst : parsed?.gust ?? null;
  return { time, dir, speed, gust, temp: typeof m.temp === "number" ? m.temp : parsed?.temp ?? null, raw };
}

/** Historique METAR d'une station (aviationweather.gov, max ~15 jours). */
export async function fetchStationObs(id: string, hours: number, revalidate = 600): Promise<Obs[]> {
  try {
    const data = await getJson<AwcMetar[]>(
      `https://aviationweather.gov/api/data/metar?ids=${id}&format=json&hours=${hours}`,
      revalidate,
    );
    const list = (Array.isArray(data) ? data : []).map(fromAwc).filter((o): o is Obs => o != null);
    if (list.length) return list.sort((a, b) => a.time - b.time);
  } catch {
    /* on tente le flux NOAA ci-dessous */
  }
  // Repli : dernier METAR du serveur NOAA (texte brut).
  try {
    const txt = await getText(`https://tgftp.nws.noaa.gov/data/observations/metar/stations/${id}.TXT`, revalidate);
    const line = txt.split("\n").map((l) => l.trim()).filter(Boolean)[1];
    const obs = line ? parseRawMetar(line) : null;
    if (obs && Date.now() / 1000 - obs.time < hours * 3600) return [obs];
  } catch {
    /* pas de données */
  }
  return [];
}
