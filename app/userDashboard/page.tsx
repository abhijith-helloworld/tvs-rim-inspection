"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Battery,
    CalendarCheck,
    CalendarX,
    Cpu,
    AlertTriangle,
    CheckCircle,
    Activity,
    Shield,
    Zap,
    HardDrive,
    Thermometer,
    Calendar,
    Clock,
    Loader2,
    LogOut,
    Bot,
    Eye,
    ClipboardCheck,
    XCircle,
} from "lucide-react";

import { fetchWithAuth, API_BASE_URL, tokenStorage } from "../lib/auth";

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

interface RobotApi {
    id: number;
    name: string;
    robo_id: string;
    robot_type: string;
    model_number: string | null;
    local_ip: string | null;
    status: "AVAILABLE" | "IN_USE" | "OFFLINE";
    emergency: boolean;
    inspection_status: "PENDING" | "COMPLETED";
    last_inspected_at: string | null;
    is_active: boolean;
    inspection_summary: InspectionSummary;
    schedule_summary: ScheduleSummary;
}

interface RobotsApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: {
        success: boolean;
        message: string;
        data: RobotApi[];
    };
}

interface DefectMetrics {
    totalDetected: number;
    totalScanned: number;
    criticalDefects: number;
    minorDefects: number;
}

interface ScheduleMetrics {
    completed: number;
    pending: number;
    total: number;
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

interface BatteryInfo {
    sequence: number;
    voltage: number;
    current: number;
    power: number;
    soc: number;
    dod: number;
    working_hours: number;
    drop_percent: number;
}

interface Robot {
    id: number;
    name: string;
    model: string;
    status: "active" | "idle" | "offline" | "error";
    battery: number;
    uptime: string;
    health: number;
    task?: string;
    taskProgress?: number;
    ip_address?: string;
    last_seen?: string;
    firmware_version?: string;
    robo_id?: string;
    batteryInfo?: BatteryInfo;
    inspection_summary?: InspectionSummary;
    schedule_summary?: ScheduleSummary;
}

interface DashboardData {
    defects: DefectMetrics;
    schedules: ScheduleMetrics;
    battery: BatteryStatus;
}

const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData>({
        defects: {
            totalDetected: 0,
            totalScanned: 0,
            criticalDefects: 0,
            minorDefects: 0,
        },
        schedules: {
            completed: 0,
            pending: 0,
            total: 0,
        },
        battery: {
            level: 78,
            status: "discharging",
            timeRemaining: "3h 45m",
        },
    });

    const [robots, setRobots] = useState<Robot[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<
        Map<string, "connected" | "disconnected" | "connecting">
    >(new Map());
    const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);
    const router = useRouter();
    const websocketsRef = useRef<Map<string, WebSocket>>(new Map());

    const handleRobotClick = (robotId: number) => {
        // If clicking the same robot, navigate to detail page
        if (selectedRobotId === robotId) {
            console.log("Navigating to robot detail", robotId);
            router.push(`/userDashboard/${robotId}`);
        } else {
            // Otherwise, select the robot and update inspection summary
            console.log("Selected robot", robotId);
            setSelectedRobotId(robotId);
            
            const selectedRobot = robots.find(r => r.id === robotId);
            if (selectedRobot?.inspection_summary) {
                setData((prevData) => ({
                    ...prevData,
                    defects: {
                        totalDetected: selectedRobot.inspection_summary!.defected,
                        totalScanned: selectedRobot.inspection_summary!.total,
                        criticalDefects: selectedRobot.inspection_summary!.defected,
                        minorDefects: selectedRobot.inspection_summary!.non_defected,
                    },
                }));
            }
        }
    };

    const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

    // Calculate defect rate
    const defectRate =
        data.defects.totalScanned > 0
            ? (data.defects.totalDetected / data.defects.totalScanned) * 100
            : 0;

