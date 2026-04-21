import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { toggleSavedApp } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext<"/api/apps/[id]/save">) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to save apps.", 401);
  }

  try {
    const { id } = await context.params;
    const payload = await toggleSavedApp(id, user.id);
    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save app.", 404);
  }
}
