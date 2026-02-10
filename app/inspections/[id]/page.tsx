"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Loader2,
    ClipboardCheck,
    Info,
    BarChart3,
    Bell,
    Settings,
    Home,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL, fetchWithAuth } from "@/app/lib/auth";

const DetailCard = ({ label, value, icon, status }: any) => {
    const statusColors: any = {
        success: "bg-emerald-50 border-emerald-200",
        error: "bg-red-50 border-red-200",
        warning: "bg-amber-50 border-amber-200",
        neutral: "bg-gray-50 border-gray-200",
    };

    const textColors: any = {
        success: "text-emerald-700",
        error: "text-red-700",
        warning: "text-amber-700",
        neutral: "text-gray-700",
    };

    return (
        <div className={`p-5 rounded-xl border ${statusColors[status] || statusColors.neutral} bg-white shadow-sm`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${statusColors[status]?.split(" ")[0]}`}>
                    {icon}
                </div>
                <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className={`text-lg font-semibold ${textColors[status] || textColors.neutral}`}>
                {value}
            </p>
        </div>
    );
};

/* ===================== HEADER COMPONENT ===================== */
const DetailHeader = ({ inspectionId }: { inspectionId: any }) => {
    const router = useRouter();
    return (
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
            <div className="p-6">
                <div className="flex items-center justify-between">
                    {/* Left Section */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-md">
                                    <BarChart3 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Inspection Details
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Review and verify inspection results
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200/50 rounded-lg">
                            <span className="text-xs text-gray-500 font-medium">ID:</span>
                            <span className="font-semibold text-gray-900">
                                {inspectionId}
                            </span>
                        </div>
                        <button className="p-2.5 rounded-lg bg-gray-50 border border-gray-200/50 hover:bg-gray-100 transition-all text-gray-600">
                            <Bell className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 rounded-lg bg-gray-50 border border-gray-200/50 hover:bg-gray-100 transition-all text-gray-600">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function InspectionDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [inspection, setInspection] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [showFalseForm, setShowFalseForm] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [userDescription, setUserDescription] = useState("");
    const [correctLabel, setCorrectLabel] = useState("");

    const [showVerifyPopup, setShowVerifyPopup] = useState(false);

    // FETCH INSPECTION
    const fetchInspection = async () => {
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/inspection/${id}/`,
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(
                    errorData?.message || "Failed to fetch inspection",
                );
            }

            const data = await res.json();
            setInspection(data.inspection);
        } catch (error: any) {
            toast.error(
                error.message || "Session expired. Please login again.",
            );
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchInspection();
    }, [id]);

    // VERIFY FUNCTION
    const handleVerify = async (falseDetectedValue = false) => {
        try {
            setVerifyLoading(true);

            const payload = {
                is_approved: true,
                false_detected: falseDetectedValue,
                user_description: falseDetectedValue ? userDescription : "",
                correct_label: falseDetectedValue ? correctLabel : "",
            };

            const res = await fetchWithAuth(
                `${API_BASE_URL}/inspection/${id}/verify/`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

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

    const inspectedDate = new Date(inspection.inspected_at);
    const isAlreadyVerified = inspection.is_human_verified;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30">
            {/* Header */}
            <DetailHeader inspectionId={inspection.id} />

            <div className="p-6 space-y-6">
                {/* VERIFIED ALERT */}
                {isAlreadyVerified && (
                    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-teal-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-teal-900 font-semibold">
                                    ✓ Verified Inspection
                                </p>
                                <p className="text-teal-700 text-sm mt-1">
                                    This inspection has already been human verified and processed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        {/* IMAGE SECTION */}
                        <div className="bg-white rounded-2xl border border-gray-200/50 overflow-hidden shadow-lg">
                            <div className="relative h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                <img
                                    src={inspection.image}
                                    alt="Inspection image"
                                    className="w-full h-full object-contain p-4"
                                />

                                {/* Status Badge */}
                                <div
                                    className={`absolute top-6 right-6 px-4 py-2.5 rounded-full font-bold shadow-lg text-white ${
                                        inspection.is_defect
                                            ? "bg-gradient-to-r from-red-600 to-red-500"
                                            : "bg-gradient-to-r from-emerald-600 to-emerald-500"
                                    }`}
                                >
                                    {inspection.is_defect
                                        ? "⚠ DEFECT"
                                        : "✓ NO DEFECT"}
                                </div>
                            </div>

                            {/* Date Info */}
                            <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            Inspected Date
                                        </p>
                                        <p className="font-bold text-gray-900 text-lg mt-2">
                                            {inspectedDate.toLocaleDateString(
                                                "en-US",
                                                {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                },
                                            )}
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            at{" "}
                                            {inspectedDate.toLocaleTimeString(
                                                "en-US",
                                                {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                },
                                            )}
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 px-5 py-3 rounded-xl shadow-sm">
                                        <span className="text-teal-600 text-xs font-bold uppercase">
                                            Rim ID
                                        </span>
                                        <p className="text-teal-900 font-bold text-lg mt-1">
                                            #{inspection.rim_id}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* QUALITY CONTROL */}
                        <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Quality Control
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <DetailCard
                                    label="AI Detection"
                                    value={
                                        inspection.is_defect
                                            ? "Defect"
                                            : "No Defect"
                                    }
                                    icon={<TrendingUp size={16} />}
                                    status={
                                        inspection.is_defect
                                            ? "error"
                                            : "success"
                                    }
                                />
                                <DetailCard
                                    label="False Detection"
                                    value={
                                        inspection.false_detected ? "Yes" : "No"
                                    }
                                    icon={<AlertCircle size={16} />}
                                    status={
                                        inspection.false_detected
                                            ? "warning"
                                            : "neutral"
                                    }
                                />
                                <DetailCard
                                    label="Human Verified"
                                    value={
                                        inspection.is_human_verified
                                            ? "Yes"
                                            : "No"
                                    }
                                    icon={<CheckCircle size={16} />}
                                    status={
                                        inspection.is_human_verified
                                            ? "success"
                                            : "neutral"
                                    }
                                />
                                <DetailCard
                                    label="Approved"
                                    value={
                                        inspection.is_approved ? "Yes" : "No"
                                    }
                                    icon={<CheckCircle size={16} />}
                                    status={
                                        inspection.is_approved
                                            ? "success"
                                            : "neutral"
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                        {/* FALSE DETECTION DETAILS */}
                        {inspection.false_detected && (
                            <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-amber-50 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        False Detection Details
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {inspection.correct_label && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">
                                                Correct Label
                                            </p>
                                            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                                                <p className="text-amber-900 font-semibold">
                                                    {inspection.correct_label}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {inspection.user_description && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">
                                                Description
                                            </p>
                                            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                                                <p className="text-amber-900">
                                                    {
                                                        inspection.user_description
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ADDITIONAL INFO */}
                        {inspection.description && (
                            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-6">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="p-3 bg-gray-100 rounded-lg">
                                        <ClipboardCheck className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Description
                                    </h3>
                                </div>
                                <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl">
                                    <p className="text-gray-700 leading-relaxed">
                                        {inspection.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* VERIFICATION ACTIONS */}
                        {!isAlreadyVerified && (
                            <div className="bg-white border border-gray-200/50 rounded-2xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-emerald-50 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Verification Actions
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowVerifyPopup(true)}
                                        disabled={verifyLoading}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {verifyLoading ? (
                                            <>
                                                <Loader2
                                                    className="animate-spin"
                                                    size={20}
                                                />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={20} />
                                                Verify Inspection
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() =>
                                            setShowFalseForm(!showFalseForm)
                                        }
                                        disabled={verifyLoading}
                                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle size={20} />
                                        {showFalseForm
                                            ? "Cancel"
                                            : "Mark as False Detection"}
                                    </button>

                                    {showFalseForm && (
                                        <div className="space-y-4 border border-amber-200 p-5 rounded-xl bg-amber-50/50">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle
                                                    className="text-amber-600"
                                                    size={18}
                                                />
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
                                                        onChange={(e) =>
                                                            setCorrectLabel(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full border border-amber-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                                        Description
                                                    </label>
                                                    <textarea
                                                        placeholder="Explain why this is a false detection..."
                                                        value={userDescription}
                                                        onChange={(e) =>
                                                            setUserDescription(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full border border-amber-300 px-4 py-3 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        if (
                                                            !correctLabel.trim() ||
                                                            !userDescription.trim()
                                                        ) {
                                                            toast.error(
                                                                "Please fill in all fields",
                                                            );
                                                            return;
                                                        }
                                                        handleVerify(true);
                                                    }}
                                                    disabled={verifyLoading}
                                                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow disabled:shadow-none flex items-center justify-center gap-2"
                                                >
                                                    {verifyLoading ? (
                                                        <>
                                                            <Loader2
                                                                className="animate-spin"
                                                                size={20}
                                                            />
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertCircle size={20} />
                                                            Submit False Detection
                                                        </>
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

            {/* VERIFY MODAL */}
            {showVerifyPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-teal-50 rounded-lg">
                                <CheckCircle
                                    className="w-6 h-6 text-teal-600"
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">
                                Confirm Verification
                            </h3>
                        </div>

                        <p className="text-gray-600 leading-relaxed">
                            Are you sure you want to verify this inspection?
                            This action confirms that the AI detection is correct and will mark the inspection as human verified.
                        </p>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowVerifyPopup(false)}
                                disabled={verifyLoading}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={async () => {
                                    const success = await handleVerify(false);
                                    if (success) {
                                        setShowVerifyPopup(false);
                                    }
                                }}
                                disabled={verifyLoading}
                                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-lg font-bold transition-all duration-200 shadow-sm hover:shadow disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none flex items-center gap-2"
                            >
                                {verifyLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        Confirm & Verify
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}