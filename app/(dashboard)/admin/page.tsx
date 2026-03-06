"use client";

import { useEffect, useState, useCallback } from "react";
import { Toaster } from "sonner";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import { Robot } from "../../types/robot";

import { RobotCard } from "./components/RobotCard";
import { DetailsModal } from "./components/DetailsModal";
import { RobotModal } from "./components/RobotModal";
import { StatsCards } from "./components/StatsCards";
import { ConfirmModal } from "./components/ConfirmModal";
import { showSuccess, showError } from "./components/NotificationService";

export default function RobotManagementPage() {
    const [robots, setRobots] = useState<Robot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // ── Fleet-wide stats (from API, not the current page slice) ──────────
    const [totalRobots, setTotalRobots] = useState(0);
    const [activeCount, setActiveCount] = useState(0);

    // ── Online count: driven by per-card WebSocket callbacks ─────────────
    const [onlineRobotIds, setOnlineRobotIds] = useState<Set<number>>(new Set());

    /**
     * Called by each RobotCard whenever its WebSocket reports a status change.
     * We aggregate the individual signals here so StatsCards always shows the
     * true real-time online count across the visible page.
     */
    const handleOnlineStatusChange = useCallback(
        (robotId: number, isOnline: boolean) => {
            setOnlineRobotIds((prev) => {
                const next = new Set(prev);
                if (isOnline) {
                    next.add(robotId);
                } else {
                    next.delete(robotId);
                }
                return next;
            });
        },
        [],
    );

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [previousPage, setPreviousPage] = useState<string | null>(null);
    const [pageSize] = useState(10);

    const [modalState, setModalState] = useState<{ isOpen: boolean; robot: Robot | null }>({ isOpen: false, robot: null });
    const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; robot: Robot | null }>({ isOpen: false, robot: null });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; robotId: number | null; robotName: string }>(
        { isOpen: false, robotId: null, robotName: "" },
    );

    const ROBOT_API = `${API_BASE_URL}/robots/`;

    /* ================= FETCH ROBOTS ================= */
    const fetchRobots = async (showRefreshing = false, page = 1) => {
        try {
            const res = await fetchWithAuth(`${ROBOT_API}?page=${page}`);
            if (!res.ok) throw new Error();

            const response = await res.json();

            setNextPage(response.next);
            setPreviousPage(response.previous);

            // ── Fleet-wide stats come from response.results, not the page slice ──
            const results = response.results ?? {};
            const fleetTotal = results.total_robots ?? response.count ?? 0;

            // Use fleet total for pagination (response.count is per-page count, not total)
            setTotalCount(fleetTotal);
            setTotalRobots(fleetTotal);
            setActiveCount(results.active_count ?? 0);

            const robotsData: Robot[] = results.data || response.data || [];
            setRobots(robotsData);
            setCurrentPage(page);

            // Reset online tracking when page changes (cards re-mount & re-report)
            setOnlineRobotIds(new Set());
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

    /* ================= PAGINATION ================= */
    const handleNextPage = () => { if (nextPage) fetchRobots(false, currentPage + 1); };
    const handlePreviousPage = () => { if (previousPage) fetchRobots(false, currentPage - 1); };
    const handlePageClick = (page: number) => fetchRobots(false, page);

    const totalPages = Math.ceil(totalCount / pageSize);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            for (let i = 1; i <= 4; i++) pages.push(i);
            pages.push("...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...");
            for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }
        return pages;
    };

    /* ================= TOGGLE ACTIVE ================= */
    const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
        setTogglingId(id);
        const newStatus = !currentStatus;
        setRobots((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: newStatus } : r)));

        try {
            const res = await fetchWithAuth(`${ROBOT_API}${id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: newStatus }),
            });
            if (!res.ok) throw new Error();

            const updatedRobot = await res.json();
            setRobots((prev) => prev.map((r) => (r.id === id ? updatedRobot : r)));

            // Keep fleet-wide active count in sync optimistically
            setActiveCount((prev) => (newStatus ? prev + 1 : prev - 1));

            showSuccess(`Robot ${currentStatus ? "deactivated" : "activated"} successfully`);
        } catch {
            setRobots((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: currentStatus } : r)));
            showError("Failed to update robot status");
        } finally {
            setTogglingId(null);
        }
    };

    /* ================= MIN BATTERY CHARGE ================= */
    const updateMinBatteryCharge = async (robotId: number, minBatteryCharge: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/get_min_battery/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ minimum_battery_charge: minBatteryCharge }),
            });
            if (!res.ok) throw new Error();
            setRobots((prev) => prev.map((r) => (r.id === robotId ? { ...r, minimum_battery_charge: minBatteryCharge } : r)));
            showSuccess("Minimum battery charge updated successfully");
            return true;
        } catch {
            showError("Failed to update minimum battery charge");
            return false;
        }
    };

    /* ================= CREATE / UPDATE ================= */
    const handleSubmit = async (formData: { robo_id: string; name: string; local_ip: string; minimum_battery_charge: number }) => {
        setSaving(true);
        try {
            const isEdit = !!modalState.robot;
            if (isEdit && modalState.robot) {
                const hasOtherChanges =
                    formData.name !== modalState.robot.name ||
                    formData.robo_id !== modalState.robot.robo_id ||
                    formData.local_ip !== modalState.robot.local_ip;
                if (!hasOtherChanges) {
                    const success = await updateMinBatteryCharge(modalState.robot.id, formData.minimum_battery_charge);
                    if (success) { setModalState({ isOpen: false, robot: null }); return; }
                }
            }
            const res = await fetchWithAuth(
                isEdit ? `${ROBOT_API}${modalState.robot!.id}/` : ROBOT_API,
                { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) },
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
        setConfirmModal({ isOpen: true, robotId: id, robotName: name });
    };

    const handleDeleteConfirm = async () => {
        if (!confirmModal.robotId) return;
        setDeleting(true);
        try {
            const res = await fetchWithAuth(`${ROBOT_API}${confirmModal.robotId}/`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            showSuccess("Robot deactivated successfully");
            setConfirmModal({ isOpen: false, robotId: null, robotName: "" });
            fetchRobots(false, robots.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
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
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <Toaster position="top-right" theme="light" />

            {/* HEADER */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Robot Fleet Management</h1>
                    <p className="text-sm sm:text-base text-gray-600">Monitor and manage robots</p>
                </div>
                <button
                    onClick={() => setModalState({ isOpen: true, robot: null })}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors text-sm sm:text-base"
                >
                    Add Robot
                </button>
            </div>

            {/* STATS — fleet-wide values from API + live online count from WS callbacks */}
            <StatsCards
                totalRobots={totalRobots}
                activeCount={activeCount}
                onlineCount={onlineRobotIds.size}
            />

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-cyan-500 mb-4" />
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
                    <div className="mb-4 sm:mb-6">
                        <p className="text-xs sm:text-sm text-gray-600">
                            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} robots
                        </p>
                    </div>

                    {/* Robot Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {robots.map((robot) => (
                            <RobotCard
                                key={robot.id}
                                robot={robot}
                                togglingId={togglingId}
                                onEdit={(r) => setModalState({ isOpen: true, robot: r })}
                                onToggleActive={toggleActiveStatus}
                                onViewDetails={(r) => setDetailsModal({ isOpen: true, robot: r })}
                                onDelete={async () => handleDeleteClick(robot.id, robot.name)}
                                onOnlineStatusChange={handleOnlineStatusChange}
                            />
                        ))}
                    </div>

                    {/* PAGINATION */}
                    {(totalPages > 1 || nextPage || previousPage) && (
                        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <p className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} robots
                            </p>
                            <div className="flex items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
                                <button onClick={handlePreviousPage} disabled={!previousPage}
                                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Previous page">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="hidden xs:flex gap-1 sm:gap-2">
                                    {getPageNumbers().map((page, index) =>
                                        page === "..." ? (
                                            <span key={`ellipsis-${index}`} className="w-7 h-7 sm:w-9 sm:h-10 flex items-center justify-center text-gray-500 text-sm">...</span>
                                        ) : (
                                            <button key={page} onClick={() => handlePageClick(page as number)}
                                                className={`w-7 h-7 sm:w-9 sm:h-10 flex items-center justify-center rounded-lg font-medium transition-colors text-sm sm:text-base ${
                                                    currentPage === page ? "bg-teal-500 text-white shadow-sm" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                }`}>
                                                {page}
                                            </button>
                                        ),
                                    )}
                                </div>
                                <span className="xs:hidden text-sm text-gray-700">{currentPage} / {totalPages}</span>
                                <button onClick={handleNextPage} disabled={!nextPage}
                                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Next page">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <RobotModal isOpen={modalState.isOpen} robot={modalState.robot} saving={saving} onSubmit={handleSubmit} onClose={() => setModalState({ isOpen: false, robot: null })} />
            <DetailsModal isOpen={detailsModal.isOpen} robot={detailsModal.robot} onClose={() => setDetailsModal({ isOpen: false, robot: null })} />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title="Deactivate Robot"
                message={`Are you sure you want to Deactivate "${confirmModal.robotName}"? This action cannot be undone.`}
                confirmText="Deactivate"
                cancelText="Cancel"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                isLoading={deleting}
            />
        </div>
    );
}