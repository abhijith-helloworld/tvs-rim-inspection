"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Calendar,
    ChevronRight,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Clock,
    ChevronLeft,
    FileText,
    BarChart3,
    ArrowLeft,
} from "lucide-react";

import { fetchWithAuth, API_BASE_URL } from "../lib/auth";
import RobotDashboardHeader from "../Includes/header";

/* ===================== TYPES ===================== */

interface Inspection {
    id: number;
    rim_id: string;
    image: string;
    inspected_at: string;
    is_defect: boolean;
    is_human_verified: boolean;
    false_detected: boolean;
    description: string | null;
    is_approved: boolean;
    correct_label: string | null;
    schedule: number;
    rim_type: string | null;
}

interface RobotData {
    id: string;
    name: string;
    status: string;
    robo_id?: string;
    minimum_battery_charge?: number;
    [key: string]: unknown;
}

interface BatteryStatus {
    level: number;
    status: "charging" | "discharging" | "full" | "low";
    timeRemaining: string;
    voltage?: number;
    current?: number;
    power?: number;
    dod?: number;
}

interface RobotStatus {
    break_status: boolean;
    emergency_status: boolean;
    Arm_moving: boolean;
}

/* ── Defaults ── */
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

/* ===================== PAGINATION COMPONENT ===================== */
const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
    recordsInfo,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    recordsInfo: string;
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">{recordsInfo}</div>
                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        className={`p-2 rounded-lg border transition-all ${
                            currentPage === 1
                                ? "bg-gray-100 border-gray-200/50 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200/50 hover:bg-gray-50 text-gray-700"
                        }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum =
                                currentPage <= 3
                                    ? i + 1
                                    : currentPage >= totalPages - 2
                                      ? totalPages - 4 + i
                                      : currentPage - 2 + i;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                        currentPage === pageNum
                                            ? "bg-teal-600 text-white shadow-md"
                                            : "bg-white border border-gray-200/50 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        className={`p-2 rounded-lg border transition-all ${
                            currentPage === totalPages
                                ? "bg-gray-100 border-gray-200/50 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200/50 hover:bg-gray-50 text-gray-700"
                        }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ===================== STAT CARD ===================== */
const StatCard = ({
    label,
    value,
    icon,
    bgColor,
    textColor,
    badgeColor,
}: {
    label: string;
    value: number | string;
    icon: React.ReactElement;
    bgColor: string;
    textColor: string;
    badgeColor: string;
}) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${bgColor} shadow-md`}>
                {React.cloneElement(icon, { className: `w-5 h-5 ${textColor}` })}
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}>
                {label}
            </span>
        </div>
        <div className="flex flex-col">
            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{value}</p>
            <p className="text-sm text-gray-600 font-medium">
                {label === "Inspections" && "Completed this batch"}
                {label === "Passed"      && "Quality-approved rims"}
                {label === "Defective"   && "Rims requiring attention"}
                {label === "Verified"    && "Human-verified inspections"}
            </p>
        </div>
    </div>
);

/* ===================== MAIN COMPONENT ===================== */
export default function InspectionsBySchedule() {
    const router       = useRouter();
    const searchParams = useSearchParams();

    const scheduleId = searchParams.get("schedule_id");
    const robotId    = searchParams.get("robot_id");

    /* ── state ── */
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [page,        setPage]        = useState(1);
    const [count,       setCount]       = useState(0);
    const [defected,    setDefected]    = useState(0);
    const [passed,      setPassed]      = useState(0);
    const [loading,     setLoading]     = useState(false);
    const [fetchError,  setFetchError]  = useState<string | null>(null);

    const [robotData,   setRobotData]   = useState<RobotData | null>(null);
    const [roboId,      setRoboId]      = useState<string>("");

    const [battery,     setBattery]     = useState<BatteryStatus>(DEFAULT_BATTERY);
    const [robotStatus, setRobotStatus] = useState<RobotStatus>(DEFAULT_ROBOT_STATUS);
    const [wsConnected, setWsConnected] = useState(false);
    const [time,        setTime]        = useState<string>(new Date().toLocaleTimeString());

    const wsRef = useRef<WebSocket | null>(null);

    const pageSize   = 10;
    const totalPages = Math.ceil(count / pageSize);

    /* ── Clock ── */
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(interval);
    }, []);

    /* ── Fetch robot data ── */
    useEffect(() => {
        if (!robotId) return;

        const fetchRobotData = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const robot: RobotData = json.data;
                    setRobotData(robot);
                    if (robot.robo_id) setRoboId(robot.robo_id as string);
                }
            } catch (err) {
                console.error("Failed to fetch robot data:", err);
            }
        };

        fetchRobotData();
    }, [robotId]);

    /* ── WebSocket for live battery + robot status ── */
    useEffect(() => {
        if (!roboId) return;

        let isManualClose = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;

        const connect = () => {
            try {
                ws = new WebSocket(`ws://192.168.0.216:8002/ws/robot_message/${roboId}/`);
                wsRef.current = ws;

                ws.onopen = () => setWsConnected(true);

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data as string);

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
                            setRobotStatus((prev) => ({
                                break_status:     payload.data.break_status     ?? prev.break_status,
                                emergency_status: payload.data.emergency_status ?? prev.emergency_status,
                                Arm_moving:       payload.data.Arm_moving       ?? prev.Arm_moving,
                            }));
                        }
                    } catch (err) {
                        console.error("❌ WS parse error:", err);
                    }
                };

                ws.onerror = (err) => console.error("❌ WS error:", err);

                ws.onclose = () => {
                    setWsConnected(false);
                    wsRef.current = null;
                    if (!isManualClose) reconnectTimeout = setTimeout(connect, 3000);
                };
            } catch (err) {
                if (!isManualClose) reconnectTimeout = setTimeout(connect, 3000);
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

    /* ── Fetch inspections ── */
    useEffect(() => {
        if (!scheduleId) return;
        fetchInspections(page);
    }, [scheduleId, page]);

    const fetchInspections = async (pageNo: number) => {
        try {
            setLoading(true);
            setFetchError(null);
            const res = await fetchWithAuth(
                `${API_BASE_URL}/schedule/${scheduleId}/inspections/?page=${pageNo}`,
            );
            const responseData = await res.json();
            setInspections(responseData?.results?.inspections ?? []);
            setCount(responseData?.count ?? 0);
            setDefected(responseData?.total_defected ?? 0);
            setPassed(responseData?.total_non_defected ?? 0);
        } catch (err) {
            console.error("Inspection fetch failed", err);
            setFetchError("Failed to load inspections.");
            setInspections([]);
        } finally {
            setLoading(false);
        }
    };

    const defectRate    = count > 0 ? ((defected / count) * 100).toFixed(1) : 0;
    const verifiedCount = inspections.filter((i) => i.is_human_verified).length;

    /* ── Missing schedule ID guard ── */
    if (!scheduleId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-200 max-w-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Missing Schedule ID</h3>
                    <p className="text-gray-600 mb-4">No schedule ID was provided in the URL.</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    /* ===================== UI ===================== */
    return (
        <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50/30 p-6">
            <RobotDashboardHeader
                title="Robotic Inspection Dashboard"
                subtitle={`Robot ID: ${robotData?.name ?? "N/A"}`}
                robotData={robotData}
                battery={battery}
                robotStatus={robotStatus}
                wsConnected={wsConnected}
                time={time}
            />

            {/* Back to schedules */}
            <div className="mb-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Schedules
                </button>
            </div>

            <div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        label="Inspections"
                        value={count}
                        icon={<Calendar />}
                        bgColor="bg-blue-50"
                        textColor="text-blue-600"
                        badgeColor="bg-blue-50 text-blue-700 border border-blue-200"
                    />
                    <StatCard
                        label="Passed"
                        value={passed}
                        icon={<CheckCircle />}
                        bgColor="bg-emerald-50"
                        textColor="text-emerald-600"
                        badgeColor="bg-emerald-50 text-emerald-700 border border-emerald-200"
                    />
                    <StatCard
                        label="Defective"
                        value={defected}
                        icon={<AlertCircle />}
                        bgColor="bg-red-50"
                        textColor="text-red-600"
                        badgeColor="bg-red-50 text-red-700 border border-red-200"
                    />
                    <StatCard
                        label="Verified"
                        value={verifiedCount}
                        icon={<CheckCircle />}
                        bgColor="bg-teal-50"
                        textColor="text-teal-600"
                        badgeColor="bg-teal-50 text-teal-700 border border-teal-200"
                    />
                </div>

                {/* Fetch Error Banner */}
                {fetchError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="text-sm text-red-700">{fetchError}</p>
                        <button
                            onClick={() => fetchInspections(page)}
                            className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Inspections List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                                        <p className="text-gray-600 font-medium">Loading inspections...</p>
                                    </div>
                                ) : inspections.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inspections Found</h3>
                                        <p className="text-gray-500 text-center">
                                            There are no inspection records for this schedule yet.
                                        </p>
                                    </div>
                                ) : (
                                    inspections.map((item) => {
                                        const date     = new Date(item.inspected_at);
                                        const isDefect = item.is_defect;

                                        return (
                                            <div
                                                key={item.id}
                                                // ✅ FIX: robot_id is now forwarded to the detail page
                                                // so InspectionDetailPage can fetch robot data and open WS
                                                onClick={() =>
                                                    router.push(
                                                        `/inspections/${item.id}?robot_id=${robotId}&schedule_id=${scheduleId}`
                                                    )
                                                }
                                                className="group p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Image */}
                                                    <div className="relative flex-shrink-0">
                                                        <img
                                                            src={item.image}
                                                            alt="Rim inspection"
                                                            className="w-20 h-20 rounded-xl object-cover border border-gray-200 group-hover:border-gray-300 transition-colors"
                                                        />
                                                        <div
                                                            className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center ${
                                                                isDefect ? "bg-red-500" : "bg-emerald-500"
                                                            }`}
                                                        >
                                                            {isDefect ? (
                                                                <XCircle className="w-4 h-4 text-white" />
                                                            ) : (
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                                                                    Rim #{item.rim_id}
                                                                </h3>
                                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                                    <div className="flex items-center text-sm text-gray-500">
                                                                        <Calendar className="w-4 h-4 mr-1" />
                                                                        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                                    </div>
                                                                    <div className="flex items-center text-sm text-gray-500">
                                                                        <Clock className="w-4 h-4 mr-1" />
                                                                        {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {item.is_human_verified && (
                                                                    <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200">
                                                                        Verified
                                                                    </span>
                                                                )}
                                                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition-colors" />
                                                            </div>
                                                        </div>

                                                        {/* Tags */}
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {item.false_detected && (
                                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                                                    False Detection
                                                                </span>
                                                            )}
                                                            {item.is_approved && (
                                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                                                                    Approved
                                                                </span>
                                                            )}
                                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                                                Schedule #{item.schedule}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {totalPages > 1 && !loading && (
                                <PaginationControls
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                    recordsInfo={`Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, count)} of ${count} inspections`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-teal-50 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-teal-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Summary</h3>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: "Total Inspections", value: count,                                                                               bg: "bg-gray-50/50",    border: "border-gray-100",   text: "text-gray-900",    labelText: "text-gray-600"   },
                                    { label: "Defect Rate",       value: `${defectRate}%`,                                                                    bg: "bg-red-50/50",     border: "border-red-100",    text: "text-red-600",     labelText: "text-red-600"    },
                                    { label: "Verified Count",    value: `${verifiedCount}/${count}`,                                                         bg: "bg-teal-50/50",    border: "border-teal-100",   text: "text-teal-600",    labelText: "text-teal-600"   },
                                    { label: "Pass Rate",         value: `${count > 0 ? ((passed / count) * 100).toFixed(1) : 0}%`,                          bg: "bg-emerald-50/50", border: "border-emerald-100", text: "text-emerald-600", labelText: "text-emerald-600" },
                                ].map(({ label, value, bg, border, text, labelText }) => (
                                    <div key={label} className={`flex items-center justify-between p-3 rounded-lg ${bg} border ${border}`}>
                                        <span className={`text-sm font-medium ${labelText}`}>{label}</span>
                                        <span className={`font-bold ${text}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-6">
                            <h3 className="text-sm font-bold text-teal-900 mb-3">Inspection Info</h3>
                            <ul className="space-y-2 text-sm text-teal-800">
                                {[
                                    "Click on any inspection to view details",
                                    "Verify and approve inspections",
                                    "Mark false detections",
                                ].map((tip) => (
                                    <li key={tip} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}