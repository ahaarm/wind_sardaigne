import { mockResponse } from "./mock";

export const USER_AGENT = "wind-sardaigne/1.0 (dashboard perso wingfoil Sardaigne)";

export function isMock(): boolean {
  return process.env.MOCK_DATA === "1";
}

/** GET JSON avec cache de données Next.js (partagé entre fonctions sur Vercel). */
export async function getJson<T = unknown>(url: string, revalidateSeconds: number): Promise<T> {
  if (isMock()) return mockResponse(url) as T;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    let reason = res.statusText;
    try {
      const body = (await res.json()) as { reason?: string };
      if (body?.reason) reason = body.reason;
    } catch {
      /* corps non JSON */
    }
    throw new Error(`HTTP ${res.status} – ${reason}`);
  }
  return (await res.json()) as T;
}

export async function getText(url: string, revalidateSeconds: number): Promise<string> {
  if (isMock()) return String(mockResponse(url));
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  return res.text();
}
