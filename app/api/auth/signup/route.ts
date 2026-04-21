import { registerUserWithFirebase } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";
import type { UserInterest } from "@/lib/backend/types";

export const runtime = "nodejs";

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
  interest?: UserInterest | null;
};

export async function POST(request: Request) {
  try {
    const body = await parseJson<SignupBody>(request);
    const user = await registerUserWithFirebase({
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      interest: body.interest,
    });

    return jsonOk({ user }, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create account.");
  }
}
