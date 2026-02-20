import { NextRequest, NextResponse } from "next/server";

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    const now = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - now;
    console.log("Token expires in:", remaining, "seconds");
    // ❌ Already expired
    if (remaining <= 0) return -1;
    return remaining;
  } catch {
    return -1;
  }
}

export async function GET(request: NextRequest) {
  try {
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    let token = request.nextUrl.searchParams.get("token");
    let role = request.nextUrl.searchParams.get("role");

    token = token?.trim() || "";
    role = role?.replace(/'/g, "").trim().toUpperCase() || "";
    console.log("startttt")
    console.log(token)

    if (!token || role !== "ADMIN") {
      return NextResponse.redirect(`${BASE_URL}/login`);
    }else{

    console.log("testinggggggggggggggggggg")

    // ✅ Check token is not expired before setting cookie
    const maxAge = getTokenExpiry(token);
    if (maxAge <= 0) {
      console.log("❌ Expired token passed from app");
      return NextResponse.redirect(`${BASE_URL}/login`);
    }

    const response = NextResponse.redirect(`${BASE_URL}/admin`);
      console.log("get the response...");
     
    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge, // ✅ synced with JWT expiry
    });

    response.cookies.set("role", role, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  
    return response;
  }
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}