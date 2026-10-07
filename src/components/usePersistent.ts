"use client";

import { useEffect, useState } from "react";

/** Petit état string mémorisé dans le navigateur (profil, région, réglages). */
export function usePersistent<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setV(s as T);
    } catch {
      /* stockage indisponible */
    }
  }, [key]);
  return [
    v,
    (nv: T) => {
      setV(nv);
      try {
        localStorage.setItem(key, nv);
      } catch {
        /* ignore */
      }
    },
  ];
}

/** Correction thermique choisie par l'utilisateur (0, 0.1, 0.2). */
export const BOOST_OPTIONS = [
  { id: "0", label: "Aucune", value: 0 },
  { id: "0.1", label: "+10 %", value: 0.1 },
  { id: "0.2", label: "+20 %", value: 0.2 },
] as const;

export type BoostId = (typeof BOOST_OPTIONS)[number]["id"];

export function boostValue(id: string): number {
  return BOOST_OPTIONS.find((b) => b.id === id)?.value ?? 0;
}
