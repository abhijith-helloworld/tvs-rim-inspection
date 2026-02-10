"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Home, LogOut, Radio, Users } from "lucide-react";

/* =======================
   Navigation Items
======================= */
const navItems = [
    { name: "Dashboard", icon: Home, path: "/admin" },
    { name: "Users", icon: Users, path: "/users" },
    { name: "Rim Type", icon: Radio, path: "/rimType" },
];

/* =======================
   Sidebar Component
======================= */
export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        try {
            localStorage.clear();
            
            document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
            document.cookie = "role=; path=/; max-age=0; SameSite=Lax";
            
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/login";
        }
    };

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    return (
        <div className={`relative h-screen flex flex-col bg-white border-r border-gray-200/80 shadow-sm transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>

            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
            >
                {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                )}
            </button>

            {/* Logo Section */}
            <div className="p-6 border-b border-gray-100">
                <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                        <span className="text-white font-bold text-xl">R</span>
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                                RimAdmin
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">
                                Management Portal
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-2">
                    {!isCollapsed && (
                        <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Main Menu
                        </p>
                    )}

                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.name}
                                onClick={() => handleNavigation(item.path)}
                                className={`flex items-center w-full rounded-lg p-3 transition-all duration-200 group relative ${
                                    isActive
                                        ? "bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm"
                                        : "hover:bg-gray-50 border border-transparent"
                                } ${isCollapsed ? "justify-center" : "justify-start gap-3"}`}
                                title={isCollapsed ? item.name : ""}
                            >
                                {/* Active Indicator */}
                                {isActive && !isCollapsed && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-r-full"></div>
                                )}

                                {/* Icon Container */}
                                <div className={`relative flex-shrink-0 ${isCollapsed ? "" : "ml-2"}`}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                        isActive 
                                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md" 
                                            : "bg-gray-100 group-hover:bg-gray-200"
                                    }`}>
                                        <Icon className={`h-3.5 w-3.5 transition-all ${
                                            isActive 
                                                ? "text-white" 
                                                : "text-gray-500 group-hover:text-gray-700"
                                        }`} />
                                    </div>
                                </div>

                                {/* Label */}
                                {!isCollapsed && (
                                    <span className={`font-medium text-sm transition-colors ${
                                        isActive 
                                            ? "text-indigo-900" 
                                            : "text-gray-700 group-hover:text-gray-900"
                                    }`}>
                                        {item.name}
                                    </span>
                                )}

                                {/* Active Glow Effect */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-blue-600/5 rounded-lg pointer-events-none"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
            {/* Logout */}
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className={`flex items-center w-full rounded-lg p-3 text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group border border-transparent hover:border-red-100 ${
                        isCollapsed ? "justify-center" : "justify-start gap-3"
                    }`}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition-all flex-shrink-0">
                        <LogOut className="h-4 w-4 text-gray-500 group-hover:text-red-600 transition-colors" />
                    </div>
                    
                    {!isCollapsed && (
                        <span className="font-medium text-sm">Logout</span>
                    )}
                </button>
            </div>
        </div>
    );
}