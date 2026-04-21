import { getCurrentUser, publicUser } from "@/lib/backend/auth";
import { jsonOk } from "@/lib/backend/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  return jsonOk({
    authenticated: Boolean(user),
    user: user ? publicUser(user) : null,
  });
}
