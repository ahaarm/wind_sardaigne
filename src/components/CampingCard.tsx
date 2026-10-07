import { CAMPING_TYPE_LABEL, STATUS_LABEL, type Camping, type OctStatus } from "@/lib/campings";
import { SPOT_BY_ID } from "@/lib/spots";
import { formatDay } from "@/lib/time";

const STATUS_CLASS: Record<OctStatus, string> = {
  ouvert: "badge-ideal",
  probable: "badge-ideal",
  partiel: "badge-ok",
  incertain: "badge-no",
};

export function StatusBadge({ c }: { c: Camping }) {
  return (
    <span className={`badge ${STATUS_CLASS[c.status]}`} style={c.status === "probable" ? { opacity: 0.8 } : undefined}>
      {c.status === "partiel" && c.closes ? `Jusqu'au ${formatDay(c.closes)}` : STATUS_LABEL[c.status]}
    </span>
  );
}

export default function CampingCard({ c, distance }: { c: Camping; distance?: string }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <strong>{c.name}</strong>
        <StatusBadge c={c} />
      </div>
      <div className="tiny muted">
        {CAMPING_TYPE_LABEL[c.type]} · {c.town}
        {distance ? ` · ${distance}` : ""}
      </div>
      <p className="small" style={{ margin: "6px 0" }}>
        <strong>Ouverture :</strong> {c.opening}
        <br />
        {c.services}
        {c.price && (
          <>
            <br />
            <strong>Prix :</strong> {c.price}
          </>
        )}
      </p>
      {c.note && <p className="small" style={{ margin: "4px 0", color: "var(--warn)" }}>⚠ {c.note}</p>}
      <div className="tiny muted" style={{ marginBottom: 6 }}>
        Spots : {c.spots.map((id) => SPOT_BY_ID[id]?.name ?? id).join(", ")}
      </div>
      <div className="row">
        {c.phone && (
          <a className="btn" href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>
            📞 Appeler
          </a>
        )}
        <a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`} target="_blank" rel="noreferrer">
          Itinéraire
        </a>
        {c.web && (
          <a className="btn" href={c.web} target="_blank" rel="noreferrer">
            Site
          </a>
        )}
        {c.sources.map((s, i) => (
          <a key={s} className="tiny" href={s} target="_blank" rel="noreferrer">
            source {i + 1}
          </a>
        ))}
      </div>
    </div>
  );
}
