import { NextResponse } from "next/server";
import { publicRequestOrigin } from "../../lib/public-origin";
import { authServiceUrl } from "../../lib/toolkit-auth";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const logout = new URL("/auth/logout", authServiceUrl());
  logout.searchParams.set("returnTo", `${publicRequestOrigin(request)}/`);
  return NextResponse.redirect(logout);
}
