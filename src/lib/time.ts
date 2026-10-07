export const TZ = "Europe/Rome";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

export interface LocalParts {
  /** AAAA-MM-JJ en heure de Sardaigne. */
  date: string;
  hour: number;
}

const cache = new Map<number, LocalParts>();

export function localParts(unix: number): LocalParts {
  const hit = cache.get(unix);
  if (hit) return hit;
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(unix * 1000)).map((x) => [x.type, x.value]));
  const res = { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
  if (cache.size > 5000) cache.clear();
  cache.set(unix, res);
  return res;
}

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const dayShortFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric" });

/** « ven. 9 oct. » à partir de AAAA-MM-JJ. */
export function formatDay(date: string, short = false): string {
  const d = new Date(`${date}T12:00:00Z`);
  return (short ? dayShortFmt : dayFmt).format(d);
}

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTime(unix: number): string {
  return timeFmt.format(new Date(unix * 1000));
}

export function formatDateTime(unix: number): string {
  return dateTimeFmt.format(new Date(unix * 1000));
}

export function todayLocal(): string {
  return localParts(Math.floor(Date.now() / 1000)).date;
}

/** Âge lisible d'une observation. */
export function ago(unix: number, now = Date.now() / 1000): string {
  const m = Math.round((now - unix) / 60);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `il y a ${h} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`;
  return `il y a ${Math.round(h / 24)} j`;
}
