"use client";

import { useEffect, useState, useRef } from "react";
import { Robot } from "../../../types/robot";
import { toast } from "sonner";

interface DetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    robot: Robot | null;
}

interface CameraStatus {
    connected: boolean;
    usb_speed: string;
    profiles_ok: boolean;
    frames_ok: boolean;
}

interface BatteryInfo {
    soc: number;
    voltage: number;
    current: number;
    power: number;
    dod: number;
    working_hours: number;
    drop_percentage: number;
}

interface JointData {
    id: number;
    position: number;
    velocity: number;
    effort: number;
    motor_temp: number;
}

interface ArmJointStates {
    left: JointData[];
    right: JointData[];
}

interface CANStatus {
    can0: boolean;
    can1: boolean;
}

interface JointStatusData {
    id: number;
    limit: "OK" | "ERROR";
    comms: "OK" | "ERROR";
    motor: "OK" | "ERROR";
}

interface ArmStatusData {
    arm: "left" | "right";
    ctrl_mode: string;
    arm_status: string;
    mode_feed: string;
    teach_mode: string;
    motion_status: string;
    trajectory_num: number;
    err_code: number;
}

interface WSData {
    battery?: BatteryInfo;
    location?: string;
    cameras?: {
        left: CameraStatus;
        right: CameraStatus;
    };
    arm_joint_states?: ArmJointStates;
    can_status?: CANStatus;
    arm_status?: {
        left?: ArmStatusData;
        right?: ArmStatusData;
    };
    robot_joint_status?: {
        left?: JointStatusData[];
        right?: JointStatusData[];
    };
    lastUpdated?: number; // Timestamp of last update
}

interface EventTimestamps {
    camera_status_update?: number;
    robot_joint_telemetry?: number;
    robot_arm_status?: number;
    robot_joint_status?: number;
    can_status?: number;
    battery_information?: number;
}

