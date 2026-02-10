"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import UsersTable from "./components/UsersTable";

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
    const pageSize = 8; // Items per page

    const fetchUsers = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const url = `${API_BASE_URL}/accounts/users/?page=${page}`;
            console.log("Fetching from:", url);

            const res = await fetchWithAuth(url);
            const json: PaginatedResponse = await res.json();

            console.log("API Response:", json);

            if (json.results?.success && json.results.data) {
                setUsers(json.results.data);
                setTotalCount(json.count);
                setTotalPages(Math.ceil(json.count / pageSize));
                setCurrentPage(page);

                console.log(`Fetched page ${page}: ${json.results.data.length} users`);
            } else {
                console.error("API returned success=false or no data:", json);
                setError(json.results?.message || "Failed to fetch users");
            }
        } catch (err) {
            console.error("Users fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch users");
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

    // Calculate stats from all users (you might want to fetch this separately for accuracy)
    const totalRobotsAssigned = users.reduce(
        (acc, user) => acc + (user.assigned_robots?.length || 0),
        0
    );

    console.log("Current users state:", users.length, "users on page", currentPage);

    return (
        <div className="p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        User Management
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Manage and verify user accounts and assign robots
                    </p>
                </div>
                <button
                    onClick={() => fetchUsers(currentPage)}
                    disabled={loading}
                    className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-red-800 font-medium">Error: {error}</span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12">
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <h3 className="mt-6 text-lg font-medium text-gray-900">Loading Users</h3>
                        <p className="mt-2 text-gray-600">Please wait...</p>
                    </div>
                </div>
            ) : users.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12">
                    <div className="flex flex-col items-center justify-center">
                        <h3 className="text-lg font-medium text-gray-900">No Users Found</h3>
                        <p className="mt-2 text-gray-600">
                            There are currently no users in the system.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Users Table */}
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
        </div>
    );
}