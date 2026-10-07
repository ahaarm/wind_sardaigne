/**
 * Spots de wingfoil en Sardaigne.
 *
 * Base : le guide « Wingfoil Sardinia: 16 Best Spots » d'Inside Sardinia (mis à jour le 5 oct. 2026),
 * complété par quelques spots à vagues hors guide (champ `guide: false`) utiles pour le freefly.
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
  "nord-ouest": { name: "Nord-Ouest – Asinara / Stintino / Alghero", short: "Nord-Ouest", lat: 40.85, lon: 8.4 },
  ouest: { name: "Ouest – Sinis / Oristano", short: "Ouest", lat: 40.0, lon: 8.38 },
  "sud-ouest": { name: "Sud-Ouest – Sulcis / Sant'Antioco", short: "Sud-Ouest", lat: 39.05, lon: 8.5 },
  sud: { name: "Sud – Villasimius / Cagliari / Chia", short: "Sud", lat: 39.05, lon: 9.2 },
  est: { name: "Est – San Teodoro / Posada", short: "Est", lat: 40.72, lon: 9.75 },
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
  /** Niveau indiqué par le guide Inside Sardinia. */
  level: string;
  /** Spot décrit dans le guide Inside Sardinia. */
  guide: boolean;
  /** Brise thermique d'après-midi fréquente (le vent réel dépasse souvent la prévision). */
  thermal: boolean;
  /** Ville de base conseillée. */
  base: string;
  water: string;
  bestWinds: string;
  notes: string[];
  hazards: string[];
}

