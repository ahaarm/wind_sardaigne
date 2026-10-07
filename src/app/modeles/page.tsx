import Verification from "@/components/Verification";
import { MODELS } from "@/lib/models";

export const metadata = { title: "Modèles – Vent Sardaigne" };

export default function Page() {
  return (
    <div>
      <h1 style={{ marginTop: 12 }}>Quel modèle croire ?</h1>

      <div className="card">
        <h3>La règle pratique</h3>
        <ul className="clean">
          <li>
            <strong>Aujourd&apos;hui / demain (0–48 h)</strong> : <strong>AROME HD</strong> (Météo-France, 1,5 km) et{" "}
            <strong>ICON-2I</strong> (ItaliaMeteo, 2,2 km). Ce sont les seuls à « voir » le relief, l&apos;effet venturi
            des Bouches de Bonifacio et les caps. Quand ils sont d&apos;accord, c&apos;est fiable.
          </li>
          <li>
            <strong>J+2 à J+5</strong> : <strong>ECMWF IFS</strong> en priorité, <strong>ICON-EU</strong> et ARPEGE
            comme second avis. On regarde surtout l&apos;arrivée et la fin d&apos;un épisode de Mistral, pas les nœuds exacts.
          </li>
          <li>
            <strong>J+5 à J+15</strong> : seulement des <strong>probabilités</strong> (ensemble ECMWF, page{" "}
            <a href="/tendance">Tendance</a>) pour choisir la côte vers laquelle rouler.
          </li>
          <li>
            <strong>ICON-D2</strong> (DWD 2 km) ne couvre pas la Sardaigne : son domaine s&apos;arrête vers 43°N.
          </li>
          <li>
            Les modèles sous-estiment souvent le vent sur les spots accélérés (Porto Pollo, Capo Testa, caps) et le
            surestiment parfois quand le vent est offshore et rafaleux. Comparez toujours avec une balise le matin.
          </li>
        </ul>
        <p className="small muted">
          Le « mix pondéré » du planning applique cette règle automatiquement : à chaque heure, chaque modèle reçoit un
          poids selon l&apos;échéance, et l&apos;écart entre modèles est affiché comme indicateur de confiance.
        </p>
      </div>

      <h2>Précision mesurée sur les 7 derniers jours</h2>
      <Verification />

      <h2>Les modèles utilisés</h2>
      <div className="grid-cards">
        {MODELS.map((m) => (
          <div key={m.id} className="card" style={{ margin: 0 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>
                <span className="swatch" style={{ background: m.color }} />
                {m.name}
              </strong>
            </div>
            <div className="tiny muted">
              {m.provider} · {m.resolution} · {m.horizon}
            </div>
            <p className="small" style={{ marginBottom: 6 }}>
              {m.description}
            </p>
            <div className="tiny muted">
              Poids dans le mix : J0 {m.weight(12)} · J+1 {m.weight(36)} · J+2 {m.weight(60)} · J+4 {m.weight(100)} · J+7{" "}
              {m.weight(170)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
