// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const role = request.nextUrl.searchParams.get("role");

  if (!token || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ✅ Redirect to CLEAN URL (no token/role in URL)
  const response = NextResponse.redirect(
    new URL(role === "ADMIN" ? "/admin" : "/userDashboard", request.url)
  );

  // ✅ Set cookies here (API route handles it)
  response.cookies.set({
    name: "access_token",
    value: token,
    httpOnly: false,
    secure: false,  // false for HTTP LAN testing
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set({
    name: "role",
    value: role,
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
  });

  return response;
}