import { jsonError, jsonOk } from "@/lib/backend/http";
import { recordAppUse } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext<"/api/apps/[id]/use">) {
  try {
    const { id } = await context.params;
    const payload = await recordAppUse(id);
    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to record app use.", 404);
  }
}