    // Determine which defect is higher
    const higherDefect =
        data.defects.criticalDefects > data.defects.minorDefects
            ? "Critical"
            : "Minor";

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Helper function to format working hours to uptime string
    const formatUptimeString = (workingHours: number): string => {
        const hours = Math.floor(workingHours);
        const decimalPart = workingHours - hours;
        const minutes = Math.round(decimalPart * 60);

        if (hours === 0 && minutes === 0) return "0m";
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    };

    // Setup WebSocket for a robot
    const setupWebSocket = (robot: Robot) => {
        if (!robot.robo_id) {
            console.warn(
                `⚠️ WebSocket not initialized: robo_id is missing for robot ${robot.name}`,
            );
            return;
        }

        const roboId = robot.robo_id;
        console.log(`🚀 Initializing WebSocket for robo_id: ${roboId}`);

        // Close existing connection if any
        if (websocketsRef.current.has(roboId)) {
            websocketsRef.current.get(roboId)?.close();
        }

        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let isManualClose = false;

        const connect = () => {
            try {
                const wsUrl = `ws://192.168.1.100:8002/ws/robot_message/${roboId}/`;
                console.log(`🔗 Attempting WebSocket connection to: ${wsUrl}`);

                const ws = new WebSocket(wsUrl);
                websocketsRef.current.set(roboId, ws);

                // Update status to connecting
                setWsStatus((prev) => new Map(prev).set(roboId, "connecting"));

                ws.onopen = () => {
                    console.log(
                        `✅ WebSocket connected for robo_id: ${roboId}`,
                    );
                    setWsStatus((prev) =>
                        new Map(prev).set(roboId, "connected"),
                    );
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        console.log(
                            `📩 WebSocket event for ${roboId}:`,
                            payload.event,
                        );

                        // Handle battery_information event only
                        if (payload.event === "battery_information") {
                            const soc = Number(payload.data?.soc) || 0;
                            const current = Number(payload.data?.current) || 0;
                            const voltage = Number(payload.data?.voltage) || 0;
                            const power = Number(payload.data?.power) || 0;
                            const dod = Number(payload.data?.dod) || 0;
                            const working_hours =
                                Number(payload.data?.working_hours) || 0;
                            const drop_percent =
                                Number(payload.data?.drop_percentage) || 0;
                            const sequence =
                                Number(payload.data?.sequence) || 0;

                            // Format working_hours to uptime string
                            const uptimeStr = formatUptimeString(working_hours);

                            setRobots((prevRobots) =>
                                prevRobots.map((r) =>
                                    r.robo_id === roboId
                                        ? {
                                              ...r,
                                              battery: soc,
                                              uptime: uptimeStr,
                                              batteryInfo: {
                                                  sequence,
                                                  voltage,
                                                  current,
                                                  power,
                                                  soc,
                                                  dod,
                                                  working_hours,
                                                  drop_percent,
                                              },
                                          }
                                        : r,
                                ),
                            );
                        }
                    } catch (err) {
                        console.error(
                            `❌ WebSocket message parse error for ${roboId}:`,
                            err,
                        );
                    }
                };

                ws.onerror = (err) => {
                    console.error(`❌ WebSocket error for ${roboId}:`, err);
                    setWsStatus((prev) =>
                        new Map(prev).set(roboId, "disconnected"),
                    );
                };

                ws.onclose = (event) => {
                    console.log(
                        `🔌 WebSocket closed for robo_id: ${roboId}`,
                        event.code,
                        event.reason,
                    );
                    setWsStatus((prev) =>
                        new Map(prev).set(roboId, "disconnected"),
                    );
                    websocketsRef.current.delete(roboId);

                    if (!isManualClose) {
                        console.log(
                            `🔄 Reconnecting in 3 seconds for ${roboId}...`,
                        );
                        reconnectTimeout = setTimeout(connect, 3000);
                    }
                };
            } catch (err) {
                console.error(`❌ WebSocket init failed for ${roboId}:`, err);
                setWsStatus((prev) =>
                    new Map(prev).set(roboId, "disconnected"),
                );
                if (!isManualClose) {
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            }
        };

        connect();

        // Cleanup function
        return () => {
            isManualClose = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (websocketsRef.current.has(roboId)) {
                websocketsRef.current.get(roboId)?.close();
                websocketsRef.current.delete(roboId);
            }
        };
    };

