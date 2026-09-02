import { NextResponse } from "next/server";
import { publicRequestOrigin } from "../../lib/public-origin";
import { authServiceUrl } from "../../lib/toolkit-auth";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const login = new URL("/auth/login", authServiceUrl());
  const returnTo = new URL("/", publicRequestOrigin(request));
  returnTo.searchParams.set("auth_event", "login_completed");
  login.searchParams.set("returnTo", returnTo.toString());
  return NextResponse.redirect(login);
}
