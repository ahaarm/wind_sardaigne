/**
 * Spots de wingfoil / kite en Sardaigne.
 *
 * `facing` = direction (en degrés) vers laquelle la plage regarde la mer.
 * Le vent qui vient de cette direction est onshore ; à +/-90° il est side-shore ;
 * à 180° il est offshore (dangereux, surtout pour une débutante).
 * Pour les lagunes / baies particulières on donne explicitement les secteurs (`sectors`).
 *
 * Les coordonnées sont celles du plan d'eau (point utilisé pour les modèles météo,
 * avec `cell_selection=sea` côté Open-Meteo).
 */

export type RegionId = "nord" | "nord-ouest" | "ouest" | "sud-ouest" | "sud" | "est";

export const REGIONS: Record<RegionId, { name: string; short: string; lat: number; lon: number }> = {
  nord: { name: "Nord – Gallura / Bouches de Bonifacio", short: "Nord", lat: 41.19, lon: 9.33 },
  "nord-ouest": { name: "Nord-Ouest – Golfe de l'Asinara / Alghero", short: "Nord-Ouest", lat: 40.75, lon: 8.3 },
  ouest: { name: "Ouest – Sinis / Oristano", short: "Ouest", lat: 40.0, lon: 8.38 },
  "sud-ouest": { name: "Sud-Ouest – Sulcis / Sant'Antioco", short: "Sud-Ouest", lat: 39.05, lon: 8.5 },
  sud: { name: "Sud – Cagliari / Chia", short: "Sud", lat: 39.05, lon: 9.0 },
  est: { name: "Est – Olbia / San Teodoro", short: "Est", lat: 40.85, lon: 9.65 },
};

/** Aptitude pour une débutante en wing. */
export type BeginnerLevel = "ideal" | "ok" | "no";
/** Intérêt pour du freefly / vague. */
export type FreeflyLevel = "top" | "ok" | "flat";

export interface Spot {
  id: string;
  name: string;
  region: RegionId;
  lat: number;
  lon: number;
  facing: number;
  sectors?: { good: string[]; ok?: string[]; offshore?: string[] };
  /** Plan d'eau plat (lagune, baie abritée) : la houle du large ne compte pas. */
  flatWater: boolean;
  beginner: BeginnerLevel;
  freefly: FreeflyLevel;
  water: string;
  bestWinds: string;
  notes: string[];
  hazards: string[];
}

