import { NextRequest, NextResponse } from "next/server";

const LOGIN_SERVICE = "https://login.trackstrats.com/auth/login";

export function GET(request: NextRequest) {
  const origin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || request.nextUrl.origin;
  const returnTo = `${origin}/?auth_event=login_completed`;
  return NextResponse.redirect(`${LOGIN_SERVICE}?returnTo=${encodeURIComponent(returnTo)}`);
}