    // Fetch robots from API
    useEffect(() => {
        const fetchRobots = async () => {
            try {
                setLoading(true);

                const response = await fetchWithAuth(`${API_BASE_URL}/robots/`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const apiResponse: RobotsApiResponse = await response.json();

                if (!apiResponse.results.success) {
                    throw new Error(apiResponse.results.message);
                }

                // Filter only active robots
                const formattedRobots: Robot[] = apiResponse.results.data
                    .filter((robot) => robot.is_active)
                    .map((robot) => ({
                        id: robot.id,
                        name: robot.name,
                        model: robot.model_number ?? "Inspection Bot",
                        status:
                            robot.status === "AVAILABLE" ? "active" : "idle",
                        battery: 0,
                        uptime: "0h 0m",
                        health: 100,
                        task:
                            robot.inspection_status === "PENDING"
                                ? "Inspection Pending"
                                : "Inspection Completed",
                        taskProgress:
                            robot.inspection_status === "PENDING" ? 0 : 100,
                        ip_address: robot.local_ip ?? undefined,
                        last_seen: robot.last_inspected_at ?? undefined,
                        robo_id: robot.robo_id,
                        inspection_summary: robot.inspection_summary,
                        schedule_summary: robot.schedule_summary,
                    }));

                setRobots(formattedRobots);
                setError(null);

                // Update Defect Analysis section with first robot's data (initially)
                if (formattedRobots.length > 0 && formattedRobots[0].inspection_summary && !selectedRobotId) {
                    const firstRobotInspection = formattedRobots[0].inspection_summary;
                    setData((prevData) => ({
                        ...prevData,
                        defects: {
                            totalDetected: firstRobotInspection.defected,
                            totalScanned: firstRobotInspection.total,
                            criticalDefects: firstRobotInspection.defected,
                            minorDefects: firstRobotInspection.non_defected,
                        },
                    }));
                    setSelectedRobotId(formattedRobots[0].id);
                }

                // Setup WebSocket for each robot
                formattedRobots.forEach((robot) => {
                    setupWebSocket(robot);
                });
            } catch (err) {
                console.error("Robot fetch failed:", err);
                setError("Failed to load robot data");
                setRobots([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRobots();

        const interval = setInterval(fetchRobots, 30000);

        return () => {
            clearInterval(interval);
            // Close all WebSocket connections on cleanup
            websocketsRef.current.forEach((ws) => ws.close());
            websocketsRef.current.clear();
        };
    }, []);

    // Calculate statistics
    const activeRobotsCount = robots.filter(
        (r) => r.status === "active",
    ).length;
    const offlineRobotsCount = robots.filter(
        (r) => r.status === "offline",
    ).length;
    const averageBattery =
        robots.length > 0
            ? Math.round(
                  robots.reduce((sum, r) => sum + r.battery, 0) / robots.length,
              )
            : 0;

    useEffect(() => {
        if (!tokenStorage.isAuthenticated()) {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = async () => {
        try {
            // Close all WebSocket connections
            websocketsRef.current.forEach((ws) => ws.close());
            websocketsRef.current.clear();

            localStorage.clear();
            document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
            document.cookie = "role=; path=/; max-age=0; SameSite=Lax";
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/login";
        }
    };

    // Get selected robot for display
    const selectedRobot = robots.find(r => r.id === selectedRobotId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white text-slate-800 p-6 md:p-6 font-sans">
            <header className="mb-6 bg-gray-100 px-3 py-3 rounded-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
                            <Cpu className="text-slate-700" size={28} />
                            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Robot Fleet Dashboard
                            </span>
                        </h1>
                        <p className="text-slate-500 text-[17px] mt-1 ml-10 font-light">
                            User Dashboard
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <div className="text-sm font-semibold text-slate-800 bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
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

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                <div className="lg:col-span-2">
                    {/* Robots List */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-all duration-200 hover:shadow-md hover:border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <Bot className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="text-slate-800">
                                    Assigned Robots
                                </span>
                                <div className="flex items-center gap-2">
                                    {loading && (
                                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                    )}
                                    {error && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            {error}
                                        </span>
                                    )}
                                </div>
                            </h2>
                            <div className="flex gap-3">
                                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium">
                                    {robots.length} Total Robots
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium">
                                    {activeRobotsCount} Active
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm font-medium">
                                    {offlineRobotsCount} Offline
                                </div>
                            </div>
                        </div>

                        {/* Robot List */}
                        <div className="space-y-4">
                            {loading && robots.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                                        <p className="text-slate-500">
                                            Loading robot fleet...
                                        </p>
                                    </div>
                                </div>
                            ) : robots.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Bot className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                        No Active Robots Found
                                    </h3>
                                    <p className="text-slate-500 mb-4">
                                        No active robots are currently
                                        registered in the system.
                                    </p>
                                </div>
                            ) : (
                                robots.map((robot) => (
                                    <div 
                                        key={robot.id} 
                                        className="group relative"
                                    >
                                        {/* Robot Card */}
                                        <div
                                            onClick={() => handleRobotClick(robot.id)}
                                            className={`relative p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                                selectedRobotId === robot.id 
                                                    ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' 
                                                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                {/* Left: Robot Info */}
                                                <div className="flex items-center gap-4">
                                                    {/* Robot Avatar with Status */}
                                                    <div className="relative">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                            selectedRobotId === robot.id 
                                                                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200'
                                                                : 'bg-gradient-to-br from-slate-100 to-slate-200'
                                                        }`}>
                                                            <Bot className={selectedRobotId === robot.id ? 'text-emerald-600' : 'text-slate-400'} />
                                                        </div>
                                                        {/* Status Indicator */}
                                                        <div
                                                            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                                                robot.status ===
                                                                "active"
                                                                    ? "bg-emerald-500 animate-pulse"
                                                                    : robot.status ===
                                                                        "idle"
                                                                      ? "bg-amber-500"
                                                                      : robot.status ===
                                                                          "offline"
                                                                        ? "bg-slate-400"
                                                                        : "bg-rose-500"
                                                            }`}
                                                        />
                                                    </div>

                                                    {/* Robot Details */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className={`font-semibold transition-colors ${
                                                                selectedRobotId === robot.id 
                                                                    ? 'text-emerald-700'
                                                                    : 'text-slate-900 group-hover:text-emerald-700'
                                                            }`}>
                                                                {robot.name}
                                                            </h3>

                                                            {robot.ip_address && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                                                    {
                                                                        robot.ip_address
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                <Battery
                                                                    className={`w-4 h-4 ${
                                                                        robot.battery >
                                                                        50
                                                                            ? "text-emerald-500"
                                                                            : robot.battery >
                                                                                20
                                                                              ? "text-amber-500"
                                                                              : "text-rose-500"
                                                                    }`}
                                                                />
                                                                <span
                                                                    className={`font-medium ${
                                                                        robot.battery >
                                                                        50
                                                                            ? "text-emerald-600"
                                                                            : robot.battery >
                                                                                20
                                                                              ? "text-amber-600"
                                                                              : "text-rose-600"
                                                                    }`}
                                                                >
                                                                    {
                                                                        robot.battery
                                                                    }
                                                                    %
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-4 h-4 text-slate-400" />
                                                                <span className="text-slate-600">
                                                                    {
                                                                        robot.uptime
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Action & Status */}
                                                <div className="flex items-center gap-4">
                                                    {/* Status Badge */}
                                                    <div
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                            robot.status ===
                                                            "active"
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : robot.status ===
                                                                    "idle"
                                                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                  : robot.status ===
                                                                      "offline"
                                                                    ? "bg-slate-100 text-slate-700 border border-slate-300"
                                                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                                        }`}
                                                    >
                                                        {robot.status
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            robot.status.slice(
                                                                1,
                                                            )}
                                                    </div>

                                                    {/* Arrow Indicator */}
                                                    <div className={`transition-opacity duration-200 ${
                                                        selectedRobotId === robot.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        <svg
                                                            className="w-5 h-5 text-emerald-500"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M9 5l7 7-7 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mt-3">
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>Task Progress</span>
                                                    <span>
                                                        {robot.taskProgress ||
                                                            0}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            robot.taskProgress &&
                                                            robot.taskProgress >
                                                                50
                                                                ? "bg-emerald-500"
                                                                : "bg-amber-500"
                                                        }`}
                                                        style={{
                                                            width: `${robot.taskProgress || 0}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Helper Text */}
                                            {selectedRobotId === robot.id && (
                                                <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                                                    <Eye className="w-3 h-3" />
                                                    <span>Click again to view details • Inspection summary shown on right →</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Defect Analysis */}
                <div className="lg:col-span-1">
                    {/* Defect Metrics */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-all duration-200 hover:shadow-md hover:border-slate-200 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <BarChart3
                                    className="text-amber-500/80"
                                    size={24}
                                />
                                <span className="text-slate-800">
                                    Inspection Summary
                                </span>
                            </h2>
                            <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-medium border border-slate-200/50">
                                <span className="text-slate-600">
                                    Scan Success:{" "}
                                </span>
                                <span className="text-emerald-600 font-semibold">
                                    {data.defects.totalScanned > 0
                                        ? (
                                              ((data.defects.totalScanned -
                                                  data.defects.totalDetected) /
                                                  data.defects.totalScanned) *
                                              100
                                          ).toFixed(1)
                                        : "0.0"}
                                    %
                                </span>
                            </div>
                        </div>

                        {/* Show selected robot name */}
                        {selectedRobot && (
                            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-medium text-emerald-900">
                                        Showing data for: {selectedRobot.name}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                            <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/50 transition-all duration-150 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase tracking-wide">
                                        Total Detected
                                    </h3>
                                    <AlertTriangle
                                        className="text-rose-500/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-slate-900">
                                    {data.defects.totalDetected}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Defects found
                                </div>
                            </div>

                            <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/50 transition-all duration-150 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase tracking-wide">
                                        Total Scanned
                                    </h3>
                                    <HardDrive
                                        className="text-blue-500/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-slate-900">
                                    {data.defects.totalScanned}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    RIMs inspected
                                </div>
                            </div>

                            <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-200/30 transition-all duration-150 hover:bg-rose-50/70">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase tracking-wide">
                                        Critical Defects
                                    </h3>
                                    <AlertTriangle
                                        className="text-rose-600/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-rose-700">
                                    {data.defects.criticalDefects}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Immediate action required
                                </div>
                            </div>

                            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/30 transition-all duration-150 hover:bg-amber-50/70">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-600 text-xs font-medium uppercase tracking-wide">
                                        Minor Defects
                                    </h3>
                                    <AlertTriangle
                                        className="text-amber-600/80"
                                        size={18}
                                    />
                                </div>
                                <div className="text-2xl font-bold mt-2 text-amber-700">
                                    {data.defects.minorDefects}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Can be scheduled
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200/50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Activity
                                        className="text-violet-500/80"
                                        size={20}
                                    />
                                    <div>
                                        <h3 className="font-medium text-slate-800">
                                            Defect Rate
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {defectRate.toFixed(2)}% of scanned
                                            items have defects
                                        </p>
                                    </div>
                                </div>
                                <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200/50">
                                    <span className="text-slate-600 text-sm">
                                        Higher defect count:{" "}
                                    </span>
                                    <span
                                        className={`font-semibold ${higherDefect === "Critical" ? "text-rose-600" : "text-amber-600"}`}
                                    >
                                        {higherDefect}
                                    </span>
                                    <span className="text-slate-500 text-sm ml-1">
                                        (
                                        {higherDefect === "Critical"
                                            ? data.defects.criticalDefects
                                            : data.defects.minorDefects}
                                        )
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-rose-400/90 to-amber-400/90 rounded-full"
                                    style={{ width: `${defectRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;