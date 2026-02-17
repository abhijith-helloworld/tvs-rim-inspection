"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import SchedulesList from "./[id]/page";
import CreateSchedule from "./Shedulecreat";
import { tokenStorage, API_BASE_URL, fetchWithAuth } from "../lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import RobotDashboardHeader from "../Includes/header";

/* ================================================================
   TYPES — must exactly match RobotDashboardHeader props
   (same as dashboard.tsx — ideally import from @/app/types/robot)
   ================================================================ */

interface RobotData {
    id: string;       // BUG 5 FIX: was missing, header requires it
    name: string;
    status: string;   // BUG 5 FIX: was missing, header requires it
    robo_id?: string;
    minimum_battery_charge?: number;
    [key: string]: unknown;
}

// BUG 3 FIX: battery must be a BatteryStatus object, never number | null
interface BatteryStatus {
    level: number;
    status: "charging" | "discharging" | "full" | "low";
    timeRemaining: string;
    voltage?: number;
    current?: number;
    power?: number;
    dod?: number;
}

// BUG 4 FIX: robotStatus must be an object, never a plain string
interface RobotStatus {
    break_status: boolean;
    emergency_status: boolean;
    Arm_moving: boolean;
}

interface StatusTotals {
    pending: number;
    processing: number;
    completed: number;
    total: number;
}

// BUG 1 FIX: filter data is passed from dashboard via URL — define the type
interface FilterData {
    filter_type: "day" | "week" | "month" | "range";
    date: string;
    start_date: string;
    end_date: string;
}

/* ── Defaults (so header never receives null/undefined) ─────────────── */
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

