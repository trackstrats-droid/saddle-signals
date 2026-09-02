import { NextRequest, NextResponse } from "next/server";

const LOGIN_SERVICE = "https://login.trackstrats.com/auth/logout";

export function GET(request: NextRequest) {
  const origin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || request.nextUrl.origin;
  return NextResponse.redirect(`${LOGIN_SERVICE}?returnTo=${encodeURIComponent(`${origin}/`)}`);
}
