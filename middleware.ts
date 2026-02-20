import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    const now = Math.floor(Date.now() / 1000);
    console.log("🕐 Token exp:", new Date(payload.exp * 1000).toISOString());
    console.log("🕐 Now:      ", new Date(now * 1000).toISOString());
    console.log("🕐 Expired?  ", payload.exp < now);
    return payload.exp < now;
  } catch {
    console.log("❌ Failed to parse token");
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Path:", pathname);

  // --------------------------------------------------
  // ✅ Token + role in URL → set cookies → redirect /admin
  // --------------------------------------------------
  const urlToken = request.nextUrl.searchParams.get("token");
  const urlRole = request.nextUrl.searchParams
    .get("role")
    ?.replace(/'/g, "")
    .trim()
    .toUpperCase();

  if (urlToken && urlRole === "ADMIN") {
    console.log("🔑 Token found in URL");
    console.log("👤 Role from URL:", urlRole);

    if (!isTokenExpired(urlToken)) {
      console.log("✅ Token valid → setting cookies → /admin");

      const response = NextResponse.redirect(new URL("/admin", request.url));

      response.cookies.set("access_token", urlToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      response.cookies.set("role", urlRole, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      return response;
    } else {
      console.log("❌ Token in URL expired → /login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // --------------------------------------------------
  // ✅ Skip login + register
  // --------------------------------------------------
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    console.log("⏭️ Skipping auth for:", pathname);
    return NextResponse.next();
  }

  // --------------------------------------------------
  // ✅ Read cookies
  // --------------------------------------------------
  const token = request.cookies.get("access_token")?.value;
  const role = request.cookies.get("role")?.value;

  console.log("🍪 Cookie token exists:", !!token);
  console.log("🍪 Cookie role:", role ?? "NONE");

  if (token) {
    console.log("🔍 Token preview:", token.substring(0, 20) + "...");
  }

  // --------------------------------------------------
  // ❌ No token → login
  // --------------------------------------------------
  if (!token) {
    console.log("❌ No token → /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --------------------------------------------------
  // ❌ Expired token → clear + login
  // --------------------------------------------------
  if (isTokenExpired(token)) {
    console.log("❌ Token expired → clearing → /login");
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    response.cookies.delete("role");
    return response;
  }

  // --------------------------------------------------
  // ✅ Prevent going back to login
  // --------------------------------------------------
  if (pathname === "/login") {
    console.log("↩️ Already logged in → away from /login");
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/userDashboard", request.url));
  }

  // --------------------------------------------------
  // ✅ ADMIN → Full access
  // --------------------------------------------------
  if (role === "ADMIN") {
    console.log("✅ ADMIN → access granted:", pathname);
    return NextResponse.next();
  }

  // --------------------------------------------------
  // ✅ USER → Restricted
  // --------------------------------------------------
  if (role === "USER") {
    const allowedUserRoutes = [
      "/userDashboard",
      "/users",
      "/arm",
      "/rimType",
      "/inspections",
      "/schedule",
      "/settings",
    ];

    const isAllowed = allowedUserRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (pathname.startsWith("/admin") || !isAllowed) {
      console.log("🚫 USER blocked from:", pathname);
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }

    console.log("✅ USER access granted:", pathname);
    return NextResponse.next();
  }

  // --------------------------------------------------
  // ❌ Unknown role
  // --------------------------------------------------
  console.log("❌ Unknown role:", role, "→ /login");
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};