export function DetailsModal({ isOpen, onClose, robot }: DetailsModalProps) {
    const [wsData, setWsData] = useState<WSData>({});
    const [wsConnected, setWsConnected] = useState(false);
    const [wsError, setWsError] = useState(false);
    const eventTimestampsRef = useRef<EventTimestamps>({});
    const timeoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    const TIMEOUT_DURATION = 2000; // 2 seconds

    /* ================= Load Persisted Data ================= */
    useEffect(() => {
        if (isOpen && robot?.robo_id) {
            // Load last known data from localStorage
            const savedDataKey = `robot_${robot.robo_id}_last_data`;
            const savedData = localStorage.getItem(savedDataKey);

            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    setWsData(parsedData);
                } catch (error) {
                    console.error("Failed to parse saved robot data:", error);
                }
            }
        }
    }, [isOpen, robot?.robo_id]);

    /* ================= Save Data to localStorage ================= */
    useEffect(() => {
        if (robot?.robo_id && Object.keys(wsData).length > 0) {
            const savedDataKey = `robot_${robot.robo_id}_last_data`;
            try {
                // Add timestamp to track when data was last updated
                const dataToSave = {
                    ...wsData,
                    lastUpdated: Date.now(),
                };
                localStorage.setItem(savedDataKey, JSON.stringify(dataToSave));
            } catch (error) {
                console.error("Failed to save robot data:", error);
            }
        }
    }, [wsData, robot?.robo_id]);

    /* ================= Timeout Check for Stale Data ================= */
    useEffect(() => {
        if (!wsConnected) {
            // Clear interval when disconnected
            if (timeoutCheckIntervalRef.current) {
                clearInterval(timeoutCheckIntervalRef.current);
                timeoutCheckIntervalRef.current = null;
            }
            return;
        }

        // Check every 500ms for stale data
        timeoutCheckIntervalRef.current = setInterval(() => {
            const now = Date.now();
            
            setWsData((prev) => {
                let updated = { ...prev };
                let hasChanges = false;

                // Check camera_status_update timeout
                if (
                    eventTimestampsRef.current.camera_status_update &&
                    now - eventTimestampsRef.current.camera_status_update > TIMEOUT_DURATION
                ) {
                    if (updated.cameras || updated.location) {
                        updated.cameras = undefined;
                        updated.location = undefined;
                        hasChanges = true;
                        delete eventTimestampsRef.current.camera_status_update;
                    }
                }

                // Check robot_joint_telemetry timeout
                if (
                    eventTimestampsRef.current.robot_joint_telemetry &&
                    now - eventTimestampsRef.current.robot_joint_telemetry > TIMEOUT_DURATION
                ) {
                    if (updated.arm_joint_states) {
                        updated.arm_joint_states = undefined;
                        hasChanges = true;
                        delete eventTimestampsRef.current.robot_joint_telemetry;
                    }
                }

                // Check robot_arm_status timeout
                if (
                    eventTimestampsRef.current.robot_arm_status &&
                    now - eventTimestampsRef.current.robot_arm_status > TIMEOUT_DURATION
                ) {
                    if (updated.arm_status) {
                        updated.arm_status = undefined;
                        hasChanges = true;
                        delete eventTimestampsRef.current.robot_arm_status;
                    }
                }

                // Check robot_joint_status timeout
                if (
                    eventTimestampsRef.current.robot_joint_status &&
                    now - eventTimestampsRef.current.robot_joint_status > TIMEOUT_DURATION
                ) {
                    if (updated.robot_joint_status) {
                        updated.robot_joint_status = undefined;
                        hasChanges = true;
                        delete eventTimestampsRef.current.robot_joint_status;
                    }
                }

                // Check can_status timeout
                if (
                    eventTimestampsRef.current.can_status &&
                    now - eventTimestampsRef.current.can_status > TIMEOUT_DURATION
                ) {
                    if (updated.can_status) {
                        updated.can_status = undefined;
                        hasChanges = true;
                        delete eventTimestampsRef.current.can_status;
                    }
                }

                // Check battery_information timeout
                if (
                    eventTimestampsRef.current.battery_information &&
                    now - eventTimestampsRef.current.battery_information > TIMEOUT_DURATION
                ) {
                    if (updated.battery) {
                        updated.battery = undefined;
                        hasChanges = true;
                        delete eventTimestampsRef.current.battery_information;
                    }
                }

                return hasChanges ? updated : prev;
            });
        }, 500);

        return () => {
            if (timeoutCheckIntervalRef.current) {
                clearInterval(timeoutCheckIntervalRef.current);
            }
        };
    }, [wsConnected]);

    /* ================= WebSocket ================= */
    useEffect(() => {
        if (!isOpen || !robot?.robo_id) {
            setWsConnected(false);
            setWsError(false);
            // Clear all timestamps
            eventTimestampsRef.current = {};
            return;
        }

        const roboId = robot.robo_id;

        const ws = new WebSocket(`${wsUrl}/ws/robot_message/${roboId}/`);

        ws.onopen = () => {
            setWsConnected(true);
            setWsError(false);
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                const now = Date.now();

                /* 🔋 Battery Update */
                if (payload.event === "battery_information") {
                    eventTimestampsRef.current.battery_information = now;
                    
                    const batteryData: BatteryInfo = {
                        soc: Number(payload.data?.soc) || 0,
                        voltage: Number(payload.data?.voltage) || 0,
                        current: Number(payload.data?.current) || 0,
                        power: Number(payload.data?.power) || 0,
                        dod: Number(payload.data?.dod) || 0,
                        working_hours: Number(payload.data?.working_hours) || 0,
                        drop_percentage:
                            Number(payload.data?.drop_percentage) || 0,
                    };

                    setWsData((prev) => ({
                        ...prev,
                        battery: batteryData,
                    }));
                }

                /* 📍 Location & 📷 Camera Update */
                if (payload.event === "camera_status_update") {
                    eventTimestampsRef.current.camera_status_update = now;
                    
                    setWsData((prev) => {
                        const newCameras = {
                            left: {
                                connected:
                                    payload.data.left_camera?.connected ??
                                    prev.cameras?.left?.connected ??
                                    false,
                                usb_speed:
                                    payload.data.left_camera?.usb_speed ??
                                    prev.cameras?.left?.usb_speed ??
                                    "Unknown",
                                profiles_ok:
                                    payload.data.left_camera?.profiles_ok ??
                                    prev.cameras?.left?.profiles_ok ??
                                    false,
                                frames_ok:
                                    payload.data.left_camera?.frames_ok ??
                                    prev.cameras?.left?.frames_ok ??
                                    false,
                            },
                            right: {
                                connected:
                                    payload.data.right_camera?.connected ??
                                    prev.cameras?.right?.connected ??
                                    false,
                                usb_speed:
                                    payload.data.right_camera?.usb_speed ??
                                    prev.cameras?.right?.usb_speed ??
                                    "Unknown",
                                profiles_ok:
                                    payload.data.right_camera?.profiles_ok ??
                                    prev.cameras?.right?.profiles_ok ??
                                    false,
                                frames_ok:
                                    payload.data.right_camera?.frames_ok ??
                                    prev.cameras?.right?.frames_ok ??
                                    false,
                            },
                        };

                        return {
                            ...prev,
                            location:
                                payload.data?.location1 ||
                                prev.location ||
                                robot.location,
                            cameras: newCameras,
                        };
                    });
                }

                /* 🔄 Robot Joint Telemetry */
                if (payload.event === "robot_joint_telemetry") {
                    eventTimestampsRef.current.robot_joint_telemetry = now;
                    
                    const arm = payload.data?.arm;
                    const joints: JointData[] = payload.data?.joints || [];

                    setWsData((prev) => {
                        const currentStates = prev.arm_joint_states || {
                            left: [],
                            right: [],
                        };

                        return {
                            ...prev,
                            arm_joint_states: {
                                ...currentStates,
                                [arm]: joints,
                            },
                        };
                    });
                }

                /* 🦾 Robot Arm Status */
                if (payload.event === "robot_arm_status") {
                    eventTimestampsRef.current.robot_arm_status = now;
                    
                    const armData: ArmStatusData = payload.data;

                    setWsData((prev) => ({
                        ...prev,
                        arm_status: {
                            ...prev.arm_status,
                            [armData.arm]: armData,
                        },
                    }));
                }

                /* 🔗 Robot Joint Status */
                if (payload.event === "robot_joint_status") {
                    eventTimestampsRef.current.robot_joint_status = now;
                    
                    const arm = payload.data?.arm;
                    const joints: JointStatusData[] =
                        payload.data?.joints || [];

                    setWsData((prev) => ({
                        ...prev,
                        robot_joint_status: {
                            ...prev.robot_joint_status,
                            [arm]: joints,
                        },
                    }));
                }

                /* 📡 CAN Status */
                if (payload.event === "can_status") {
                    eventTimestampsRef.current.can_status = now;
                    
                    setWsData((prev) => ({
                        ...prev,
                        can_status: payload.data,
                    }));
                }
            } catch (err) {
                console.error("WebSocket message parse error:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setWsError(true);
        };

        ws.onclose = () => {
            setWsConnected(false);
            eventTimestampsRef.current = {};
        };

        return () => {
            ws.close();
            eventTimestampsRef.current = {};
        };
    }, [isOpen, robot?.robo_id, robot?.location]);

    if (!isOpen || !robot) return null;

    /* ================= Helpers ================= */

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const formatDateTime = (dateString?: string | null) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusColor = (status: string) => {
        const colors = {
            active: "bg-emerald-50 text-emerald-700 border-emerald-200",
            idle: "bg-blue-50 text-blue-700 border-blue-200",
            offline: "bg-gray-50 text-gray-600 border-gray-200",
            error: "bg-red-50 text-red-700 border-red-200",
            maintenance: "bg-amber-50 text-amber-700 border-amber-200",
        };
        return (
            colors[status.toLowerCase() as keyof typeof colors] ||
            colors.offline
        );
    };

    const getBatteryColor = (level?: number) => {
        if (!level) return "text-gray-500";
        if (level > 70) return "text-emerald-500";
        if (level > 30) return "text-amber-500";
        return "text-red-500";
    };

    const getTemperatureColor = (temp: number) => {
        if (temp > 60) return "text-red-600";
        if (temp > 45) return "text-amber-600";
        return "text-emerald-600";
    };

    const getStatusIndicatorColor = (status: string) => {
        if (status === "OK") return "bg-emerald-50 text-emerald-700";
        return "bg-red-50 text-red-700";
    };

    const formatLastUpdated = (timestamp?: number) => {
        if (!timestamp) return null;
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        if (seconds > 0) return `${seconds}s ago`;
        return "just now";
    };

    /* ================= Live Values ================= */

    const liveBattery = wsData?.battery?.soc ?? robot.battery_level;
    const liveLocation = wsData?.location ?? robot.location;
    const liveCameras = wsData?.cameras;
    const batteryDetails = wsData?.battery;
    const armJointStates = wsData?.arm_joint_states;
    const canStatus = wsData?.can_status;
    const armStatus = wsData?.arm_status;
    const robotJointStatus = wsData?.robot_joint_status;
    const lastUpdatedTime = wsData?.lastUpdated;

    /* ================= Empty State Component ================= */
    const EmptyState = ({ message }: { message: string }) => (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );

    /* ================= UI ================= */

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Full screen style */}
            <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 p-6 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {robot.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">
                                    ID: {robot.robo_id}
                                </span>
                                <button
                                    onClick={() =>
                                        copyToClipboard(robot.robo_id)
                                    }
                                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(robot.status)}`}
                        >
                            {robot.status.charAt(0).toUpperCase() +
                                robot.status.slice(1)}
                        </span>

                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                robot.is_active
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                        >
                            {robot.is_active ? "Active" : "Inactive"}
                        </span>

                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                wsConnected
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : wsError
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                        >
                            {wsConnected
                                ? "Live"
                                : wsError
                                  ? "Connection Error"
                                  : "Connecting..."}
                        </span>

                        {/* Last Updated Badge */}
                        {!wsConnected && lastUpdatedTime && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Cached: {formatLastUpdated(lastUpdatedTime)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Body - Two Column Layout */}
                <div className="p-6">
                    {/* Connection Error */}
                    {wsError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-800">
                                Connection Error
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                                Unable to connect to the robot's live data
                                stream. Showing last known data
                                {lastUpdatedTime &&
                                    ` from ${formatLastUpdated(lastUpdatedTime)}`}
                                .
                            </p>
                        </div>
                    )}

                    {/* Showing Cached Data Notice */}
                    {!wsConnected &&
                        !wsError &&
                        Object.keys(wsData).length > 0 &&
                        lastUpdatedTime && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-800">
                                    Showing Cached Data
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Displaying last known data from{" "}
                                    {formatLastUpdated(lastUpdatedTime)}.
                                    Connecting to live stream...
                                </p>
                            </div>
                        )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                    Basic Information
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Local IP
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {robot.local_ip || "Not assigned"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Location
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {liveLocation || "Unknown"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Created
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatDateTime(robot.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Battery */}
                            {liveBattery !== undefined ? (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        Battery
                                    </h3>
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-600">
                                                Charge Level
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">
                                                {liveBattery}%
                                            </span>
                                        </div>
                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getBatteryColor(liveBattery).replace("text-", "bg-")}`}
                                                style={{
                                                    width: `${liveBattery}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {batteryDetails && (
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    Voltage
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {batteryDetails.voltage.toFixed(
                                                        2,
                                                    )}{" "}
                                                    V
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    Current
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {batteryDetails.current.toFixed(
                                                        2,
                                                    )}{" "}
                                                    A
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    Power
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {batteryDetails.power.toFixed(
                                                        1,
                                                    )}{" "}
                                                    W
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    DoD
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {batteryDetails.dod.toFixed(
                                                        1,
                                                    )}
                                                    %
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    Working Hours
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {batteryDetails.working_hours.toFixed(
                                                        2,
                                                    )}{" "}
                                                    h
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    Drop %
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {batteryDetails.drop_percentage.toFixed(
                                                        1,
                                                    )}
                                                    %
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        Battery
                                    </h3>
                                    <EmptyState message="No battery data available" />
                                </div>
                            )}

                            {/* CAN Status */}
                            {canStatus ? (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        CAN Bus Status
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">
                                                CAN0
                                            </span>
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${canStatus.can0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                                            >
                                                {canStatus.can0
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">
                                                CAN1
                                            </span>
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${canStatus.can1 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                                            >
                                                {canStatus.can1
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        CAN Bus Status
                                    </h3>
                                    <EmptyState message="No CAN bus data available" />
                                </div>
                            )}

                            {/* Camera Status */}
                            {liveCameras ? (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        Camera Status
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Left Camera */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Left Camera
                                                </span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${liveCameras.left.connected ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                                                >
                                                    {liveCameras.left.connected
                                                        ? "Connected"
                                                        : "Disconnected"}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1 pl-3">
                                                <div className="flex justify-between">
                                                    <span>USB Speed:</span>
                                                    <span className="font-medium">
                                                        {
                                                            liveCameras.left
                                                                .usb_speed
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Profiles:</span>
                                                    <span
                                                        className={`font-medium ${liveCameras.left.profiles_ok ? "text-emerald-600" : "text-red-600"}`}
                                                    >
                                                        {liveCameras.left
                                                            .profiles_ok
                                                            ? "OK"
                                                            : "Error"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Frames:</span>
                                                    <span
                                                        className={`font-medium ${liveCameras.left.frames_ok ? "text-emerald-600" : "text-red-600"}`}
                                                    >
                                                        {liveCameras.left
                                                            .frames_ok
                                                            ? "OK"
                                                            : "Error"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Camera */}
                                        <div className="pt-3 border-t border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Right Camera
                                                </span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${liveCameras.right.connected ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                                                >
                                                    {liveCameras.right.connected
                                                        ? "Connected"
                                                        : "Disconnected"}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1 pl-3">
                                                <div className="flex justify-between">
                                                    <span>USB Speed:</span>
                                                    <span className="font-medium">
                                                        {
                                                            liveCameras.right
                                                                .usb_speed
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Profiles:</span>
                                                    <span
                                                        className={`font-medium ${liveCameras.right.profiles_ok ? "text-emerald-600" : "text-red-600"}`}
                                                    >
                                                        {liveCameras.right
                                                            .profiles_ok
                                                            ? "OK"
                                                            : "Error"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Frames:</span>
                                                    <span
                                                        className={`font-medium ${liveCameras.right.frames_ok ? "text-emerald-600" : "text-red-600"}`}
                                                    >
                                                        {liveCameras.right
                                                            .frames_ok
                                                            ? "OK"
                                                            : "Error"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        Camera Status
                                    </h3>
                                    <EmptyState message="No camera data available" />
                                </div>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            {/* Arm Status */}
                            {armStatus &&
                            (armStatus.left || armStatus.right) ? (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        Arm Status
                                    </h3>
                                    <div className="space-y-3">
                                        {armStatus.left && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Left Arm
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {
                                                            armStatus.left
                                                                .arm_status
                                                        }
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs pl-3">
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Mode:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.left
                                                                    .ctrl_mode
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Motion:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.left
                                                                    .motion_status
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Mode Feed:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.left
                                                                    .mode_feed
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Error Code:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.left
                                                                    .err_code
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {armStatus.right && (
                                            <div className="pt-3 border-t border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Right Arm
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {
                                                            armStatus.right
                                                                .arm_status
                                                        }
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs pl-3">
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Mode:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.right
                                                                    .ctrl_mode
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Motion:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.right
                                                                    .motion_status
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Mode Feed:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.right
                                                                    .mode_feed
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Error Code:
                                                        </span>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                armStatus.right
                                                                    .err_code
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        Arm Status
                                    </h3>
                                    <EmptyState message="No arm status data available" />
                                </div>
                            )}

                            {/* Joint Health Status */}
                            {robotJointStatus &&
                            (robotJointStatus.left?.length > 0 ||
                                robotJointStatus.right?.length > 0) ? (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        Joint Health Status
                                    </h3>
                                    <div className="space-y-3">
                                        {robotJointStatus.left?.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Left Arm
                                                </p>
                                                <div className="space-y-2 pl-3">
                                                    {robotJointStatus.left.map(
                                                        (joint) => (
                                                            <div
                                                                key={joint.id}
                                                                className="bg-white p-2 rounded border border-gray-200"
                                                            >
                                                                <p className="text-xs font-medium text-gray-600 mb-1">
                                                                    Joint{" "}
                                                                    {joint.id}
                                                                </p>
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Limit
                                                                        </span>
                                                                        <p
                                                                            className={`font-medium ${joint.limit === "OK" ? "text-emerald-600" : "text-red-600"}`}
                                                                        >
                                                                            {
                                                                                joint.limit
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Comms
                                                                        </span>
                                                                        <p
                                                                            className={`font-medium ${joint.comms === "OK" ? "text-emerald-600" : "text-red-600"}`}
                                                                        >
                                                                            {
                                                                                joint.comms
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Motor
                                                                        </span>
                                                                        <p
                                                                            className={`font-medium ${joint.motor === "OK" ? "text-emerald-600" : "text-red-600"}`}
                                                                        >
                                                                            {
                                                                                joint.motor
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {robotJointStatus.right?.length > 0 && (
                                            <div className="pt-3 border-t border-gray-200">
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Right Arm
                                                </p>
                                                <div className="space-y-2 pl-3">
                                                    {robotJointStatus.right.map(
                                                        (joint) => (
                                                            <div
                                                                key={joint.id}
                                                                className="bg-white p-2 rounded border border-gray-200"
                                                            >
                                                                <p className="text-xs font-medium text-gray-600 mb-1">
                                                                    Joint{" "}
                                                                    {joint.id}
                                                                </p>
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Limit
                                                                        </span>
                                                                        <p
                                                                            className={`font-medium ${joint.limit === "OK" ? "text-emerald-600" : "text-red-600"}`}
                                                                        >
                                                                            {
                                                                                joint.limit
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Comms
                                                                        </span>
                                                                        <p
                                                                            className={`font-medium ${joint.comms === "OK" ? "text-emerald-600" : "text-red-600"}`}
                                                                        >
                                                                            {
                                                                                joint.comms
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Motor
                                                                        </span>
                                                                        <p
                                                                            className={`font-medium ${joint.motor === "OK" ? "text-emerald-600" : "text-red-600"}`}
                                                                        >
                                                                            {
                                                                                joint.motor
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        Joint Health Status
                                    </h3>
                                    <EmptyState message="No joint status data available" />
                                </div>
                            )}

                            {/* Joint Telemetry */}
                            {armJointStates &&
                            (armJointStates.left?.length > 0 ||
                                armJointStates.right?.length > 0) ? (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        Robot Joint Telemetry
                                    </h3>
                                    <div className="space-y-3">
                                        {armJointStates.left?.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Left Arm
                                                </p>
                                                <div className="space-y-2 pl-3">
                                                    {armJointStates.left.map(
                                                        (joint) => (
                                                            <div
                                                                key={joint.id}
                                                                className="bg-white p-2 rounded border border-gray-200"
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-xs font-medium text-gray-600">
                                                                        Joint{" "}
                                                                        {
                                                                            joint.id
                                                                        }
                                                                    </p>
                                                                    <span
                                                                        className={`text-xs font-semibold ${getTemperatureColor(joint.motor_temp)}`}
                                                                    >
                                                                        {joint.motor_temp.toFixed(
                                                                            0,
                                                                        )}
                                                                        °C
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Pos
                                                                        </span>
                                                                        <p className="font-medium text-gray-900">
                                                                            {joint.position.toFixed(
                                                                                3,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Vel
                                                                        </span>
                                                                        <p className="font-medium text-gray-900">
                                                                            {joint.velocity.toFixed(
                                                                                5,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Effort
                                                                        </span>
                                                                        <p className="font-medium text-gray-900">
                                                                            {joint.effort.toFixed(
                                                                                3,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {armJointStates.right?.length > 0 && (
                                            <div className="pt-3 border-t border-gray-200">
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Right Arm
                                                </p>
                                                <div className="space-y-2 pl-3">
                                                    {armJointStates.right.map(
                                                        (joint) => (
                                                            <div
                                                                key={joint.id}
                                                                className="bg-white p-2 rounded border border-gray-200"
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-xs font-medium text-gray-600">
                                                                        Joint{" "}
                                                                        {
                                                                            joint.id
                                                                        }
                                                                    </p>
                                                                    <span
                                                                        className={`text-xs font-semibold ${getTemperatureColor(joint.motor_temp)}`}
                                                                    >
                                                                        {joint.motor_temp.toFixed(
                                                                            0,
                                                                        )}
                                                                        °C
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Pos
                                                                        </span>
                                                                        <p className="font-medium text-gray-900">
                                                                            {joint.position.toFixed(
                                                                                3,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Vel
                                                                        </span>
                                                                        <p className="font-medium text-gray-900">
                                                                            {joint.velocity.toFixed(
                                                                                5,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">
                                                                            Effort
                                                                        </span>
                                                                        <p className="font-medium text-gray-900">
                                                                            {joint.effort.toFixed(
                                                                                3,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        Robot Joint Telemetry
                                    </h3>
                                    <EmptyState message="No joint telemetry data available" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-500">
                    Robot ID: {robot.id} • Updated:{" "}
                    {formatDateTime(robot.updated_at)}
                    {lastUpdatedTime && !wsConnected && (
                        <>
                            {" "}
                            • Last Live Data:{" "}
                            {formatLastUpdated(lastUpdatedTime)}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}