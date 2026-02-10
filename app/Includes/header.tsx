"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";

export const Header: React.FC = () => {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className=" p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Logo */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            <span className="text-gray-600">RIM</span> <span className="text-gray-600">INSPECTION</span>
            <span className="text-primary text-gray-600">.AI</span>
          </h1>
          <p className="text-gray-400">
            Automated Quality Control System for Forged Monoblock Wheels
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Settings Button */}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center space-x-2 p-2 bg-dark-card rounded-lg hover:bg-gray-800 bg-gray-800 transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
