# 🪁 Vent Sardaigne

Dashboard perso pour planifier un road-trip wingfoil en Sardaigne (arrivée à Porto Torres le 10 octobre, retour le 25 octobre 2026 depuis Porto Torres ou Olbia, deux VW California) :
où aller chaque jour selon le vent, la houle et la météo, pour une débutante 🌱, pour du freefly/vague 🌊 et
pour la famille ☀️.

## Ce que fait l'app

| Page | Contenu |
|---|---|
| **Planning** (`/`) | Matrice spots × jours (10 jours) avec une note 0–100 par profil (Débutante, Freefly/vague, Les deux, Famille/beau temps) + « meilleurs choix par jour ». Filtre par région, temps de route depuis Porto Torres, Olbia ou la position GPS, aile conseillée (5 m / 3,5 m) pour chacun, correction thermique optionnelle. |
| **Spot** (`/spot/<id>`) | Fiche du spot (niveau, plan d'eau, dangers, rose des vents side/onshore/offshore), heure par heure pour chaque modèle, houle, nuages/pluie/température, graphique 5 jours avec l'écart entre modèles, balises proches, liens Windguru (+ balises Windguru) / Windy / Windfinder / Holfuy / itinéraire / campings. |
| **Tendance 15 j** (`/tendance`) | Ensemble ECMWF (51 scénarios) par région : probabilité de ≥ 12 / ≥ 18 nds l'après-midi et régime dominant (Mistral, Scirocco, Libeccio). Pour choisir la côte vers laquelle rouler. |
| **Campings** (`/campings`) | ~30 campings, aires et parkings ouverts (ou probablement) entre le 10 et le 25 octobre, avec dates, services, téléphone, sources, et les règles pour dormir en van. Aussi affichés sur chaque fiche spot. |
| **Balises** (`/balises`) | Vent mesuré (METAR des aéroports et des caps + Figari en Corse), dernières 24 h. |
| **Modèles** (`/modeles`) | Quel modèle croire selon l'échéance + **vérification automatique** : erreur des prévisions J-1/J-2/J-3 de chaque modèle face au vent mesuré aux balises sur les 7 derniers jours. |

Les dernières données sont gardées dans le navigateur : sans réseau, l'app affiche la dernière version avec son heure.

## Modèles et « mix pondéré »

Toutes les prévisions passent par [Open-Meteo](https://open-meteo.com/) (gratuit, sans clé, usage non commercial).

| Modèle | Résolution | Échéance | Poids dans le mix |
|---|---|---|---|
| AROME France HD (Météo-France) | 1,5 km | ~2 j | 1 jusqu'à 42 h |
| AROME France | 2,5 km | ~2 j | 0,5 jusqu'à 42 h |
| ICON-2I (ItaliaMeteo / ARPAE) | 2,2 km | 3 j | 1 jusqu'à 72 h |
| ICON-EU (DWD) | 7 km | 5 j | 0,5 (< 48 h) puis 1 jusqu'à 120 h |
| ARPEGE Europe | ~11 km | 4 j | 0,5 jusqu'à 96 h |
| ECMWF IFS | 9–25 km | 15 j | 0,5 (< 48 h) puis 1 |
| ECMWF AIFS (IA) | 25 km | 15 j | 0 (affiché seulement) |
| GFS | 13–25 km | 16 j | 0,3 au-delà de 120 h |

ICON-D2 (DWD, 2 km) n'est **pas** utilisé : son domaine s'arrête vers 43°N et ne couvre pas la Sardaigne.
La houle vient de l'API Marine d'Open-Meteo, la tendance de l'API Ensemble (ECMWF IFS 0,25°).

Si un identifiant de modèle est refusé par Open-Meteo, le suivant dans `candidates` est essayé
(`src/lib/models.ts`) et la page Planning signale les modèles indisponibles.

## Notes (scoring)

Calculées heure par heure entre 10 h et 18 h ; note du jour = moyenne des 3 meilleures heures (`src/lib/scoring.ts`).
Seuil commun : **10 nœuds établis minimum** (`MIN_WIND`), en dessous la note est 0.

- **Débutante** : vent ≥ 10 nds, idéal 13–18 nds, pénalité si rafales irrégulières ou > 25–30 nds, 0 si offshore, bonus lagune / eau plate, pénalité vagues.
- **Freefly / vague** : vent ≥ 10 nds, idéal 14–26 nds, houle idéale 0,8–2,5 m, spots « vague » favorisés.
- **Les deux** : moyenne géométrique des deux → un spot où vous naviguez tous les deux le même jour.
- **Famille / beau temps** : soleil, pas de pluie, ≥ 22 °C, vent pas trop fort.

La direction est jugée par spot : side/side-on (bon), onshore (ok), side-off (bof), offshore (dangereux).
Les spots (les 15 du guide [Inside Sardinia](https://www.inside-sardinia.com/guides/wingfoiling-sardinia/) + 6 spots à vagues hors guide) et leurs orientations sont dans `src/lib/spots.ts` ; ajuste-les si tu découvres mieux sur place.

**Correction thermique** : le guide note que 12–18 nds prévus le matin donnent souvent 18–25 nds sur l'eau vers 15 h. Le réglage +10 % / +20 % majore le vent prévu entre 12 h et 18 h sur les spots marqués « thermique » (désactivé par défaut ; à calibrer avec la page Modèles et les balises).

## Choix d'aile (quiver 5 m + 3,5 m)

`src/lib/wings.ts` : vent effectif = max(vent moyen, 0,8 × rafales). Débutante : 5 m jusqu'à ~17 nds, 3,5 m jusqu'à ~24 nds.
Confirmé : 5 m jusqu'à ~22 nds, 3,5 m jusqu'à ~32 nds. Si vous avez besoin de la même aile au même moment, l'app
l'indique (« à tour de rôle »). Seuils à ajuster après les premières sessions.

## Déployer sur Vercel

1. Pousser ce repo sur GitHub (déjà fait si tu lis ceci sur GitHub).
2. Sur [vercel.com/new](https://vercel.com/new) : *Import Git Repository* → choisir `wind_sardaigne` → **Deploy**.
   Aucune variable d'environnement n'est nécessaire (framework détecté : Next.js).
3. Sur le téléphone : ouvrir l'URL puis « Ajouter à l'écran d'accueil ».

Les réponses des API sont mises en cache par le CDN de Vercel (1 h pour les prévisions, 10 min pour les balises,
3 h pour la tendance et la vérification), ce qui reste largement sous la limite gratuite d'Open-Meteo (10 000 appels/jour).

## Développement

```bash
npm install
npm run dev          # vraies données
npm run dev:mock     # données simulées (sans réseau)
npm test             # tests unitaires (vitest)
npm run lint         # vérification TypeScript
npm run build
```

## Sources de données

- Prévisions : Open-Meteo (Météo-France AROME/ARPEGE, ItaliaMeteo-ARPAE ICON-2I, DWD ICON-EU, ECMWF IFS/AIFS, NOAA GFS).
- Houle : Open-Meteo Marine. Tendance : Open-Meteo Ensemble.
- Vent mesuré : METAR via [aviationweather.gov](https://aviationweather.gov/data/api/) (repli : NOAA tgftp).
- Les balises privées (Holfuy, Windguru, Windy stations) n'ont pas d'API libre : liens directs depuis chaque spot.
