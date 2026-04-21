import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

export async function parseJson<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
