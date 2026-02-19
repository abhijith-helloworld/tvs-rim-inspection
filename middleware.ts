// FILE: middleware.ts (root of Next.js project)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;
  const role = request.cookies.get("role")?.value;

  // -------------------------------
  // ✅ AUTH ROUTES: Redirect away if already logged in
  // -------------------------------
  const authRoutes = ["/login", "/register", "/mobile-auth"];

  if (authRoutes.includes(pathname)) {
    if (token && role) {
      // Already logged in — send to appropriate dashboard
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }
    // Not logged in — allow access to auth pages
    return NextResponse.next();
  }

  // -------------------------------
  // ✅ NOT LOGGED IN → REDIRECT TO LOGIN
  // -------------------------------
  if (!token || !role) {
    console.log(`❌ No token/role found, redirecting to login from: ${pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // -------------------------------
  // ✅ ADMIN ACCESS (FULL ACCESS)
  // -------------------------------
  if (role === "ADMIN") {
    console.log(`✅ Admin access granted for: ${pathname}`);
    return NextResponse.next();
  }

  // -------------------------------
  // ✅ USER ACCESS (LIMITED)
  // -------------------------------
  if (role === "USER") {
    // ❌ Block admin area entirely
    if (pathname.startsWith("/admin")) {
      console.log(`❌ User blocked from admin area`);
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }

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

    if (!isAllowed) {
      console.log(`❌ User blocked from: ${pathname}`);
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }

    console.log(`✅ User access granted for: ${pathname}`);
    return NextResponse.next();
  }

  // -------------------------------
  // ❌ UNKNOWN ROLE → FORCE LOGIN
  // -------------------------------
  console.log(`❌ Unknown role: ${role}, forcing login`);
  return NextResponse.redirect(new URL("/login", request.url));
}

// -------------------------------------
// ✅ MATCHER (IGNORE STATIC + API)
// -------------------------------------
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};