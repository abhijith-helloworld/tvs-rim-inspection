import { AlertCircle, CalendarDays, CheckCircle, Clock, Zap, XCircle } from 'lucide-react';
import React from 'react'



/* ===================== SCHEDULE CARD COMPONENT ===================== */
interface ScheduleCardProps {
    schedule: Schedule;
    onClick: (id: number) => void;
}

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

export function ScheduleCard({ schedule, onClick }: ScheduleCardProps) {
    const getStatusConfig = (
        status: Schedule["status"],
        isCanceled: boolean,
    ) => {
        if (isCanceled) {
            return {
                icon: <XCircle className="w-4 h-4" />,
                bgClass: "bg-red-50/50",
                badgeClass: "bg-red-100/80 text-red-700 border border-red-200/50",
            };
        }

        switch (status) {
            case "completed":
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    bgClass: "bg-emerald-50/50",
                    badgeClass: "bg-emerald-100/80 text-emerald-700 border border-emerald-200/50",
                };
            case "processing":
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    bgClass: "bg-blue-50/50",
                    badgeClass: "bg-blue-100/80 text-blue-700 border border-blue-200/50",
                };
            case "pending":
            case "scheduled":
            default:
                return {
                    icon: <Clock className="w-4 h-4" />,
                    bgClass: "bg-amber-50/50",
                    badgeClass: "bg-amber-100/80 text-amber-700 border border-amber-200/50",
                };
        }
    };

    const formatDateTime = (dateStr: string, timeStr: string) => {
        try {
            const date = new Date(`${dateStr}T${timeStr}`);
            return date.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return `${dateStr} ${timeStr}`;
        }
    };

    const status = getStatusConfig(schedule.status, schedule.is_canceled);

    return (
        <div
            className="group rounded-2xl border border-gray-200/50 bg-gradient-to-br from-white to-gray-50/30 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-0.5 backdrop-blur-sm"
            onClick={() => onClick(schedule.id)}
        >
            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2.5 border border-gray-200/50 shadow-sm rounded-xl ${status.bgClass} border ${status.badgeClass.split(' ')[0]}/50`}>
                            {status.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 truncate max-w-[180px]">
                                {schedule.location}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Robot #{schedule.robot}
                            </p>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${status.badgeClass} backdrop-blur-sm`}>
                        {schedule.is_canceled ? "Canceled" : schedule.status}
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-white/80 border border-gray-200/50 shadow-sm">
                            <CalendarDays className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Scheduled Time</p>
                            <p className="font-medium text-sm text-gray-900">
                                {formatDateTime(schedule.scheduled_date, schedule.scheduled_time)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100/50 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        Duration: {schedule.scheduled_time} - {schedule.end_time.split('.')[0]}
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(schedule.id);
                        }}
                        className="px-3 py-2 rounded-lg bg-teal-50 border border-teal-200/50 hover:bg-teal-100 hover:border-teal-300 hover:shadow-sm transition-all group-hover:border-teal-300 flex items-center gap-1.5 text-xs font-medium text-teal-700"
                        title="Start Inspection"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Start
                    </button>
                </div>
            </div>
        </div>
    );
}