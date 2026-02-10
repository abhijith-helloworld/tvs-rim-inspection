"use client";

import React, { useEffect, useState } from "react";
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
    Settings,
    Filter,
    FileText,
    TrendingUp,
    Search,
    Timer,
    BarChart3,
    Bell,
    ArrowLeft,
    Cpu,
} from "lucide-react";

import { fetchWithAuth, API_BASE_URL } from "../lib/auth";

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

/* ===================== HEADER COMPONENT ===================== */
const InspectionHeader = ({ scheduleId }: { scheduleId: string | null }) => {
    const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <header className="mb-6 bg-gray-100 px-3 py-3 rounded-2xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
                        <Cpu className="text-slate-700" size={28} />
                        <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            Robotic Inspection Dashboard
                        </span>
                    </h1>
                    <p className="text-slate-500 text-[17px] mt-1 ml-10 font-light">
                        Real time Inspection
                    </p>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <div className="text-sm font-semibold text-slate-800">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <div className="text-xs font-medium text-slate-600 bg-slate-50/80 px-2 py-0.5 rounded border border-slate-200/50">
                            {time}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
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

/* ===================== STAT CARD COMPONENT ===================== */
const StatCard = ({
    label,
    value,
    icon,
    bgColor,
    textColor,
    badgeColor,
    bgcolor
}: any) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${bgColor} shadow-md`}>
                {React.cloneElement(icon, {
                    className: `w-5 h-5 ${textColor}`,
                })}
            </div>
            <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}
            >
                {label}
            </span>
        </div>
        <div className="flex flex-col">
            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                {value}
            </p>
            <p className="text-sm text-gray-600 font-medium">
                {label === "Inspections" && "Completed this batch"}
                {label === "Passed" && "Quality-approved rims"}
                {label === "Defective" && "Rims requiring attention"}
            </p>
        </div>
    </div>
);

/* ===================== MAIN COMPONENT ===================== */
export default function InspectionsBySchedule() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const scheduleId = searchParams.get("schedule_id");
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [defected, setDefected] = useState(0);
    const [passed, setPassed] = useState(0);
    const [loading, setLoading] = useState(false);

    const pageSize = 10;
    const totalPages = Math.ceil(count / pageSize);

    /* ===================== FETCH ===================== */
    useEffect(() => {
        if (!scheduleId) return;
        fetchInspections(page);
    }, [scheduleId, page]);

    const fetchInspections = async (pageNo: number) => {
        try {
            setLoading(true);
            const res = await fetchWithAuth(
                `${API_BASE_URL}/schedule/${scheduleId}/inspections/?page=${pageNo}`,
            );

            const data = await res.json();

            setInspections(data?.results?.inspections ?? []);
            setCount(data?.count ?? 0);
            setDefected(data?.total_defected ?? 0);
            setPassed(data?.total_non_defected ?? 0);
        } catch (err) {
            console.error("Inspection fetch failed", err);
            setInspections([]);
        } finally {
            setLoading(false);
        }
    };

    const defectRate = count > 0 ? ((defected / count) * 100).toFixed(1) : 0;
    const verifiedCount = inspections.filter((i) => i.is_human_verified).length;

    /* ===================== UI ===================== */
    return (
        <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50/30 p-6">
            {/* Header */}
            <InspectionHeader scheduleId={scheduleId} />

            <div className="">
                {/* Stats Cards Grid */}
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

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Inspections List - Left Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                                        <p className="text-gray-600 font-medium">
                                            Loading inspections...
                                        </p>
                                    </div>
                                ) : inspections.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            No Inspections Found
                                        </h3>
                                        <p className="text-gray-500 text-center">
                                            There are no inspection records for
                                            this schedule yet.
                                        </p>
                                    </div>
                                ) : (
                                    inspections.map((item) => {
                                        const date = new Date(
                                            item.inspected_at,
                                        );
                                        const isDefect = item.is_defect;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/inspections/${item.id}`,
                                                    )
                                                }
                                                className="group p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Image Container */}
                                                    <div className="relative flex-shrink-0">
                                                        <img
                                                            src={item.image}
                                                            alt="Rim inspection"
                                                            className="w-20 h-20 rounded-xl object-cover border border-gray-200 group-hover:border-gray-300 transition-colors"
                                                        />
                                                        <div
                                                            className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center ${
                                                                isDefect
                                                                    ? "bg-red-500"
                                                                    : "bg-emerald-500"
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
                                                                    Rim #
                                                                    {
                                                                        item.rim_id
                                                                    }
                                                                </h3>
                                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                                    <div className="flex items-center text-sm text-gray-500">
                                                                        <Calendar className="w-4 h-4 mr-1" />
                                                                        {date.toLocaleDateString(
                                                                            "en-US",
                                                                            {
                                                                                month: "short",
                                                                                day: "numeric",
                                                                            },
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center text-sm text-gray-500">
                                                                        <Clock className="w-4 h-4 mr-1" />
                                                                        {date.toLocaleTimeString(
                                                                            "en-US",
                                                                            {
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
                                                                            },
                                                                        )}
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
                                                                    False
                                                                    Detection
                                                                </span>
                                                            )}
                                                            {item.is_approved && (
                                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                                                                    Approved
                                                                </span>
                                                            )}
                                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                                                Schedule #
                                                                {item.schedule}
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
                                    onPageChange={setPage}
                                    recordsInfo={`Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, count)} of ${count} inspections`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-teal-50 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-teal-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Summary
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                                    <span className="text-sm text-gray-600 font-medium">
                                        Total Inspections
                                    </span>
                                    <span className="font-bold text-gray-900">
                                        {count}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-100">
                                    <span className="text-sm text-red-600 font-medium">
                                        Defect Rate
                                    </span>
                                    <span className="font-bold text-red-600">
                                        {defectRate}%
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50/50 border border-teal-100">
                                    <span className="text-sm text-teal-600 font-medium">
                                        Verified Count
                                    </span>
                                    <span className="font-bold text-teal-600">
                                        {verifiedCount}/{count}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                                    <span className="text-sm text-emerald-600 font-medium">
                                        Pass Rate
                                    </span>
                                    <span className="font-bold text-emerald-600">
                                        {count > 0
                                            ? ((passed / count) * 100).toFixed(
                                                  1,
                                              )
                                            : 0}
                                        %
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-6">
                            <h3 className="text-sm font-bold text-teal-900 mb-3">
                                Inspection Info
                            </h3>
                            <ul className="space-y-2 text-sm text-teal-800">
                                <li className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                                    Click on any inspection to view details
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                                    Verify and approve inspections
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                                    Mark false detections
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
