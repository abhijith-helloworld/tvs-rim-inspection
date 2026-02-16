import {
    AlertCircle,
    CalendarDays,
    CheckCircle,
    Clock,
    Zap,
    XCircle,
    Edit2,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { API_BASE_URL, fetchWithAuth } from "../../../lib/auth";

/* ===================== SCHEDULE CARD COMPONENT ===================== */
interface ScheduleCardProps {
    schedule: Schedule;
    onClick: (id: number) => void;
    onUpdate: () => void; // Callback to refresh schedules after edit/cancel
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

export function ScheduleCard({ schedule, onClick, onUpdate }: ScheduleCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const getStatusConfig = (
        status: Schedule["status"],
        isCanceled: boolean,
    ) => {
        if (isCanceled) {
            return {
                icon: <XCircle className="w-4 h-4" />,
                bgClass: "bg-red-50/50",
                badgeClass:
                    "bg-red-100/80 text-red-700 border border-red-200/50",
            };
        }

        switch (status) {
            case "completed":
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    bgClass: "bg-emerald-50/50",
                    badgeClass:
                        "bg-emerald-100/80 text-emerald-700 border border-emerald-200/50",
                };
            case "processing":
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    bgClass: "bg-blue-50/50",
                    badgeClass:
                        "bg-blue-100/80 text-blue-700 border border-blue-200/50",
                };
            case "pending":
            case "scheduled":
            default:
                return {
                    icon: <Clock className="w-4 h-4" />,
                    bgClass: "bg-amber-50/50",
                    badgeClass:
                        "bg-amber-100/80 text-amber-700 border border-amber-200/50",
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

    const handleEdit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowEditModal(true);
    };

    const handleCancel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!confirm("Are you sure you want to cancel this schedule?")) {
            return;
        }

        setIsCanceling(true);

        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/robots/${schedule.robot}/schedule/${schedule.id}/cancel/`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to cancel schedule");
            }

            const result = await response.json();
            
            if (result.success) {
                onUpdate(); // Refresh the schedule list
            } else {
                throw new Error(result.message || "Failed to cancel schedule");
            }
        } catch (error: any) {
            console.error("❌ Error canceling schedule:", error);
            alert(error.message || "Failed to cancel schedule");
        } finally {
            setIsCanceling(false);
        }
    };

    const status = getStatusConfig(schedule.status, schedule.is_canceled);

    // Disable edit/cancel for completed or already canceled schedules
    const canModify = !schedule.is_canceled && schedule.status !== "completed";

    return (
        <>
            <div
                className="group rounded-2xl border border-gray-200/50 bg-gradient-to-br from-white to-gray-50/30 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-0.5 backdrop-blur-sm"
                onClick={() => onClick(schedule.id)}
            >
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div
                                className={`p-2.5 border border-gray-200/50 shadow-sm rounded-xl ${status.bgClass} border ${status.badgeClass.split(" ")[0]}/50`}
                            >
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
                        <div
                            className={`px-3 py-1.5 rounded-full text-xs font-medium ${status.badgeClass} backdrop-blur-sm`}
                        >
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
                                <p className="text-xs text-gray-500">
                                    Scheduled Time
                                </p>
                                <p className="font-medium text-sm text-gray-900">
                                    {formatDateTime(
                                        schedule.scheduled_date,
                                        schedule.scheduled_time,
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-100/50 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500">
                            Duration: {schedule.scheduled_time} -{" "}
                            {schedule.end_time.split(".")[0]}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleEdit}
                                disabled={!canModify || isEditing}
                                className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-all ${
                                    canModify
                                        ? "bg-teal-50 border-teal-200/50 hover:bg-teal-100 hover:border-teal-300 hover:shadow-sm group-hover:border-teal-300 text-teal-700"
                                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                                title={canModify ? "Edit Schedule" : "Cannot edit this schedule"}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            
                            <button
                                onClick={handleCancel}
                                disabled={!canModify || isCanceling}
                                className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-all ${
                                    canModify
                                        ? "bg-red-50 border-red-200/50 hover:bg-red-100 hover:border-red-300 hover:shadow-sm group-hover:border-red-300 text-red-700"
                                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                                title={canModify ? "Cancel Schedule" : "Cannot cancel this schedule"}
                            >
                                {isCanceling ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                                        Canceling...
                                    </>
                                ) : (
                                    <>
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <EditScheduleModal
                    schedule={schedule}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={onUpdate}
                />
            )}
        </>
    );
}

/* ===================== EDIT SCHEDULE MODAL ===================== */
interface EditScheduleModalProps {
    schedule: Schedule;
    onClose: () => void;
    onUpdate: () => void;
}

function EditScheduleModal({ schedule, onClose, onUpdate }: EditScheduleModalProps) {
    const [formData, setFormData] = useState({
        location: schedule.location,
        scheduled_date: schedule.scheduled_date,
        scheduled_time: schedule.scheduled_time.substring(0, 5), // HH:MM format
        end_time: schedule.end_time.substring(0, 5),
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/robots/${schedule.robot}/schedule/${schedule.id}/`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        location: formData.location,
                        scheduled_date: formData.scheduled_date,
                        scheduled_time: formData.scheduled_time,
                        end_time: formData.end_time,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update schedule");
            }

            const result = await response.json();
            
            if (result.success) {
                onUpdate(); // Refresh the schedule list
                onClose(); // Close modal
            } else {
                throw new Error(result.message || "Failed to update schedule");
            }
        } catch (error: any) {
            console.error("❌ Error updating schedule:", error);
            setError(error.message || "Failed to update schedule");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Edit Schedule
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Location
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) =>
                                setFormData({ ...formData, location: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={formData.scheduled_date}
                            onChange={(e) =>
                                setFormData({ ...formData, scheduled_date: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.scheduled_time}
                                onChange={(e) =>
                                    setFormData({ ...formData, scheduled_time: e.target.value })
                                }
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) =>
                                    setFormData({ ...formData, end_time: e.target.value })
                                }
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 text-white rounded-lg font-medium hover:bg-gradient-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}