import { NextResponse } from "next/server";

/**
 * Réponse JSON mise en cache par le CDN de Vercel (`s-maxage`) ; on sert une version
 * périmée pendant la régénération (`stale-while-revalidate`) pour rester rapide.
 */
export async function cachedJson<T>(fn: () => Promise<T>, sMaxAge: number): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 6}` },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
