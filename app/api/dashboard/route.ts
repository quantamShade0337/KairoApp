import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { listDashboard } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to view your dashboard.", 401);
  }

  const payload = await listDashboard(user.id);
  return jsonOk({
    user: {
      id: user.id,
      name: user.name,
      handle: user.handle,
    },
    ...payload,
  });
}
