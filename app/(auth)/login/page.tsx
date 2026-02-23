"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    login,
    register,
    tokenStorage,
    redirectBasedOnRole,
} from "../../lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL as string;

// ─── Types ───────────────────────────────────────────────────────────────────
type CardView = "login" | "register" | "forgot" | "reset";

// ─── Component ───────────────────────────────────────────────────────────────
export default function LoginPage() {
    const [view, setView] = useState<CardView>("login");
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Login fields
    const [loginId, setLoginId] = useState("");

    // Register fields
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    // Shared
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Forgot password fields
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetToken, setResetToken] = useState("");

    // Reset password fields
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const router = useRouter();

    /* ── Auth check ─────────────────────────────────────────────────────── */
    useEffect(() => {
        if (tokenStorage.isAuthenticated()) {
            const redirectPath = redirectBasedOnRole();
            router.replace(redirectPath);
        }
    }, [router]);

    /* ── View transition helper ──────────────────────────────────────────── */
    const switchView = (next: CardView) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setError("");
        setTimeout(() => {
            setView(next);
            // Clear relevant fields
            setPassword("");
            setShowPassword(false);
            if (next === "login") {
                setUsername("");
                setEmail("");
                setForgotEmail("");
                setNewPassword("");
                setConfirmPassword("");
                setResetToken("");
            }
            if (next === "forgot") {
                setForgotEmail("");
            }
            if (next === "reset") {
                setNewPassword("");
                setConfirmPassword("");
            }
            setTimeout(() => setIsTransitioning(false), 150);
        }, 300);
    };

    /* ── Login ───────────────────────────────────────────────────────────── */
    const handleLogin = async () => {
        if (!loginId || !password) {
            setError("Please enter login and password");
            return;
        }
        setLoading(true);
        setError("");
        const result = await login(loginId, password);
        if (result.success && result.redirectTo) {
            router.replace(result.redirectTo);
        } else {
            setError(result.error || "Login failed");
            setLoading(false);
        }
    };

    /* ── Register ────────────────────────────────────────────────────────── */
    const handleRegister = async () => {
        if (!username || !email || !password) {
            setError("Please fill all fields");
            return;
        }
        setLoading(true);
        setError("");
        const res = await register(username, email, password);
        if (!res.success) {
            setError(res.error || "Registration failed");
        } else {
            alert(res.message);
            switchView("login");
        }
        setLoading(false);
    };

    /* ── Forgot Password (Step 1) ────────────────────────────────────────── */
    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            setError("Please enter your email address");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/accounts/forgot-password/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(
                    data?.detail ||
                        data?.message ||
                        "Failed to send reset request",
                );
            } else {
                // Save token received from API
                const token =
                    data?.token || data?.reset_token || data?.data?.token;
                if (token) {
                    setResetToken(token);
                    switchView("reset");
                } else {
                    setError(
                        "No token received from server. Please contact support.",
                    );
                }
            }
        } catch (err) {
            console.error("Forgot password error:", err);
            setError("Network error. Please check your connection and try again.");
        }
        setLoading(false);
    };

    /* ── Reset Password (Step 2) ─────────────────────────────────────────── */
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError("Please fill all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/accounts/reset-password/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: resetToken,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(
                    data?.detail || data?.message || "Password reset failed",
                );
            } else {
                setShowSuccessModal(true);
            }
        } catch (err) {
            console.error("Reset password error:", err);
            setError("Network error. Please check your connection and try again.");
        }
        setLoading(false);
    };

    /* ── Card rotation angles ────────────────────────────────────────────── */
    const rotationMap: Record<CardView, string> = {
        login: "rotateY(0deg)",
        register: "rotateY(180deg)",
        forgot: "rotateY(90deg)",
        reset: "rotateY(90deg)",
    };

    const isFlat = view === "login" || view === "register";

    /* ── Header text ─────────────────────────────────────────────────────── */
    const headerMap: Record<CardView, { title: string; subtitle: string }> = {
        login: {
            title: "Welcome Back",
            subtitle: "Sign in to continue to your dashboard",
        },
        register: {
            title: "Join Us",
            subtitle: "Create your account to get started",
        },
        forgot: {
            title: "Reset Password",
            subtitle: "Enter your email to receive a reset token",
        },
        reset: {
            title: "New Password",
            subtitle: "Almost there — set your new password",
        },
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-md">
                {/* ── Header ── */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {headerMap[view].title}
                    </h1>
                    <p className="text-gray-600">{headerMap[view].subtitle}</p>
                </div>

                {/* ── 3D Card Container ── */}
                <div
                    className="relative perspective-1000"
                    style={{
                        height:
                            view === "reset"
                                ? "460px"
                                : view === "forgot"
                                  ? "320px"
                                  : "420px",
                        transition: "height 0.4s ease",
                    }}
                >
                    <div
                        className={`absolute w-full h-full transition-all duration-500 preserve-3d ${isTransitioning ? "scale-95 opacity-90" : "scale-100 opacity-100"}`}
                        style={{
                            transform: isFlat ? rotationMap[view] : undefined,
                            transformStyle: "preserve-3d",
                        }}
                    >
                        {/* ══ FRONT — Login ══ */}
                        <div
                            className="absolute w-full h-full backface-hidden"
                            style={{
                                backfaceVisibility: "hidden",
                                display:
                                    view === "login" || isFlat
                                        ? undefined
                                        : "none",
                            }}
                        >
                            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Sign In
                                </h2>

                                <div className="space-y-5">
                                    <ErrorBanner message={error} />

                                    <Field
                                        label="Username or Email"
                                        icon="user"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Enter your username or email"
                                            className="w-full pl-10 pr-4 py-3 border text-black border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                            value={loginId}
                                            onChange={(e) =>
                                                setLoginId(e.target.value)
                                            }
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                handleLogin()
                                            }
                                        />
                                    </Field>

                                    <PasswordField
                                        label="Password"
                                        placeholder="Enter your password"
                                        value={password}
                                        show={showPassword}
                                        onToggle={() =>
                                            setShowPassword((p) => !p)
                                        }
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        onEnter={handleLogin}
                                        accentColor="indigo"
                                    />

                                    {/* Forgot password link */}
                                    <div className="flex justify-end -mt-2">
                                        <button
                                            onClick={() => switchView("forgot")}
                                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>

                                    <button
                                        disabled={loading}
                                        onClick={handleLogin}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Signing in..." : "Sign In"}
                                    </button>

                                    <SwitchPrompt
                                        text="Don't have an account?"
                                        action="Sign up here"
                                        color="indigo"
                                        onClick={() => switchView("register")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ BACK — Register ══ */}
                        <div
                            className="absolute w-full h-full backface-hidden"
                            style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)",
                                display:
                                    view === "register" || isFlat
                                        ? undefined
                                        : "none",
                            }}
                        >
                            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Create Account
                                </h2>

                                <div className="space-y-5">
                                    <ErrorBanner message={error} />

                                    <Field label="Username" icon="user">
                                        <input
                                            type="text"
                                            placeholder="Choose a username"
                                            className="w-full pl-10 pr-4 py-3 text-black border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                            value={username}
                                            onChange={(e) =>
                                                setUsername(e.target.value)
                                            }
                                        />
                                    </Field>

                                    <Field label="Email Address" icon="email">
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            className="w-full pl-10 pr-4 py-3 text-black border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                        />
                                    </Field>

                                    <PasswordField
                                        label="Password"
                                        placeholder="Create a strong password"
                                        value={password}
                                        show={showPassword}
                                        onToggle={() =>
                                            setShowPassword((p) => !p)
                                        }
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        onEnter={handleRegister}
                                        accentColor="purple"
                                    />

                                    <button
                                        disabled={loading}
                                        onClick={handleRegister}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Creating account..." : "Create Account"}
                                    </button>

                                    <SwitchPrompt
                                        text="Already have an account?"
                                        action="Sign in here"
                                        color="purple"
                                        onClick={() => switchView("login")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ Forgot Password (Step 1) ══ */}
                        {view === "forgot" && (
                            <div
                                className="absolute w-full h-full"
                                style={{ backfaceVisibility: "hidden" }}
                            >
                                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                                    {/* Step indicator */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                                1
                                            </span>
                                            <span className="text-sm font-semibold text-indigo-600">
                                                Verify Email
                                            </span>
                                        </div>
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-bold flex items-center justify-center">
                                                2
                                            </span>
                                            <span className="text-sm font-medium text-gray-400">
                                                New Password
                                            </span>
                                        </div>
                                    </div>

                                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                                        Enter your email
                                    </h2>
                                    <p className="text-sm text-gray-500 mb-6">
                                        We'll send you a token to reset your
                                        password.
                                    </p>

                                    <div className="space-y-5">
                                        <ErrorBanner message={error} />

                                        <Field
                                            label="Email Address"
                                            icon="email"
                                        >
                                            <input
                                                type="email"
                                                placeholder="Enter your registered email"
                                                className="w-full pl-10 pr-4 py-3 text-black border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                                value={forgotEmail}
                                                onChange={(e) =>
                                                    setForgotEmail(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) =>
                                                    e.key === "Enter" &&
                                                    handleForgotPassword()
                                                }
                                            />
                                        </Field>

                                        <button
                                            disabled={loading}
                                            onClick={handleForgotPassword}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? "Sending..." : "Send Reset Token"}
                                        </button>

                                        <SwitchPrompt
                                            text="Remember your password?"
                                            action="Back to sign in"
                                            color="indigo"
                                            onClick={() => switchView("login")}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ Reset Password (Step 2) ══ */}
                        {view === "reset" && (
                            <div
                                className="absolute w-full h-full"
                                style={{ backfaceVisibility: "hidden" }}
                            >
                                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                                    {/* Step indicator */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
                                                <svg
                                                    className="w-3.5 h-3.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={3}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            </span>
                                            <span className="text-sm font-semibold text-green-600">
                                                Email Verified
                                            </span>
                                        </div>
                                        <div className="flex-1 h-px bg-indigo-200" />
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                                2
                                            </span>
                                            <span className="text-sm font-semibold text-indigo-600">
                                                New Password
                                            </span>
                                        </div>
                                    </div>

                                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                                        Set new password
                                    </h2>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Choose a strong password for your
                                        account.
                                    </p>

                                    <div className="space-y-4">
                                        <ErrorBanner message={error} />

                                        <PasswordField
                                            label="New Password"
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            show={showNewPassword}
                                            onToggle={() =>
                                                setShowNewPassword((p) => !p)
                                            }
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                            onEnter={handleResetPassword}
                                            accentColor="indigo"
                                        />

                                        <PasswordField
                                            label="Confirm Password"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            show={showConfirmPassword}
                                            onToggle={() =>
                                                setShowConfirmPassword(
                                                    (p) => !p,
                                                )
                                            }
                                            onChange={(e) =>
                                                setConfirmPassword(
                                                    e.target.value,
                                                )
                                            }
                                            onEnter={handleResetPassword}
                                            accentColor="indigo"
                                        />

                                        <button
                                            disabled={loading}
                                            onClick={handleResetPassword}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? "Resetting..." : "Reset Password"}
                                        </button>

                                        <SwitchPrompt
                                            text="Remember your password?"
                                            action="Back to sign in"
                                            color="indigo"
                                            onClick={() => switchView("login")}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    By continuing, you agree to our{" "}
                    <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Terms
                    </a>{" "}
                    and{" "}
                    <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Privacy Policy
                    </a>
                </p>
                <p className="text-center text-xs text-gray-400 mt-4">
                    © {new Date().getFullYear()} Dashboard. All rights reserved.
                </p>
            </div>

            {/* ══ Success Modal ══ */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-modalIn">
                        {/* Success icon */}
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <svg
                                className="w-10 h-10 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Password Reset!
                        </h3>
                        <p className="text-gray-500 mb-7 text-sm leading-relaxed">
                            Your password has been successfully updated. You can
                            now sign in with your new password.
                        </p>

                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setView("login");
                                setResetToken("");
                                setNewPassword("");
                                setConfirmPassword("");
                                setForgotEmail("");
                            }}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            Go to Sign In
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes shake {
                    0%,
                    100% {
                        transform: translateX(0);
                    }
                    10%,
                    30%,
                    50%,
                    70%,
                    90% {
                        transform: translateX(-5px);
                    }
                    20%,
                    40%,
                    60%,
                    80% {
                        transform: translateX(5px);
                    }
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: scale(0.92) translateY(16px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.25s ease;
                }
                .animate-modalIn {
                    animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
            `}</style>
        </div>
    );
}

/* ─── Shared Sub-components ─────────────────────────────────────────────────── */

function ErrorBanner({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-shake">
            <div className="flex items-center">
                <svg
                    className="w-5 h-5 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                    />
                </svg>
                {message}
            </div>
        </div>
    );
}

function Field({
    label,
    icon,
    children,
}: {
    label: string;
    icon: "user" | "email" | "lock";
    children: React.ReactNode;
}) {
    const icons: Record<string, React.ReactNode> = {
        user: (
            <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
            </svg>
        ),
        email: (
            <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
            </svg>
        ),
        lock: (
            <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
            </svg>
        ),
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {icons[icon]}
                </div>
                {children}
            </div>
        </div>
    );
}

function PasswordField({
    label,
    placeholder,
    value,
    show,
    onToggle,
    onChange,
    onEnter,
    accentColor,
}: {
    label: string;
    placeholder: string;
    value: string;
    show: boolean;
    onToggle: () => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEnter: () => void;
    accentColor: "indigo" | "purple";
}) {
    const ring =
        accentColor === "indigo"
            ? "focus:ring-indigo-500 focus:border-indigo-500"
            : "focus:ring-purple-500 focus:border-purple-500";
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>
                <input
                    type={show ? "text" : "password"}
                    placeholder={placeholder}
                    className={`w-full pl-10 pr-12 py-3 text-black border border-gray-300 rounded-xl focus:ring-2 ${ring} transition-all duration-200`}
                    value={value}
                    onChange={onChange}
                    onKeyDown={(e) => e.key === "Enter" && onEnter()}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                    {show ? (
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

function SwitchPrompt({
    text,
    action,
    color,
    onClick,
}: {
    text: string;
    action: string;
    color: "indigo" | "purple";
    onClick: () => void;
}) {
    const cls =
        color === "indigo"
            ? "text-indigo-600 hover:text-indigo-800"
            : "text-purple-600 hover:text-purple-800";
    return (
        <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-gray-600">
                {text}{" "}
                <button
                    onClick={onClick}
                    className={`${cls} font-semibold transition-colors duration-200`}
                >
                    {action}
                </button>
            </p>
        </div>
    );
}