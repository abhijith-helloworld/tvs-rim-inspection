"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import {
    BarChart3,
    Battery,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Clock,
    HardDrive,
    CalendarCheck,
    Zap,
    Loader2,
    Camera,
    AlertCircle,
    Move,
    Filter,
    CheckCheck,
    X,
    Navigation,
    MapPin,
    Handshake,
} from "lucide-react";
import RobotDashboardHeader from "@/app/Includes/header";

/* ================================================================
   SHARED TYPES
   ================================================================ */

export interface RobotData {
    id: string;
    name: string;
    status: string;
    robo_id?: string;
    minimum_battery_charge?: number;
}

export interface BatteryStatus {
    level: number;
    status: "charging" | "discharging" | "full" | "low";
    timeRemaining: string;
    voltage?: number;
    current?: number;
    power?: number;
    dod?: number;
}

export interface RobotStatus {
    break_status: boolean;
    emergency_status: boolean;
    Arm_moving: boolean;
}

/* ================================================================
   OTHER LOCAL TYPES
   ================================================================ */

interface CameraStatus {
    connected: boolean;
    usb_speed: string;
    profiles_ok: boolean;
    frames_ok: boolean;
}

interface CanStatus {
    can0: boolean;
    can1: boolean;
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

export interface FilterData {
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
    cameras: { left: CameraStatus; right: CameraStatus };
    locations?: string[];
    mapName?: string;
    robotStatus: RobotStatus;
    canStatus: CanStatus;
}

/* ================================================================
   DEFAULT VALUES
   ================================================================ */

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
   FILTER MODAL
   ================================================================ */

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
        currentFilter.date ?? new Date().toISOString().split("T")[0],
    );
    const [startDate, setStartDate] = useState(currentFilter.start_date ?? "");
    const [endDate, setEndDate] = useState(currentFilter.end_date ?? "");

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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                        Filter Schedules
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Filter Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(["day", "week", "month", "range"] as const).map(
                                (type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                                            filterType === type
                                                ? "bg-emerald-500 text-white shadow-sm"
                                                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                        }`}
                                    >
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    {filterType !== "range" ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) =>
                                    setSelectedDate(e.target.value)
                                }
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(["start", "end"] as const).map((which) => (
                                <div key={which}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {which === "start" ? "Start" : "End"}{" "}
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={
                                            which === "start"
                                                ? startDate
                                                : endDate
                                        }
                                        onChange={(e) =>
                                            which === "start"
                                                ? setStartDate(e.target.value)
                                                : setEndDate(e.target.value)
                                        }
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-6 py-2.5 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                        Apply Filter
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ================================================================
   MAP NOT UPLOADED POPUP
   ================================================================ */

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
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 text-center">
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
    );
};

/* ================================================================
   LOW BATTERY WARNING POPUP
   ================================================================ */

const LowBatteryWarningPopup = ({
    isOpen,
    onClose,
    batteryLevel,
    minimumThreshold,
}: {
    isOpen: boolean;
    onClose: () => void;
    batteryLevel: number;
    minimumThreshold: number;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-rose-200 p-6 text-center">
                <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                    <Battery className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Low Battery Warning
                </h3>
                <p className="text-slate-600 mb-4">
                    Battery level is critically low at{" "}
                    <span className="font-bold text-rose-600">
                        {batteryLevel.toFixed(1)}%
                    </span>
                </p>
                <p className="text-sm text-slate-500 mb-6">
                    Minimum required: {minimumThreshold}%<br />
                    Please charge the robot immediately.
                </p>
                <button
                    onClick={onClose}
                    className="w-full px-6 py-3 rounded-xl font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg"
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
};

/* ================================================================
   MAIN DASHBOARD COMPONENT
   ================================================================ */

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

    /* ---- navigation state ---- */
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
    const [showMapNotUploadedPopup, setShowMapNotUploadedPopup] = useState(false);

    /* ---- low battery warning state ---- */
    const [showLowBatteryPopup, setShowLowBatteryPopup] = useState(false);
    const [lowBatteryAcknowledged, setLowBatteryAcknowledged] = useState(false);

    /* ---- location loading state ---- */
    const [locationLoading, setLocationLoading] = useState(false);

    const [wsConnected, setWsConnected] = useState(false);
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
        schedules: { total: 0, scheduled: 0, processing: 0, completed: 0 },
        battery: DEFAULT_BATTERY,
        arm: {
            connected: true,
            temperature: 42.5,
            position: { x: 125.4, y: 87.2, z: 56.8 },
            velocity: 2.5,
            gripperStatus: "open",
            joints: [
                { id: 1, name: "Base",     position: 45,  status: "normal"  },
                { id: 2, name: "Shoulder", position: 120, status: "normal"  },
                { id: 3, name: "Elbow",    position: 90,  status: "warning" },
                { id: 4, name: "Wrist",    position: 60,  status: "normal"  },
                { id: 5, name: "Gripper",  position: 30,  status: "normal"  },
            ],
        },
        cameras: {
            left:  { connected: false, usb_speed: "", profiles_ok: false, frames_ok: false },
            right: { connected: false, usb_speed: "", profiles_ok: false, frames_ok: false },
        },
        locations: [],
        mapName: undefined,
        robotStatus: DEFAULT_ROBOT_STATUS,
        canStatus: { can0: false, can1: false },
    });

    const [time, setTime] = useState(new Date().toLocaleTimeString());

    /* ── Get robot ID from URL path ── */
    useEffect(() => {
        const parts = window.location.pathname.split("/");
        setRobotId(parts[parts.length - 1]);
    }, []);

    /* ── Fetch robot data ── */
    useEffect(() => {
        if (!robotId) return;
        const fetchRobotData = async () => {
            try {
                setLoading(true);
                const res = await fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/`);
                if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
                const result = await res.json();
                const robot: RobotData = result.data;
                setRobotData(robot);
                if (robot.robo_id) setRoboId(robot.robo_id);
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

    /* ── Low battery check ── */
    useEffect(() => {
        if (!robotData?.minimum_battery_charge) return;
        const { level, status } = data.battery;
        const min = robotData.minimum_battery_charge;
        const isDischarging = status === "discharging" || status === "low";

        if (level < min && isDischarging && !lowBatteryAcknowledged) {
            setShowLowBatteryPopup(true);
        } else if (level >= min || status === "charging" || status === "full") {
            setLowBatteryAcknowledged(false);
            setShowLowBatteryPopup(false);
        }
    }, [data.battery.level, data.battery.status, robotData, lowBatteryAcknowledged]);

    /* ── Fetch filtered schedule + inspection data ── */
    useEffect(() => {
        if (!robotId) return;
        const fetchFilteredData = async () => {
            try {
                const res = await fetchWithAuth(
                    `${API_BASE_URL}/schedule/robot/${robotId}/filter/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(currentFilter),
                    },
                );
                if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
                const result = await res.json();

                setData((prev) => ({
                    ...prev,
                    ...(result.schedule_summary && {
                        schedules: {
                            total:      result.schedule_summary.total      ?? 0,
                            scheduled:  result.schedule_summary.scheduled  ?? 0,
                            processing: result.schedule_summary.processing ?? 0,
                            completed:  result.schedule_summary.completed  ?? 0,
                        },
                    }),
                    ...(result.inspection_summary && {
                        inspection: {
                            total:                result.inspection_summary.total                ?? 0,
                            defected:             result.inspection_summary.defected             ?? 0,
                            non_defected:         result.inspection_summary.non_defected         ?? 0,
                            approved:             result.inspection_summary.approved             ?? 0,
                            human_verified:       result.inspection_summary.human_verified       ?? 0,
                            pending_verification: result.inspection_summary.pending_verification ?? 0,
                        },
                    }),
                }));
            } catch (err) {
                console.error("Error fetching filtered data:", err);
            }
        };
        fetchFilteredData();
    }, [robotId, currentFilter]);

    /* ================================================================
       FETCH LOCATIONS — extracted as a reusable callback so both the
       initial load AND the upload_clicked WS event can call it
       ================================================================ */
    const fetchLocations = useCallback(async (id: string) => {
        if (!id) return;
        try {
            setLocationLoading(true);
            const res = await fetchWithAuth(`${API_BASE_URL}/robots/${id}/location/`);
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            const result = await res.json();
            const locationData = result?.data?.location_data?.data;
            const locationsArray = Object.values(
                locationData?.locations ?? {},
            ).filter(Boolean) as string[];
            setData((prev) => ({
                ...prev,
                locations: locationsArray,
                mapName: locationData?.map_name ?? "",
            }));
        } catch (err) {
            console.error("Error fetching locations:", err);
        } finally {
            setLocationLoading(false);
        }
    }, []);

    /* ── Initial location fetch ── */
    useEffect(() => {
        if (!robotId) return;
        fetchLocations(robotId);
    }, [robotId, fetchLocations]);

    /* ── Clock ── */
    useEffect(() => {
        const interval = setInterval(
            () => setTime(new Date().toLocaleTimeString()),
            1000,
        );
        return () => clearInterval(interval);
    }, []);

    /* ── Location click via WebSocket ── */
    const handleLocationClick = useCallback(
        (locationName: string) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.warn("⚠️ WebSocket not connected.");
                return;
            }
            wsRef.current.send(
                JSON.stringify({
                    event: "move_to_location",
                    data: {
                        location_name: locationName.trim(),
                        navigation_style: navigationStyle,
                        status: true,
                    },
                }),
            );
        },
        [navigationStyle],
    );

    /* ── PATCH navigation ── */
    const patchNavigation = useCallback(
        async (
            mode: "stationary" | "autonomous",
            style?: "free" | "strict" | "strict_with_autonomous",
        ) => {
            if (!robotId) return;
            setNavPatchLoading(true);
            setNavPatchError(null);
            const payload: NavigationPayload = { navigation_mode: mode };
            if (mode === "autonomous" && style)
                payload.navigation_style = style;

            try {
                const res = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/navigation/`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    },
                );
                if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
            } catch (err) {
                console.error("❌ Navigation PATCH error:", err);
                setNavPatchError("Failed to update navigation");
                setNavigationMode((prev) =>
                    prev === "autonomous" ? "stationary" : "autonomous",
                );
            } finally {
                setNavPatchLoading(false);
            }
        },
        [robotId],
    );

    const handleToggleNavigation = useCallback(() => {
        if (!isAutonomousReady) {
            setShowMapNotUploadedPopup(true);
            return;
        }
        if (navPatchLoading) return;
        const next = navigationMode === "stationary" ? "autonomous" : "stationary";
        setNavigationMode(next);
        patchNavigation(next, next === "autonomous" ? navigationStyle : undefined);
    }, [isAutonomousReady, navPatchLoading, navigationMode, navigationStyle, patchNavigation]);

    const handleStyleChange = useCallback(
        (style: "free" | "strict" | "strict_with_autonomous") => {
            if (navPatchLoading) return;
            setNavigationStyle(style);
            patchNavigation(navigationMode, style);
        },
        [navPatchLoading, navigationMode, patchNavigation],
    );

    const handleLowBatteryClose = useCallback(() => {
        setShowLowBatteryPopup(false);
        setLowBatteryAcknowledged(true);
    }, []);

    /* ================================================================
       WEBSOCKET
       — upload_clicked event: status:true → refetch locations
       ================================================================ */
    useEffect(() => {
        if (!roboId) return;
        let isManualClose = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;

        const connect = () => {
            try {
                ws = new WebSocket(
                    `ws://192.168.0.216:8002/ws/robot_message/${roboId}/`,
                );
                wsRef.current = ws;

                ws.onopen = () => setWsConnected(true);

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data as string);

                        /* ── upload_clicked ──────────────────────────────
                           When the user uploads a new map on the robot,
                           the WS fires this event with status:true.
                           We immediately refetch /robots/${robotId}/location/
                           so the location list reflects the new map.
                        ─────────────────────────────────────────────── */
                        if (payload.event === "upload_clicked") {
                            if (payload.data?.status === true) {
                                console.log("📍 upload_clicked received — refreshing locations...");
                                fetchLocations(robotId);
                            }
                        }

                        if (payload.event === "robot_status") {
                            setData((prev) => ({
                                ...prev,
                                robotStatus: {
                                    break_status:
                                        payload.data.break_status     ?? prev.robotStatus.break_status,
                                    emergency_status:
                                        payload.data.emergency_status ?? prev.robotStatus.emergency_status,
                                    Arm_moving:
                                        payload.data.Arm_moving       ?? prev.robotStatus.Arm_moving,
                                },
                            }));
                        }

                        if (payload.event === "can_status") {
                            setData((prev) => ({
                                ...prev,
                                canStatus: {
                                    can0: payload.data.can0 ?? prev.canStatus.can0,
                                    can1: payload.data.can1 ?? prev.canStatus.can1,
                                },
                            }));
                        }

                        if (payload.event === "camera_status_update") {
                            setData((prev) => ({
                                ...prev,
                                cameras: {
                                    left: {
                                        connected:   payload.data.left_camera?.connected   ?? prev.cameras.left.connected,
                                        usb_speed:   payload.data.left_camera?.usb_speed   ?? prev.cameras.left.usb_speed,
                                        profiles_ok: payload.data.left_camera?.profiles_ok ?? prev.cameras.left.profiles_ok,
                                        frames_ok:   payload.data.left_camera?.frames_ok   ?? prev.cameras.left.frames_ok,
                                    },
                                    right: {
                                        connected:   payload.data.right_camera?.connected   ?? prev.cameras.right.connected,
                                        usb_speed:   payload.data.right_camera?.usb_speed   ?? prev.cameras.right.usb_speed,
                                        profiles_ok: payload.data.right_camera?.profiles_ok ?? prev.cameras.right.profiles_ok,
                                        frames_ok:   payload.data.right_camera?.frames_ok   ?? prev.cameras.right.frames_ok,
                                    },
                                },
                            }));
                        }

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

                            const hours   = Math.floor(soc / 20);
                            const minutes = Math.floor((soc % 20) * 3);

                            setData((prev) => ({
                                ...prev,
                                battery: {
                                    level: soc,
                                    status,
                                    timeRemaining: `${hours}h ${minutes}m`,
                                    voltage,
                                    current,
                                    power,
                                    dod,
                                },
                            }));
                        }

                        if (payload.event === "autonomous_ready") {
                            setIsAutonomousReady(payload.data?.status === true);
                            setIsModeActive(payload.data?.mode_active === true);
                        }
                    } catch (err) {
                        console.error("❌ WS message parse error:", err);
                    }
                };

                ws.onerror = (err) => console.error("❌ WS error:", err);

                ws.onclose = () => {
                    setWsConnected(false);
                    wsRef.current = null;
                    if (!isManualClose)
                        reconnectTimeout = setTimeout(connect, 3000);
                };
            } catch (err) {
                console.error("❌ WS init failed:", err);
                if (!isManualClose)
                    reconnectTimeout = setTimeout(connect, 3000);
            }
        };

        connect();
        return () => {
            isManualClose = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            ws?.close();
            wsRef.current = null;
        };
    // fetchLocations is stable (useCallback with no deps that change),
    // so including it here is safe and fixes the eslint exhaustive-deps warning
    }, [roboId, fetchLocations, robotId]);

    /* ── Derived values ── */
    const defectRate =
        data.inspection.total > 0
            ? (data.inspection.defected / data.inspection.total) * 100
            : 0;
    const successRate =
        data.inspection.total > 0
            ? ((data.inspection.total - data.inspection.defected) / data.inspection.total) * 100
            : 0;
    const isAutonomous = navigationMode === "autonomous";

    const getFilterLabel = () => {
        switch (currentFilter.filter_type) {
            case "day":   return `Day: ${currentFilter.date}`;
            case "week":  return `Week of ${currentFilter.date}`;
            case "month": return `Month of ${currentFilter.date}`;
            case "range": return `${currentFilter.start_date} – ${currentFilter.end_date}`;
            default:      return "All Time";
        }
    };

    /* ── Loading / error states ── */
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg">Loading robot data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <p className="text-slate-800 text-lg font-semibold mb-2">Error Loading Dashboard</p>
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

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <div className="bg-gradient-to-br from-slate-50 to-white text-slate-800 p-6 font-sans w-full">
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
            <LowBatteryWarningPopup
                isOpen={showLowBatteryPopup}
                onClose={handleLowBatteryClose}
                batteryLevel={data.battery.level}
                minimumThreshold={robotData?.minimum_battery_charge ?? 20}
            />

            <RobotDashboardHeader
                title="Robotic Inspection Dashboard"
                subtitle={`Robot ID: ${robotData?.name ?? "N/A"}`}
                robotData={robotData}
                battery={data.battery}
                robotStatus={data.robotStatus}
                wsConnected={wsConnected}
                time={time}
            />

            <main className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* ── LEFT COLUMN (60%) ── */}
                <div className="lg:w-3/5 space-y-6">
                    {/* Defect Analysis */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <BarChart3 className="text-amber-500/80" size={24} />
                                <span className="text-slate-800">Defect Analysis</span>
                            </h2>
                            <div className="px-3 py-1.5 bg-slate-50 border-slate-100 rounded-lg text-xs font-medium border">
                                <span className="text-slate-600">Success: </span>
                                <span className="text-emerald-600 font-semibold">
                                    {successRate.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { label: "Total Scanned", value: data.inspection.total,                icon: <HardDrive   size={18} className="text-blue-500"    />, bg: "bg-slate-50",   border: "border-slate-100",   text: "text-slate-900"   },
                                { label: "Defected",      value: data.inspection.defected,             icon: <AlertTriangle size={18} className="text-rose-500"  />, bg: "bg-rose-50",    border: "border-rose-100",    text: "text-rose-700"    },
                                { label: "Non-Defected",  value: data.inspection.non_defected,         icon: <CheckCircle size={18} className="text-emerald-500"  />, bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700" },
                                { label: "Approved",      value: data.inspection.approved,             icon: <CheckCheck  size={18} className="text-green-500"    />, bg: "bg-green-50",   border: "border-green-100",   text: "text-green-700"   },
                                { label: "Verified",      value: data.inspection.human_verified,       icon: <CheckCircle size={18} className="text-blue-500"     />, bg: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-700"    },
                                { label: "Pending",       value: data.inspection.pending_verification, icon: <Clock       size={18} className="text-amber-500"    />, bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-700"   },
                            ].map(({ label, value, icon, bg, border, text }) => (
                                <div key={label} className={`${bg} p-4 rounded-lg border ${border}`}>
                                    <div className="flex justify-between">
                                        <h3 className="text-xs uppercase text-slate-600">{label}</h3>
                                        {icon}
                                    </div>
                                    <div className={`text-2xl font-bold mt-2 ${text}`}>{value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <div className="flex flex-col md:flex-row justify-between mb-2 gap-2">
                                <div>
                                    <h3 className="font-medium">Defect Rate</h3>
                                    <p className="text-sm text-slate-500">
                                        {defectRate.toFixed(2)}% of scanned items have defects
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

                    {/* Go to Schedules */}
                    <div className="group cursor-pointer p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-gray-900">Schedule Dashboard</h3>
                                <p className="text-gray-600">
                                    View detailed schedule information and inspection results with advanced filtering options.
                                </p>
                            </div>
                            <div className="relative inline-flex">
                                <a
                                    href={`/schedule?robot_id=${robotId}&filter_type=${currentFilter.filter_type}&date=${currentFilter.date ?? ""}&start_date=${currentFilter.start_date ?? ""}&end_date=${currentFilter.end_date ?? ""}`}
                                    className="relative z-10 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 group/btn hover:shadow-2xl"
                                >
                                    <span className="tracking-tight">Go to Schedules</span>
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
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 rounded-xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Management */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <CalendarCheck className="text-emerald-500/80" size={24} />
                                <span className="text-slate-800">Schedule Management</span>
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
                            {[
                                { label: "Total",      value: data.schedules.total,      icon: <CalendarCheck className="text-blue-500/80"    size={18} />, bg: "bg-slate-50/70",   border: "border-slate-200/50",   text: "text-slate-900"   },
                                { label: "Scheduled",  value: data.schedules.scheduled,  icon: <Calendar      className="text-blue-600/80"    size={18} />, bg: "bg-blue-50/50",    border: "border-blue-200/30",    text: "text-blue-700"    },
                                { label: "Processing", value: data.schedules.processing, icon: <Clock        className="text-amber-600/80"   size={18} />, bg: "bg-amber-50/50",   border: "border-amber-200/30",   text: "text-amber-700"   },
                                { label: "Completed",  value: data.schedules.completed,  icon: <CheckCircle  className="text-emerald-600/80" size={18} />, bg: "bg-emerald-50/50", border: "border-emerald-200/30", text: "text-emerald-700" },
                            ].map(({ label, value, icon, bg, border, text }) => (
                                <div key={label} className={`${bg} p-4 rounded-lg border ${border}`}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-slate-600 text-xs font-medium uppercase">{label}</h3>
                                        {icon}
                                    </div>
                                    <div className={`text-2xl font-bold mt-2 ${text}`}>{value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-slate-200/50">
                            <div className="flex flex-col md:flex-row justify-between mb-2 gap-2">
                                <h3 className="font-medium text-slate-800">Schedule Progress</h3>
                                <span className="text-sm text-slate-500">
                                    {data.schedules.completed} of {data.schedules.total} completed
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"
                                    style={{
                                        width: `${data.schedules.total > 0 ? (data.schedules.completed / data.schedules.total) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN (40%) ── */}
                <div className="lg:w-2/5 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Battery */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                                <h2 className="text-xl font-semibold flex items-center gap-3">
                                    <Battery className="text-emerald-500/80" size={24} />
                                    <span className="text-slate-800">Robot Battery</span>
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
                                    {data.battery.status.charAt(0).toUpperCase() + data.battery.status.slice(1)}
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <div className="text-4xl font-bold mb-1.5 text-slate-900">
                                    {data.battery.level.toFixed(1)}%
                                </div>
                            </div>

                            <div className="h-6 bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div
                                    className={`h-full rounded-full ${
                                        data.battery.level > 50
                                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            : data.battery.level > 20
                                              ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                              : "bg-gradient-to-r from-rose-500 to-rose-400"
                                    }`}
                                    style={{ width: `${data.battery.level}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mb-6">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/30">
                                    <div className="text-slate-600 text-xs font-medium mb-1">DOD</div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {data.battery.dod ? `${data.battery.dod.toFixed(0)}%` : "N/A"}
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/30">
                                    <div className="text-slate-600 text-xs font-medium mb-1">Voltage</div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {data.battery.voltage ? `${data.battery.voltage.toFixed(1)}V` : "N/A"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Robot Location */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <MapPin className="text-blue-500/80" size={24} />
                                    <span className="text-slate-800">Robot Location</span>
                                </h2>
                                {/* ── Loading spinner shown while fetching locations ── */}
                                {locationLoading && (
                                    <div className="flex items-center gap-1.5 text-xs text-blue-600">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Updating...</span>
                                    </div>
                                )}
                            </div>

                            {/* Stationary ←→ Autonomous toggle */}
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <span className={`text-xs font-semibold transition-colors duration-300 ${!isAutonomous ? "text-slate-800" : "text-slate-400"}`}>
                                    Stationary
                                </span>
                                <button
                                    type="button"
                                    onClick={handleToggleNavigation}
                                    disabled={navPatchLoading || !isAutonomousReady}
                                    className={`relative w-14 h-7 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-300 ${!isAutonomousReady ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${navPatchLoading ? "cursor-wait" : ""}`}
                                    style={{ backgroundColor: isAutonomous ? "#2563eb" : "#cbd5e1" }}
                                    aria-label="Toggle navigation mode"
                                >
                                    {navPatchLoading && (
                                        <span className="absolute inset-0 flex items-center justify-center z-10">
                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                                        </span>
                                    )}
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${isAutonomous ? "translate-x-7" : "translate-x-0"}`}
                                    />
                                </button>
                                <span className={`text-xs font-semibold transition-colors duration-300 ${isAutonomous ? "text-blue-700" : "text-slate-400"}`}>
                                    Autonomous
                                </span>
                            </div>

                            {!isAutonomousReady && (
                                <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Waiting for map update ready...</span>
                                </div>
                            )}

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

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAutonomous ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                                <div className="flex gap-2 mb-4">
                                    {(
                                        [
                                            ["free",                   "Free"       ],
                                            ["strict",                 "Strict"     ],
                                            ["strict_with_autonomous", "Strict Auto"],
                                        ] as const
                                    ).map(([value, label]) => {
                                        const disabled = value !== "free" && !isModeActive;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => handleStyleChange(value)}
                                                disabled={navPatchLoading || disabled}
                                                title={disabled ? "Waiting for mode activation" : ""}
                                                className={`flex-1 text-xs font-semibold px-2 py-2 rounded-lg border transition-all duration-200 ${
                                                    navigationStyle === value
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : disabled
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
                                    <h3 className="font-medium text-slate-800 text-sm">Recent Locations</h3>
                                    {data.locations && data.locations.length > 0 && (
                                        <span className="text-xs text-slate-500">Map: {data.mapName}</span>
                                    )}
                                </div>

                                <div className="space-y-2 h-44 overflow-y-auto">
                                    {locationLoading ? (
                                        /* ── Skeleton while locations are being refreshed ── */
                                        <div className="flex flex-col items-center justify-center h-full py-6 text-slate-400">
                                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-400" />
                                            <p className="text-sm">Loading locations...</p>
                                        </div>
                                    ) : data.locations && data.locations.length > 0 ? (
                                        data.locations.map((location, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleLocationClick(location)}
                                                className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50/80 text-slate-700 text-sm hover:bg-slate-100 transition-colors border border-slate-200/50 cursor-pointer active:bg-slate-200"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                <span>{location}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-6 text-slate-400">
                                            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">No locations available</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Robot location data will appear here
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isAutonomous && (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Navigation className="w-10 h-10 mx-auto mb-2 opacity-25" />
                                    <p className="text-sm font-medium">Stationary Mode</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Enable autonomous to see locations
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Camera Status */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-xl font-semibold flex items-center gap-3 mb-4">
                            <Camera className="text-violet-500/80" size={20} />
                            <span className="text-slate-800">Camera Status</span>
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            {(["left", "right"] as const).map((side) => {
                                const cam = data.cameras[side];
                                return (
                                    <div key={side} className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/30">
                                        <div className="text-slate-700 text-base font-semibold mb-0.5 capitalize">
                                            {side} Camera
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${cam.connected ? "bg-emerald-500" : "bg-red-500"}`} />
                                            <span className={`text-xs font-medium ${cam.connected ? "text-emerald-600" : "text-red-600"}`}>
                                                {cam.connected ? "Connected" : "Disconnected"}
                                            </span>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {[
                                                { label: "USB Speed", value: cam.usb_speed || "Unknown", conditional: false },
                                                { label: "Profiles",  value: !cam.connected ? "Unknown" : cam.profiles_ok ? "OK" : "Issue", conditional: true, ok: cam.profiles_ok },
                                                { label: "Frames",    value: !cam.connected ? "Unknown" : cam.frames_ok   ? "OK" : "Issue", conditional: true, ok: cam.frames_ok   },
                                            ].map(({ label, value, conditional, ok }) => (
                                                <div key={label} className="flex justify-between text-xs">
                                                    <span className="text-slate-500">{label}:</span>
                                                    <span
                                                        className={`font-medium ${
                                                            !conditional
                                                                ? "text-slate-900"
                                                                : !cam.connected
                                                                  ? "text-slate-400"
                                                                  : ok
                                                                    ? "text-emerald-600"
                                                                    : "text-red-600"
                                                        }`}
                                                    >
                                                        {value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CAN / Arm Status */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h3 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
                                <Handshake className="text-indigo-500" size={20} />
                                Arm Status
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {(["can0", "can1"] as const).map((can) => (
                                    <div
                                        key={can}
                                        className={`p-3 rounded-lg border transition-all ${data.canStatus[can] ? "bg-emerald-50/60 border-emerald-200/50" : "bg-slate-50/60 border-slate-200/50"}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold text-slate-700 uppercase">{can}</span>
                                            <div className={`w-2 h-2 rounded-full ${data.canStatus[can] ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                        </div>
                                        <span className={`text-sm font-medium ${data.canStatus[can] ? "text-emerald-700" : "text-slate-600"}`}>
                                            {data.canStatus[can] ? "Online" : "Offline"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;