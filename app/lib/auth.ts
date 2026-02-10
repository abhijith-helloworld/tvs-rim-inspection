import Cookies from "js-cookie";

/* ===============================
   TYPES
================================ */
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserData {
  username: string;
  email: string;
  role: "USER" | "ADMIN";
}

/* ===============================
   API BASE URL
================================ */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/* ===============================
   TOKEN STORAGE (LOCAL + COOKIE)
================================ */
export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  },

  setTokens(tokens: AuthTokens): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("accessToken", tokens.access);
    localStorage.setItem("refreshToken", tokens.refresh);

    // ⭐ Middleware Support
    Cookies.set("access_token", tokens.access);
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");

    Cookies.remove("access_token");
    Cookies.remove("role");
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  setUserData(userData: UserData): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("userData", JSON.stringify(userData));

    // ⭐ Role Cookie for Middleware
    Cookies.set("role", userData.role);
  },

  getUserData(): UserData | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  },

  getUserRole(): "USER" | "ADMIN" | null {
    const userData = this.getUserData();
    return userData?.role || null;
  },
};

/* ===============================
   REFRESH TOKEN HANDLER
================================ */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    tokenStorage.clearTokens();
    return null;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber(resolve);
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json();

    tokenStorage.setTokens({
      access: data.access,
      refresh: refreshToken,
    });

    onRefreshed(data.access);
    return data.access;
  } catch (error) {
    console.error("Refresh error:", error);
    tokenStorage.clearTokens();
    window.location.href = "/login";
    return null;
  } finally {
    isRefreshing = false;
  }
};

/* ===============================
   FETCH WITH AUTH (AUTO REFRESH)
================================ */
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  let accessToken = tokenStorage.getAccessToken();

  if (!accessToken) {
    tokenStorage.clearTokens();
    window.location.href = "/login";
    throw new Error("No access token");
  }

  const makeRequest = (token: string) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  let response = await makeRequest(accessToken);

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error("Re-auth failed");
    response = await makeRequest(newToken);
  }

  return response;
};

/* ===============================
   LOGIN
================================ */
export const login = async (
  loginId: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
  redirectTo?: string;
  userData?: UserData;
}> => {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: loginId,
        password,
      }),
    });

    const response = await res.json();

    if (!res.ok || !response.success) {
      return {
        success: false,
        error:
          response.message ||
          response.detail ||
          "Invalid credentials",
      };
    }

    const { data } = response;

    if (!data?.access || !data?.refresh) {
      return {
        success: false,
        error: "Invalid token response",
      };
    }

    // ⭐ Store tokens
    tokenStorage.setTokens({
      access: data.access,
      refresh: data.refresh,
    });

    // ⭐ Store user data + role
    const userData: UserData = {
      username: data.username,
      email: data.email,
      role: data.role || "USER",
    };

    tokenStorage.setUserData(userData);

    // ⭐ Role redirect
    const redirectTo =
      userData.role === "ADMIN"
        ? "/admin"
        : "/userDashboard";

    return {
      success: true,
      userData,
      redirectTo,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Login failed",
    };
  }
};

/* ===============================
   REGISTER
================================ */
export const register = async (
  username: string,
  email: string,
  password: string
) => {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error:
          data.username?.[0] ||
          data.email?.[0] ||
          data.password?.[0] ||
          data.detail ||
          "Registration failed",
      };
    }

    return {
      success: true,
      message: data.message || "Registration successful",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Registration error",
    };
  }
};

/* ===============================
   LOGOUT
================================ */
export const logout = async (): Promise<void> => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/accounts/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch {}
  }

  tokenStorage.clearTokens();
  window.location.href = "/login";
};

/* ===============================
   ROLE HELPERS
================================ */
export const checkRoleAccess = (
  allowedRoles: Array<"USER" | "ADMIN">
): boolean => {
  const role = tokenStorage.getUserRole();
  if (!role) return false;
  return allowedRoles.includes(role);
};

export const redirectBasedOnRole = (): string => {
  const role = tokenStorage.getUserRole();
  return role === "ADMIN" ? "/admin" : "/userDashboard";
};
