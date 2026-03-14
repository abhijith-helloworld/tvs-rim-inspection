"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
import Link from "next/link";

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
    robo_id: string;
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
    hasNext,
    hasPrev,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    recordsInfo: string;
    hasNext: boolean;
    hasPrev: boolean;
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-gray-500">{recordsInfo}</div>
                <div className="flex items-center gap-1.5">
                    <button
                        disabled={!hasPrev}
                        onClick={() => onPageChange(currentPage - 1)}
                        className={`p-1.5 rounded-lg border transition-all ${
                            !hasPrev
                                ? "bg-gray-100 border-gray-200/50 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200/50 hover:bg-gray-50 text-gray-700"
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum =
                                currentPage <= 3
                                    ? i + 1
                                    : currentPage >= totalPages - 2
                                    ? totalPages - 4 + i
                                    : currentPage - 2 + i;
                            if (pageNum < 1 || pageNum > totalPages) return null;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
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
                        disabled={!hasNext}
                        onClick={() => onPageChange(currentPage + 1)}
                        className={`p-1.5 rounded-lg border transition-all ${
                            !hasNext
                                ? "bg-gray-100 border-gray-200/50 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200/50 hover:bg-gray-50 text-gray-700"
                        }`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(totalPages)}
                        className={`px-3 h-8 rounded-lg border text-xs font-semibold transition-all ${
                            currentPage === totalPages
                                ? "bg-gray-100 border-gray-200/50 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200/50 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 text-gray-700"
                        }`}
                    >
                        Last
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
    icon: React.ReactElement<{ className?: string }>;
    bgColor: string;
    textColor: string;
    badgeColor: string;
}) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${bgColor} shadow-sm flex-shrink-0`}>
            {React.cloneElement(icon, { className: `w-4 h-4 ${textColor}` })}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-0.5">{value}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                {label}
            </span>
        </div>
    </div>
);