export const SPOTS: Spot[] = [
  // ---------------- NORD ----------------
  {
    id: "porto-pollo",
    name: "Porto Pollo (Isola dei Gabbiani)",
    region: "nord",
    lat: 41.188,
    lon: 9.326,
    facing: 315,
    sectors: {
      good: ["W", "WNW", "NW", "NNW", "E", "ENE", "NE"],
      ok: ["N", "WSW", "ESE"],
      offshore: ["S", "SSW", "SSE", "SW", "SE"],
    },
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    water: "Clapot côté ouest (Porto Pollo), plus plat près du bord ; côté est (Porto Liscia) avec l'Est",
    bestWinds: "Ponente / Mistral (W–NW) accéléré par les Bouches de Bonifacio ; Levante (E) côté Porto Liscia",
    notes: [
      "LE spot de référence du nord : effet venturi, le vent réel dépasse souvent les modèles de 20–30 %.",
      "Nombreuses écoles et loueurs : idéal pour faire encadrer les sessions de ta femme.",
      "Isthme entre les deux baies : on choisit le côté selon la direction du vent.",
    ],
    hazards: ["Très fréquenté (windsurf/kite)", "Rafales fortes par Mistral établi"],
  },
  {
    id: "capo-testa",
    name: "Capo Testa – Rena di Ponente",
    region: "nord",
    lat: 41.238,
    lon: 9.143,
    facing: 270,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    water: "Vagues et houle d'ouest, roches",
    bestWinds: "Ouest / Nord-Ouest (side-on), Sud-Ouest",
    notes: [
      "Spot sauvage près de Santa Teresa Gallura, belle houle quand le Ponente/Mistral rentre.",
      "Plage de l'autre côté de l'isthme (Rena di Levante) pour les vents d'est.",
    ],
    hazards: ["Rochers de granit en sortie", "Plage étroite pour décoller"],
  },
  // ---------------- NORD-OUEST ----------------
  {
    id: "valledoria",
    name: "Valledoria – La Ciaccia",
    region: "nord-ouest",
    lat: 40.94,
    lon: 8.79,
    facing: 345,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    water: "Beach-break, houle de nord-ouest",
    bestWinds: "Mistral NW / Nord, Ouest",
    notes: [
      "Golfe de l'Asinara : le Mistral rentre side-on avec de la vague, bon pour le freefly sur la houle.",
      "Longue plage de sable, embouchure du Coghinas à proximité.",
    ],
    hazards: ["Shorebreak par grosse houle", "Courants près de l'embouchure"],
  },
  {
    id: "platamona",
    name: "Platamona (Sassari)",
    region: "nord-ouest",
    lat: 40.825,
    lon: 8.48,
    facing: 5,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    water: "Longue plage de sable, petites vagues par vent de nord",
    bestWinds: "Nord-Ouest à Nord-Est",
    notes: ["Longue plage, beaucoup d'espace ; onshore par vent de nord (plus facile mais clapot)."],
    hazards: ["Shorebreak si houle de nord"],
  },
  {
    id: "porto-ferro",
    name: "Porto Ferro",
    region: "nord-ouest",
    lat: 40.684,
    lon: 8.2,
    facing: 290,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    water: "Baie exposée, belles vagues de nord-ouest",
    bestWinds: "Mistral NW, Ouest, Sud-Ouest",
    notes: ["Spot de surf réputé au nord d'Alghero, très exposé à la houle de Mistral."],
    hazards: ["Grosses vagues par Mistral fort", "Rochers aux extrémités de la baie"],
  },
  {
    id: "alghero",
    name: "Alghero – Maria Pia / Lido",
    region: "nord-ouest",
    lat: 40.59,
    lon: 8.296,
    facing: 255,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    water: "Grande baie sableuse, clapot à petites vagues",
    bestWinds: "Ouest, Nord-Ouest (side-on), Sud-Ouest",
    notes: ["Baie large et sableuse, ville à proximité (pratique avec un enfant)."],
    hazards: ["Zone de baignade balisée selon saison"],
  },
  // ---------------- OUEST ----------------
  {
    id: "capo-mannu",
    name: "Capo Mannu (Sinis)",
    region: "ouest",
    lat: 40.04,
    lon: 8.375,
    facing: 300,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    water: "Vagues puissantes sur récif, houle de Mistral",
    bestWinds: "Mistral NW, Ouest",
    notes: [
      "Le spot de vague de référence en Méditerranée : idéal freefly/wave dès que le Mistral souffle.",
      "Putzu Idu juste à côté : village, parkings de vans, ambiance surf.",
    ],
    hazards: ["Récif et rochers", "Vagues puissantes – niveau confirmé", "Long retour si casse"],
  },
  {
    id: "mari-ermi",
    name: "Mari Ermi / Is Arutas",
    region: "ouest",
    lat: 39.965,
    lon: 8.398,
    facing: 265,
    flatWater: false,
    beginner: "no",
    freefly: "ok",
    water: "Plages de quartz, vagues par houle d'ouest",
    bestWinds: "Mistral NW (side-on), Ouest, Sud-Ouest",
    notes: ["Alternative plus accessible à Capo Mannu, vagues plus douces."],
    hazards: ["Shorebreak par houle"],
  },
  {
    id: "torre-grande",
    name: "Torre Grande (golfe d'Oristano)",
    region: "ouest",
    lat: 39.9,
    lon: 8.52,
    facing: 215,
    flatWater: false,
    beginner: "ok",
    freefly: "flat",
    water: "Golfe abrité, clapot",
    bestWinds: "Ouest, Sud-Ouest, Sud",
    notes: ["Golfe abrité, utile quand la côte ouest est trop exposée.", "Par Mistral (NW) le vent est side-off et rafaleux."],
    hazards: ["Vent side-off et rafaleux par Mistral"],
  },
  // ---------------- SUD-OUEST ----------------
  {
    id: "punta-trettu",
    name: "Punta Trettu (lagune de Sant'Antioco)",
    region: "sud-ouest",
    lat: 39.068,
    lon: 8.488,
    facing: 200,
    sectors: {
      good: ["NW", "NNW", "WNW", "W", "N", "SE", "SSE", "S"],
      ok: ["WSW", "SW", "ESE", "E", "NNE", "SSW"],
      offshore: [],
    },
    flatWater: true,
    beginner: "ideal",
    freefly: "flat",
    water: "Lagune plate et peu profonde (on a pied très loin)",
    bestWinds: "Mistral NW (le classique), Sud-Est",
    notes: [
      "Le paradis pour apprendre : eau plate, on a pied, vent régulier par Mistral.",
      "Spot devenu une référence du wingfoil ; écoles sur place. Parking pour vans.",
      "Pour toi : idéal pour travailler jibes/tacks en foil sur eau plate.",
    ],
    hazards: ["Faible profondeur : attention à l'aileron/foil à marée basse (mât court)", "Herbiers"],
  },
  {
    id: "porto-botte",
    name: "Porto Botte",
    region: "sud-ouest",
    lat: 39.035,
    lon: 8.568,
    facing: 210,
    sectors: {
      good: ["NW", "NNW", "WNW", "W", "SE", "SSE", "S", "SW"],
      ok: ["N", "WSW", "SSW", "ESE"],
      offshore: ["NE", "ENE", "E"],
    },
    flatWater: true,
    beginner: "ideal",
    freefly: "flat",
    water: "Grande baie/lagune très peu profonde, eau plate",
    bestWinds: "Mistral NW, Sud-Est",
    notes: ["Immense plan d'eau peu profond, très régulier par Mistral (souvent > 20 nds).", "Écoles et location sur place."],
    hazards: ["Vent souvent fort : prévoir petites ailes", "Faible profondeur pour le foil"],
  },
  {
    id: "funtanamare",
    name: "Funtanamare (Gonnesa)",
    region: "sud-ouest",
    lat: 39.265,
    lon: 8.42,
    facing: 260,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    water: "Beach-break, houle d'ouest/nord-ouest",
    bestWinds: "Mistral NW, Ouest, Sud-Ouest",
    notes: ["Spot de vague du sud-ouest, bon plan B quand le Sinis est trop gros."],
    hazards: ["Shorebreak", "Courants de baïne par houle"],
  },
  // ---------------- SUD ----------------
  {
    id: "chia",
    name: "Chia – Su Giudeu / Campana",
    region: "sud",
    lat: 38.887,
    lon: 8.873,
    facing: 185,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    water: "Plages de sable, vagues par Scirocco / Libeccio",
    bestWinds: "Sud-Est (Scirocco), Sud, Sud-Ouest (Libeccio)",
    notes: ["Magnifiques plages et lagune à flamants ; vagues quand le Scirocco/Libeccio rentre.", "Par Mistral : offshore, à éviter."],
    hazards: ["Offshore par Mistral", "Rochers et îlot en face de Su Giudeu"],
  },
  {
    id: "poetto",
    name: "Poetto (Cagliari)",
    region: "sud",
    lat: 39.205,
    lon: 9.18,
    facing: 150,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    water: "Très longue plage, peu profonde, clapot ou petites vagues",
    bestWinds: "Sud-Est (Scirocco), Sud, Est, Sud-Ouest",
    notes: ["Grande plage urbaine avec écoles ; brise thermique possible par beau temps.", "Par Mistral : offshore, dangereux."],
    hazards: ["Offshore par Mistral / vent de nord", "Zones de baignade"],
  },
  // ---------------- EST ----------------
  {
    id: "la-cinta",
    name: "San Teodoro – La Cinta",
    region: "est",
    lat: 40.8,
    lon: 9.69,
    facing: 80,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    water: "Longue plage, petites vagues par vent d'est",
    bestWinds: "Est (Levante), Sud-Est, Nord-Est",
    notes: ["Longue langue de sable entre mer et étang, ambiance familiale.", "Par Mistral : offshore."],
    hazards: ["Offshore par Mistral / vent d'ouest"],
  },
  {
    id: "pittulongu",
    name: "Olbia – Pittulongu",
    region: "est",
    lat: 40.957,
    lon: 9.578,
    facing: 60,
    flatWater: false,
    beginner: "ok",
    freefly: "flat",
    water: "Baie sableuse, clapot",
    bestWinds: "Est, Nord-Est, Sud-Est",
    notes: ["Pratique à l'arrivée/départ du ferry d'Olbia."],
    hazards: ["Offshore par Mistral"],
  },
];

export const SPOT_BY_ID: Record<string, Spot> = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

export const BEGINNER_LABEL: Record<BeginnerLevel, string> = {
  ideal: "Idéal débutant",
  ok: "Débutant possible (avec école / conditions douces)",
  no: "Confirmés",
};

export const FREEFLY_LABEL: Record<FreeflyLevel, string> = {
  top: "Vague / houle – freefly",
  ok: "Houle possible",
  flat: "Eau plate",
};
