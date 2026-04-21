import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";
import { getProject, updateProject } from "@/lib/backend/service";

export const runtime = "nodejs";

type UpdateProjectBody = {
  name?: string;
  description?: string;
  code?: string;
  visibility?: "public" | "private";
  status?: "draft" | "published" | "private";
  tags?: string[];
};

export async function GET(_request: Request, context: RouteContext<"/api/projects/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to view projects.", 401);
  }

  try {
    const { id } = await context.params;
    const project = await getProject(id, user.id);

    if (!project) {
      return jsonError("Project not found.", 404);
    }

    return jsonOk({ project });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load project.", 403);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/projects/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to update projects.", 401);
  }

  try {
    const { id } = await context.params;
    const body = await parseJson<UpdateProjectBody>(request);
    const project = await updateProject(id, user.id, body);
    return jsonOk({ project });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update project.");
  }
}
