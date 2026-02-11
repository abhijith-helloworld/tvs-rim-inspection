"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import UsersTable from "./components/UsersTable";
import AddUserModal from "./components/AddUserModal";
import { PlusCircle } from "lucide-react";

interface RobotAssignment {
    id: number;
    robo_id: string;
    name: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    profile: {
        is_verified?: boolean;
    } | null;
    assigned_robots?: RobotAssignment[];
}

interface PaginatedResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: {
        success: boolean;
        message: string;
        data: User[];
    };
}

export default function Page() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

    const fetchUsers = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const url = `${API_BASE_URL}/accounts/users/?page=${page}`;

            const res = await fetchWithAuth(url);
            const json: PaginatedResponse = await res.json();


            if (json.results?.success && json.results.data) {
                setUsers(json.results.data);
                setTotalCount(json.count);
                setTotalPages(Math.ceil(json.count));
                setCurrentPage(page);
            } else {
                console.error("API returned success=false or no data:", json);
                setError(json.results?.message || "Failed to fetch users");
            }
        } catch (err) {
            console.error("Users fetch error:", err);
            setError(
                err instanceof Error ? err.message : "Failed to fetch users",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(1);
    }, []);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            fetchUsers(page);
        }
    };

    const handleUserAdded = () => {
        fetchUsers(currentPage);
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        User Management
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Manage and verify user accounts and assign robots
                    </p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <PlusCircle />
                        Add User
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-red-800 font-medium">
                            Error: {error}
                        </span>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12">
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <h3 className="mt-6 text-lg font-medium text-gray-900">
                            Loading Users
                        </h3>
                        <p className="mt-2 text-gray-600">Please wait...</p>
                    </div>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12">
                    <div className="flex flex-col items-center justify-center">
                        <h3 className="text-lg font-medium text-gray-900">
                            No Users Found
                        </h3>
                        <p className="mt-2 text-gray-600">
                            There are currently no users in the system.
                        </p>
                        <button
                            onClick={() => setIsAddUserModalOpen(true)}
                            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            Add Your First User
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <UsersTable
                            users={users}
                            setUsers={setUsers}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            totalCount={totalCount}
                        />
                    </div>
                </>
            )}
            <AddUserModal
                isOpen={isAddUserModalOpen}
                onClose={() => setIsAddUserModalOpen(false)}
                onUserAdded={handleUserAdded}
            />
        </div>
    );
}