export const SPOTS: Spot[] = [
  // ================= NORD =================
  {
    id: "porto-pollo",
    name: "Porto Pollo",
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
    level: "Tous niveaux, écoles sur place",
    guide: true,
    thermal: true,
    base: "Palau (10 min)",
    water: "Side-shore à cross-shore, petites vagues, plage de sable",
    bestWinds: "Maestrale (NO) 15–30 nds accéléré par les Bouches de Bonifacio",
    notes: [
      "Le spot le plus fiable de l'île selon le guide : baie relativement protégée, « venteux sans être chaotique ».",
      "La plage s'organise par sport : windsurf à gauche, kite au milieu, wingfoil à droite vers Porto Liscia.",
      "Le vent réel dépasse souvent la prévision (venturi + thermique l'après-midi).",
      "Base idéale avec non-pratiquants : Palau, archipel de La Maddalena.",
    ],
    hazards: ["Très fréquenté par beau Maestrale", "Rafales fortes quand le Mistral est établi"],
  },
  {
    id: "porto-liscia",
    name: "Porto Liscia",
    region: "nord",
    lat: 41.175,
    lon: 9.345,
    facing: 30,
    sectors: {
      good: ["NW", "WNW", "NNW", "N", "W", "NE", "ENE", "E"],
      ok: ["NNE", "ESE", "WSW"],
      offshore: ["S", "SSW", "SSE", "SW", "SE"],
    },
    flatWater: true,
    beginner: "ideal",
    freefly: "flat",
    level: "Tous niveaux, idéal débutants",
    guide: true,
    thermal: true,
    base: "Palau",
    water: "Eau plate et peu profonde (on a pied à 100 m du bord), plage de sable",
    bestWinds: "Maestrale (NO) 12–25 nds",
    notes: [
      "L'alternative eau plate de Porto Pollo, à quelques km : le guide conseille de commencer ici avant Porto Pollo.",
      "Quand Porto Pollo est trop chargé, Porto Liscia est souvent un peu plus calme tout en restant bien venté.",
      "Écoles bien établies, moins de monde.",
    ],
    hazards: ["Faible profondeur : attention au foil (mât court au début)"],
  },
  {
    id: "rena-majore",
    name: "Rena Majore",
    region: "nord",
    lat: 41.203,
    lon: 9.066,
    facing: 340,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    level: "Intermédiaire à avancé",
    guide: true,
    thermal: false,
    base: "Santa Teresa di Gallura",
    water: "Vagues, spot exposé et puissant",
    bestWinds: "Maestrale (NO), Tramontana (N), 18–35+ nds",
    notes: [
      "Quand la houle de nord-ouest s'aligne avec le Maestrale : vraies vagues pour le wing (guide).",
      "Rarement plus de quelques riders, plus d'espace et de puissance que Porto Pollo.",
    ],
    hazards: ["Piste d'accès en mauvais état", "Mise à l'eau sur rochers"],
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
    level: "Confirmés (hors guide)",
    guide: false,
    thermal: false,
    base: "Santa Teresa di Gallura",
    water: "Vagues et houle d'ouest, roches",
    bestWinds: "Ouest / Nord-Ouest (side-on), Sud-Ouest",
    notes: ["Spot sauvage près de Santa Teresa ; Rena di Levante de l'autre côté de l'isthme pour les vents d'est."],
    hazards: ["Rochers de granit", "Plage étroite pour décoller"],
  },
  // ================= NORD-OUEST =================
  {
    id: "isola-rossa",
    name: "Isola Rossa",
    region: "nord-ouest",
    lat: 41.006,
    lon: 8.872,
    facing: 60,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    level: "Spot de repli (guide)",
    guide: true,
    thermal: false,
    base: "Isola Rossa / Trinità d'Agultu",
    water: "Baie partiellement protégée du Maestrale",
    bestWinds: "Maestrale (NO) atténué, Nord-Est",
    notes: [
      "Plus gérable que les spots totalement exposés, ambiance de village, très peu de riders (guide).",
      "Bonne option de repli entre Porto Torres et Porto Pollo.",
    ],
    hazards: ["Vent plus irrégulier dans la baie"],
  },
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
    level: "Confirmés (hors guide)",
    guide: false,
    thermal: false,
    base: "Valledoria / Castelsardo",
    water: "Beach-break, houle de nord-ouest",
    bestWinds: "Maestrale (NO) / Nord, Ouest",
    notes: ["Golfe de l'Asinara : le Maestrale rentre side-on avec de la houle, bon pour le freefly."],
    hazards: ["Shorebreak par grosse houle", "Courants près de l'embouchure du Coghinas"],
  },
  {
    id: "platamona",
    name: "Platamona",
    region: "nord-ouest",
    lat: 40.825,
    lon: 8.48,
    facing: 5,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    level: "Spot de repli (guide)",
    guide: true,
    thermal: false,
    base: "Sassari / Porto Torres (15 min)",
    water: "Très longue plage de sable",
    bestWinds: "Maestrale (NO) side-shore, Nord",
    notes: [
      "Maestrale side-shore fiable, à 15 min du port de Porto Torres : idéal pour une première session à l'arrivée.",
      "Longue plage, beaucoup d'espace.",
    ],
    hazards: ["Shorebreak si houle de nord"],
  },
  {
    id: "la-pelosa",
    name: "La Pelosa (Stintino)",
    region: "nord-ouest",
    lat: 40.966,
    lon: 8.209,
    facing: 160,
    sectors: {
      good: ["N", "NNW", "NW", "NNE"],
      ok: ["WNW", "NE", "ENE", "E", "SE", "SSE"],
      offshore: ["S", "SSW", "SW", "WSW"],
    },
    flatWater: false,
    beginner: "no",
    freefly: "flat",
    level: "Intermédiaire à avancé",
    guide: true,
    thermal: false,
    base: "Stintino (40 min de Porto Torres)",
    water: "Lagune peu profonde, plate à clapoteuse, eau turquoise",
    bestWinds: "Tramontana (N), Maestrale (NO), 18–30+ nds",
    notes: [
      "Hors saison (dès octobre) le guide la décrit vide et spectaculaire ; en été accès payant et bondé.",
      "Petites ailes : le vent y est souvent fort (20–30 nds).",
    ],
    hazards: ["Plage protégée : règles d'accès (vérifier sur place)", "Vent fort et rafaleux par Tramontana"],
  },
  {
    id: "mugoni",
    name: "Mugoni (Porto Conte)",
    region: "nord-ouest",
    lat: 40.612,
    lon: 8.205,
    facing: 185,
    flatWater: true,
    beginner: "ideal",
    freefly: "flat",
    level: "Débutant à intermédiaire",
    guide: true,
    thermal: true,
    base: "Alghero (20 min)",
    water: "Baie abritée, eau plate, plage de sable",
    bestWinds: "Brises thermiques d'après-midi 12–20 nds",
    notes: [
      "La baie de Porto Conte protège du Maestrale : pas la puissance de Porto Pollo, mais des conditions propres pour progresser.",
      "Le guide cite septembre–octobre parmi les meilleures périodes. Petite location sur place.",
    ],
    hazards: ["Thermique faible si le ciel est couvert"],
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
    level: "Confirmés (hors guide)",
    guide: false,
    thermal: false,
    base: "Alghero",
    water: "Baie exposée, belles vagues de nord-ouest",
    bestWinds: "Maestrale (NO), Ouest, Sud-Ouest",
    notes: ["Spot de surf réputé au nord d'Alghero, très exposé à la houle de Maestrale."],
    hazards: ["Grosses vagues par Maestrale fort", "Rochers aux extrémités de la baie"],
  },
  // ================= OUEST =================
  {
    id: "capo-mannu",
    name: "Capo Mannu",
    region: "ouest",
    lat: 40.04,
    lon: 8.375,
    facing: 300,
    flatWater: false,
    beginner: "no",
    freefly: "top",
    level: "Avancé",
    guide: true,
    thermal: false,
    base: "Putzu Idu / Oristano",
    water: "Pointe rocheuse, vagues, puissant et exposé",
    bestWinds: "Maestrale (NO), 18–35+ nds",
    notes: [
      "Un des rares spots où l'on fait vraiment de la vague en wing quand la houle de NO s'aligne avec le Maestrale.",
      "Services minimum : tout prévoir.",
    ],
    hazards: ["Récif et rochers", "Vagues puissantes – avancés", "Long retour si casse"],
  },
  {
    id: "is-arutas",
    name: "Is Arutas / Mari Ermi",
    region: "ouest",
    lat: 39.958,
    lon: 8.395,
    facing: 265,
    flatWater: false,
    beginner: "no",
    freefly: "ok",
    level: "Intermédiaire à avancé",
    guide: true,
    thermal: false,
    base: "Cabras",
    water: "Plages exposées, side-shore, petites à moyennes vagues",
    bestWinds: "Maestrale (NO) side-shore, 15–28 nds",
    notes: [
      "Plages de quartz du Sinis : vent plus fort et régulier que les spots abrités, souvent seul à l'eau.",
      "À combiner avec les ruines de Tharros.",
    ],
    hazards: ["Aucun abri du Maestrale", "Peu de services"],
  },
  {
    id: "torre-grande",
    name: "Torre Grande",
    region: "ouest",
    lat: 39.9,
    lon: 8.52,
    facing: 215,
    flatWater: false,
    beginner: "no",
    freefly: "flat",
    level: "Intermédiaire",
    guide: true,
    thermal: false,
    base: "Oristano",
    water: "Golfe d'Oristano, plat à petit clapot, mise à l'eau sur galets",
    bestWinds: "Maestrale (NO), 15–25 nds",
    notes: [
      "Le spot le plus accessible de la zone d'Oristano, plus abrité que le Sinis ; vraie scène locale.",
      "« Moins spectaculaire qu'Is Arutas, plus tolérant » (guide).",
    ],
    hazards: ["Galets à la mise à l'eau", "Vent parfois rafaleux par Maestrale"],
  },
  // ================= SUD-OUEST =================
  {
    id: "punta-trettu",
    name: "Punta Trettu",
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
    level: "Tous niveaux – meilleure eau plate d'Europe",
    guide: true,
    thermal: true,
    base: "Sant'Antioco (20 min)",
    water: "Lagune plate et peu profonde protégée par un banc de sable, on a pied partout",
    bestWinds: "Maestrale + thermiques, 12–25 nds",
    notes: [
      "Selon le guide, l'eau reste lisse même à 20 nds et les thermiques sont « mécaniquement fiables ».",
      "Le meilleur endroit pour que ta femme progresse vite ; pour toi, spot de freestyle / jibes en foil.",
      "Plusieurs écoles, location, hébergements et restaurants de plage.",
    ],
    hazards: ["Faible profondeur : mât court au début", "Herbiers"],
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
    beginner: "ok",
    freefly: "flat",
    level: "Tous niveaux (un peu de clapot)",
    guide: true,
    thermal: true,
    base: "Sant'Antioco / San Giovanni Suergiu",
    water: "Grande baie peu profonde, petit clapot quand le vent monte",
    bestWinds: "Maestrale (NO), Sud-Est",
    notes: [
      "Voisin un peu plus agité de Punta Trettu : pour sortir de l'eau parfaitement plate (guide).",
      "Plus calme, ambiance locale, services basiques.",
    ],
    hazards: ["Vent souvent fort", "Faible profondeur pour le foil"],
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
    level: "Confirmés (hors guide)",
    guide: false,
    thermal: false,
    base: "Iglesias / Portoscuso",
    water: "Beach-break, houle d'ouest / nord-ouest",
    bestWinds: "Maestrale (NO), Ouest, Sud-Ouest",
    notes: ["Spot de vague du sud-ouest, à 30 min de Punta Trettu : le plan freefly quand ta femme est à la lagune."],
    hazards: ["Shorebreak", "Courants par houle"],
  },
  // ================= SUD =================
  {
    id: "porto-giunco",
    name: "Porto Giunco (Villasimius)",
    region: "sud",
    lat: 39.117,
    lon: 9.528,
    facing: 130,
    sectors: {
      good: ["NW", "NNW", "SE", "SSE", "ESE", "E"],
      ok: ["N", "WNW", "S", "ENE"],
      offshore: ["SW", "WSW", "W", "SSW"],
    },
    flatWater: false,
    beginner: "ok",
    freefly: "flat",
    level: "Tous niveaux selon conditions",
    guide: true,
    thermal: false,
    base: "Villasimius",
    water: "Crique protégée, eau cristalline",
    bestWinds: "Maestrale (NO) et Scirocco (SE)",
    notes: [
      "Le guide le recommande pour combiner wing et plage en famille plutôt que pour une semaine 100 % ride.",
      "Étang de Notteri juste derrière (flamants roses).",
    ],
    hazards: ["Vent irrégulier par Maestrale (passe par la terre)"],
  },
  {
    id: "chia",
    name: "Chia – Su Giudeu",
    region: "sud",
    lat: 38.887,
    lon: 8.873,
    facing: 185,
    flatWater: false,
    beginner: "ok",
    freefly: "ok",
    level: "Hors guide",
    guide: false,
    thermal: true,
    base: "Chia / Pula",
    water: "Plages de sable, vagues par Scirocco / Libeccio",
    bestWinds: "Sud-Est (Scirocco), Sud, Sud-Ouest (Libeccio)",
    notes: ["Magnifiques plages ; le guide note que le Scirocco réveille les spots de la côte sud.", "Par Maestrale : offshore."],
    hazards: ["Offshore par Maestrale", "Îlot et rochers face à Su Giudeu"],
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
    level: "Hors guide",
    guide: false,
    thermal: true,
    base: "Cagliari",
    water: "Très longue plage peu profonde, clapot ou petites vagues",
    bestWinds: "Sud-Est (Scirocco), Sud, brise thermique",
    notes: ["Grande plage urbaine avec écoles, pratique pour un jour de ville.", "Par Maestrale : offshore, dangereux."],
    hazards: ["Offshore par Maestrale / vent de nord"],
  },
  // ================= EST =================
  {
    id: "su-tiriarzu",
    name: "Su Tiriarzu (Posada)",
    region: "est",
    lat: 40.645,
    lon: 9.735,
    facing: 85,
    flatWater: false,
    beginner: "ideal",
    freefly: "ok",
    level: "Tous niveaux",
    guide: true,
    thermal: true,
    base: "Posada",
    water: "Grande plage de sable, beaucoup d'espace, sans rochers ni bancs",
    bestWinds: "Thermiques d'après-midi, Scirocco (SE), Tramontana / Grecale (N–NE)",
    notes: [
      "Mise à l'eau facile depuis le sable, beaucoup de débutants et de familles (école Nido Surf).",
      "Le thermique rend souvent le spot navigable quand la prévision régionale est plate : demander à l'école.",
      "Camping directement derrière la plage ; village médiéval de Posada pour l'apéro.",
    ],
    hazards: ["Maestrale offshore ici : réservé aux experts"],
  },
  {
    id: "la-cinta",
    name: "La Cinta (San Teodoro)",
    region: "est",
    lat: 40.8,
    lon: 9.69,
    facing: 80,
    sectors: {
      good: ["NW", "WNW", "NNW", "E", "ENE", "ESE", "SE"],
      ok: ["N", "NE", "SSE", "W"],
      offshore: ["S", "SSW", "SW", "WSW"],
    },
    flatWater: false,
    beginner: "ideal",
    freefly: "ok",
    level: "Tous niveaux",
    guide: true,
    thermal: false,
    base: "San Teodoro",
    water: "Lagune plate côté étang par Maestrale ; mer côté plage par vents d'est",
    bestWinds: "Maestrale (NO) sur la lagune, Est / Sud-Est côté mer",
    notes: [
      "Longue langue de sable entre l'étang de San Teodoro et la mer : eau plate protégée côté lagune quand le Maestrale arrive (guide).",
      "Une des plus belles plages du nord-est.",
    ],
    hazards: ["Choisir le bon côté selon la direction du vent"],
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

/** Points de départ pour estimer les temps de route. */
export const PLACES = {
  "porto-torres": { name: "Porto Torres (ferry)", lat: 40.836, lon: 8.401 },
  olbia: { name: "Olbia (ferry)", lat: 40.923, lon: 9.515 },
} as const;

/**
 * Pages Windguru (prévisions) par spot : https://www.windguru.cz/<id>.
 * `proxy` = pas de page dédiée trouvée, on renvoie vers le spot Windguru le plus proche.
 * `stations` = balises Windguru en direct (https://www.windguru.cz/station/<id>).
 * Identifiants trouvés le 7 oct. 2026 via la recherche Windguru.
 */
export const WINDGURU: Record<string, { id: number; proxy?: string; stations?: { id: number; name: string }[] }> = {
  "porto-pollo": { id: 278, stations: [{ id: 974, name: "Porto Pollo – FH Academy" }] },
  "porto-liscia": { id: 91929 },
  "rena-majore": { id: 49163, stations: [{ id: 2225, name: "Rena Majore – Petra di Cossu" }] },
  "capo-testa": { id: 49163, proxy: "Rena Majore", stations: [{ id: 2225, name: "Rena Majore – Petra di Cossu" }] },
  "isola-rossa": { id: 49167 },
  valledoria: { id: 49168 },
  platamona: { id: 49171 },
  "la-pelosa": { id: 49172 },
  mugoni: { id: 49174 },
  "porto-ferro": { id: 49173 },
  "capo-mannu": { id: 49176 },
  "is-arutas": { id: 501236 },
  "torre-grande": { id: 29081, proxy: "Sinis" },
  "punta-trettu": { id: 436366 },
  "porto-botte": { id: 74121, stations: [{ id: 3301, name: "Porto Botte – flyitkitesurf" }] },
  funtanamare: { id: 52705 },
  "porto-giunco": { id: 146965 },
  chia: { id: 1522 },
  poetto: { id: 29744 },
  "su-tiriarzu": { id: 501232, proxy: "La Caletta (5 km)" },
  "la-cinta": { id: 49159 },
};
