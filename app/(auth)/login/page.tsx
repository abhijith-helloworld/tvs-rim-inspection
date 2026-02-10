"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, register, tokenStorage, redirectBasedOnRole } from "../../lib/auth";

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [isFlipping, setIsFlipping] = useState(false);
    const [loginId, setLoginId] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const cardRef = useRef<HTMLDivElement>(null);

    /* ===============================
     AUTH CHECK - REDIRECT IF ALREADY LOGGED IN
  ================================ */
    useEffect(() => {
        if (tokenStorage.isAuthenticated()) {
            const redirectPath = redirectBasedOnRole();
            router.replace(redirectPath);
        }
    }, [router]);

    /* ===============================
     CARD FLIP ANIMATION
  ================================ */
    const handleCardFlip = (toRegister: boolean) => {
        if (isFlipping) return;

        setIsFlipping(true);
        setTimeout(() => {
            setIsRegister(toRegister);
            // Clear form fields when flipping
            if (toRegister) {
                setLoginId("");
            } else {
                setUsername("");
                setEmail("");
            }
            setPassword("");
            setError("");
            setTimeout(() => {
                setIsFlipping(false);
            }, 150);
        }, 300);
    };

    /* ===============================
     LOGIN WITH ROLE-BASED REDIRECT
  ================================ */
    const handleLogin = async () => {
        if (!loginId || !password) {
            setError("Please enter login and password");
            return;
        }

        setLoading(true);
        setError("");

        const result = await login(loginId, password);

        if (result.success && result.redirectTo) {
            // Redirect based on user role
            router.replace(result.redirectTo);
        } else {
            setError(result.error || "Login failed");
            setLoading(false);
        }
    };

    /* ===============================
     REGISTER
  ================================ */
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
            handleCardFlip(false); // Auto redirect to sign in
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-md">
                {/* HEADER */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {isRegister ? "Join Us" : "Welcome Back"}
                    </h1>
                    <p className="text-gray-600">
                        {isRegister
                            ? "Create your account to get started"
                            : "Sign in to continue to your dashboard"}
                    </p>
                </div>

                {/* 3D CARD CONTAINER */}
                <div className="relative h-[420px] perspective-1000">
                    <div
                        ref={cardRef}
                        className={`absolute w-full h-full transition-all duration-500 preserve-3d ${
                            isFlipping
                                ? "scale-95 opacity-90"
                                : "scale-100 opacity-100"
                        }`}
                        style={{
                            transform: isRegister
                                ? "rotateY(180deg)"
                                : "rotateY(0deg)",
                            transformStyle: "preserve-3d",
                        }}
                    >
                        {/* FRONT SIDE - LOGIN */}
                        <div
                            className="absolute w-full h-full backface-hidden"
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 pb-5">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Sign In
                                    </h2>
                                </div>

                                <div className="space-y-6">
                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-shake">
                                            <div className="flex items-center">
                                                <svg
                                                    className="w-5 h-5 mr-2"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                {error}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username or Email
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
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Enter your username or email"
                                                className="w-full pl-10 pr-4 py-3 border text-black  border-gray-300 rounded-xl focus:ring-2 "
                                                value={loginId}
                                                onChange={(e) =>
                                                    setLoginId(e.target.value)
                                                }
                                                onKeyDown={(e) =>
                                                    e.key === "Enter" &&
                                                    handleLogin()
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Password
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
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="Enter your password"
                                                className="w-full pl-10 pr-12 py-3 text-black border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                                value={password}
                                                onChange={(e) =>
                                                    setPassword(e.target.value)
                                                }
                                                onKeyDown={(e) =>
                                                    e.key === "Enter" &&
                                                    handleLogin()
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword(
                                                        !showPassword
                                                    )
                                                }
                                                className="absolute right-3 top-3 text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                {showPassword ? (
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

                                    <button
                                        disabled={loading}
                                        onClick={handleLogin}
                                        className="w-full bg-gradient-to-r  from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <svg
                                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                Signing in...
                                            </span>
                                        ) : (
                                            "Sign In"
                                        )}
                                    </button>

                                    <div className="text-center pt-4 border-t border-gray-100">
                                        <p className="text-gray-600">
                                            Don't have an account?{" "}
                                            <button
                                                onClick={() =>
                                                    handleCardFlip(true)
                                                }
                                                className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors duration-200"
                                            >
                                                Sign up here
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BACK SIDE - REGISTER */}
                        <div
                            className="absolute w-full h-full backface-hidden pb-3"
                            style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)",
                            }}
                        >
                            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 pb-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Create Account
                                    </h2>
                                </div>

                                <div className="space-y-6">
                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-shake">
                                            <div className="flex items-center">
                                                <svg
                                                    className="w-5 h-5 mr-2"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                {error}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username
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
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Choose a username"
                                                className="w-full pl-10 pr-4 py-3 text-black  border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                                value={username}
                                                onChange={(e) =>
                                                    setUsername(e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
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
                                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <input
                                                type="email"
                                                placeholder="Enter your email"
                                                className="w-full pl-10 pr-4 py-3 text-black  border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                                value={email}
                                                onChange={(e) =>
                                                    setEmail(e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Password
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
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="Create a strong password"
                                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                                value={password}
                                                onChange={(e) =>
                                                    setPassword(e.target.value)
                                                }
                                                onKeyDown={(e) =>
                                                    e.key === "Enter" &&
                                                    handleRegister()
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword(
                                                        !showPassword
                                                    )
                                                }
                                                className="absolute right-3 top-3 text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                {showPassword ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        disabled={loading}
                                        onClick={handleRegister}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <svg
                                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                Creating account...
                                            </span>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>

                                    <div className="text-center pt-4 border-t border-gray-100">
                                        <p className="text-gray-600">
                                            Already have an account?{" "}
                                            <button
                                                onClick={() =>
                                                    handleCardFlip(false)
                                                }
                                                className="text-purple-600 font-semibold hover:text-purple-800 transition-colors duration-200"
                                            >
                                                Sign in here
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    By continuing, you agree to our{" "}
                    <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Terms
                    </a>
                    {" "}and{" "}
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
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
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