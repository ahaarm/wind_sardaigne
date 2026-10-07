/**
 * Modèles météo utilisés (via Open-Meteo).
 *
 * `candidates` : identifiants Open-Meteo essayés dans l'ordre (le premier qui répond est gardé).
 * `weight(leadH)` : poids dans le « mix pondéré » selon l'échéance (en heures depuis maintenant).
 *   0 = le modèle est affiché mais n'entre pas dans le mix.
 */
export interface ModelDef {
  id: string;
  name: string;
  short: string;
  provider: string;
  resolution: string;
  horizon: string;
  candidates: string[];
  forecastDays: number;
  color: string;
  weight: (leadH: number) => number;
  description: string;
}

export const MODELS: ModelDef[] = [
  {
    id: "arome_hd",
    name: "AROME France HD",
    short: "AROME HD",
    provider: "Météo-France",
    resolution: "1,5 km",
    horizon: "~2 j",
    candidates: ["meteofrance_arome_france_hd"],
    forecastDays: 3,
    color: "#2a78d6",
    weight: (h) => (h <= 42 ? 1 : 0),
    description:
      "Modèle non-hydrostatique à très haute résolution. Le domaine AROME couvre la Corse et la Sardaigne : il résout l'accélération dans les Bouches de Bonifacio, les effets de cap et les brises thermiques. Le meilleur choix pour aujourd'hui / demain.",
  },
  {
    id: "arome",
    name: "AROME France",
    short: "AROME",
    provider: "Météo-France",
    resolution: "2,5 km",
    horizon: "~2 j",
    candidates: ["meteofrance_arome_france"],
    forecastDays: 3,
    color: "#eb6834",
    weight: (h) => (h <= 42 ? 0.5 : 0),
    description: "Même physique qu'AROME HD avec une grille un peu plus large ; fournit les rafales. Compté à demi-poids car très corrélé à AROME HD.",
  },
  {
    id: "icon_2i",
    name: "ICON-2I (ItaliaMeteo / ARPAE)",
    short: "ICON-2I",
    provider: "ItaliaMeteo – ARPAE",
    resolution: "2,2 km",
    horizon: "3 j",
    candidates: ["italia_meteo_arpae_icon_2i"],
    forecastDays: 3,
    color: "#1baf7a",
    weight: (h) => (h <= 72 ? 1 : 0),
    description:
      "Le modèle opérationnel italien, centré sur l'Italie (Sardaigne comprise) et assimilant les observations italiennes. Très bon jusqu'à 72 h, complémentaire d'AROME.",
  },
  {
    id: "icon_eu",
    name: "ICON-EU (DWD)",
    short: "ICON-EU",
    provider: "DWD (Allemagne)",
    resolution: "7 km",
    horizon: "5 j",
    candidates: ["icon_eu"],
    forecastDays: 5,
    color: "#eda100",
    weight: (h) => (h <= 120 ? (h < 48 ? 0.5 : 1) : 0),
    description:
      "Le modèle allemand régional. NB : ICON-D2 (2 km) ne couvre PAS la Sardaigne (domaine limité à ~43°N), c'est donc ICON-EU qui est utilisé. Bon pour J+2 à J+5.",
  },
  {
    id: "arpege",
    name: "ARPEGE Europe",
    short: "ARPEGE",
    provider: "Météo-France",
    resolution: "~11 km",
    horizon: "4 j",
    candidates: ["meteofrance_arpege_europe"],
    forecastDays: 4,
    color: "#e87ba4",
    weight: (h) => (h <= 96 ? 0.5 : 0),
    description: "Modèle global de Météo-France, zoomé sur l'Europe. Utile comme second avis à J+2–J+4.",
  },
  {
    id: "ecmwf",
    name: "ECMWF IFS",
    short: "ECMWF",
    provider: "ECMWF (Europe)",
    resolution: "9 km (HRES) / 25 km",
    horizon: "10–15 j",
    candidates: ["ecmwf_ifs", "ecmwf_ifs025"],
    forecastDays: 15,
    color: "#008300",
    weight: (h) => (h < 48 ? 0.5 : 1),
    description:
      "Le meilleur modèle global en moyenne échéance (référence des scores de vérification). Pilier du mix à partir de J+2, et seul modèle déterministe retenu au-delà de J+5.",
  },
  {
    id: "aifs",
    name: "ECMWF AIFS (IA)",
    short: "AIFS",
    provider: "ECMWF",
    resolution: "25 km",
    horizon: "15 j",
    candidates: ["ecmwf_aifs025_single", "ecmwf_aifs025"],
    forecastDays: 15,
    color: "#4a3aa7",
    weight: () => 0,
    description:
      "Modèle d'intelligence artificielle de l'ECMWF : très bon sur la situation de grande échelle (arrivée d'un Mistral), mais trop lissé pour l'intensité locale. Affiché pour comparaison uniquement.",
  },
  {
    id: "gfs",
    name: "GFS (NOAA)",
    short: "GFS",
    provider: "NOAA (USA)",
    resolution: "13–25 km",
    horizon: "16 j",
    candidates: ["gfs_seamless", "gfs_global"],
    forecastDays: 16,
    color: "#e34948",
    weight: (h) => (h > 120 ? 0.3 : 0),
    description: "Modèle global américain, moins précis en Méditerranée. Faible poids, seulement en longue échéance pour élargir le consensus.",
  },
];

export const MODEL_BY_ID: Record<string, ModelDef> = Object.fromEntries(MODELS.map((m) => [m.id, m]));

/** Variables horaires demandées à chaque modèle. */
export const FORECAST_VARS = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "temperature_2m",
  "cloud_cover",
  "precipitation",
] as const;

export const MARINE_VARS = [
  "wave_height",
  "wave_period",
  "wave_direction",
  "swell_wave_height",
  "swell_wave_period",
  "sea_surface_temperature",
] as const;
