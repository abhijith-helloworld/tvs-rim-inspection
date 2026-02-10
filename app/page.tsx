import { cookies } from "next/headers";
import { redirect } from "next/navigation";


/* Helper to decode JWT from cookie */
const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export default async function HomePage() {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("accessToken")?.value;

  if (!accessToken) {
    // No token → redirect to login
    redirect("/login");
  }

  const decoded = parseJwt(accessToken);
  const role = decoded?.role || decoded?.user_role;

  if (role === "ADMIN_USER") {
    redirect("/admin"); // Admin dashboard
  } else {
    redirect("/userDashboard"); // Normal user
  }
}
