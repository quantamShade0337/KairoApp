import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk } from "@/lib/backend/http";
import { purchaseApp } from "@/lib/backend/service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext<"/api/apps/[id]/purchase">) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to buy apps.", 401);
  }

  try {
    const { id } = await context.params;
    const payload = await purchaseApp(id, user.id);
    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to buy app.");
  }
}
