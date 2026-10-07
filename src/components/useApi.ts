"use client";

import { useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** true si on affiche la copie locale (hors-ligne / en attente du réseau). */
  stale: boolean;
}

const PREFIX = "wind-sar:";

/**
 * Récupère une route /api et garde la dernière réponse dans le navigateur, pour
 * afficher quelque chose même sans réseau (dans le van…).
 */
export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true, stale: false });

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem(PREFIX + path);
      if (saved) setState({ data: JSON.parse(saved) as T, error: null, loading: true, stale: true });
    } catch {
      /* stockage indisponible */
    }
    fetch(path)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? `HTTP ${r.status}`);
        return body as T;
      })
      .then((data) => {
        if (cancelled) return;
        setState({ data, error: null, loading: false, stale: false });
        try {
          localStorage.setItem(PREFIX + path, JSON.stringify(data));
        } catch {
          /* quota dépassé : tant pis */
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, error: e.message, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
