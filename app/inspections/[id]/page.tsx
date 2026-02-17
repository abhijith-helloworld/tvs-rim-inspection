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

/* ================================================================
   TYPES
   ================================================================ */

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

/* ================================================================
   DETAIL CARD
   ================================================================ */
interface DetailCardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
    status: "success" | "error" | "warning" | "neutral";
}

const DetailCard = ({ label, value, icon, status }: DetailCardProps) => {
    const statusColors = {
        success: "bg-emerald-50 border-emerald-200",
        error:   "bg-red-50 border-red-200",
        warning: "bg-amber-50 border-amber-200",
        neutral: "bg-gray-50 border-gray-200",
    };
    const textColors = {
        success: "text-emerald-700",
        error:   "text-red-700",
        warning: "text-amber-700",
        neutral: "text-gray-700",
    };

    return (
        <div className={`p-5 rounded-xl border ${statusColors[status]} bg-white shadow-sm`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${statusColors[status].split(" ")[0]}`}>
                    {icon}
                </div>
                <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className={`text-lg font-semibold ${textColors[status]}`}>{value}</p>
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

    // ✅ Both params are forwarded from InspectionsBySchedule
    const robotId    = searchParams.get("robot_id")    ?? "";
    const scheduleId = searchParams.get("schedule_id") ?? "";

    /* ── inspection state ── */
    const [inspection,      setInspection]      = useState<any>(null);
    const [loading,         setLoading]         = useState(true);
    const [showFalseForm,   setShowFalseForm]   = useState(false);
    const [verifyLoading,   setVerifyLoading]   = useState(false);
    const [userDescription, setUserDescription] = useState("");
    const [correctLabel,    setCorrectLabel]    = useState("");
    const [showVerifyPopup, setShowVerifyPopup] = useState(false);

    /* ── robot / header state ── */
    const [robotData,   setRobotData]   = useState<RobotData | null>(null);
    const [roboId,      setRoboId]      = useState<string>("");
    const [battery,     setBattery]     = useState<BatteryStatus>(DEFAULT_BATTERY);
    const [robotStatus, setRobotStatus] = useState<RobotStatus>(DEFAULT_ROBOT_STATUS);
    const [wsConnected, setWsConnected] = useState<boolean>(false);
    const [time,        setTime]        = useState<string>(new Date().toLocaleTimeString());

    const wsRef = useRef<WebSocket | null>(null);

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
                    // ✅ roboId triggers the WS useEffect below
                    if (robot.robo_id) setRoboId(robot.robo_id as string);
                }
            } catch (err) {
                console.error("Failed to fetch robot data:", err);
            }
        };

        fetchRobotData();
    }, [robotId]);

    /* ── WebSocket for live battery + robot status ── */
    // ✅ Runs as soon as roboId is set (which happens after robot fetch succeeds)
    useEffect(() => {
        if (!roboId) return;

        let isManualClose = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;

        const connect = () => {
            try {
                ws = new WebSocket(`ws://192.168.0.216:8002/ws/robot_message/${roboId}/`);
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
                is_approved:      true,
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

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 p-6 via-white to-gray-50/30">
            <RobotDashboardHeader
                title="Robotic Inspection Dashboard"
                subtitle={`Robot: ${robotData?.name ?? "N/A"}`}
                robotData={robotData}
                battery={battery}
                robotStatus={robotStatus}
                wsConnected={wsConnected}
                time={time}
            />

            <div className=" space-y-6">

                {/* ✅ Back navigation — preserves robot_id and schedule_id in the URL
                    so InspectionsBySchedule can restore its state correctly */}
                <button
                    onClick={() =>
                        router.push(
                            `/inspections?schedule_id=${scheduleId}&robot_id=${robotId}`
                        )
                    }
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Inspections
                </button>

                {/* Already verified banner */}
                {isAlreadyVerified && (
                    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-teal-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-teal-900 font-semibold">✓ Verified Inspection</p>
                                <p className="text-teal-700 text-sm mt-1">
                                    This inspection has already been human verified and processed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ── LEFT COLUMN ── */}
                    <div className="space-y-6">
                        {/* Image section */}
                        <div className="bg-white rounded-2xl border border-gray-200/50 overflow-hidden shadow-lg">
                            <div className="relative h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                <img
                                    src={inspection.image}
                                    alt="Inspection image"
                                    className="w-full h-full object-contain p-4"
                                />
                                <div
                                    className={`absolute top-6 right-6 px-4 py-2.5 rounded-full font-bold shadow-lg text-white ${
                                        inspection.is_defect
                                            ? "bg-gradient-to-r from-red-600 to-red-500"
                                            : "bg-gradient-to-r from-emerald-600 to-emerald-500"
                                    }`}
                                >
                                    {inspection.is_defect ? "⚠ DEFECT" : "✓ NO DEFECT"}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            Inspected Date
                                        </p>
                                        <p className="font-bold text-gray-900 text-lg mt-2">
                                            {inspectedDate.toLocaleDateString("en-US", {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            at{" "}
                                            {inspectedDate.toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 px-5 py-3 rounded-xl shadow-sm">
                                        <span className="text-teal-600 text-xs font-bold uppercase">Rim ID</span>
                                        <p className="text-teal-900 font-bold text-lg mt-1">
                                            #{inspection.rim_id}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quality Control */}
                        <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Quality Control</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailCard
                                    label="AI Detection"
                                    value={inspection.is_defect ? "Defect" : "No Defect"}
                                    icon={<TrendingUp size={16} />}
                                    status={inspection.is_defect ? "error" : "success"}
                                />
                                <DetailCard
                                    label="False Detection"
                                    value={inspection.false_detected ? "Yes" : "No"}
                                    icon={<AlertCircle size={16} />}
                                    status={inspection.false_detected ? "warning" : "neutral"}
                                />
                                <DetailCard
                                    label="Human Verified"
                                    value={inspection.is_human_verified ? "Yes" : "No"}
                                    icon={<CheckCircle size={16} />}
                                    status={inspection.is_human_verified ? "success" : "neutral"}
                                />
                                <DetailCard
                                    label="Approved"
                                    value={inspection.is_approved ? "Yes" : "No"}
                                    icon={<CheckCircle size={16} />}
                                    status={inspection.is_approved ? "success" : "neutral"}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="space-y-6">
                        {/* False Detection Details */}
                        {inspection.false_detected && (
                            <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-amber-50 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">False Detection Details</h2>
                                </div>
                                <div className="space-y-4">
                                    {inspection.correct_label && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">Correct Label</p>
                                            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                                                <p className="text-amber-900 font-semibold">{inspection.correct_label}</p>
                                            </div>
                                        </div>
                                    )}
                                    {inspection.user_description && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">Description</p>
                                            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                                                <p className="text-amber-900">{inspection.user_description}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Additional description */}
                        {inspection.description && (
                            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-6">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="p-3 bg-gray-100 rounded-lg">
                                        <ClipboardCheck className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Description</h3>
                                </div>
                                <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl">
                                    <p className="text-gray-700 leading-relaxed">{inspection.description}</p>
                                </div>
                            </div>
                        )}

                        {/* Verification Actions */}
                        {!isAlreadyVerified && (
                            <div className="bg-white border border-gray-200/50 rounded-2xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-emerald-50 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Verification Actions</h2>
                                </div>

                                <div className="space-y-4">
                                    {/* Verify button */}
                                    <button
                                        onClick={() => setShowVerifyPopup(true)}
                                        disabled={verifyLoading}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {verifyLoading ? (
                                            <><Loader2 className="animate-spin" size={20} /> Processing...</>
                                        ) : (
                                            <><CheckCircle size={20} /> Verify Inspection</>
                                        )}
                                    </button>

                                    {/* False detection toggle */}
                                    <button
                                        onClick={() => setShowFalseForm(!showFalseForm)}
                                        disabled={verifyLoading}
                                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle size={20} />
                                        {showFalseForm ? "Cancel" : "Mark as False Detection"}
                                    </button>

                                    {/* False detection form */}
                                    {showFalseForm && (
                                        <div className="space-y-4 border border-amber-200 p-5 rounded-xl bg-amber-50/50">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="text-amber-600" size={18} />
                                                <p className="text-amber-900 font-medium">
                                                    Provide details about the false detection:
                                                </p>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                                        Correct Label
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., No Defect, Scratch, Dent..."
                                                        value={correctLabel}
                                                        onChange={(e) => setCorrectLabel(e.target.value)}
                                                        className="w-full border border-amber-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                                        Description
                                                    </label>
                                                    <textarea
                                                        placeholder="Explain why this is a false detection..."
                                                        value={userDescription}
                                                        onChange={(e) => setUserDescription(e.target.value)}
                                                        className="w-full border border-amber-300 px-4 py-3 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                    />
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
                                                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow disabled:shadow-none flex items-center justify-center gap-2"
                                                >
                                                    {verifyLoading ? (
                                                        <><Loader2 className="animate-spin" size={20} /> Submitting...</>
                                                    ) : (
                                                        <><AlertCircle size={20} /> Submit False Detection</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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