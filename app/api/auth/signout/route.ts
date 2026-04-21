import { clearSession } from "@/lib/backend/auth";
import { jsonOk } from "@/lib/backend/http";

export const runtime = "nodejs";

export async function POST() {
  await clearSession();
  return jsonOk({ success: true });
}
