"use client";

import React from "react";
import { fetchWithAuth, API_BASE_URL } from "../../../lib/auth";
import Image from "next/image";
import Male from "../../../../public/Male Memojis.svg";
import Female from "../../../../public/Female Memojis.svg";

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

interface Robot {
    id: number;
    name: string;
    robo_id: string;
    status: string;
    is_active: boolean;
    local_ip: string;
}

interface Props {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalCount: number;
}

export default function UsersTable({ 
    users, 
    setUsers, 
    currentPage, 
    totalPages, 
    onPageChange,
    totalCount 
}: Props) {
    const [updatingId, setUpdatingId] = React.useState<number | null>(null);
    const [availableRobots, setAvailableRobots] = React.useState<Robot[]>([]);
    const [loadingRobots, setLoadingRobots] = React.useState(false);
    const [activeDropdown, setActiveDropdown] = React.useState<number | null>(null);
    const [selectedRobotIds, setSelectedRobotIds] = React.useState<string[]>([]);

    // Function to determine avatar based on user ID (even = male, odd = female)
    const getAvatar = (userId: number) => {
        return userId % 2 === 0 ? Male : Female;
    };

    const updateVerify = async (userId: number, value: boolean) => {
        try {
            setUpdatingId(userId);

            await fetchWithAuth(`${API_BASE_URL}/accounts/users/${userId}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    is_verified: value,
                }),
            });

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId
                        ? {
                              ...u,
                              profile: {
                                  ...(u.profile || {}),
                                  is_verified: value,
                              },
                          }
                        : u,
                ),
            );
        } catch (err) {
            console.error("Verify update error:", err);
        } finally {
            setUpdatingId(null);
        }
    };

    const fetchRobots = async () => {
        try {
            setLoadingRobots(true);
            const res = await fetchWithAuth(`${API_BASE_URL}/robots/`);
            const json = await res.json();

            if (json.results?.success) {
                const activeRobots = json.results.data.filter(
                    (robot: Robot) => robot.is_active,
                );
                setAvailableRobots(activeRobots);
            }
        } catch (err) {
            console.error("Fetch robots error:", err);
        } finally {
            setLoadingRobots(false);
        }
    };

    const toggleDropdown = (userId: number) => {
        if (activeDropdown === userId) {
            setActiveDropdown(null);
            setSelectedRobotIds([]);
        } else {
            setActiveDropdown(userId);
            const user = users.find((u) => u.id === userId);
            const currentRobots = (user?.assigned_robots || []).map((r) => r.robo_id);
            setSelectedRobotIds(currentRobots);
            if (availableRobots.length === 0) {
                fetchRobots();
            }
        }
    };

    const toggleRobotSelection = (robotId: string) => {
        setSelectedRobotIds((prev) => {
            if (prev.includes(robotId)) {
                return prev.filter((id) => id !== robotId);
            } else {
                return [...prev, robotId];
            }
        });
    };

    const assignRobots = async (userId: number) => {
        try {
            setUpdatingId(userId);

            await fetchWithAuth(
                `${API_BASE_URL}/accounts/users/assign-robots/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        robot_ids: selectedRobotIds,
                    }),
                },
            );

            // Refresh current page data
            const res = await fetchWithAuth(`${API_BASE_URL}/accounts/users/?page=${currentPage}`);
            const json = await res.json();

            if (json.results?.success) {
                setUsers(json.results.data);
            }

            setActiveDropdown(null);
            setSelectedRobotIds([]);
        } catch (err) {
            console.error("Assign robots error:", err);
        } finally {
            setUpdatingId(null);
        }
    };

    const removeRobot = async (userId: number, robotId: string) => {
        try {
            setUpdatingId(userId);

            await fetchWithAuth(
                `${API_BASE_URL}/accounts/users/remove-robots/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        robot_ids: [robotId],
                    }),
                },
            );

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId
                        ? {
                              ...u,
                              assigned_robots: (u.assigned_robots || []).filter(
                                  (r) => r.robo_id !== robotId,
                              ),
                          }
                        : u,
                ),
            );
        } catch (err) {
            console.error("Remove robot error:", err);
        } finally {
            setUpdatingId(null);
        }
    };

    const startIndex = (currentPage - 1) * 8 + 1;
    const endIndex = Math.min(currentPage * 8, totalCount);

    return (
        <div className="bg-white rounded-lg overflow-hidden">
            <div className="overflow-hidden flex flex-col">
                <div className="h-[600px] overflow-auto">
                    <table className="min-w-full table-fixed">
                        <colgroup>
                            <col className="w-[25%]" />
                            <col className="w-[15%]" />
                            <col className="w-[12%]" />
                            <col className="w-[23%]" />
                            <col className="w-[25%]" />
                        </colgroup>
                        <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    User Information
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Verification
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Assigned Robots
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {users.map((user) => {
                                const verified = user.profile?.is_verified || false;
                                const robots = user.assigned_robots || [];
                                const isDropdownOpen = activeDropdown === user.id;
                                const avatar = getAvatar(user.id);

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 overflow-hidden">
                                                    <Image
                                                        src={avatar}
                                                        alt={user.username}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                                        {user.username}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50">
                                                <div className={`w-2 h-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`}></div>
                                                <span className={`text-xs font-medium ${user.is_active ? "text-emerald-700" : "text-red-700"}`}>
                                                    {user.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1.5">
                                                ID: {user.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-xs font-medium ${verified ? "text-emerald-600" : "text-gray-600"}`}>
                                                {verified ? "Verified" : "Not Verified"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {robots.length > 0 ? (
                                                    robots.map((robot) => (
                                                        <span key={robot.robo_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                            {robot.name}
                                                            <button
                                                                onClick={() => removeRobot(user.id, robot.robo_id)}
                                                                disabled={updatingId === user.id}
                                                                className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        No robots assigned
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateVerify(user.id, !verified)}
                                                    disabled={updatingId === user.id}
                                                    className={`w-20 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                                                        updatingId === user.id
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : verified
                                                              ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                                                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                                                    }`}
                                                >
                                                    {updatingId === user.id ? (
                                                        <span className="inline-block w-full text-center">...</span>
                                                    ) : verified ? (
                                                        "Unverify"
                                                    ) : (
                                                        "Verify"
                                                    )}
                                                </button>

                                                <div className="relative">
                                                    <button
                                                        onClick={() => toggleDropdown(user.id)}
                                                        disabled={updatingId === user.id}
                                                        className={`w-24 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
                                                            isDropdownOpen
                                                                ? "bg-indigo-600 text-white"
                                                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
                                                        }`}
                                                    >
                                                        {isDropdownOpen ? "Close" : "Add Robots"}
                                                    </button>

                                                    {isDropdownOpen && (
                                                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                                                            <div className="p-4">
                                                                <div className="text-sm font-semibold text-gray-900 mb-3">
                                                                    Select Robots
                                                                </div>

                                                                {loadingRobots ? (
                                                                    <div className="text-center py-4 text-sm text-gray-500">
                                                                        Loading robots...
                                                                    </div>
                                                                ) : availableRobots.length === 0 ? (
                                                                    <div className="text-center py-4 text-sm text-amber-600 bg-amber-50 rounded-lg">
                                                                        No active robots available
                                                                    </div>
                                                                ) : (
                                                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                                                        {availableRobots.map((robot) => {
                                                                            const isSelected = selectedRobotIds.includes(robot.robo_id);
                                                                            return (
                                                                                <label
                                                                                    key={robot.id}
                                                                                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                                                                        isSelected
                                                                                            ? "bg-indigo-50 border border-indigo-200"
                                                                                            : "hover:bg-gray-50 border border-transparent"
                                                                                    }`}
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={() => toggleRobotSelection(robot.robo_id)}
                                                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                                                    />
                                                                                    <div className="flex-1">
                                                                                        <div className="text-sm font-medium text-gray-900">
                                                                                            {robot.name}
                                                                                        </div>
                                                                                        <div className="text-xs text-gray-500">
                                                                                            {robot.robo_id}
                                                                                        </div>
                                                                                    </div>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                                                    <div className="text-xs text-gray-600">
                                                                        {selectedRobotIds.length} selected
                                                                    </div>
                                                                    <button
                                                                        onClick={() => assignRobots(user.id)}
                                                                        disabled={updatingId === user.id}
                                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-xs font-medium"
                                                                    >
                                                                        {updatingId === user.id ? "Assigning..." : "Assign"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/30">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing <span className="font-semibold text-gray-900">{startIndex}</span> to{" "}
                            <span className="font-semibold text-gray-900">{endIndex}</span> of{" "}
                            <span className="font-semibold text-gray-900">{totalCount}</span> users
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    const showPage =
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1);

                                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                                    if (showEllipsisBefore || showEllipsisAfter) {
                                        return (
                                            <span key={page} className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    if (!showPage) return null;

                                    return (
                                        <button
                                            key={page}
                                            onClick={() => onPageChange(page)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                                currentPage === page
                                                    ? "bg-indigo-600 text-white"
                                                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}