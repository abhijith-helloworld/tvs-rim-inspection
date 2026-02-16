import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ✅ Read token + role from URL (coming from Flutter)
  const urlToken = searchParams.get("token");
  const urlRole = searchParams.get("role");

  // ✅ Read token + role from cookies (after first login)
  const cookieToken = request.cookies.get("access_token")?.value;
  const cookieRole = request.cookies.get("role")?.value;

  // -------------------------------------------------
  // ✅ FIRST TIME LOGIN FROM FLUTTER
  // Example: /admin?token=XXX&role=ADMIN
  // -------------------------------------------------
  if (urlToken && urlRole) {
    const cleanUrl = new URL(
      urlRole === "ADMIN" ? "/admin" : "/userDashboard",
      request.url
    );

    const response = NextResponse.redirect(cleanUrl);

    // IMPORTANT for LAN (http://192.168.x.x)
    response.cookies.set({
      name: "access_token",
      value: urlToken,
      httpOnly: false,
      secure: false,      // must be false for HTTP
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set({
      name: "role",
      value: urlRole,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    return response;
  }

  // -------------------------------------------------
  // ✅ PUBLIC ROUTES (no login needed)
  // -------------------------------------------------
  const publicRoutes = ["/login", "/register"];

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // -------------------------------------------------
  // ❌ Not Logged In
  // -------------------------------------------------
  if (!cookieToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // -------------------------------------------------
  // ✅ ADMIN ACCESS
  // -------------------------------------------------
  if (cookieRole === "ADMIN") {
    return NextResponse.next();
  }

  // -------------------------------------------------
  // ✅ USER ACCESS (block admin)
  // -------------------------------------------------
  if (cookieRole === "USER") {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }
    return NextResponse.next();
  }

  // -------------------------------------------------
  // ❌ Unknown role
  // -------------------------------------------------
  return NextResponse.redirect(new URL("/login", request.url));
}

// -------------------------------------------------
// ✅ Ignore static + API
// -------------------------------------------------
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
