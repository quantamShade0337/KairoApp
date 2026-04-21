import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { cloneApp } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext<"/api/apps/[id]/clone">) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to clone apps.", 401);
  }

  try {
    const { id } = await context.params;
    const payload = await cloneApp(id, user);
    return jsonOk(payload, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to clone app.", 404);
  }
}
