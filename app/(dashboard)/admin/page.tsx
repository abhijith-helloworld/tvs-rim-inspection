"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import { Robot } from "../../types/robot";

import { RobotCard } from "./components/RobotCard";
import { DetailsModal } from "./components/DetailsModal";
import { RobotModal } from "./components/RobotModal";
import { StatsCards } from "./components/StatsCards";
import { ConfirmModal } from "./components/ConfirmModal";

import {
    showSuccess,
    showError,
    showInfo,
} from "./components/NotificationService";

export default function RobotManagementPage() {
    const [robots, setRobots] = useState<Robot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [previousPage, setPreviousPage] = useState<string | null>(null);
    const [pageSize] = useState(10);

    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        robot: Robot | null;
    }>({ isOpen: false, robot: null });

    const [detailsModal, setDetailsModal] = useState<{
        isOpen: boolean;
        robot: Robot | null;
    }>({ isOpen: false, robot: null });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        robotId: number | null;
        robotName: string;
    }>({ isOpen: false, robotId: null, robotName: "" });

    const ROBOT_API = `${API_BASE_URL}/robots/`;

    /* ================= FETCH ROBOTS ================= */
    const fetchRobots = async (showRefreshing = false, page = 1) => {
        try {
            const url = `${ROBOT_API}?page=${page}`;
            const res = await fetchWithAuth(url);
            if (!res.ok) throw new Error();

            const response = await res.json();

            setTotalCount(response.count || 0);
            setNextPage(response.next);
            setPreviousPage(response.previous);

            const robotsData = response.results?.data || response.data || [];
            setRobots(robotsData);
            setCurrentPage(page);
        } catch {
            showError("Failed to load robots");
            setRobots([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRobots();
    }, []);

    /* ================= PAGINATION HANDLERS ================= */
    const handleNextPage = () => {
        if (nextPage) {
            fetchRobots(false, currentPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (previousPage) {
            fetchRobots(false, currentPage - 1);
        }
    };

    const handlePageClick = (page: number) => {
        fetchRobots(false, page);
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++)
                    pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
        setTogglingId(id);

        const newStatus = !currentStatus;

        setRobots((prev:any) =>
            prev.map((r:any) =>
                r.id === id ? { ...r, is_active: newStatus } : r,
            ),
        );

        try {
            const res = await fetchWithAuth(`${ROBOT_API}${id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: newStatus }),
            });

            if (!res.ok) {
                throw new Error(`Failed to update: ${res.status}`);
            }

            const updatedRobot = await res.json();

            setRobots((prev) =>
                prev.map((r) => (r.id === id ? updatedRobot : r)),
            );

            showSuccess(
                `Robot ${currentStatus ? "deactivated" : "activated"} successfully`,
            );
        } catch (error) {
            console.error("Toggle error:", error);

            setRobots((prev:any) =>
                prev.map((r:any) =>
                    r.id === id ? { ...r, is_active: currentStatus } : r,
                ),
            );

            showError("Failed to update robot status");
        } finally {
            setTogglingId(null);
        }
    };

    /* ================= CREATE / UPDATE ================= */
    const handleSubmit = async (formData: {
        robo_id: string;
        name: string;
        local_ip: string;
        minimum_battery_charge: number;
    }) => {
        setSaving(true);

        try {
            const isEdit = !!modalState.robot;

            const res = await fetchWithAuth(
                isEdit ? `${ROBOT_API}${modalState.robot!.id}/` : ROBOT_API,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                },
            );

            if (!res.ok) throw new Error();

            showSuccess(`Robot ${isEdit ? "updated" : "created"} successfully`);
            setModalState({ isOpen: false, robot: null });
            fetchRobots(false, currentPage);
        } catch {
            showError("Failed to save robot");
        } finally {
            setSaving(false);
        }
    };

    /* ================= DELETE ================= */
    const handleDeleteClick = (id: number, name: string) => {
        setConfirmModal({
            isOpen: true,
            robotId: id,
            robotName: name,
        });
    };

    const handleDeleteConfirm = async () => {
        if (!confirmModal.robotId) return;

        setDeleting(true);

        try {
            const res = await fetchWithAuth(
                `${ROBOT_API}${confirmModal.robotId}/?force=true`,
                {
                    method: "DELETE",
                },
            );

            if (!res.ok) throw new Error();

            showSuccess("Robot deleted successfully");

            // Close modal immediately after successful deletion
            setConfirmModal({ isOpen: false, robotId: null, robotName: "" });

            // Refresh the robot list
            if (robots.length === 1 && currentPage > 1) {
                fetchRobots(false, currentPage - 1);
            } else {
                fetchRobots(false, currentPage);
            }
        } catch {
            showError("Failed to delete robot");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setConfirmModal({ isOpen: false, robotId: null, robotName: "" });
    };

    /* ================= RENDER ================= */
    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <Toaster position="top-right" theme="light" />

            {/* HEADER */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Robot Fleet Management
                    </h1>
                    <p className="text-gray-600">Monitor and manage robots</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() =>
                            setModalState({ isOpen: true, robot: null })
                        }
                        className="px-5 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                    >
                        Add Robot
                    </button>
                </div>
            </div>

            {robots && <StatsCards robots={robots} />}

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-cyan-500 mb-4"></div>
                        <p className="text-gray-600">Loading robots...</p>
                    </div>
                </div>
            ) : !robots || robots.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center">
                    <div className="text-6xl text-gray-400 mb-3">🤖</div>
                    <p className="text-gray-600">No robots found</p>
                </div>
            ) : (
                <>
                    <div className="mb-6 flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * pageSize + 1} -{" "}
                            {Math.min(currentPage * pageSize, totalCount)} of{" "}
                            {totalCount} robots
                        </p>

                        <button
                            onClick={() =>
                                showInfo(
                                    "Use toggle to activate/deactivate robots",
                                )
                            }
                            className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                            Help
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {robots.map((robot) => (
                            <RobotCard
                                key={robot.id}
                                robot={robot}
                                togglingId={togglingId}
                                onEdit={(r) =>
                                    setModalState({ isOpen: true, robot: r })
                                }
                                onToggleActive={toggleActiveStatus}
                                onViewDetails={(r) =>
                                    setDetailsModal({ isOpen: true, robot: r })
                                }
                                onDelete={async () =>
                                    handleDeleteClick(robot.id, robot.name)
                                }
                            />
                        ))}
                    </div>

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex justify-between items-center">
                            <p className="text-sm text-gray-600">
                                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                                {Math.min(currentPage * pageSize, totalCount)}{" "}
                                of {totalCount} robots
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={!previousPage}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Previous page"
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
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </button>

                                <div className="flex gap-2">
                                    {getPageNumbers().map((page, index) =>
                                        page === "..." ? (
                                            <span
                                                key={`ellipsis-${index}`}
                                                className="w-10 h-10 flex items-center justify-center text-gray-500"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() =>
                                                    handlePageClick(
                                                        page as number,
                                                    )
                                                }
                                                className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${
                                                    currentPage === page
                                                        ? "bg-teal-500 text-white shadow-sm"
                                                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ),
                                    )}
                                </div>

                                <button
                                    onClick={handleNextPage}
                                    disabled={!nextPage}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Next page"
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
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <RobotModal
                isOpen={modalState.isOpen}
                robot={modalState.robot}
                saving={saving}
                onSubmit={handleSubmit}
                onClose={() => setModalState({ isOpen: false, robot: null })}
            />

            <DetailsModal
                isOpen={detailsModal.isOpen}
                robot={detailsModal.robot}
                onClose={() => setDetailsModal({ isOpen: false, robot: null })}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title="Delete Robot"
                message={`Are you sure you want to delete "${confirmModal.robotName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                isLoading={deleting}
            />
        </div>
    );
}