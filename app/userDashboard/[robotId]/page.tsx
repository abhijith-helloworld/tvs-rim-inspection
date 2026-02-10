"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import {
    BarChart3,
    Battery,
    Cpu,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Clock,
    HardDrive,
    CalendarCheck,
    CalendarX,
    Zap,
    Loader2,
    Camera,
    Disc,
    AlertCircle,
    Move,
    Filter,
    CheckCheck,
    X,
    Navigation,
    MapPin,
    Wifi,
    Armchair,
    Handshake,
} from "lucide-react";

/* ================= TYPES ================= */

interface CameraStatus {
    connected: boolean;
    usb_speed: string;
    profiles_ok: boolean;
    frames_ok: boolean;
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

interface CanStatus {
    can0: boolean;
    can1: boolean;
}

interface LocationData {
    location1: string;
    location2: string;
    location3: string;
}

interface ArmJoint {
    id: number;
    name: string;
    position: number;
    status: "normal" | "warning" | "error";
}

interface ArmStatus {
    connected: boolean;
    temperature: number;
    position: { x: number; y: number; z: number };
    velocity: number;
    gripperStatus: "open" | "closed";
    joints: ArmJoint[];
}

interface RobotStatus {
    break_status: boolean;
    emergency_status: boolean;
    Arm_moving: boolean;
}

interface InspectionSummary {
    total: number;
    defected: number;
    non_defected: number;
    approved: number;
    human_verified: number;
    pending_verification: number;
}

interface ScheduleSummary {
    total: number;
    scheduled: number;
    processing: number;
    completed: number;
}

interface FilterData {
    filter_type: "day" | "week" | "month" | "range";
    date?: string;
    start_date?: string;
    end_date?: string;
}

interface NavigationPayload {
    navigation_mode: "stationary" | "autonomous";
    navigation_style?: "free" | "strict" | "strict_with_autonomous";
}

interface DashboardData {
    inspection: InspectionSummary;
    schedules: ScheduleSummary;
    battery: BatteryStatus;
    arm: ArmStatus;
    cameras: {
        left: CameraStatus;
        right: CameraStatus;
    };
    locations?: string[];
    mapName?: string;
    robotStatus: RobotStatus;
    canStatus: CanStatus;
}

interface RobotData {
    id: string;
    name: string;
    status: string;
    robo_id?: string;
}

/* ================= FILTER MODAL COMPONENT ================= */
const FilterModal = ({
    isOpen,
    onClose,
    onApply,
    currentFilter,
}: {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filter: FilterData) => void;
    currentFilter: FilterData;
}) => {
    const [filterType, setFilterType] = useState<FilterData["filter_type"]>(
        currentFilter.filter_type,
    );
    const [selectedDate, setSelectedDate] = useState(
        currentFilter.date || new Date().toISOString().split("T")[0],
    );
    const [startDate, setStartDate] = useState(currentFilter.start_date || "");
    const [endDate, setEndDate] = useState(currentFilter.end_date || "");

    if (!isOpen) return null;

    const handleApply = () => {
        const filter: FilterData = {
            filter_type: filterType,
            date: selectedDate,
        };

        if (filterType === "range") {
            filter.start_date = startDate;
            filter.end_date = endDate;
        }

        onApply(filter);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-slate-900">
                            Filter Schedules
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Filter Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Filter Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(["day", "week", "month", "range"] as const).map(
                                (type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                            filterType === type
                                                ? "bg-slate-900 text-white shadow-lg"
                                                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                        }`}
                                    >
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Date Selection */}
                    {filterType !== "range" && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) =>
                                    setSelectedDate(e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>
                    )}

                    {/* Range Selection */}
                    {filterType === "range" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        setStartDate(e.target.value)
                                    }
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-6 py-3 rounded-xl font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg"
                    >
                        Apply Filter
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================= MAP NOT UPLOADED POPUP ================= */
const MapNotUploadedPopup = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200">
                <div className="p-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Map Not Uploaded
                    </h3>
                    <p className="text-slate-600 mb-6">
                        Please upload a map before enabling autonomous mode.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 rounded-xl font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================= MAIN COMPONENT ================= */

const Dashboard: React.FC = () => {
    const [robotId, setRobotId] = useState<string>("");
    const [roboId, setRoboId] = useState<string>("");
    const [robotData, setRobotData] = useState<RobotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [currentFilter, setCurrentFilter] = useState<FilterData>({
        filter_type: "month",
        date: new Date().toISOString().split("T")[0],
    });

    /* ---- navigation toggle state ---- */
    const [navigationMode, setNavigationMode] = useState<
        "stationary" | "autonomous"
    >("stationary");
    const [navigationStyle, setNavigationStyle] = useState<
        "free" | "strict" | "strict_with_autonomous"
    >("free");

    const [navPatchLoading, setNavPatchLoading] = useState(false);
    const [navPatchError, setNavPatchError] = useState<string | null>(null);

    /* ---- autonomous ready state ---- */
    const [isAutonomousReady, setIsAutonomousReady] = useState(false);
    const [isModeActive, setIsModeActive] = useState(false);
    const [showMapNotUploadedPopup, setShowMapNotUploadedPopup] =
        useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    /* ---- WebSocket reference ---- */
    const wsRef = useRef<WebSocket | null>(null);

    const [data, setData] = useState<DashboardData>({
        inspection: {
            total: 0,
            defected: 0,
            non_defected: 0,
            approved: 0,
            human_verified: 0,
            pending_verification: 0,
        },
        schedules: {
            total: 0,
            scheduled: 0,
            processing: 0,
            completed: 0,
        },
        battery: {
            level: 0,
            status: "discharging",
            timeRemaining: "0h 0m",
        },
        arm: {
            connected: true,
            temperature: 42.5,
            position: { x: 125.4, y: 87.2, z: 56.8 },
            velocity: 2.5,
            gripperStatus: "open",
            joints: [
                { id: 1, name: "Base", position: 45, status: "normal" },
                { id: 2, name: "Shoulder", position: 120, status: "normal" },
                { id: 3, name: "Elbow", position: 90, status: "warning" },
                { id: 4, name: "Wrist", position: 60, status: "normal" },
                { id: 5, name: "Gripper", position: 30, status: "normal" },
            ],
        },
        cameras: {
            left: {
                connected: false,
                usb_speed: "",
                profiles_ok: false,
                frames_ok: false,
            },
            right: {
                connected: false,
                usb_speed: "",
                profiles_ok: false,
                frames_ok: false,
            },
        },
        locations: [],
        mapName: undefined,
        robotStatus: {
            break_status: false,
            emergency_status: false,
            Arm_moving: false,
        },
        canStatus: {
            can0: false,
            can1: false,
        },
    });

    const [time, setTime] = useState(new Date().toLocaleTimeString());

    /* ================= GET ROBOT ID FROM URL ================= */
    useEffect(() => {
        const pathParts = window.location.pathname.split("/");
        const id = pathParts[pathParts.length - 1];
        setRobotId(id);
    }, []);

    /* ================= FETCH ROBOT DATA ================= */
    useEffect(() => {
        if (!robotId) return;

        const fetchRobotData = async () => {
            try {
                setLoading(true);
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/`,
                );

                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }

                const result = await response.json();
                console.log("📊 Robot data response:", result);

                const robotData: RobotData = result.data;
                setRobotData(robotData);

                if (robotData.robo_id) {
                    setRoboId(robotData.robo_id);
                    console.log("✅ Robot ID set:", robotData.robo_id);
                }

                setError(null);
            } catch (err) {
                console.error("Error fetching robot data:", err);
                setError("Failed to load robot data");
                setRobotData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRobotData();
    }, [robotId]);

    /* ================= FETCH FILTERED SCHEDULE & INSPECTION DATA ================= */
    useEffect(() => {
        if (!robotId) return;

        const fetchFilteredData = async () => {
            try {
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/schedule/robot/${robotId}/filter/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(currentFilter),
                    },
                );

                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }

                const result = await response.json();
                console.log("📊 Filtered data:", result);

                if (result.schedule_summary) {
                    setData((prev) => ({
                        ...prev,
                        schedules: {
                            total: result.schedule_summary.total || 0,
                            scheduled: result.schedule_summary.scheduled || 0,
                            processing: result.schedule_summary.processing || 0,
                            completed: result.schedule_summary.completed || 0,
                        },
                    }));
                }

                if (result.inspection_summary) {
                    setData((prev) => ({
                        ...prev,
                        inspection: {
                            total: result.inspection_summary.total || 0,
                            defected: result.inspection_summary.defected || 0,
                            non_defected:
                                result.inspection_summary.non_defected || 0,
                            approved: result.inspection_summary.approved || 0,
                            human_verified:
                                result.inspection_summary.human_verified || 0,
                            pending_verification:
                                result.inspection_summary
                                    .pending_verification || 0,
                        },
                    }));
                }
            } catch (err) {
                console.error("Error fetching filtered data:", err);
            }
        };

        fetchFilteredData();
    }, [robotId, currentFilter]);

    /* ================= FETCH LOCATIONS ================= */
    useEffect(() => {
        if (!robotId) return;

        const fetchLocations = async () => {
            try {
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/location/`,
                );

                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }

                const result = await response.json();
                const locationData = result?.data?.location_data?.data;
                const locationsObj = locationData?.locations || {};
                const locationsArray =
                    Object.values(locationsObj).filter(Boolean);
                const mapName = locationData?.map_name || ""; // ✅ DECLARE mapName HERE

                setData((prev) => ({
                    ...prev,
                    locations: locationsArray as string[],
                    mapName: mapName, // ✅ NOW mapName is defined
                }));
            } catch (err) {
                console.error("Error fetching locations:", err);
            }
        };

        fetchLocations();
    }, [robotId]);

    /* ================= CLOCK ================= */
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    /* ================= HANDLE LOCATION CLICK ================= */
    const handleLocationClick = (locationName: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn(
                "⚠️ WebSocket not connected. Cannot send location click event.",
            );
            return;
        }

        const cleanedLocationName = locationName.trim(); // 🔥 remove leading & trailing spaces

        const message = {
            event: "move_to_location",
            data: {
                location_name: cleanedLocationName,
                navigation_style: navigationStyle,
                status: true,
            },
        };

        try {
            wsRef.current.send(JSON.stringify(message));
            console.log("✅ Location click sent:", message);
        } catch (err) {
            console.error("❌ Failed to send location click:", err);
        }
    };

    /* ================= PATCH NAVIGATION ================= */
    const patchNavigation = async (
        mode: "stationary" | "autonomous",
        style?: "free" | "strict" | "strict_with_autonomous",
    ) => {
        if (!robotId) return;
        setNavPatchLoading(true);
        setNavPatchError(null);

        const payload: NavigationPayload = {
            navigation_mode: mode,
        };

        // Only include navigation_style when in autonomous mode
        if (mode === "autonomous" && style) {
            payload.navigation_style = style;
        }

        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/navigation/`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                throw new Error(`PATCH failed: ${response.status}`);
            }

            console.log("✅ Navigation updated:", payload);
        } catch (err) {
            console.error("❌ Navigation PATCH error:", err);
            setNavPatchError("Failed to update navigation");
            // Revert the mode on error
            setNavigationMode(
                mode === "autonomous" ? "stationary" : "autonomous",
            );
        } finally {
            setNavPatchLoading(false);
        }
    };

    /* ---- toggle handler ---- */
    const handleToggleNavigation = () => {
        // Check if autonomous is ready before allowing toggle
        if (!isAutonomousReady) {
            setShowMapNotUploadedPopup(true);
            return;
        }

        if (navPatchLoading) return;
        const next =
            navigationMode === "stationary" ? "autonomous" : "stationary";
        setNavigationMode(next);

        // Only pass style when switching to autonomous
        patchNavigation(
            next,
            next === "autonomous" ? navigationStyle : undefined,
        );
    };

    /* ---- style change handler ---- */
    const handleStyleChange = (
        style: "free" | "strict" | "strict_with_autonomous",
    ) => {
        if (navPatchLoading) return;
        setNavigationStyle(style);
        patchNavigation(navigationMode, style);
    };

    /* ================= WEBSOCKET ================= */
    useEffect(() => {
        if (!roboId) {
            console.warn("⚠️ WebSocket not initialized: robo_id is missing");
            return;
        }

        console.log(`🚀 Initializing WebSocket for robo_id: ${roboId}`);

        let ws: WebSocket | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let isManualClose = false;

        const connect = () => {
            try {
                const wsUrl = `ws://192.168.1.100:8002/ws/robot_message/${roboId}/`;
                console.log(`🔗 Attempting WebSocket connection to: ${wsUrl}`);

                ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log(
                        `✅ WebSocket connected for robo_id: ${roboId}`,
                    );
                    setWsConnected(true);
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        console.log("📩 WebSocket event:", payload.event);

                        /* ================= ROBOT STATUS ================= */
                        if (payload.event === "robot_status") {
                            setData((prev) => ({
                                ...prev,
                                robotStatus: {
                                    break_status:
                                        payload.data.break_status ??
                                        prev.robotStatus.break_status,
                                    emergency_status:
                                        payload.data.emergency_status ??
                                        prev.robotStatus.emergency_status,
                                    Arm_moving:
                                        payload.data.Arm_moving ??
                                        prev.robotStatus.Arm_moving,
                                },
                            }));
                        }

                        /* ================= CAN STATUS ================= */
                        if (payload.event === "can_status") {
                            setData((prev) => ({
                                ...prev,
                                canStatus: {
                                    can0:
                                        payload.data.can0 ??
                                        prev.canStatus.can0,
                                    can1:
                                        payload.data.can1 ??
                                        prev.canStatus.can1,
                                },
                            }));
                            console.log("🔌 CAN Status updated:", payload.data);
                        }

                        /* ================= CAMERA STATUS ================= */
                        if (payload.event === "camera_status_update") {
                            setData((prev) => ({
                                ...prev,
                                cameras: {
                                    left: {
                                        connected:
                                            payload.data.left_camera
                                                ?.connected ??
                                            prev.cameras.left.connected,
                                        usb_speed:
                                            payload.data.left_camera
                                                ?.usb_speed ??
                                            prev.cameras.left.usb_speed,
                                        profiles_ok:
                                            payload.data.left_camera
                                                ?.profiles_ok ??
                                            prev.cameras.left.profiles_ok,
                                        frames_ok:
                                            payload.data.left_camera
                                                ?.frames_ok ??
                                            prev.cameras.left.frames_ok,
                                    },
                                    right: {
                                        connected:
                                            payload.data.right_camera
                                                ?.connected ??
                                            prev.cameras.right.connected,
                                        usb_speed:
                                            payload.data.right_camera
                                                ?.usb_speed ??
                                            prev.cameras.right.usb_speed,
                                        profiles_ok:
                                            payload.data.right_camera
                                                ?.profiles_ok ??
                                            prev.cameras.right.profiles_ok,
                                        frames_ok:
                                            payload.data.right_camera
                                                ?.frames_ok ??
                                            prev.cameras.right.frames_ok,
                                    },
                                },
                            }));
                        }

                        /* ================= BATTERY INFO ================= */
                        if (payload.event === "battery_information") {
                            const soc = Number(payload.data?.soc) || 0;
                            const current = Number(payload.data?.current) || 0;
                            const voltage = Number(payload.data?.voltage) || 0;
                            const power = Number(payload.data?.power) || 0;
                            const dod = Number(payload.data?.dod) || 0;

                            let batteryStatus:
                                | "charging"
                                | "discharging"
                                | "full"
                                | "low";

                            if (current > 0.5) batteryStatus = "charging";
                            else if (soc >= 99) batteryStatus = "full";
                            else if (soc < 20) batteryStatus = "low";
                            else batteryStatus = "discharging";

                            const hours = Math.floor(soc / 20);
                            const minutes = Math.floor((soc % 20) * 3);

                            setData((prev) => ({
                                ...prev,
                                battery: {
                                    level: soc,
                                    status: batteryStatus,
                                    timeRemaining: `${hours}h ${minutes}m`,
                                    voltage,
                                    current,
                                    power,
                                    dod,
                                },
                            }));
                        }

                        /* ================= AUTONOMOUS MODE WITH MODE_ACTIVE ================= */
                        if (payload.event === "autonomous_ready") {
                            const ready = payload.data?.status === true;
                            const modeActive =
                                payload.data?.mode_active === true;

                            setIsAutonomousReady(ready);
                            setIsModeActive(modeActive);

                            console.log(
                                "🤖 Autonomous Ready:",
                                ready,
                                "| Mode Active:",
                                modeActive,
                                "| Strict/Strict Auto is now",
                                modeActive
                                    ? "enabled (user can click)"
                                    : "disabled (waiting for activation)",
                            );
                        }
                    } catch (err) {
                        console.error("❌ WebSocket message parse error:", err);
                    }
                };

                ws.onerror = (err) => {
                    console.error("❌ WebSocket error:", err);
                };

                ws.onclose = (event) => {
                    console.log(
                        `🔌 WebSocket closed for robo_id: ${roboId}`,
                        event.code,
                        event.reason,
                    );

                    setWsConnected(false);
                    wsRef.current = null;

                    if (!isManualClose) {
                        console.log("🔄 Reconnecting in 3 seconds...");
                        reconnectTimeout = setTimeout(connect, 3000);
                    }
                };
            } catch (err) {
                console.error("❌ WebSocket init failed:", err);
                if (!isManualClose) {
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            }
        };

        connect();

        return () => {
            isManualClose = true;

            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }

            if (ws) {
                ws.close();
            }

            wsRef.current = null;
        };
    }, [roboId]);

    /* ================= DERIVED VALUES ================= */
    const defectRate =
        data.inspection.total > 0
            ? (data.inspection.defected / data.inspection.total) * 100
            : 0;

    const successRate =
        data.inspection.total > 0
            ? ((data.inspection.total - data.inspection.defected) /
                  data.inspection.total) *
              100
            : 0;

    /* ================= LOADING STATE ================= */
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg">
                        Loading robot data...
                    </p>
                </div>
            </div>
        );
    }

    /* ================= ERROR STATE ================= */
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <p className="text-slate-800 text-lg font-semibold mb-2">
                        Error Loading Dashboard
                    </p>
                    <p className="text-slate-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const getFilterLabel = () => {
        switch (currentFilter.filter_type) {
            case "day":
                return `Day: ${currentFilter.date}`;
            case "week":
                return `Week of ${currentFilter.date}`;
            case "month":
                return `Month of ${currentFilter.date}`;
            case "range":
                return `${currentFilter.start_date} - ${currentFilter.end_date}`;
            default:
                return "All Time";
        }
    };

    const isAutonomous = navigationMode === "autonomous";

    return (
        <div className="bg-gradient-to-br from-slate-50 to-white text-slate-800 p-6 md:p-6 font-sans w-full">
            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={setCurrentFilter}
                currentFilter={currentFilter}
            />

            <MapNotUploadedPopup
                isOpen={showMapNotUploadedPopup}
                onClose={() => setShowMapNotUploadedPopup(false)}
            />

            <header className="mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-gray-100 px-3 py-3 rounded-2xl">
                    <div >
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
                            <Cpu className="text-slate-700" size={28} />
                            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Robotic Inspection Dashboard
                            </span>
                        </h1>
                        <p className="text-slate-500 text-[17px] mt-1 ml-10 font-light">
                            Robot ID: {robotData?.name}
                        </p>
                    </div>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full lg:w-auto">
                        {/* WebSocket Connection Status */}
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                                wsConnected
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                            <div
                                className={`w-2 h-2 rounded-full ${
                                    wsConnected
                                        ? "bg-emerald-500 animate-pulse"
                                        : "bg-rose-500"
                                }`}
                            ></div>
                            <span>
                                {wsConnected ? "Connected" : "Disconnected"}
                            </span>
                        </div>

                        {/* Robot Status Indicators */}
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full lg:w-auto">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Disc
                                        className={`w-5 h-5 ${
                                            data.robotStatus.break_status
                                                ? "text-rose-500"
                                                : "text-slate-400"
                                        }`}
                                    />
                                    {data.robotStatus.break_status && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-medium ${
                                        data.robotStatus.break_status
                                            ? "text-rose-600"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Brake
                                </span>
                            </div>

                            <div className="w-px h-6 bg-slate-200"></div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <AlertCircle
                                        className={`w-5 h-5 ${
                                            data.robotStatus.emergency_status
                                                ? "text-red-600"
                                                : "text-slate-400"
                                        }`}
                                    />
                                    {data.robotStatus.emergency_status && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-medium ${
                                        data.robotStatus.emergency_status
                                            ? "text-red-700"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Emergency
                                </span>
                            </div>

                            <div className="w-px h-6 bg-slate-200"></div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Move
                                        className={`w-5 h-5 ${
                                            data.robotStatus.Arm_moving
                                                ? "text-blue-500 animate-pulse"
                                                : "text-slate-400"
                                        }`}
                                    />
                                    {data.robotStatus.Arm_moving && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-medium ${
                                        data.robotStatus.Arm_moving
                                            ? "text-blue-600"
                                            : "text-slate-500"
                                    }`}
                                >
                                    Arm Moving
                                </span>
                            </div>
                        </div>

                        {/* Date and Time */}
                        <div className="text-right w-full lg:w-auto">
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
                </div>
            </header>

            <main className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Defects & Schedules (60%) */}
                <div className="lg:w-3/5 space-y-6">
                    {/* Defect Analysis (Inspection Summary) */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <BarChart3
                                    className="text-amber-500/80"
                                    size={24}
                                />
                                <span className="text-slate-800">
                                    Defect Analysis
                                </span>
                            </h2>

                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 bg-slate-50 border-slate-100 rounded-lg text-xs font-medium border">
                                    <span className="text-slate-600">
                                        Success:{" "}
                                    </span>
                                    <span className="text-emerald-600 font-semibold">
                                        {successRate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="flex justify-between">
                                    <h3 className="text-xs uppercase text-slate-600">
                                        Total Scanned
                                    </h3>
                                    <HardDrive
                                        size={18}
                                        className="text-blue-500"
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2">
                                    {data.inspection.total}
                                </div>
                            </div>

                            <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                                <div className="flex justify-between">
                                    <h3 className="text-xs uppercase text-slate-600">
                                        Defected
                                    </h3>
                                    <AlertTriangle
                                        size={18}
                                        className="text-rose-500"
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-rose-700">
                                    {data.inspection.defected}
                                </div>
                            </div>

                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <div className="flex justify-between">
                                    <h3 className="text-xs uppercase text-slate-600">
                                        Non-Defected
                                    </h3>
                                    <CheckCircle
                                        size={18}
                                        className="text-emerald-500"
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-emerald-700">
                                    {data.inspection.non_defected}
                                </div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <div className="flex justify-between">
                                    <h3 className="text-xs uppercase text-slate-600">
                                        Approved
                                    </h3>
                                    <CheckCheck
                                        size={18}
                                        className="text-green-500"
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-green-700">
                                    {data.inspection.approved}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="flex justify-between">
                                    <h3 className="text-xs uppercase text-slate-600">
                                        Verified
                                    </h3>
                                    <CheckCircle
                                        size={18}
                                        className="text-blue-500"
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-blue-700">
                                    {data.inspection.human_verified}
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                <div className="flex justify-between">
                                    <h3 className="text-xs uppercase text-slate-600">
                                        Pending
                                    </h3>
                                    <Clock
                                        size={18}
                                        className="text-amber-500"
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-amber-700">
                                    {data.inspection.pending_verification}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex flex-col md:flex-row justify-between mb-2 gap-2">
                                <div>
                                    <h3 className="font-medium">Defect Rate</h3>
                                    <p className="text-sm text-slate-500">
                                        {defectRate.toFixed(2)}% of scanned
                                        items have defects
                                    </p>
                                </div>
                            </div>

                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-rose-400 to-amber-400"
                                    style={{ width: `${defectRate}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Go to Schedules Button */}
                    <div className="group cursor-pointer p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Schedule Dashboard
                                </h3>
                                <p className="text-gray-600 lg:max-w-full">
                                    View detailed schedule information and
                                    inspection results with advanced filtering
                                    options.
                                </p>
                            </div>

                            <div className="relative inline-flex">
                                <a
                                    href={`/schedule?robot_id=${robotId}&filter_type=${currentFilter.filter_type}&date=${currentFilter.date || ""}&start_date=${currentFilter.start_date || ""}&end_date=${currentFilter.end_date || ""}`}
                                    className="relative z-10 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 group/btn hover:shadow-2xl"
                                >
                                    <span className="tracking-tight">
                                        Go to Schedules
                                    </span>
                                    <svg
                                        className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                                        />
                                    </svg>
                                </a>

                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500 animate-pulse-slow"></div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Management */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <CalendarCheck
                                    className="text-emerald-500/80"
                                    size={24}
                                />
                                <span className="text-slate-800">
                                    Schedule Management
                                </span>
                            </h2>
                            <button
                                onClick={() => setShowFilterModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium transition-colors w-full md:w-auto"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span>{getFilterLabel()}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase">
                                        Total
                                    </h3>
                                    <CalendarCheck
                                        className="text-blue-500/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-slate-900">
                                    {data.schedules.total}
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase">
                                        Scheduled
                                    </h3>
                                    <Calendar
                                        className="text-blue-600/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-blue-700">
                                    {data.schedules.scheduled}
                                </div>
                            </div>

                            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase">
                                        Processing
                                    </h3>
                                    <Clock
                                        className="text-amber-600/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-amber-700">
                                    {data.schedules.processing}
                                </div>
                            </div>

                            <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase">
                                        Completed
                                    </h3>
                                    <CheckCircle
                                        className="text-emerald-600/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-emerald-700">
                                    {data.schedules.completed}
                                </div>
                            </div>
                        </div>

                        <div className=" pt-6 border-t border-slate-200/50">
                            <div className="flex flex-col md:flex-row justify-between mb-2 gap-2">
                                <h3 className="font-medium text-slate-800">
                                    Schedule Progress
                                </h3>
                                <span className="text-sm text-slate-500">
                                    {data.schedules.completed} of{" "}
                                    {data.schedules.total} completed
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"
                                    style={{
                                        width: `${data.schedules.total > 0 ? (data.schedules.completed / data.schedules.total) * 100 : 0}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Battery & Camera Status (40%) */}
                <div className="lg:w-2/5 space-y-6">
                    {/* Robot Status - Split into two columns */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Robot Battery View */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                                <h2 className="text-xl font-semibold flex items-center gap-3">
                                    <Battery
                                        className="text-emerald-500/80"
                                        size={24}
                                    />
                                    <span className="text-slate-800">
                                        Robot Battery
                                    </span>
                                </h2>
                                <div
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        data.battery.status === "charging"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : data.battery.status === "low"
                                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                                              : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}
                                >
                                    {data.battery.status
                                        .charAt(0)
                                        .toUpperCase() +
                                        data.battery.status.slice(1)}
                                </div>
                            </div>

                            <div>
                                <div className="text-center mb-6">
                                    <div className="text-4xl font-bold mb-1.5 text-slate-900">
                                        {data.battery.level.toFixed(1)}%
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full rounded-full ${
                                                data.battery.level > 50
                                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                    : data.battery.level > 20
                                                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                                      : "bg-gradient-to-r from-rose-500 to-rose-400"
                                            }`}
                                            style={{
                                                width: `${data.battery.level}%`,
                                            }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between text-xs text-slate-400 mb-6">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/30">
                                            <div className="text-slate-600 text-xs font-medium mb-1">
                                                DOD
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {data.battery.dod
                                                    ? `${data.battery.dod.toFixed(0)}%`
                                                    : "N/A"}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/30">
                                            <div className="text-slate-600 text-xs font-medium mb-1">
                                                Voltage
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {data.battery.voltage
                                                    ? `${data.battery.voltage.toFixed(1)}V`
                                                    : "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Robot Location with Toggle */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <MapPin
                                        className="text-blue-500/80"
                                        size={24}
                                    />
                                    <span className="text-slate-800">
                                        Robot Location
                                    </span>
                                </h2>
                            </div>

                            {/* Stationary ←→ Autonomous toggle */}
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <span
                                    className={`text-xs font-semibold transition-colors duration-300 ${
                                        !isAutonomous
                                            ? "text-slate-800"
                                            : "text-slate-400"
                                    }`}
                                >
                                    Stationary
                                </span>

                                <button
                                    type="button"
                                    onClick={handleToggleNavigation}
                                    disabled={
                                        navPatchLoading || !isAutonomousReady
                                    }
                                    className={`relative w-14 h-7 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-300 ${
                                        !isAutonomousReady
                                            ? "opacity-50 cursor-not-allowed"
                                            : "cursor-pointer"
                                    } ${navPatchLoading ? "cursor-wait" : ""}`}
                                    style={{
                                        backgroundColor: isAutonomous
                                            ? "#2563eb"
                                            : "#cbd5e1",
                                    }}
                                    aria-label="Toggle navigation mode"
                                >
                                    {navPatchLoading && (
                                        <span className="absolute inset-0 flex items-center justify-center z-10">
                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                                        </span>
                                    )}

                                    <span
                                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md
                                            transition-transform duration-300 ease-in-out
                                            ${isAutonomous ? "translate-x-7" : "translate-x-0"}`}
                                    />
                                </button>

                                <span
                                    className={`text-xs font-semibold transition-colors duration-300 ${
                                        isAutonomous
                                            ? "text-blue-700"
                                            : "text-slate-400"
                                    }`}
                                >
                                    Autonomous
                                </span>
                            </div>

                            {/* Autonomous ready status */}
                            {!isAutonomousReady && (
                                <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Waiting for map update ready...</span>
                                </div>
                            )}

                            {/* PATCH error toast */}
                            {navPatchError && (
                                <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{navPatchError}</span>
                                    <button
                                        onClick={() => setNavPatchError(null)}
                                        className="ml-auto text-rose-400 hover:text-rose-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Autonomous content */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    isAutonomous
                                        ? "max-h-[600px] opacity-100"
                                        : "max-h-0 opacity-0"
                                }`}
                            >
                                {/* navigation_style pills */}
                                <div className="flex gap-2 mb-4">
                                    {(
                                        [
                                            ["free", "Free"],
                                            ["strict", "Strict"],
                                            [
                                                "strict_with_autonomous",
                                                "Strict Auto",
                                            ],
                                        ] as const
                                    ).map(([value, label]) => {
                                        // "Free" is always enabled
                                        // "Strict" and "Strict Auto" are only enabled when isModeActive is true
                                        const isStrictMode = value !== "free";
                                        const buttonDisabled =
                                            isStrictMode && !isModeActive;

                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    handleStyleChange(value)
                                                }
                                                disabled={
                                                    navPatchLoading ||
                                                    buttonDisabled
                                                }
                                                title={
                                                    buttonDisabled
                                                        ? "Waiting for mode activation"
                                                        : ""
                                                }
                                                className={`flex-1 text-xs font-semibold px-2 py-2 rounded-lg border transition-all duration-200
                                                    ${
                                                        navigationStyle ===
                                                        value
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                            : buttonDisabled
                                                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                                                              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-slate-800 text-sm">
                                        Recent Locations
                                    </h3>
                                    {data.locations &&
                                        data.locations.length > 0 && (
                                            <span className="text-xs text-slate-500">
                                                Map: {data.mapName}
                                            </span>
                                        )}
                                </div>

                                <div className="space-y-2 h-44 overflow-y-auto scroll-hide">
                                    {data.locations &&
                                    data.locations.length > 0 ? (
                                        data.locations.map(
                                            (location, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() =>
                                                        handleLocationClick(
                                                            location,
                                                        )
                                                    }
                                                    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50/80 text-slate-700 text-sm hover:bg-slate-100 transition-colors border border-slate-200/50 cursor-pointer active:bg-slate-200"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <span>{location}</span>
                                                </div>
                                            ),
                                        )
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-6 text-slate-400">
                                            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">
                                                No locations available
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Robot location data will appear
                                                here
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stationary placeholder */}
                            {!isAutonomous && (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Navigation className="w-10 h-10 mx-auto mb-2 opacity-25" />
                                    <p className="text-sm font-medium">
                                        Stationary Mode
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Enable autonomous to see locations
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Camera Status */}
                    <div className=" bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 gap-4">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <Camera
                                    className="text-violet-500/80"
                                    size={20}
                                />
                                <span className="text-slate-800">
                                    Camera Status
                                </span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/30">
                                <div className="text-slate-700 text-base font-semibold mb-0.5">
                                    Left Camera
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <div
                                        className={`w-2 h-2 rounded-full ${
                                            data.cameras.left.connected
                                                ? "bg-emerald-500"
                                                : "bg-red-500"
                                        }`}
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            data.cameras.left.connected
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {data.cameras.left.connected
                                            ? "Connected"
                                            : "Disconnected"}
                                    </span>
                                </div>

                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            USB Speed:
                                        </span>
                                        <span className="font-medium text-slate-900">
                                            {data.cameras.left.usb_speed ||
                                                "Unknown"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Profiles:
                                        </span>
                                        <span
                                            className={`font-medium ${
                                                !data.cameras.left.connected
                                                    ? "text-slate-400"
                                                    : data.cameras.left
                                                            .profiles_ok
                                                      ? "text-emerald-600"
                                                      : "text-red-600"
                                            }`}
                                        >
                                            {!data.cameras.left.connected
                                                ? "Unknown"
                                                : data.cameras.left.profiles_ok
                                                  ? "OK"
                                                  : "Issue"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Frames:
                                        </span>
                                        <span
                                            className={`font-medium ${
                                                !data.cameras.left.connected
                                                    ? "text-slate-400"
                                                    : data.cameras.left
                                                            .frames_ok
                                                      ? "text-emerald-600"
                                                      : "text-red-600"
                                            }`}
                                        >
                                            {!data.cameras.left.connected
                                                ? "Unknown"
                                                : data.cameras.left.frames_ok
                                                  ? "OK"
                                                  : "Issue"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/30">
                                <div className="text-slate-700 text-base font-semibold mb-0.5">
                                    Right Camera
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <div
                                        className={`w-2 h-2 rounded-full ${
                                            data.cameras.right.connected
                                                ? "bg-emerald-500"
                                                : "bg-red-500"
                                        }`}
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            data.cameras.right.connected
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {data.cameras.right.connected
                                            ? "Connected"
                                            : "Disconnected"}
                                    </span>
                                </div>

                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            USB Speed:
                                        </span>
                                        <span className="font-medium text-slate-900">
                                            {data.cameras.right.usb_speed ||
                                                "Unknown"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Profiles:
                                        </span>
                                        <span
                                            className={`font-medium ${
                                                !data.cameras.right.connected
                                                    ? "text-slate-400"
                                                    : data.cameras.right
                                                            .profiles_ok
                                                      ? "text-emerald-600"
                                                      : "text-red-600"
                                            }`}
                                        >
                                            {!data.cameras.right.connected
                                                ? "Unknown"
                                                : data.cameras.right.profiles_ok
                                                  ? "OK"
                                                  : "Issue"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Frames:
                                        </span>
                                        <span
                                            className={`font-medium ${
                                                !data.cameras.right.connected
                                                    ? "text-slate-400"
                                                    : data.cameras.right
                                                            .frames_ok
                                                      ? "text-emerald-600"
                                                      : "text-red-600"
                                            }`}
                                        >
                                            {!data.cameras.right.connected
                                                ? "Unknown"
                                                : data.cameras.right.frames_ok
                                                  ? "OK"
                                                  : "Issue"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CAN Status Section */}
                        <div className="mt-2 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-slate-800 flex items-center gap-2">
                                    <Handshake
                                        className=" text-indigo-500"
                                        size={20}
                                    />
                                    Arm Status
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div
                                    className={`p-3 rounded-lg border transition-all ${
                                        data.canStatus.can0
                                            ? "bg-emerald-50/60 border-emerald-200/50"
                                            : "bg-slate-50/60 border-slate-200/50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-slate-700">
                                            CAN0
                                        </span>
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                data.canStatus.can0
                                                    ? "bg-emerald-500 animate-pulse"
                                                    : "bg-slate-400"
                                            }`}
                                        ></div>
                                    </div>
                                    <span
                                        className={`text-sm font-medium ${
                                            data.canStatus.can0
                                                ? "text-emerald-700"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        {data.canStatus.can0
                                            ? "Online"
                                            : "Offline"}
                                    </span>
                                </div>

                                <div
                                    className={`p-3 rounded-lg border transition-all ${
                                        data.canStatus.can1
                                            ? "bg-emerald-50/60 border-emerald-200/50"
                                            : "bg-slate-50/60 border-slate-200/50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-slate-700">
                                            CAN1
                                        </span>
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                data.canStatus.can1
                                                    ? "bg-emerald-500 animate-pulse"
                                                    : "bg-slate-400"
                                            }`}
                                        ></div>
                                    </div>
                                    <span
                                        className={`text-sm font-medium ${
                                            data.canStatus.can1
                                                ? "text-emerald-700"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        {data.canStatus.can1
                                            ? "Online"
                                            : "Offline"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
