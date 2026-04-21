import { authenticateUserWithFirebase } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";

export const runtime = "nodejs";

type SigninBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = await parseJson<SigninBody>(request);
    const user = await authenticateUserWithFirebase({
      email: body.email ?? "",
      password: body.password ?? "",
    });
    return jsonOk({ user });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to sign in.", 401);
  }
}
