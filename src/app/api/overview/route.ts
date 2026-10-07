import { getOverview } from "@/lib/server/forecast";
import { cachedJson } from "@/lib/server/respond";

export const maxDuration = 60;

export async function GET() {
  return cachedJson(getOverview, 3600);
}
