import { NextResponse } from "next/server";
import { getSpotDetail } from "@/lib/server/forecast";
import { cachedJson } from "@/lib/server/respond";
import { SPOT_BY_ID } from "@/lib/spots";

export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const spot = SPOT_BY_ID[id];
  if (!spot) return NextResponse.json({ error: "Spot inconnu" }, { status: 404 });
  return cachedJson(() => getSpotDetail(spot), 3600);
}
