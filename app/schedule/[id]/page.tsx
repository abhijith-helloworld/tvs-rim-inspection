"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, ChevronRight, Loader2, XCircle,
    ChevronLeft, Search, BarChart3, AlertCircle,
    ChevronDown, Check, X,
} from "lucide-react";
import { ScheduleCard } from "./_components/schedule-card";
import type { Schedule, Pagination } from "../page";

/* ===================== TYPES ===================== */
interface RobotData {
    id: number | string;
    robo_id: string;
    name: string;
    robot_type?: string;
    model_number?: string | null;
    local_ip?: string | null;
    status: string;
    inspection_status?: string;
    schedule_summary?: { total: number; scheduled: number; processing: number; completed: number };
    inspection_summary?: { total: number; defected: number; non_defected: number };
    [key: string]: unknown;
}

interface FilterData {
    filter_type: "day" | "week" | "month" | "range";
    date?: string;
    start_date?: string;
    end_date?: string;
}

export interface ScheduleListPageProps {
    robotId: string | number;
    robotData: RobotData | null;
    filterData?: FilterData;
    // Data owned by parent
    schedules: Schedule[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
    statusFilter: string[];
    currentPage: number;
    // Callbacks
    onStatusFilterChange: (val: string[]) => void;
    onPageChange: (page: number) => void;
    onRefresh: () => void;
}

/* ===================== STATUS CONFIG ===================== */
const STATUS_OPTIONS = [
    { value: "scheduled",  label: "Scheduled"  },
    { value: "processing", label: "Processing" },
    { value: "completed",  label: "Completed"  },
];

/* ===================== STATUS DROPDOWN ===================== */
interface StatusDropdownProps {
    value: string[];
    onChange: (val: string[]) => void;
}

function StatusDropdown({ value, onChange }: StatusDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggle = (val: string) =>
        onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);

    const clearAll = () => onChange([]);

