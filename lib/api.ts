import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export function serverError(error = "Internal Server Error") {
  return NextResponse.json({ error }, { status: 500 });
}

export async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
