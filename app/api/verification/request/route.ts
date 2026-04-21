import { getCurrentUser } from "@/lib/backend/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/backend/http";
import { requestVerification } from "@/lib/backend/service";

export const runtime = "nodejs";

type VerificationBody = {
  message?: string;
  proofLabel?: string;
  proofDetails?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Sign in to request verification.", 401);
  }

  try {
    const body = await parseJson<VerificationBody>(request);
    const profile = await requestVerification({
      userId: user.id,
      message: body.message ?? "",
      proofLabel: body.proofLabel ?? "",
      proofDetails: body.proofDetails ?? "",
    });

    return jsonOk({ profile });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to submit verification request.");
  }
}
