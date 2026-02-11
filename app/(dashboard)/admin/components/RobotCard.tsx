"use client";

import Link from "next/link";
import { Robot } from "../../../types/robot";
import ArmCalibration from "./armCalibrate";
import { useState, useEffect, useRef } from "react";

interface RobotCardProps {
    robot: Robot;
    onEdit: (robot: Robot) => void;
    onToggleActive: (id: number, currentStatus: boolean) => Promise<void>;
    onViewDetails: (robot: Robot) => void;
    onDelete: (id: number) => Promise<void>;
    togglingId?: number | null;
}

export function RobotCard({
    robot,
    onEdit,
    onToggleActive,
    onViewDetails,
    onDelete,
    togglingId,
}: RobotCardProps) {
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [localToggling, setLocalToggling] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showIP, setShowIP] = useState(false);
    const [localRobot, setLocalRobot] = useState<Robot>(robot);
    const [wsConnected, setWsConnected] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update local robot when prop changes
    useEffect(() => {
        setLocalRobot(robot);
    }, [robot]);

    // WebSocket connection for real-time status updates
    useEffect(() => {
        const connectWebSocket = () => {
            try {
                // Create WebSocket connection using robot's robo_id
                const ws = new WebSocket(
                    `ws://192.168.1.100:8002/ws/robot_message/${robot.robo_id}/`,
                );

                ws.onopen = () => {
                    setWsConnected(true);
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        // Handle robot_active_status event
                        if (message.event === "robot_active_status") {
                            const newStatus = message.data?.status;

                            if (typeof newStatus === "boolean") {
                                // Update local robot state with new status (passive update)
                                setLocalRobot((prev: any) => ({
                                    ...prev,
                                    is_active: newStatus,
                                }));
                            }
                        }
                    } catch (error) {
                    }
                };

                ws.onerror = (error) => {
                    console.error(
                        `❌ WebSocket error for robot ${robot.robo_id}:`,
                        error,
                    );
                    setWsConnected(false);
                };

                ws.onclose = () => {
                    setWsConnected(false);
                    // Attempt to reconnect after 5 seconds
                    reconnectTimeoutRef.current = setTimeout(() => {

                        connectWebSocket();
                    }, 5000);
                };

                wsRef.current = ws;
            } catch (error) {
                console.error("Failed to create WebSocket connection:", error);
            }
        };

        // Initial connection
        connectWebSocket();

        // Cleanup on unmount
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [robot.robo_id]); // Reconnect if robot ID changes

    /* ================= STATUS HELPERS ================= */

    const getStatusStyles = (status: string) => {
        const styles = {
            active: {
                bg: "bg-emerald-50",
                border: "border-emerald-200",
                text: "text-emerald-700",
            },
            available: {
                bg: "bg-blue-50",
                border: "border-blue-200",
                text: "text-blue-700",
            },
            idle: {
                bg: "bg-blue-50",
                border: "border-blue-200",
                text: "text-blue-700",
            },
            offline: {
                bg: "bg-gray-50",
                border: "border-gray-200",
                text: "text-gray-600",
            },
            error: {
                bg: "bg-red-50",
                border: "border-red-200",
                text: "text-red-700",
            },
            maintenance: {
                bg: "bg-amber-50",
                border: "border-amber-200",
                text: "text-amber-700",
            },
        };
        return (
            styles[status.toLowerCase() as keyof typeof styles] ||
            styles.offline
        );
    };

    const formatDate = (date?: string | null) => {
        if (!date) return "Never";
        const diff = (Date.now() - new Date(date).getTime()) / 60000;
        if (diff < 60) return `${Math.floor(diff)}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return new Date(date).toLocaleDateString();
    };

    const isToggling = localToggling || togglingId === localRobot.id;

    // Battery color helpers
    const getBatteryStyles = (level: number) => {
        if (level > 60)
            return {
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                border: "border-emerald-200",
            };
        if (level > 20)
            return {
                bg: "bg-amber-50",
                text: "text-amber-700",
                border: "border-amber-200",
            };
        return {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
        };
    };

    // IP masking helper
    const maskIP = (ip: string) => {
        if (!ip || ip === "DHCP") return ip;
        const parts = ip.split(".");
        if (parts.length !== 4) return ip;
        return `${parts[0]}.${parts[1]}.•••.•••`;
    };

    const statusStyles = getStatusStyles(localRobot.status);
    const batteryStyles =
        localRobot.battery_level !== undefined
            ? getBatteryStyles(localRobot.battery_level)
            : {
                  bg: "bg-gray-50",
                  text: "text-gray-600",
                  border: "border-gray-200",
              };

    /* ================= TOGGLE ================= */

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (localRobot.is_active) {
            setShowDeactivateConfirm(true);
        } else {
            toggleRobot();
        }
    };

    const toggleRobot = async () => {
        if (localToggling) return;

        setLocalToggling(true);

        try {
            await onToggleActive(localRobot.id, localRobot.is_active);

            // Optimistically update the local state
            setLocalRobot((prev: any) => ({
                ...prev,
                is_active: !prev.is_active,
            }));
        } catch (error) {
            console.error(`Failed to toggle robot ${robot.robo_id}:`, error);
            alert("Failed to update robot status. Please try again.");
        } finally {
            setLocalToggling(false);
            setShowDeactivateConfirm(false);
        }
    };

    /* ================= DELETE ================= */

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            await onDelete(localRobot.id);
        } catch (error) {
            console.error(`Failed to delete robot ${robot.robo_id}:`, error);
            alert("Failed to delete robot. Please try again.");
        }
    };

    return (
        <div className="group relative h-full">
            {/* MAIN CARD */}
            <div className="relative h-full rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                {/* WebSocket Connection Indicator */}
                <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-gray-200">
                        <div
                            className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                            title={
                                wsConnected
                                    ? "WebSocket Connected"
                                    : "WebSocket Disconnected"
                            }
                        />
                        <span
                            className={`text-xs font-medium ${wsConnected ? "text-emerald-700" : "text-red-700"}`}
                        >
                            {wsConnected ? "Synced" : "Unsynced"}
                        </span>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="p-6">
                    {/* HEADER */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                                {localRobot.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-gray-500">
                                    ID: {localRobot.robo_id}
                                </span>
                            </div>
                        </div>
                        {/* Status Badge - Uncomment if needed */}
                        {/* <div
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles.border} ${statusStyles.bg} ${statusStyles.text}`}
                        >
                            {localRobot.status.charAt(0).toUpperCase() +
                                localRobot.status.slice(1)}
                        </div> */}
                    </div>

                    {/* STATS GRID */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Battery */}
                        {localRobot.battery_level !== undefined && (
                            <div>
                                <div className="text-xs text-gray-500 mb-1">
                                    Battery
                                </div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {localRobot.battery_level}%
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {localRobot.location && (
                            <div>
                                <div className="text-xs text-gray-500 mb-1">
                                    Location
                                </div>
                                <div className="text-sm font-medium text-gray-700 truncate">
                                    {localRobot.location}
                                </div>
                            </div>
                        )}

                        {/* IP Address */}
                        <div>
                            <div className="text-xs text-gray-500 mb-1">
                                Local IP
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-medium text-gray-700 truncate flex-1">
                                    {showIP
                                        ? localRobot.local_ip || "DHCP"
                                        : maskIP(localRobot.local_ip || "DHCP")}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowIP(!showIP);
                                    }}
                                    className="text-cyan-600 hover:text-cyan-700 transition-colors flex-shrink-0"
                                    title={showIP ? "Hide IP" : "Show IP"}
                                >
                                    {showIP ? (
                                        <svg
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Last Active */}
                        <div>
                            <div className="text-xs text-gray-500 mb-1">
                                Last Active
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                                {formatDate(localRobot.last_seen)}
                            </div>
                        </div>
                    </div>

                    {/* Battery Progress Bar */}
                    {localRobot.battery_level !== undefined && (
                        <div className="mb-4">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        localRobot.battery_level > 60
                                            ? "bg-emerald-500"
                                            : localRobot.battery_level > 30
                                              ? "bg-amber-500"
                                              : "bg-red-500"
                                    }`}
                                    style={{
                                        width: `${Math.min(100, Math.max(0, localRobot.battery_level))}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* TOGGLE SECTION */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {localRobot.is_active ? "Active" : "Inactive"}
                            </p>
                            <p className="text-xs text-gray-600">
                                {localRobot.is_active
                                    ? "Running inspections"
                                    : "No active tasks"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleToggleClick}
                            disabled={isToggling}
                            className={`
                                relative inline-flex h-8 w-16 flex-shrink-0 items-center rounded-full 
                                transition-all duration-300
                                ${
                                    localRobot.is_active
                                        ? "bg-emerald-500"
                                        : "bg-gray-300"
                                }
                                ${isToggling ? "opacity-70 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}
                            `}
                        >
                            <span
                                className={`
                                    inline-block h-6 w-6 bg-white rounded-full shadow-md
                                    transform transition-transform duration-300
                                    ${localRobot.is_active ? "translate-x-9" : "translate-x-1"}
                                    ${isToggling ? "animate-pulse" : ""}
                                `}
                            />
                            {isToggling && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(localRobot);
                            }}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                            disabled={isToggling}
                        >
                            View Details
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowModal(true);
                            }}
                            className="flex-1 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
                            disabled={isToggling}
                        >
                            Calibrate
                        </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(localRobot);
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                            disabled={isToggling}
                        >
                            Edit
                        </button>

                        <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                            disabled={isToggling}
                        >
                            Delete
                        </button>

                        <Link
                            href={`/userDashboard/${robot.id}`}
                            className="col-span-2 w-full text-center px-4 py-2 rounded-lg border border-green-200 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            {/* ARM CALIBRATION MODAL */}
            {showModal && (
                <ArmCalibration
                    robotId={localRobot.id}
                    roboId={localRobot.robo_id}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* DEACTIVATION CONFIRMATION MODAL */}
            {showDeactivateConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowDeactivateConfirm(false)}
                    />

                    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
                        {/* MODAL HEADER */}
                        <div className="p-6 border-b border-amber-100">
                            <h3 className="text-xl font-bold text-gray-900">
                                Deactivate Robot?
                            </h3>
                        </div>

                        {/* MODAL BODY */}
                        <div className="p-6">
                            <div className="mb-6">
                                <p className="text-red-700 mb-4 font-medium">
                                    <strong className="text-red-700 font-bold">
                                        {localRobot.name}
                                    </strong>{" "}
                                    Deactivation is not allowed while the robot
                                    is online. Please try again later.
                                </p>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() =>
                                        setShowDeactivateConfirm(false)
                                    }
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg 
                                        hover:bg-gray-50 transition-all duration-200 font-semibold
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isToggling}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={toggleRobot}
                                    disabled={isToggling}
                                    className={`
                                        flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200
                                        flex items-center justify-center gap-2
                                        ${
                                            isToggling
                                                ? "bg-gray-400 text-white cursor-not-allowed"
                                                : "bg-amber-500 hover:bg-amber-600 text-white"
                                        }
                                    `}
                                >
                                    {isToggling ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Deactivating...
                                        </>
                                    ) : (
                                        "Deactivate Robot"
                                    )}
                                </button>
                            </div>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                You can reactivate the robot anytime from this
                                dashboard
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
