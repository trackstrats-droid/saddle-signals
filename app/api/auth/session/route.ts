import { NextRequest, NextResponse } from "next/server";

const SESSION_AUTHORITY = "https://aheadofthemark.trackstrats.com/api/auth/session";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(SESSION_AUTHORITY, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Session authority unavailable");
    const session = await response.json();
    return NextResponse.json(session, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