    return (
        <div ref={ref} className="relative min-w-[200px]">
            {/* Trigger */}
            <button
                onClick={() => setOpen((p) => !p)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200/50 bg-white/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
            >
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                    {value.length === 0 ? (
                        <span className="text-gray-400">All Status</span>
                    ) : (
                        value.map((v) => {
                            const opt = STATUS_OPTIONS.find((o) => o.value === v);
                            return (
                                <span
                                    key={v}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-700"
                                >
                                    {opt?.label}
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { e.stopPropagation(); toggle(v); }}
                                        onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), toggle(v))}
                                        className="ml-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </span>
                            );
                        })
                    )}
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center p-2 justify-between border-gray-100 bg-gray-50">
                        {value.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Options */}
                    <ul className="py-1">
                        {STATUS_OPTIONS.map((opt) => {
                            const isSelected = value.includes(opt.value);
                            return (
                                <li key={opt.value}>
                                    <button
                                        onClick={() => toggle(opt.value)}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors ${
                                            isSelected
                                                ? "bg-teal-50 text-gray-900"
                                                : "hover:bg-gray-50 text-gray-600"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="font-medium">{opt.label}</span>
                                        </div>
                                        <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-teal-600 border-teal-600"
                                                    : "border-gray-300 bg-white"
                                            }`}
                                        >
                                            {isSelected && (
                                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={() => setOpen(false)}
                            className="w-full py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===================== MAIN COMPONENT ===================== */
function ScheduleListPage({
    robotId: robotIdProp,
    robotData,
    filterData,
    schedules,
    pagination,
    loading,
    error,
    statusFilter,
    currentPage,
    onStatusFilterChange,
    onPageChange,
    onRefresh,
}: ScheduleListPageProps) {
    const router     = useRouter();
    const robotDbId  = robotIdProp ? String(robotIdProp).trim() : null;

    // Local search — client-side only, no API call needed
    const [searchQuery, setSearchQuery] = useState("");

    /* ── Filter label for header badge ── */
    const getFilterLabel = () => {
        if (!filterData) return null;
        switch (filterData.filter_type) {
            case "day":   return `Day: ${filterData.date}`;
            case "week":  return `Week of ${filterData.date}`;
            case "month": return `Month of ${filterData.date}`;
            case "range": return `${filterData.start_date} – ${filterData.end_date}`;
        }
    };

    const handleScheduleClick = (scheduleId: number) => {
        router.push(`/inspections?schedule_id=${scheduleId}&robot_id=${robotDbId}`);
    };

    // Client-side location search only; status filtering is server-side via parent
    const filteredSchedules = searchQuery
        ? schedules.filter((s) =>
              s.location.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : schedules;

    /* ── Invalid ID guard ── */
    if (!robotDbId || isNaN(Number(robotDbId))) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="rounded-2xl bg-white p-8 text-center shadow-xl max-w-md border border-red-200">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Invalid Robot ID</h3>
                    <p className="text-gray-600 mb-4">
                        Robot ID is missing or invalid:{" "}
                        <code className="bg-red-50 px-2 py-1 rounded">{String(robotIdProp)}</code>
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

    /* ── Loading ── */
    if (loading && schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
                <p className="mt-6 text-gray-600 font-medium">Loading schedules...</p>
                {robotData && (
                    <p className="mt-2 text-sm text-gray-500">
                        Robot: {robotData.name} ({robotData.robo_id})
                    </p>
                )}
            </div>
        );
    }

    /* ── Error ── */
    if (error && schedules.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="rounded-2xl bg-white p-8 text-center shadow-xl max-w-md">
                    <XCircle className="w-16 h-16 mx-auto mb-4 text-rose-600" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Failed to Load</h3>
                    <p className="mb-2 text-gray-600">{error}</p>
                    <p className="text-sm text-gray-500 mb-4">Robot ID: {robotDbId}</p>
                    <button
                        onClick={onRefresh}
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

            {/* ── Header ── */}
            <div className="mb-4">
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
                                {robotData
                                    ? <>{robotData.name} Schedules</>
                                    : <>Robot ID: {robotDbId}</>
                                }
                            </p>
                        </div>
                    </div>
                    {filterData && (
                        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700">
                            <span className="text-emerald-500 mr-1">Filter:</span>
                            {getFilterLabel()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Search & Status Filter ── */}
            <div className="mb-4 flex">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Location search (client-side) */}
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

                    {/* Status filter — controlled by parent, triggers re-fetch */}
                    <StatusDropdown value={statusFilter} onChange={onStatusFilterChange} />
                </div>
            </div>

            {/* ── Grid or empty state ── */}
            {filteredSchedules.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-300/50 p-16 text-center bg-white/50">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-2xl font-semibold mb-3 text-gray-900">No Schedules Found</h3>
                    <p className="text-gray-600">
                        {searchQuery || statusFilter.length > 0
                            ? "No schedules match your criteria."
                            : "No schedules available for this robot."}
                    </p>
                </div>
            ) : (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredSchedules.map((schedule) => (
                            <div key={schedule.id}>
                                <ScheduleCard
                                    schedule={schedule}
                                    onClick={handleScheduleClick}
                                    onUpdate={onRefresh}
                                />
                            </div>
                        ))}
                    </div>

                    {/* ── Pagination ── */}
                    <div className="flex items-center justify-between pt-6">
                        <div className="text-sm text-gray-600">
                            Showing{" "}
                            <span className="font-semibold">
                                {(pagination.current_page - 1) * pagination.page_size + 1}
                            </span>
                            {" "}to{" "}
                            <span className="font-semibold">
                                {Math.min(
                                    pagination.current_page * pagination.page_size,
                                    pagination.total_records,
                                )}
                            </span>
                            {" "}of{" "}
                            <span className="font-semibold">{pagination.total_records}</span>{" "}
                            schedules
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onPageChange(pagination.current_page - 1)}
                                disabled={!pagination.has_previous}
                                className={`p-2 rounded-lg border transition-all ${
                                    pagination.has_previous
                                        ? "bg-white hover:bg-gray-50 text-gray-700"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
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
                                onClick={() => onPageChange(pagination.current_page + 1)}
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