import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";
import { getSettingsProfile, updateSettingsProfile } from "@/lib/backend/service";

export const runtime = "nodejs";

type UpdateProfileBody = {
  name?: string;
  handle?: string;
  bio?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to view your settings.", 401);
  }

  const profile = await getSettingsProfile(user.id);
  return jsonOk({ profile });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to update your settings.", 401);
  }

  try {
    const body = await parseJson<UpdateProfileBody>(request);
    const profile = await updateSettingsProfile(user.id, body);
    return jsonOk({ profile });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update your settings.");
  }
}
