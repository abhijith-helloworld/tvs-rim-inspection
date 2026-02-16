"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import {
    Calendar,
    ChevronRight,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    ChevronLeft,
    Search,
    X,
    BarChart3,
    AlertCircle,
    Wifi,
    WifiOff,
} from "lucide-react";
import { ScheduleCard } from "./_components/schedule-card";
import { RobotWebSocketManager } from "../../lib/websocket-utils";

/* ===================== TYPES ===================== */
interface Schedule {
    id: number;
    location: string;
    scheduled_date: string;
    scheduled_time: string;
    end_time: string;
    is_canceled: boolean;
    status: "scheduled" | "processing" | "completed" | "pending";
    created_at: string;
    robot: number;
}

interface RobotData {
    id: number;
    robo_id: string;
    name: string;
    robot_type: string;
    model_number: string | null;
    local_ip: string | null;
    status: string;
    inspection_status: string;
    schedule_summary: {
        total: number;
        scheduled: number;
        processing: number;
        completed: number;
    };
    inspection_summary: {
        total: number;
        defected: number;
        non_defected: number;
    };
}

interface Pagination {
    current_page: number;
    total_pages: number;
    total_records: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
}

interface FilterData {
    filter_type: "day" | "week" | "month" | "range";
    date?: string;
    start_date?: string;
    end_date?: string;
}

interface ScheduleListPageProps {
    robotId: string | number;
}

