import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";
import { createProject, listProjects } from "@/lib/backend/service";

export const runtime = "nodejs";

type CreateProjectBody = {
  name?: string;
  description?: string;
  visibility?: "public" | "private";
  status?: "draft" | "published" | "private";
  tags?: string[];
  code?: string;
  sourceKind?: "project" | "draft" | "upload";
  sourceLabel?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to view projects.", 401);
  }

  const projects = await listProjects(user.id);
  return jsonOk({ projects });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to create projects.", 401);
  }

  try {
    const body = await parseJson<CreateProjectBody>(request);
    const project = await createProject({
      ownerId: user.id,
      name: body.name ?? "Untitled project",
      description: body.description ?? "A new Kyro project.",
      visibility: body.visibility,
      status: body.status,
      tags: body.tags,
      code: body.code,
      sourceKind: body.sourceKind,
      sourceLabel: body.sourceLabel,
    });

    return jsonOk({ project }, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create project.");
  }
}
