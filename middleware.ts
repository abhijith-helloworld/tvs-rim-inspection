import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const role = request.cookies.get("role")?.value;

  // ---- Public Routes (no auth needed) ----
  if (pathname === "/login") {
    // If already logged in, redirect based on role
    if (token) {
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }
    // Allow unauthenticated access to login
    return NextResponse.next();
  }

  // ---- Not Logged In ----
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ---- ADMIN ACCESS ----
  if (role === "ADMIN") {
    return NextResponse.next(); // Admin can access everything
  }

  // ---- USER ACCESS ----
  if (role === "USER") {
    // Define exact allowed routes for users
    const allowedUserRoutes = [
      "/userDashboard",
      "/users",
      "/arm",
      "/rimType",
      "/inspections",
      "/schedule",
    ];

    // Check if pathname matches exactly OR starts with allowed route + "/"
    const isAllowed = allowedUserRoutes.some(route => {
      return pathname === route || pathname.startsWith(route + "/");
    });

    // Block admin routes
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }

    // Block any non-allowed routes
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }

    return NextResponse.next();
  }

  // ---- Unknown Role or No Role ----
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (static files)
     * - public folder files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};