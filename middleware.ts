import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ---------------- Decode JWT (Edge Safe) ---------------- */
function decodeJWT(token: string): any | null {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = atob(
      base64Payload.replace(/-/g, "+").replace(/_/g, "/")
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/* ---------------- Expiry Check ---------------- */
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/* ---------------- Set Auth Cookies Helper ---------------- */
function setAuthCookies(
  response: NextResponse,
  token: string,
  role: string
): NextResponse {
  const isProd = process.env.NODE_ENV === "production";

  // ⭐ httpOnly: false — REQUIRED so js-cookie on the client
  //    can read these cookies via Cookies.get() for localStorage sync.
  //    If httpOnly were true, only the browser would send them on
  //    requests, but client JS could never read them.
  response.cookies.set("access_token", token, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  response.cookies.set("role", role, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}

/* ---------------- Middleware ---------------- */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Path:", pathname);

  /* -------------------------------------------------------
     🔥 1️⃣ MOBILE AUTH FLOW
     Catches any route that has ?token= in the query string.
     e.g. /mobile-auth?token=xxx&role=ADMIN
          /any-path?token=xxx

     Middleware:
       → Validates token
       → Sets access_token + role cookies
       → Redirects to /admin or /userDashboard

     Then on the dashboard, tokenStorage.getAccessToken()
     reads the cookie immediately (no localStorage needed).
     The layout's useEffect calls syncFromCookies() to also
     write to localStorage for future use.
  ------------------------------------------------------- */
  const urlToken = request.nextUrl.searchParams.get("token");

  if (urlToken) {
    console.log("🔑 URL token detected on path:", pathname);

    if (isTokenExpired(urlToken)) {
      console.log("❌ URL token expired");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = decodeJWT(urlToken);
    if (!payload) {
      console.log("❌ Invalid JWT payload");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Role priority: ?role= param → JWT payload → default USER
    const urlRole = request.nextUrl.searchParams.get("role");
    const role =
      urlRole?.toUpperCase() ||
      payload.role?.toUpperCase() ||
      payload.user_role?.toUpperCase() ||
      "USER";

    const redirectPath = role === "ADMIN" ? "/admin" : "/userDashboard";

    console.log(`✅ Mobile auth → role: ${role}, redirecting to: ${redirectPath}`);

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    return setAuthCookies(response, urlToken, role);
  }

  /* -------------------------------------------------------
     2️⃣ PUBLIC ROUTES — no auth needed
  ------------------------------------------------------- */
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return NextResponse.next();
  }

  /* -------------------------------------------------------
     3️⃣ READ AUTH COOKIES for all protected routes
  ------------------------------------------------------- */
  const token = request.cookies.get("access_token")?.value;
  const role = request.cookies.get("role")?.value;

  console.log("🍪 Cookie token:", token ? "present" : "missing");
  console.log("🍪 Cookie role:", role || "missing");

  if (!token) {
    console.log("❌ No token cookie → redirect to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isTokenExpired(token)) {
    console.log("❌ Token expired → redirect to login");
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    response.cookies.delete("role");
    return response;
  }

  /* -------------------------------------------------------
     4️⃣ ADMIN — full access to all routes
  ------------------------------------------------------- */
  if (role === "ADMIN") {
    console.log("✅ ADMIN access granted");
    return NextResponse.next();
  }

  /* -------------------------------------------------------
     5️⃣ USER — restricted to allowed routes only
  ------------------------------------------------------- */
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
      (route) =>
        pathname === route || pathname.startsWith(route + "/")
    );

    if (!isAllowed || pathname.startsWith("/admin")) {
      console.log("❌ USER accessing restricted route → redirect to userDashboard");
      return NextResponse.redirect(new URL("/userDashboard", request.url));
    }

    console.log("✅ USER access granted");
    return NextResponse.next();
  }

  // Unknown or missing role
  console.log("❌ Unknown role → redirect to login");
  return NextResponse.redirect(new URL("/login", request.url));
}

/* ---------------- Apply to all protected routes ---------------- */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};