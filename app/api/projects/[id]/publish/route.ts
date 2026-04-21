import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";
import { publishProject } from "@/lib/backend/service";
import type { AppCategory } from "@/lib/backend/types";

export const runtime = "nodejs";

type PublishBody = {
  name?: string;
  description?: string;
  tags?: string[];
  visibility?: "public" | "private";
  category?: AppCategory;
  priceCents?: number;
  sourceKind?: "project" | "draft" | "upload";
  sourceLabel?: string;
};

export async function POST(request: Request, context: RouteContext<"/api/projects/[id]/publish">) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to publish projects.", 401);
  }

  try {
    const { id } = await context.params;
    const body = await parseJson<PublishBody>(request);
    const payload = await publishProject(id, user.id, body);
    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to publish project.");
  }
}
