"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Loader2,
    ClipboardCheck,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL, fetchWithAuth } from "@/app/lib/auth";
import RobotDashboardHeader from "@/app/Includes/header";
import { RobotData } from "@/app/types/robot";

/* ================================================================
   TYPES
   ================================================================ */

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
   DETAIL BADGE — compact inline badge replacing the old tall card
   ================================================================ */
interface DetailBadgeProps {
    label: string;
    value: string;
    status: "success" | "error" | "warning" | "neutral";
}

const DetailBadge = ({ label, value, status }: DetailBadgeProps) => {
    const colors = {
        success: "bg-emerald-50 border-emerald-200 text-emerald-700",
        error:   "bg-red-50 border-red-200 text-red-700",
        warning: "bg-amber-50 border-amber-200 text-amber-700",
        neutral: "bg-gray-50 border-gray-200 text-gray-600",
    };
    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colors[status]}`}>
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <span className={`text-xs font-bold ${colors[status].split(" ")[2]}`}>{value}</span>
        </div>
    );
};

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function InspectionDetailPage() {
    const { id }       = useParams();
    const router       = useRouter();
    const searchParams = useSearchParams();

    const robotId    = searchParams.get("robot_id")    ?? "";
    const scheduleId = searchParams.get("schedule_id") ?? "";

    /* ── inspection state ── */
    const [inspection,      setInspection]      = useState<any>(null);
    const [loading,         setLoading]         = useState(true);
    const [showFalseForm,   setShowFalseForm]   = useState(false);
    const [verifyLoading,   setVerifyLoading]   = useState(false);
    const [userDescription, setUserDescription] = useState("");
    const [correctLabel,    setCorrectLabel]    = useState("");
    const [isApproved,      setIsApproved]      = useState(false);
    const [showVerifyPopup, setShowVerifyPopup] = useState(false);

    /* ── robot / header state ── */
    const [robotData,   setRobotData]   = useState<RobotData | null>(null);
    const [roboId,      setRoboId]      = useState<string>("");
    const [battery,     setBattery]     = useState<BatteryStatus>(DEFAULT_BATTERY);
    const [robotStatus, setRobotStatus] = useState<RobotStatus>(DEFAULT_ROBOT_STATUS);
    const [wsConnected, setWsConnected] = useState<boolean>(false);
    const [time,        setTime]        = useState<string>(new Date().toLocaleTimeString());

    const wsRef  = useRef<WebSocket | null>(null);
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
                ws = new WebSocket(`${WS_URL}/ws/robot_message/${roboId}/`);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log("✅ WS connected for robot:", roboId);
                    setWsConnected(true);
                };

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
                console.error("❌ WS init error:", err);
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

    /* ── Fetch inspection ── */
    const fetchInspection = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/inspection/${id}/`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData?.message || "Failed to fetch inspection");
            }
            const data = await res.json();
            setInspection(data.inspection);
            setIsApproved(data.inspection?.is_approved ?? false);
        } catch (error: any) {
            toast.error(error.message || "Session expired. Please login again.");
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchInspection();
    }, [id]);

    /* ── Verify ── */
    const handleVerify = async (falseDetectedValue = false) => {
        try {
            setVerifyLoading(true);

            const payload = {
                is_approved:      isApproved,
                false_detected:   falseDetectedValue,
                user_description: falseDetectedValue ? userDescription : "",
                correct_label:    falseDetectedValue ? correctLabel    : "",
            };

            const res = await fetchWithAuth(`${API_BASE_URL}/inspection/${id}/verify/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 400 && data?.message) {
                    toast.error(data.message);
                } else if (res.status === 401) {
                    toast.error("Session expired. Please login again.");
                    router.push("/login");
                } else if (res.status === 404) {
                    toast.error("Inspection not found");
                } else {
                    toast.error(data?.message || "Verification failed");
                }
                return false;
            }

            toast.success(data?.message || "Inspection verified successfully");
            await fetchInspection();
            setShowFalseForm(false);
            setUserDescription("");
            setCorrectLabel("");
            return true;
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
            return false;
        } finally {
            setVerifyLoading(false);
        }
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
                    <p className="text-gray-600 font-medium">Loading inspection...</p>
                </div>
            </div>
        );
    }

    /* ── Not found ── */
    if (!inspection) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto" />
                    <p className="text-gray-600 font-medium">Inspection not found</p>
                    <Link
                        href="/inspections"
                        className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                    >
                        Go Back
                    </Link>
                </div>
            </div>
        );
    }

    const inspectedDate     = new Date(inspection.inspected_at);
    const isAlreadyVerified = inspection.is_human_verified;
    const isFalseDetected   = inspection.false_detected;

    /* ================================================================
       RENDER — single-screen, no outer scroll
       ================================================================ */

    /* Shared panel style — every column card uses this */
    const panel = "bg-white rounded-2xl border border-gray-200/50 shadow-sm";
    /* Shared section header */
    const SectionHeader = ({
        icon,
        iconBg,
        title,
    }: {
        icon: React.ReactNode;
        iconBg: string;
        title: string;
    }) => (
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
            <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
            <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        </div>
    );

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

            {/* ── Header ── */}
            <RobotDashboardHeader
                title="Robotic Inspection Dashboard"
                subtitle={`Robot: ${robotData?.name ?? "N/A"}`}
                robotData={robotData}
                battery={battery}
                robotStatus={robotStatus}
                wsConnected={wsConnected}
                time={time}
            />

            {/* ── Sub-header ── */}
            <div className="px-5 py-2 flex items-center gap-3 shrink-0">
                <button
                    onClick={() => router.push(`/inspections?schedule_id=${scheduleId}&robot_id=${robotId}`)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Inspections
                </button>

                {isAlreadyVerified && (
                    <span className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified Inspection
                    </span>
                )}
            </div>

            {/* ── 1 large left + 2 stacked right layout ── */}
            <div className="flex-1 min-h-0 flex gap-4 p-4">

                {/* ══ LEFT: Image (takes up half the width) ══ */}
                <div className={`${panel} flex flex-col overflow-hidden w-1/2 shrink-0`}>
                    <SectionHeader
                        icon={<TrendingUp className="w-3.5 h-3.5 text-blue-600" />}
                        iconBg="bg-blue-50"
                        title="Inspection Image"
                    />
                    <div className="flex-1 min-h-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                            src={inspection.image}
                            alt="Inspection image"
                            className="w-full h-full object-contain p-4"
                        />
                    </div>
                    <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Inspected</p>
                            <p className="font-semibold text-gray-800 text-sm leading-tight mt-0.5">
                                {inspectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5">
                                {inspectedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        <div className="bg-teal-50 border border-teal-200 px-3 py-2 rounded-xl text-right shrink-0">
                            <p className="text-teal-500 text-[10px] font-bold uppercase tracking-widest">Rim ID</p>
                            <p className="text-teal-800 font-bold text-sm mt-0.5">#{inspection.rim_id}</p>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT: two stacked panels ══ */}
                <div className="flex-1 flex flex-col gap-4 min-h-0">

                    {/* ── TOP RIGHT: Verification Actions (30%) ── */}
                    <div className={`${panel} flex flex-col overflow-hidden min-h-0`} style={{ flex: "2 1 0" }}>
                        <SectionHeader
                            icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                            iconBg="bg-emerald-50"
                            title="Verification Actions"
                        />
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
                            {!isAlreadyVerified ? (
                                <>
                                    {/* Verify button */}
                                    <button
                                        onClick={() => setShowVerifyPopup(true)}
                                        disabled={verifyLoading}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                                    >
                                        {verifyLoading ? (
                                            <><Loader2 className="animate-spin" size={15} /> Processing...</>
                                        ) : (
                                            <><CheckCircle size={15} /> Verify Inspection</>
                                        )}
                                    </button>

                                    {/* False detection toggle */}
                                    <button
                                        onClick={() => setShowFalseForm(!showFalseForm)}
                                        disabled={verifyLoading}
                                        className={`w-full py-3 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow disabled:cursor-not-allowed flex items-center justify-center gap-2 relative shrink-0
                                            ${isFalseDetected
                                                ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600"
                                                : "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500"
                                            } disabled:from-gray-300 disabled:to-gray-300`}
                                    >
                                        <AlertCircle size={15} />
                                        {showFalseForm ? "Cancel" : "Mark as False Detection"}
                                        {isFalseDetected && !showFalseForm && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/30">
                                                <CheckCircle size={10} /> Marked
                                            </span>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
                                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-teal-900 font-bold text-sm">Inspection Verified</p>
                                        <p className="text-teal-600 text-xs mt-0.5">Human verified and processed successfully.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── BOTTOM RIGHT: Quality Control + Details (70%) ── */}
                    <div className={`${panel} flex flex-col overflow-hidden min-h-0`} style={{ flex: "7 1 0" }}>
                        <SectionHeader
                            icon={<TrendingUp className="w-3.5 h-3.5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            title="Quality Control"
                        />
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

                            {/* Status badges */}
                            <div className="grid grid-cols-2 gap-2">
                                <DetailBadge
                                    label="AI Detection"
                                    value={inspection.is_defect ? "Defect" : "No Defect"}
                                    status={inspection.is_defect ? "error" : "success"}
                                />
                                <DetailBadge
                                    label="False Detection"
                                    value={inspection.false_detected ? "Yes" : "No"}
                                    status={inspection.false_detected ? "warning" : "neutral"}
                                />
                                <DetailBadge
                                    label="Human Verified"
                                    value={inspection.is_human_verified ? "Yes" : "No"}
                                    status={inspection.is_human_verified ? "success" : "neutral"}
                                />
                                <DetailBadge
                                    label="Approved"
                                    value={inspection.is_approved ? "Yes" : "No"}
                                    status={inspection.is_approved ? "success" : "neutral"}
                                />
                            </div>

                            {/* False Detection Details */}
                            {inspection.false_detected && (
                                <div className="rounded-xl border border-amber-200 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span className="text-xs font-bold text-amber-800">False Detection Details</span>
                                    </div>
                                    <div className="p-3 space-y-2 bg-white">
                                        {inspection.correct_label && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Correct Label</p>
                                                <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                                    {inspection.correct_label}
                                                </p>
                                            </div>
                                        )}
                                        {inspection.user_description && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                                                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                                    {inspection.user_description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* False detection form (shown when toggled) */}
                            {showFalseForm && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden flex flex-col">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <p className="text-xs font-bold text-amber-800">False Detection Form</p>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Correct Label</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., No Defect, Scratch, Dent..."
                                                value={correctLabel}
                                                onChange={(e) => setCorrectLabel(e.target.value)}
                                                className="w-full border border-amber-300 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                                            <textarea
                                                placeholder="Explain why this is a false detection..."
                                                value={userDescription}
                                                onChange={(e) => setUserDescription(e.target.value)}
                                                className="w-full border border-amber-300 bg-white px-3 py-2 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                                            />
                                        </div>
                                        {/* is_approved checkbox */}
                                        <div
                                            onClick={() => setIsApproved((prev) => !prev)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all
                                                ${isApproved ? "bg-emerald-50 border-emerald-300" : "bg-white border-gray-200 hover:border-emerald-200"}`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all
                                                ${isApproved ? "bg-emerald-500 border-emerald-500" : "border-gray-300 bg-white"}`}
                                            >
                                                {isApproved && (
                                                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-semibold ${isApproved ? "text-emerald-700" : "text-gray-700"}`}>Mark as Approved</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Approve this inspection in the report</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!correctLabel.trim() || !userDescription.trim()) {
                                                    toast.error("Please fill in all fields");
                                                    return;
                                                }
                                                handleVerify(true);
                                            }}
                                            disabled={verifyLoading}
                                            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {verifyLoading ? (
                                                <><Loader2 className="animate-spin" size={15} /> Submitting...</>
                                            ) : (
                                                <><AlertCircle size={15} /> Submit False Detection</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {inspection.description && (
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                                        <ClipboardCheck className="w-3.5 h-3.5 text-gray-500" />
                                        <span className="text-xs font-bold text-gray-600">Description</span>
                                    </div>
                                    <div className="p-3 bg-white">
                                        <p className="text-sm text-gray-600 leading-relaxed">{inspection.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>{/* end right stack */}
            </div>

            {/* ── Confirm Verify Modal ── */}
            {showVerifyPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-teal-50 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Confirm Verification</h3>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Are you sure you want to verify this inspection? This action confirms
                            that the AI detection is correct and will mark the inspection as human verified.
                        </p>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowVerifyPopup(false)}
                                disabled={verifyLoading}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const success = await handleVerify(false);
                                    if (success) setShowVerifyPopup(false);
                                }}
                                disabled={verifyLoading}
                                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none flex items-center gap-2"
                            >
                                {verifyLoading ? (
                                    <><Loader2 className="animate-spin" size={18} /> Verifying...</>
                                ) : (
                                    <><CheckCircle size={18} /> Confirm & Verify</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}