/* ================================================================
   COMPONENT
   ================================================================ */

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    /* ── Robot ID from URL ─────────────────────────────────────────── */
    const [robotId, setRobotId] = useState<string>("");
    const [isInitialized, setIsInitialized] = useState(false);

    // BUG 1+2 FIX: read ALL filter params the dashboard passes in the URL
    const [filterData, setFilterData] = useState<FilterData>({
        filter_type: "month",
        date: "",
        start_date: "",
        end_date: "",
    });

    /* ── Robot state ───────────────────────────────────────────────── */
    const [robotData, setRobotData] = useState<RobotData | null>(null);
    const [roboId, setRoboId] = useState<string>("");

    // BUG 3 FIX: battery is always a BatteryStatus object
    const [battery, setBattery] = useState<BatteryStatus>(DEFAULT_BATTERY);

    // BUG 4 FIX: robotStatus is always a RobotStatus object
    const [robotStatus, setRobotStatus] =
        useState<RobotStatus>(DEFAULT_ROBOT_STATUS);

    const [wsConnected, setWsConnected] = useState<boolean>(false);

    /* ── Schedule totals ───────────────────────────────────────────── */
    const [statusTotals, setStatusTotals] = useState<StatusTotals>({
        pending: 0,
        processing: 0,
        completed: 0,
        total: 0,
    });
    const [loading, setLoading] = useState(true);

    /* ── Clock ─────────────────────────────────────────────────────── */
    const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

    // BUG 6 FIX: WebSocket ref for live battery + status updates
    const wsRef = useRef<WebSocket | null>(null);

    /* ── Clock tick ────────────────────────────────────────────────── */
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    /* ── INITIALIZE: read robot_id + all filter params from URL ─────── */
    // BUG 1+2 FIX: previously only robot_id was read; filter params were dropped
    useEffect(() => {
        const robotIdParam = searchParams.get("robot_id");
        setRobotId(robotIdParam ?? "");

        setFilterData({
            filter_type:
                (searchParams.get("filter_type") as FilterData["filter_type"]) ??
                "month",
            date:       searchParams.get("date")       ?? "",
            start_date: searchParams.get("start_date") ?? "",
            end_date:   searchParams.get("end_date")   ?? "",
        });

        setIsInitialized(true);
    }, [searchParams]);

    /* ── AUTH CHECK ────────────────────────────────────────────────── */
    useEffect(() => {
        if (!tokenStorage.isAuthenticated()) {
            router.replace("/login");
        }
    }, [router]);

    /* ── FETCH ROBOT DATA ──────────────────────────────────────────── */
    // BUG 5 FIX: fetch full robot object so we have id + status for header
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
                    const robot: RobotData = json.data;
                    setRobotData(robot);

                    // Seed battery from REST response if available
                    // (WebSocket will override with live values)
                    if (typeof robot.battery_level === "number") {
                        setBattery((prev) => ({
                            ...prev,
                            level: robot.battery_level as number,
                        }));
                    }

                    // Save robo_id for WebSocket connection
                    if (robot.robo_id) {
                        setRoboId(robot.robo_id as string);
                    }
                }
            } catch (error) {
                console.error("Error fetching robot data:", error);
            }
        };

        fetchRobotData();
    }, [robotId, isInitialized]);

    /* ── FETCH SCHEDULE STATUS TOTALS ──────────────────────────────── */
    useEffect(() => {
        if (!robotId || !isInitialized) return;

        const fetchStatusTotals = async () => {
            try {
                setLoading(true);
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/schedules/`,
                );
                if (!response.ok) throw new Error("Failed to fetch schedules");

                const data = await response.json();
                if (data.success && data.data.status_totals) {
                    setStatusTotals(data.data.status_totals);
                }
            } catch (error) {
                console.error("Error fetching status totals:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatusTotals();
    }, [robotId, isInitialized]);

    /* ── WEBSOCKET — live battery + robot status ───────────────────── */
    // BUG 6 FIX: schedule page had no WebSocket at all, so battery/robotStatus
    // were stuck at their initial values and the header showed stale data.
    useEffect(() => {
        if (!roboId) return;

        let isManualClose = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;

        const connect = () => {
            try {
                ws = new WebSocket(
                    `ws://192.168.0.216:8002/ws/robot_message/${roboId}/`,
                );
                wsRef.current = ws;

                ws.onopen = () => setWsConnected(true);

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data as string);

                        /* battery_information → BatteryStatus object */
                        if (payload.event === "battery_information") {
                            const soc     = Number(payload.data?.soc)     || 0;
                            const current = Number(payload.data?.current) || 0;
                            const voltage = Number(payload.data?.voltage) || 0;
                            const power   = Number(payload.data?.power)   || 0;
                            const dod     = Number(payload.data?.dod)     || 0;

                            const status: BatteryStatus["status"] =
                                current > 0.5 ? "charging"
                                : soc >= 99   ? "full"
                                : soc < 20    ? "low"
                                :               "discharging";

                            const hours   = Math.floor(soc / 20);
                            const minutes = Math.floor((soc % 20) * 3);

                            setBattery({
                                level: soc,
                                status,
                                timeRemaining: `${hours}h ${minutes}m`,
                                voltage,
                                current,
                                power,
                                dod,
                            });
                        }

                        /* robot_status → RobotStatus object */
                        if (payload.event === "robot_status") {
                            setRobotStatus((prev) => ({
                                break_status:
                                    payload.data.break_status ??
                                    prev.break_status,
                                emergency_status:
                                    payload.data.emergency_status ??
                                    prev.emergency_status,
                                Arm_moving:
                                    payload.data.Arm_moving ??
                                    prev.Arm_moving,
                            }));
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
            ws?.close();
            wsRef.current = null;
        };
    }, [roboId]);

    /* ── LOADING GUARD ─────────────────────────────────────────────── */
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

    /* ── RENDER ────────────────────────────────────────────────────── */
    return (
        <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50/30 p-6">

            <RobotDashboardHeader
                title="Robotic Schedule Dashboard"
                subtitle={`Robot ID: ${robotData?.name ?? "N/A"}`}
                robotData={robotData}
                battery={battery}
                robotStatus={robotStatus}
                wsConnected={wsConnected}
                time={time}
            />

            {/* Main Content */}
            <div>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 transition-all duration-200 hover:shadow-lg shadow-sm backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.total}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Total Inspections
                            </p>
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-2xl shadow-sm border border-green-100 p-6 transition-all duration-200 hover:shadow-lg backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.completed}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Completed
                            </p>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-100 p-6 transition-all duration-200 hover:shadow-lg backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.pending}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Pending
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-2xl shadow-sm border border-gray-200/50 p-6 transition-all duration-200 hover:shadow-lg hover:border-gray-300 backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.processing}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Processing
                            </p>
                        </div>
                    </div>
                </div>
                {/* Schedule Section */}
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                        <div className="rounded-2xl border border-gray-200/50 bg-white shadow-lg overflow-hidden backdrop-blur-sm">
                            {robotId && isInitialized ? (
                                <SchedulesList
                                    robotId={robotId}
                                    filterData={filterData}
                                />
                            ) : (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mr-3" />
                                    <p className="text-gray-400">
                                        Loading robot data...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-[23%]">
                        <div className="rounded-2xl bg-white shadow-lg overflow-hidden backdrop-blur-sm sticky top-20">
                            <CreateSchedule robotId={robotId} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    return <DashboardContent />;
}