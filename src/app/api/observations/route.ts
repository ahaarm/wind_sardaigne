import { getObservations } from "@/lib/server/observations";
import { cachedJson } from "@/lib/server/respond";

export const maxDuration = 30;

export async function GET() {
  return cachedJson(() => getObservations(26), 600);
}
