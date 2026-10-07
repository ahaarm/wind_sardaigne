import { getEnsemble } from "@/lib/server/ensemble";
import { cachedJson } from "@/lib/server/respond";

export const maxDuration = 60;

export async function GET() {
  return cachedJson(getEnsemble, 3 * 3600);
}