/* ===================== MAIN COMPONENT ===================== */
function ScheduleListPage({ robotId: robotIdProp }: ScheduleListPageProps) {
    const router = useRouter();

    /* ===================== STEP 1: Normalize and validate database ID ===================== */
    const robotDbId = robotIdProp ? String(robotIdProp).trim() : null;

    /* ===================== STATE ===================== */
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [robotData, setRobotData] = useState<RobotData | null>(null);
    const [roboId, setRoboId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(8);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 🔌 WebSocket state
    const [wsConnected, setWsConnected] = useState(false);
    const [wsError, setWsError] = useState<string | null>(null);
    const wsManagerRef = useRef<RobotWebSocketManager | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [pagination, setPagination] = useState<Pagination>({
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        page_size: 8,
        has_next: false,
        has_previous: false,
    });

    const [currentFilter] = useState<FilterData>({
        filter_type: "month",
        date: new Date().toISOString().split("T")[0],
    });

    /* ===================== STEP 2: Validate database robot ID ===================== */
    useEffect(() => {
        const isValid = robotDbId && !isNaN(Number(robotDbId));
        if (!isValid) {
            console.error("❌ Invalid robotDbId:", robotDbId);
            setError(
                `Invalid robot ID: ${robotDbId === null ? "null" : robotDbId === "" ? "empty" : robotDbId}`
            );
            setLoading(false);
            return;
        }
    }, [robotDbId, robotIdProp]);

    /* ===================== STEP 3: Fetch robot data to get robo_id ===================== */
    useEffect(() => {
        const fetchRobotAndSetup = async () => {
            if (!robotDbId || isNaN(Number(robotDbId))) {
                console.warn("⏭️  Skipping fetch - robotDbId invalid:", robotDbId);
                return;
            }

            try {
                setLoading(true);

                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotDbId}/`
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Failed to fetch robot`);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message || "Failed to fetch robot data");
                }

                const robot = result.data as RobotData;
                setRobotData(robot);

                setRoboId(robot.robo_id);
                setError(null);
            } catch (err: any) {
                console.error("❌ Error fetching robot:", err.message);
                setError(err.message || "Failed to load robot data");
                setRobotData(null);
                setRoboId(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRobotAndSetup();
    }, [robotDbId]);

    /* ===================== STEP 4: Fetch schedules ===================== */
    const fetchFilteredData = React.useCallback(async () => {
        if (!robotDbId || isNaN(Number(robotDbId))) {
            console.warn("⏭️  Skipping schedule fetch - robotDbId invalid:", robotDbId);
            return;
        }

        setIsRefreshing(true);
        setError(null);

        try {

            const filterBody = {
                filter_type: "month",
                date: new Date().toISOString().split("T")[0],
            };

            const url = `${API_BASE_URL}/schedule/robot/${robotDbId}/filter/?page=${currentPage}&page_size=${pageSize}`;
            const response = await fetchWithAuth(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(filterBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("  - API Error:", response.status, errorText);
                throw new Error(
                    `HTTP ${response.status}: ${errorText || "Unknown error"}`
                );
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "Failed to fetch schedules");
            }

            const sortedSchedules = [...(result.schedules || [])].sort(
                (a, b) => {
                    const dateA = new Date(
                        `${a.scheduled_date}T${a.scheduled_time}`
                    ).getTime();
                    const dateB = new Date(
                        `${b.scheduled_date}T${b.scheduled_time}`
                    ).getTime();
                    return dateB - dateA;
                }
            );

            setSchedules(sortedSchedules);
            if (result.pagination) {
                setPagination(result.pagination);
            }

            setError(null);
        } catch (err: any) {
            console.error("❌ Fetch Error:", err.message);
            setError(err.message || "Failed to load schedules");
            setSchedules([]);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [robotDbId, currentPage, pageSize]);

    /* ===================== STEP 5: Initial fetch of schedules ===================== */
    useEffect(() => {
        if (!robotDbId || isNaN(Number(robotDbId))) {
            return;
        }

        setLoading(true);
        fetchFilteredData();
    }, [robotDbId, fetchFilteredData]);

    /* ===================== STEP 6: Setup WebSocket with robo_id ===================== */
    useEffect(() => {
        if (!roboId) {
            console.warn("⏭️  Waiting for robo_id from robot data:", {
                roboId,
                robotDbId,
            });
            return;
        }


        wsManagerRef.current = new RobotWebSocketManager({
            robotId: roboId,
            baseUrl: "ws://192.168.0.224:8002",
            onScheduleUpdated: () => {
                if (refreshTimeoutRef.current) {
                    clearTimeout(refreshTimeoutRef.current);
                }

                refreshTimeoutRef.current = setTimeout(() => {
                    fetchFilteredData();
                }, 1000);
            },
            onConnected: () => {
                setWsConnected(true);
                setWsError(null);
            },
            onDisconnected: () => {
                setWsConnected(false);
            },
            onError: (err) => {
                console.error("⚠️  WebSocket error:", err);
                setWsError(err.message);
            },
        });

        wsManagerRef.current.connect().catch((err) => {
            console.error("❌ Failed to connect WebSocket:", err);
            setWsError(err.message);
        });

        return () => {
            if (wsManagerRef.current) {
                wsManagerRef.current.disconnect();
            }
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [roboId, fetchFilteredData]);

    /* ===================== HANDLE PAGE CHANGE ===================== */
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.total_pages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    /* ===================== HANDLE SCHEDULE CLICK ===================== */
    const handleScheduleClick = (scheduleId: number) => {
        router.push(
            `/inspections?schedule_id=${scheduleId}&robot_id=${robotDbId}`
        );
    };

    /* ===================== MANUAL REFRESH ===================== */
    const handleManualRefresh = () => {
        fetchFilteredData();
    };

    /* ===================== FILTER SCHEDULES ===================== */
    const filteredSchedules = schedules.filter((schedule) => {
        if (
            searchQuery &&
            !schedule.location
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        ) {
            return false;
        }

        if (statusFilter !== "all") {
            if (statusFilter === "canceled" && !schedule.is_canceled)
                return false;
            if (statusFilter !== "canceled" && schedule.is_canceled)
                return false;
            if (statusFilter !== "canceled" && schedule.status !== statusFilter)
                return false;
        }

        return true;
    });

    /* ===================== ERROR STATE: Invalid Robot ID ===================== */
    if (!robotDbId || isNaN(Number(robotDbId))) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="rounded-2xl bg-white p-8 text-center shadow-xl max-w-md border border-red-200">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">
                        Invalid Robot ID
                    </h3>
                    <p className="text-gray-600">
                        Robot ID is missing or invalid:{" "}
                        <code className="bg-red-50 px-2 py-1 rounded">
                            {String(robotIdProp)}
                        </code>
                    </p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-6 py-3 rounded-xl font-medium bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    /* ===================== LOADING STATE ===================== */
    if (loading && schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
                <p className="mt-6 text-gray-600 font-medium">
                    Loading robot data and schedules...
                </p>
                {robotData && (
                    <p className="mt-2 text-sm text-gray-500">
                        Robot: {robotData.name} ({robotData.robo_id})
                    </p>
                )}
            </div>
        );
    }

    /* ===================== ERROR STATE ===================== */
    if (error && schedules.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="rounded-2xl bg-white p-8 text-center shadow-xl max-w-md">
                    <XCircle className="w-16 h-16 mx-auto mb-4 text-rose-600" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">
                        Failed to Load
                    </h3>
                    <p className="mb-2 text-gray-600">{error}</p>
                    <p className=" text-sm text-gray-500">
                        Robot ID: {robotDbId}
                        {roboId && ` (robo_id: ${roboId})`}
                    </p>
                    <button
                        onClick={handleManualRefresh}
                        className="px-6 py-3 rounded-xl font-medium bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    /* ===================== MAIN UI ===================== */
    return (
        <div className="bg-white p-6">
            {/* Header with Robot Info and WebSocket Status */}
            <div className="mb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Schedule Management
                            </h1>
                            <p className="text-sm font-semibold text-gray-500 mt-0.5">
                                {robotData ? (
                                    <>
                                        {robotData.name} Schedules
                                    </>
                                ) : (
                                    <>Robot ID: {robotDbId}</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* WebSocket Error Message */}
            {wsError && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">
                            WebSocket Connection Issue
                        </p>
                        <p className="text-sm text-amber-700">{wsError}</p>
                        <p className="text-xs text-amber-600 mt-1">
                            Live updates are unavailable. Data will be updated manually on
                            refresh.
                        </p>
                    </div>
                </div>
            )}

            {/* Search and Status Filter */}
            <div className="mb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 flex-1">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/50 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200/50 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                        >
                            <option value="all">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="canceled">Canceled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Schedules Grid or Empty State */}
            {filteredSchedules.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-300/50 p-16 text-center bg-white/50">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-2xl font-semibold mb-3 text-gray-900">
                        No Schedules Found
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || statusFilter !== "all"
                            ? "No schedules match your criteria."
                            : "No schedules available for this robot."}
                    </p>
                </div>
            ) : (
                <div>
                    {/* Schedules Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredSchedules.map((schedule) => (
                            <div key={schedule.id}>
                                <ScheduleCard
                                    schedule={schedule}
                                    onClick={handleScheduleClick}
                                    onUpdate={fetchFilteredData}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-6 border-gray-200">
                        <div className="text-sm text-gray-600">
                            Showing{" "}
                            <span className="font-semibold">
                                {(pagination.current_page - 1) *
                                    pagination.page_size +
                                    1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold">
                                {Math.min(
                                    pagination.current_page *
                                        pagination.page_size,
                                    pagination.total_records
                                )}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold">
                                {pagination.total_records}
                            </span>{" "}
                            schedules
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    handlePageChange(pagination.current_page - 1)
                                }
                                disabled={!pagination.has_previous}
                                className={`p-2 rounded-lg border transition-all ${
                                    pagination.has_previous
                                        ? "bg-white hover:bg-gray-50 text-gray-700"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from(
                                { length: pagination.total_pages },
                                (_, i) => i + 1
                            ).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-9 h-9 rounded-lg font-medium text-sm transition-all ${
                                        page === pagination.current_page
                                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                                            : "bg-white border border-gray-200/50 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() =>
                                    handlePageChange(pagination.current_page + 1)
                                }
                                disabled={!pagination.has_next}
                                className={`p-2 rounded-lg border transition-all ${
                                    pagination.has_next
                                        ? "bg-white hover:bg-gray-50 text-gray-700"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScheduleListPage;