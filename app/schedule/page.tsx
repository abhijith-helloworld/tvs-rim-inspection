"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import SchedulesList from "./[id]/page";
import CreateSchedule from "./[id]/_components/Shedulecreat";
import { tokenStorage, API_BASE_URL, fetchWithAuth } from "../lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import RobotDashboardHeader from "../Includes/header";

import type {
    RobotData,
    BatteryStatus,
    RobotStatus,
    FilterData,
    Schedule,
    Pagination,
} from "../types/robot";

export type { Schedule, Pagination };

/* ================================================================
   LOCAL TYPES
   ================================================================ */

interface ScheduleSummary {
    total: number;
    scheduled: number;
    processing: number;
    completed: number;
}

/* ── Defaults ─────────────────────────────────────────────────── */
const DEFAULT_BATTERY: BatteryStatus = {
    level: 0,
    status: "discharging",
    timeRemaining: "0h 0m",
};

const DEFAULT_ROBOT_STATUS: RobotStatus = {
    break_status: false,
    emergency_status: false,
    Arm_moving: false,
};

const DEFAULT_PAGINATION: Pagination = {
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    page_size: 8,
    has_next: false,
    has_previous: false,
};

/* ── Filter body builder ──────────────────────────────────────── */
function buildFilterBody(
    filterData: FilterData,
    statusFilter: string[],
): Record<string, string | string[] | undefined> {
    return {
        filter_type: filterData.filter_type,
        date: filterData.date || undefined,
        start_date: filterData.start_date || undefined,
        end_date: filterData.end_date || undefined,
        ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
    };
}

/* ================================================================
   COMPONENT
   ================================================================ */

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    /* ── URL / init state ───────────────────────────────────────── */
    const [robotId, setRobotId] = useState<string>("");
    const [isInitialized, setIsInitialized] = useState(false);
    const [filterData, setFilterData] = useState<FilterData>({
        filter_type: "month",
        date: "",
        start_date: "",
        end_date: "",
    });

    /* ── Robot state ────────────────────────────────────────────── */
    const [robotData, setRobotData] = useState<RobotData | null>(null);
    const [roboId, setRoboId] = useState<string>("");
    const [battery, setBattery] = useState<BatteryStatus>(DEFAULT_BATTERY);
    const [robotStatus, setRobotStatus] =
        useState<RobotStatus>(DEFAULT_ROBOT_STATUS);
    const [wsConnected, setWsConnected] = useState<boolean>(false);

    /* ── Schedule state ─────────────────────────────────────────── */
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [pagination, setPagination] =
        useState<Pagination>(DEFAULT_PAGINATION);
    const [scheduleSummary, setScheduleSummary] = useState<ScheduleSummary>({
        total: 0,
        scheduled: 0,
        processing: 0,
        completed: 0,
    });
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 8;

    /* ── Loading / error ────────────────────────────────────────── */
    const [schedulesLoading, setSchedulesLoading] = useState(false);
    const [schedulesError, setSchedulesError] = useState<string | null>(null);

    /* ── Clock ──────────────────────────────────────────────────── */
    const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

    const wsRef = useRef<WebSocket | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

    /* ── Clock tick ─────────────────────────────────────────────── */
    useEffect(() => {
        const interval = setInterval(
            () => setTime(new Date().toLocaleTimeString()),
            1000,
        );
        return () => clearInterval(interval);
    }, []);

    /* ── Read URL params ────────────────────────────────────────── */
    useEffect(() => {
        const robotIdParam = searchParams.get("robot_id");
        setRobotId(robotIdParam ?? "");
        setFilterData({
            filter_type:
                (searchParams.get(
                    "filter_type",
                ) as FilterData["filter_type"]) ?? "month",
            date: searchParams.get("date") ?? "",
            start_date: searchParams.get("start_date") ?? "",
            end_date: searchParams.get("end_date") ?? "",
        });
        setIsInitialized(true);
    }, [searchParams]);

    /* ── Auth check ─────────────────────────────────────────────── */
    useEffect(() => {
        if (!tokenStorage.isAuthenticated()) router.replace("/login");
    }, [router]);

    /* ── Fetch robot data ───────────────────────────────────────── */
    useEffect(() => {
        if (!robotId || !isInitialized) return;
        const fetchRobotData = async () => {
            try {
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/`,
                );
                if (!response.ok) throw new Error("Failed to fetch robot data");
                const json = await response.json();
                if (json.success && json.data) {
                    const raw = json.data;
                    const robot: RobotData = {
                        ...raw,
                        robo_id: raw.robo_id ?? "",
                    };
                    setRobotData(robot);
                    if (typeof raw.battery_level === "number") {
                        setBattery((prev: any) => ({
                            ...prev,
                            level: raw.battery_level as number,
                        }));
                    }
                    if (robot.robo_id) setRoboId(robot.robo_id);
                }
            } catch (error) {
                console.error("Error fetching robot data:", error);
            }
        };
        fetchRobotData();
    }, [robotId, isInitialized]);

    /* ── Fetch schedules ────────────────────────────────────────── */
    const fetchSchedules = useCallback(async () => {
        if (!robotId || isNaN(Number(robotId))) return;
        setSchedulesLoading(true);
        setSchedulesError(null);
        try {
            const body = buildFilterBody(filterData, statusFilter);
            const url = `${API_BASE_URL}/schedule/robot/${robotId}/filter/?page=${currentPage}&page_size=${PAGE_SIZE}`;

            const response = await fetchWithAuth(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `HTTP ${response.status}: ${errorText || "Unknown error"}`,
                );
            }

            const result = await response.json();
            if (!result.success)
                throw new Error(result.message || "Failed to fetch schedules");

            const sorted = [...(result.schedules || [])].sort(
                (a: Schedule, b: Schedule) => {
                    const priorityA = a.status === "processing" ? 0 : 1;
                    const priorityB = b.status === "processing" ? 0 : 1;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    const dateA = new Date(
                        `${a.scheduled_date}T${a.scheduled_time}`,
                    ).getTime();
                    const dateB = new Date(
                        `${b.scheduled_date}T${b.scheduled_time}`,
                    ).getTime();
                    return dateB - dateA;
                },
            );

            setSchedules(sorted);
            if (result.pagination) setPagination(result.pagination);
            if (result.schedule_summary)
                setScheduleSummary(result.schedule_summary);
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to load schedules";
            setSchedulesError(message);
            setSchedules([]);
        } finally {
            setSchedulesLoading(false);
        }
    }, [robotId, filterData, statusFilter, currentPage]);

    useEffect(() => {
        if (!robotId || !isInitialized) return;
        fetchSchedules();
    }, [robotId, isInitialized, fetchSchedules]);

    /* ── WebSocket ──────────────────────────────────────────────── */
    useEffect(() => {
        if (!roboId) return;

        let isManualClose = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;

        const connect = () => {
            try {
                ws = new WebSocket(`${WS_URL}/ws/robot_message/${roboId}/`);
                wsRef.current = ws;

                ws.onopen = () => setWsConnected(true);

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data as string);

                        if (payload.event === "battery_information") {
                            const soc = Number(payload.data?.soc) || 0;
                            const current =
                                Number(payload.data?.current) || 0;
                            const voltage =
                                Number(payload.data?.voltage) || 0;
                            const power = Number(payload.data?.power) || 0;
                            const dod = Number(payload.data?.dod) || 0;
                            const status: BatteryStatus["status"] =
                                current > 0.5
                                    ? "charging"
                                    : soc >= 99
                                      ? "full"
                                      : soc < 20
                                        ? "low"
                                        : "discharging";
                            setBattery({
                                level: soc,
                                status,
                                timeRemaining: `${Math.floor(soc / 20)}h ${Math.floor((soc % 20) * 3)}m`,
                                voltage,
                                current,
                                power,
                                dod,
                            });
                        }

                        if (payload.event === "robot_status") {
                            setRobotStatus((prev: any) => ({
                                break_status:
                                    payload.data.break_status ??
                                    prev.break_status,
                                emergency_status:
                                    payload.data.emergency_status ??
                                    prev.emergency_status,
                                Arm_moving:
                                    payload.data.Arm_moving ?? prev.Arm_moving,
                            }));
                        }

                        if (
                            payload.event === "schedule_updated" ||
                            payload.event === "schedule_created"
                        ) {
                            if (refreshTimeoutRef.current)
                                clearTimeout(refreshTimeoutRef.current);
                            refreshTimeoutRef.current = setTimeout(
                                () => fetchSchedules(),
                                1000,
                            );
                        }
                    } catch (err) {
                        console.error("❌ WS message parse error:", err);
                    }
                };

                ws.onerror = (err) => console.error("❌ WS error:", err);

                ws.onclose = () => {
                    setWsConnected(false);
                    wsRef.current = null;
                    if (!isManualClose)
                        reconnectTimeout = setTimeout(connect, 3000);
                };
            } catch (err) {
                console.error("❌ WS init failed:", err);
                if (!isManualClose)
                    reconnectTimeout = setTimeout(connect, 3000);
            }
        };

        connect();
        return () => {
            isManualClose = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (refreshTimeoutRef.current)
                clearTimeout(refreshTimeoutRef.current);
            ws?.close();
            wsRef.current = null;
        };
    }, [roboId, fetchSchedules]);

    /* ── Handlers ───────────────────────────────────────────────── */
    const handleStatusFilterChange = useCallback((val: string[]) => {
        setStatusFilter(val);
        setCurrentPage(1);
    }, []);

    const handlePageChange = useCallback(
        (page: number) => {
            if (page >= 1 && page <= pagination.total_pages) {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },
        [pagination.total_pages],
    );

    /* ── Back navigation ────────────────────────────────────────── */
    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    /* ── Loading guard ──────────────────────────────────────────── */
    if (!isInitialized || !robotId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Initializing dashboard...</p>
                </div>
            </div>
        );
    }

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30 p-4 md:p-6">
            {/* ── Header ───────────────────────────────────────────────── */}
            <RobotDashboardHeader
                title="Robotic Schedule Dashboard"
                subtitle={`Robot ID: ${robotData?.name ?? "N/A"}`}
                robotData={robotData}
                battery={battery}
                robotStatus={robotStatus}
                wsConnected={wsConnected}
                time={time}
            />
                        <div className="">
                <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-gray-600 text-sm font-medium group cursor-pointer"
                >
                    <ArrowLeft
                        className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:-translate-x-0.5 transition-all duration-150"
                    />
                    <span>
                        Back to{" "}
                        <span className="font-semibold text-gray-800">
                            {robotData?.name ?? "Robot"}
                        </span>
                    </span>
                </button>
            </div>

            <div className="mt-2">
                {/* ── Stats Grid ───────────────────────────────────────────
                      Always 2-col on mobile, 4-col from sm (640px) upward.
                      No breakpoint collapses between 1024–1280 that would
                      cause 1-col or 2-col stacking at 1200px.
                ─────────────────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <StatCard
                        label="Total Schedule"
                        value={schedulesLoading ? "..." : scheduleSummary.total}
                        bg="bg-blue-50"
                        border="border-blue-100"
                    />
                    <StatCard
                        label="Completed"
                        value={schedulesLoading ? "..." : scheduleSummary.completed}
                        bg="bg-green-50"
                        border="border-green-100"
                    />
                    <StatCard
                        label="Pending"
                        value={schedulesLoading ? "..." : scheduleSummary.scheduled}
                        bg="bg-amber-50"
                        border="border-amber-100"
                    />
                    <StatCard
                        label="Processing"
                        value={schedulesLoading ? "..." : scheduleSummary.processing}
                        bg="bg-sky-50"
                        border="border-sky-100"
                    />
                </div>

                {/* ── Schedule Section ─────────────────────────────────────
                      Layout logic:
                        < 1280px  → stack vertically (list full-width, form below)
                        ≥ 1280px  → side-by-side: list flex-1, form w-80 sidebar

                      This prevents the cramped 2-column squeeze that occurs at
                      exactly 1200px when using lg: (1024px) breakpoint.
                ─────────────────────────────────────────────────────────── */}
                <div className="flex flex-col xl:flex-row gap-5">

                    {/* Schedule list */}
                    <div className="flex-1 min-w-0">
                        <div className="rounded-2xl border border-gray-200/60 bg-white shadow-sm overflow-hidden">
                            <SchedulesList
                                robotId={robotId}
                                robotData={robotData}
                                filterData={filterData}
                                schedules={schedules}
                                pagination={pagination}
                                loading={schedulesLoading}
                                error={schedulesError}
                                statusFilter={statusFilter}
                                currentPage={currentPage}
                                onStatusFilterChange={handleStatusFilterChange}
                                onPageChange={handlePageChange}
                                onRefresh={fetchSchedules}
                            />
                        </div>
                    </div>

                    {/* Create schedule form
                          - Full width when stacked (< xl)
                          - Fixed 320px sidebar when side-by-side (≥ xl / 1280px)
                          - sticky so it stays visible while scrolling the list   */}
                    <div className="w-full xl:w-80 xl:shrink-0">
                        <div className="rounded-2xl bg-white border border-gray-200/60 shadow-sm overflow-hidden xl:sticky xl:top-6">
                            <CreateSchedule
                                robotId={robotId}
                                onSuccess={fetchSchedules}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Extracted StatCard to keep JSX clean ──────────────────────── */
interface StatCardProps {
    label: string;
    value: number | string;
    bg: string;
    border: string;
}

function StatCard({ label, value, bg, border }: StatCardProps) {
    return (
        <div
            className={`${bg} rounded-2xl border ${border} p-4 md:p-5 transition-all duration-200 hover:shadow-md shadow-sm`}
        >
            <p className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-1">
                {value}
            </p>
            <p className="text-xs md:text-sm text-gray-600 font-medium">
                {label}
            </p>
        </div>
    );
}

export default function Home() {
    return <DashboardContent />;
}