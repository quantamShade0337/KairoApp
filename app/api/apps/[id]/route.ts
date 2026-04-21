import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { getAppById } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/apps/[id]">) {
  const { id } = await context.params;
  const viewer = await getCurrentUser();
  const payload = await getAppById(id, viewer?.id);

  if (!payload) {
    return jsonError("App not found.", 404);
  }

  return jsonOk(payload);
}
