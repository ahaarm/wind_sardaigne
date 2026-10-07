import { getVerification } from "@/lib/server/observations";
import { cachedJson } from "@/lib/server/respond";

export const maxDuration = 60;

export async function GET() {
  return cachedJson(() => getVerification(7), 3 * 3600);
}
