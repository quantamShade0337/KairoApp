import { NextRequest } from "next/server";
import { listApps } from "@/lib/backend/service";
import { jsonOk } from "@/lib/backend/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "All";
  const sort = searchParams.get("sort") ?? "Most used";

  const payload = await listApps({ query, category, sort });
  return jsonOk(payload);
}
