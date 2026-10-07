/**
 * Choix d'aile avec le quiver disponible : 5 m et 3,5 m.
 *
 * On raisonne sur un vent « effectif » qui tient compte des rafales : max(vent moyen, 0,8 × rafales).
 * Seuils indicatifs pour des gabarits moyens (à ajuster après les premières sessions) :
 * - débutante : 5 m jusqu'à ~17 nds effectifs, 3,5 m jusqu'à ~24 nds, au-delà trop fort ;
 * - confirmé : 5 m jusqu'à ~22 nds, 3,5 m jusqu'à ~32 nds, au-delà trop fort.
 * Sous 10 nds établis : pas navigable (et la 5 m est juste entre 10 et 12 nds : grand foil / grande planche).
 */
import { MIN_WIND } from "./scoring";

export type Wing = "5" | "3.5" | "light" | "strong";
export type Rider = "debutante" | "confirme";

export const WING_THRESHOLDS: Record<Rider, { to5: number; to35: number }> = {
  debutante: { to5: 17, to35: 24 },
  confirme: { to5: 22, to35: 32 },
};

export function effectiveWind(w: number, g: number | null): number {
  return Math.max(w, (g ?? w * 1.3) * 0.8);
}

export function wingFor(w: number | null, g: number | null, rider: Rider): Wing | null {
  if (w == null) return null;
  if (w < MIN_WIND) return "light";
  const eff = effectiveWind(w, g);
  const t = WING_THRESHOLDS[rider];
  if (eff <= t.to5) return "5";
  if (eff <= t.to35) return "3.5";
  return "strong";
}

export function wingLabel(wing: Wing | null): string {
  switch (wing) {
    case "5":
      return "5 m";
    case "3.5":
      return "3,5 m";
    case "light":
      return "trop léger";
    case "strong":
      return "trop fort";
    default:
      return "–";
  }
}

/** Les deux ont besoin de la même aile au même moment → naviguer à tour de rôle. */
export function wingConflict(a: Wing | null, b: Wing | null): boolean {
  return (a === "5" || a === "3.5") && a === b;
}

/** Résumé court pour un couple (elle / toi). */
export function wingPlan(w: number | null, g: number | null): { her: Wing | null; him: Wing | null; text: string } {
  const her = wingFor(w, g, "debutante");
  const him = wingFor(w, g, "confirme");
  let text = `elle ${wingLabel(her)} · toi ${wingLabel(him)}`;
  if (wingConflict(her, him)) text += " → à tour de rôle";
  return { her, him, text };
}