/* ===================== MAIN COMPONENT ===================== */
export default function InspectionsBySchedule() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const scheduleId = searchParams.get("schedule_id");
    const robotId = searchParams.get("robot_id");

    /* ── state ── */
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    const [defected, setDefected] = useState(0);
    const [passed, setPassed] = useState(0);
    const [verifiedCount, setVerifiedCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [robotData, setRobotData] = useState<RobotData | null>(null);
    const [roboId, setRoboId] = useState<string>("");

    const [battery, setBattery] = useState<BatteryStatus>(DEFAULT_BATTERY);
    const [robotStatus, setRobotStatus] = useState<RobotStatus>(DEFAULT_ROBOT_STATUS);
    const [wsConnected, setWsConnected] = useState(false);
    const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

    const wsRef = useRef<WebSocket | null>(null);
    const inspectionWsRef = useRef<WebSocket | null>(null);

    const [pageSize, setPageSize] = useState(1);
    // Derive totalPages dynamically from total count + actual page size returned by API
    const totalPages = count > 0 && pageSize > 0 ? Math.ceil(count / pageSize) : 1;

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

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
                ws = new WebSocket(`${WS_URL}/ws/robot_message/${roboId}/`);
                wsRef.current = ws;

                ws.onopen = () => setWsConnected(true);

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data as string);

                        if (payload.event === "battery_information") {
                            const soc = Number(payload.data?.soc) || 0;
                            const current = Number(payload.data?.current) || 0;
                            const voltage = Number(payload.data?.voltage) || 0;
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
                            setRobotStatus((prev) => ({
                                break_status: payload.data.break_status ?? prev.break_status,
                                emergency_status: payload.data.emergency_status ?? prev.emergency_status,
                                Arm_moving: payload.data.Arm_moving ?? prev.Arm_moving,
                            }));
                        }
                    } catch (err) {
                    }
                };
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

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    /* ── WebSocket for inspection_created events ── */
    useEffect(() => {
        if (!scheduleId) return;

        let isManualClose = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;

        const connect = () => {
            try {
                ws = new WebSocket(`${WS_URL}/ws/inspection/${scheduleId}/`);
                inspectionWsRef.current = ws;

                ws.onopen = () => {
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data as string);

                        if (payload.event === "inspection_created") {
                            fetchInspections(page);
                        }
                    } catch (err) {
                    }
                };
                ws.onclose = () => {
                    inspectionWsRef.current = null;
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
            inspectionWsRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleId]);

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

            const results = responseData?.results?.inspections ?? [];
            setInspections(results);
            setCount(responseData?.count ?? 0);
            setHasNext(!!responseData?.next);
            setHasPrev(pageNo > 1 || !!responseData?.previous);
            setDefected(responseData?.total_defected ?? 0);
            setPassed(responseData?.total_non_defected ?? 0);
            setVerifiedCount(responseData?.total_human_verified ?? 0);
            // Only set pageSize when next exists (guarantees this is a full page, not a partial last page)
            if (responseData?.next && results.length > 0) setPageSize(results.length);
        } catch (err) {
            setFetchError("Failed to load inspections.");
            setInspections([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const defectRate = count > 0 ? ((defected / count) * 100).toFixed(1) : "0";

    /* ── Missing schedule ID guard ── */
    if (!scheduleId) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
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
        <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50/30">
            {/* ── HEADER ── */}
            <div className="flex-shrink-0 px-4 pt-4">
                <RobotDashboardHeader
                    title="Robotic Inspection Dashboard"
                    subtitle={`Robot ID: ${robotData?.name ?? "N/A"}`}
                    robotData={robotData}
                    battery={battery}
                    robotStatus={robotStatus}
                    wsConnected={wsConnected}
                    time={time}
                />
                <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-gray-600 text-sm font-medium group cursor-pointer mb-2"
                >
                    <ArrowLeft
                        className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:-translate-x-0.5 transition-all duration-150"
                    />
                    <span>
                        Back to{" "}
                        <span className="font-semibold text-gray-800">
                            Schedule
                        </span>
                    </span>
                </button>
            </div>
            {/* ── STAT CARDS ── */}
            <div className="flex-shrink-0 px-4 pb-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            </div>

            {/* ── ERROR BANNER ── */}
            {fetchError && (
                <div className="flex-shrink-0 mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700">{fetchError}</p>
                    <button
                        onClick={() => fetchInspections(page)}
                        className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 min-h-0 px-4 pb-4">
                <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* ── LEFT: Inspections list ── */}
                    <div className="lg:col-span-2 h-full flex flex-col bg-white rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                        {/* Scrollable rows */}
                        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                                    <p className="text-gray-600 font-medium">Loading inspections...</p>
                                </div>
                            ) : inspections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inspections Found</h3>
                                    <p className="text-gray-500 text-center">
                                        There are no inspection records for this schedule yet.
                                    </p>
                                </div>
                            ) : (
                                inspections.map((item) => {
                                    const date = new Date(item.inspected_at);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() =>
                                                router.push(
                                                    `/inspections/${item.id}?robot_id=${robotId}&schedule_id=${scheduleId}`
                                                )
                                            }
                                            className="group p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Thumbnail */}
                                                <img
                                                    src={item.image}
                                                    alt="Rim inspection"
                                                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 group-hover:border-gray-300 transition-colors flex-shrink-0"
                                                />

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                                                                Rim #{item.rim_id}
                                                            </h3>
                                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                                <span className="flex items-center text-xs text-gray-500">
                                                                    <Calendar className="w-3 h-3 mr-1" />
                                                                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                                </span>
                                                                <span className="flex items-center text-xs text-gray-500">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {item.is_human_verified && (
                                                                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200">
                                                                    Verified
                                                                </span>
                                                            )}
                                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
                                                        </div>
                                                    </div>

                                                    {/* Tags */}
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {item.false_detected && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                                                False Detection
                                                            </span>
                                                        )}
                                                        {item.is_approved && (
                                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                                                                Approved
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
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

                        {/* Pagination */}
                        {totalPages > 1 && !loading && (
                            <PaginationControls
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                hasNext={hasNext}
                                hasPrev={hasPrev}
                                recordsInfo={`Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${count} inspections`}
                            />
                        )}
                    </div>

                    {/* ── RIGHT: Sidebar ── */}
                    <div className="h-full flex flex-col gap-4">
                        {/* Summary */}
                        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-5 flex-shrink-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-teal-50 rounded-lg">
                                    <BarChart3 className="w-4 h-4 text-teal-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Summary</h3>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { label: "Total Inspections", value: count, bg: "bg-gray-50/50", border: "border-gray-100", text: "text-gray-900", labelText: "text-gray-600" },
                                    { label: "Defect Rate", value: `${defectRate}%`, bg: "bg-red-50/50", border: "border-red-100", text: "text-red-600", labelText: "text-red-600" },
                                    { label: "Verified Count", value: `${verifiedCount}/${count}`, bg: "bg-teal-50/50", border: "border-teal-100", text: "text-teal-600", labelText: "text-teal-600" },
                                    { label: "Pass Rate", value: `${count > 0 ? ((passed / count) * 100).toFixed(1) : 0}%`, bg: "bg-emerald-50/50", border: "border-emerald-100", text: "text-emerald-600", labelText: "text-emerald-600" },
                                ].map(({ label, value, bg, border, text, labelText }) => (
                                    <div key={label} className={`flex items-center justify-between p-2.5 rounded-lg ${bg} border ${border}`}>
                                        <span className={`text-sm font-medium ${labelText}`}>{label}</span>
                                        <span className={`font-bold ${text}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-5 flex-1">
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