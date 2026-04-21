import { jsonError, jsonOk } from "@/lib/backend/http";
import { getCreatorProfile } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/creators/[handle]">) {
  const { handle } = await context.params;
  const payload = await getCreatorProfile(handle);

  if (!payload) {
    return jsonError("Creator not found.", 404);
  }

  return jsonOk(payload);
}
