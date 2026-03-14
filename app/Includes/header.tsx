"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Cpu,
    Disc,
    AlertCircle,
    Move,
    Calendar,
    Clock,
    BatteryLow,
    BatteryMedium,
    BatteryFull,
    BatteryWarning,
    Zap,
    Settings,
    Home,
    type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { RobotData, BatteryStatus, RobotStatus } from "../types/robot";
import { fetchWithAuth, API_BASE_URL } from "../lib/auth";


/* ================================================================
   LOCAL TYPES
   ================================================================ */

interface OperationMode {
    mode: "AUTO" | "MAINTENANCE" | "NORMAL";
    speed?: number;
    inspection?: boolean;
}

interface RobotDashboardHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    robotData: RobotData | null;
    battery: BatteryStatus;
    robotStatus: RobotStatus;
    wsConnected: boolean;
    time: string;
    lastWsEvent?: string | null;
    operationMode?: OperationMode | null;
    onOperationModeUpdated?: (mode: OperationMode) => void;
    /** Your already-connected WebSocket instance */
    ws?: WebSocket | null;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const DEFAULT_ROBOT_STATUS: RobotStatus = {
    break_status: false,
    emergency_status: false,
    Arm_moving: false,
};

const ROBOT_STATUS_TIMEOUT_MS = 3000;

/* ================================================================
   HOME BUTTON
   ================================================================ */

const HomeButton = () => {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push("/userDashboard")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 active:scale-95 shadow-sm"
            title="Go to Home"
        >
            <Home className="w-4 h-4" />
            <span>Go to Home</span>
        </button>
    );
};

/* ================================================================
   OPERATION MODE BUTTON
   ================================================================ */

const OperationModeButton = ({ mode }: { mode: OperationMode | null | undefined }) => {
    const isMaintenance = mode?.mode === "MAINTENANCE";
    const isAuto = mode?.mode === "AUTO";
    const isNormal = mode?.mode === "NORMAL";

    const cs = isMaintenance
        ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" }
        : isAuto || isNormal
          ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500" }
          : { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-400", icon: "text-slate-400" };

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300 whitespace-nowrap ${cs.bg} ${cs.border} ${cs.text}`}
            title={`Operation Mode: ${mode?.mode ?? "Unknown"}`}
        >
            <Settings className={`w-4 h-4 ${cs.icon}`} />
            <span className="font-semibold">{mode?.mode ?? "AUTO"}</span>
        </div>
    );
};

/* ================================================================
   BATTERY INDICATOR
   ================================================================ */

const BatteryIndicator = ({
    level,
    status,
    minimumCharge,
}: {
    level: number;
    status: BatteryStatus["status"];
    minimumCharge: number;
}) => {
    const isBelowMin = level < minimumCharge;
    const isCharging = status === "charging";

    const Icon =
        level <= 15 ? BatteryWarning
        : level <= 35 ? BatteryLow
        : level <= 65 ? BatteryMedium
        : BatteryFull;

    const cs = isCharging
        ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500", dot: "bg-emerald-500" }
        : isBelowMin
          ? { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500", dot: "bg-rose-500" }
          : level <= 35
            ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500", dot: "bg-amber-500" }
            : { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: "text-slate-500", dot: "bg-slate-400" };

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300 whitespace-nowrap ${cs.bg} ${cs.border} ${cs.text}`}
            title={`Min required: ${minimumCharge}%`}
        >
            <div className="relative flex items-center">
                {isCharging ? (
                    <Zap className={`w-4 h-4 ${cs.icon}`} />
                ) : (
                    <Icon className={`w-4 h-4 ${cs.icon}`} />
                )}
                {isBelowMin && !isCharging && (
                    <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${cs.dot} animate-ping`} />
                )}
            </div>
            <div className="flex flex-col leading-none gap-0.5">
                <span className="font-bold">{level.toFixed(1)}%</span>
                <span className="text-[10px] opacity-70">Min: {minimumCharge}%</span>
            </div>
        </div>
    );
};

/* ================================================================
   CONNECTION STATUS
   ================================================================ */

const ConnectionStatus = ({ wsConnected }: { wsConnected: boolean }) => (
    <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300 whitespace-nowrap ${
            wsConnected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
        }`}
    >
        <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
        <span>{wsConnected ? "Connected" : "Disconnected"}</span>
    </div>
);

/* ================================================================
   ROBOT STATUS PANEL
   ================================================================ */

const RobotStatusPanel = ({ robotStatus: incoming }: { robotStatus: RobotStatus }) => {
    const [display, setDisplay] = useState<RobotStatus>(DEFAULT_ROBOT_STATUS);
    const [blinking, setBlinking] = useState<Record<keyof RobotStatus, boolean>>(
        { break_status: false, emergency_status: false, Arm_moving: false },
    );

    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blinkTimers = useRef<Partial<Record<keyof RobotStatus, ReturnType<typeof setTimeout>>>>({});

    const applyIncoming = useCallback((next: RobotStatus) => {
        setDisplay(next);
        const fields: (keyof RobotStatus)[] = ["break_status", "emergency_status", "Arm_moving"];
        fields.forEach((f) => {
            if (next[f]) {
                setBlinking((prev) => ({ ...prev, [f]: true }));
                if (blinkTimers.current[f]) clearTimeout(blinkTimers.current[f]);
                blinkTimers.current[f] = setTimeout(() => {
                    setBlinking((prev) => ({ ...prev, [f]: false }));
                }, 600);
            }
        });
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => {
            setDisplay(DEFAULT_ROBOT_STATUS);
        }, ROBOT_STATUS_TIMEOUT_MS);
    }, []);

    useEffect(() => {
        applyIncoming(incoming);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incoming.break_status, incoming.emergency_status, incoming.Arm_moving]);

    useEffect(() => {
        return () => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
            (["break_status", "emergency_status", "Arm_moving"] as (keyof RobotStatus)[]).forEach((f) => {
                if (blinkTimers.current[f]) clearTimeout(blinkTimers.current[f]);
            });
        };
    }, []);

    return (
        <>
            <style>{`
                @keyframes status-blink {
                    0%,100% { opacity:1; transform:scale(1);    }
                    25%     { opacity:.2; transform:scale(.92); }
                    50%     { opacity:1; transform:scale(1.06); }
                    75%     { opacity:.2; transform:scale(.96); }
                }
                .status-blink { animation: status-blink 0.6s ease-in-out 1; }
            `}</style>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                {/* Brake */}
                <div className="flex items-center gap-2">
                    <div className={`relative ${blinking.break_status ? "status-blink" : ""}`}>
                        <Disc className={`w-5 h-5 transition-colors duration-200 ${display.break_status ? "text-rose-500" : "text-slate-400"}`} />
                        {display.break_status && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                        )}
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-200 ${display.break_status ? "text-rose-600" : "text-slate-500"}`}>
                        Brake
                    </span>
                </div>

                <div className="w-px h-6 bg-slate-200" />

                {/* Emergency */}
                <div className="flex items-center gap-2">
                    <div className={`relative ${blinking.emergency_status ? "status-blink" : ""}`}>
                        <AlertCircle className={`w-5 h-5 transition-colors duration-200 ${display.emergency_status ? "text-red-600" : "text-slate-400"}`} />
                        {display.emergency_status && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                        )}
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-200 ${display.emergency_status ? "text-red-700" : "text-slate-500"}`}>
                        Emergency
                    </span>
                </div>

                <div className="w-px h-6 bg-slate-200" />

                {/* Arm Moving */}
                <div className="flex items-center gap-2">
                    <div className={`relative ${blinking.Arm_moving ? "status-blink" : ""}`}>
                        <Move className={`w-5 h-5 transition-colors duration-200 ${display.Arm_moving ? "text-blue-500 animate-pulse" : "text-slate-400"}`} />
                        {display.Arm_moving && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                        )}
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-200 ${display.Arm_moving ? "text-blue-600" : "text-slate-500"}`}>
                        Arm Moving
                    </span>
                </div>
            </div>
        </>
    );
};

/* ================================================================
   DATE TIME DISPLAY
   ================================================================ */

const DateTimeDisplay = ({ time }: { time: string }) => (
    <div className="text-right flex-shrink-0">
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
);

/* ================================================================
   MAIN HEADER COMPONENT
   ================================================================ */

const RobotDashboardHeader: React.FC<RobotDashboardHeaderProps> = ({
    title,
    subtitle,
    icon: Icon = Cpu,
    robotData,
    battery,
    robotStatus,
    wsConnected,
    time,
    onOperationModeUpdated,
    ws,
}) => {
    const [operationMode, setOperationMode] = useState<OperationMode | null>(null);
    const [isLoadingMode, setIsLoadingMode] = useState(false);

    const [liveMinimumCharge, setLiveMinimumCharge] = useState<number | null>(null);
    const minimumCharge = liveMinimumCharge ?? robotData?.minimum_battery_charge ?? 20;

    const hasFetchedRef = useRef(false);

    const fetchOperationMode = useCallback(
        (robotId: number | string) => {
            setIsLoadingMode(true);
            fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/operation-mode/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            })
                .then((res) => {
                    if (!res.ok) {
                        res.text().then((t) =>
                            console.error(`[operation-mode] API ${res.status}:`, t),
                        );
                        return null;
                    }
                    return res.json();
                })
                .then((result) => {
                    if (!result) { setIsLoadingMode(false); return; }
                    let mode: OperationMode | null = null;
                    if (result?.data?.operation_mode)   { mode = result.data.operation_mode; }
                    else if (result?.operation_mode)    { mode = result.operation_mode; }
                    else if (result?.mode)              { mode = result; }

                    if (mode) {
                        setOperationMode(mode);
                        onOperationModeUpdated?.(mode);
                    }
                    setIsLoadingMode(false);
                })
                .catch(() => {
                    setIsLoadingMode(false);
                });
        },
        [onOperationModeUpdated],
    );

    const fetchMinimumBatteryCharge = useCallback(() => {
        if (!robotData?.id) return;

        const url = `${API_BASE_URL}/robots/${robotData.id}/`;
        fetchWithAuth(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        })
            .then((res) => {
                if (!res.ok) {
                    res.text().then((t) =>
                        console.error(`[min-battery] API ${res.status}:`, t),
                    );
                    return null;
                }
                return res.json();
            })
            .then((result) => {
                if (!result) return;
                let minCharge: number | null = null;

                if (typeof result?.minimum_battery_charge === "number") {
                    minCharge = result.minimum_battery_charge;
                } else if (typeof result?.data?.minimum_battery_charge === "number") {
                    minCharge = result.data.minimum_battery_charge;
                } else if (typeof result?.results?.data?.minimum_battery_charge === "number") {
                    minCharge = result.results.data.minimum_battery_charge;
                } else if (typeof result?.results?.minimum_battery_charge === "number") {
                    minCharge = result.results.minimum_battery_charge;
                }

                if (minCharge !== null) {
                    setLiveMinimumCharge(minCharge);
                }
            })
            .catch((err) => console.error("[min-battery] fetch failed:", err));
    }, [robotData?.id]);

    useEffect(() => {
        if (!robotData?.id || hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchOperationMode(robotData.id);
    }, [robotData?.id, fetchOperationMode]);

    useEffect(() => {
        if (!ws) return;

        const handleMessage = (event: MessageEvent) => {
            let message: {
                event: string;
                data?: {
                    robot_id?: number;
                    robo_id?: string;
                    operation_mode?: OperationMode;
                    minimum_battery_charge?: number;
                };
            };

            try {
                const raw = event.data;
                message =
                    typeof raw === "string"
                        ? JSON.parse(raw)
                        : JSON.parse(JSON.stringify(raw));
            } catch {
                return;
            }

            if (message.event === "operation_mode_updated") {
                const robotId = message.data?.robot_id ?? robotData?.id;
                if (!robotId) return;
                fetchOperationMode(robotId);
            }

            if (message.event === "min_battery_updated") {
                const inlineValue = message.data?.minimum_battery_charge;
                if (typeof inlineValue === "number") {
                    setLiveMinimumCharge(inlineValue);
                }
                fetchMinimumBatteryCharge();
            }
        };

        ws.addEventListener("message", handleMessage);
        return () => ws.removeEventListener("message", handleMessage);
    }, [ws, robotData?.id, fetchOperationMode, fetchMinimumBatteryCharge]);

    return (
        <header className="mb-3">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-4 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">

                {/* Left: Home Button + Title + Subtitle */}
                <div className="flex-shrink-0">
                    {/* Home button — sits above and before the title */}
                    <div className="mb-2.5">
                    </div>

                    {/* Title row */}
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3">
                        <Icon className="text-slate-700 flex-shrink-0" size={28} />
                        <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            {title}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-[17px] mt-1 ml-10 font-light">
                        {subtitle ?? `Robot ID: ${robotData?.name}`}
                    </p>
                </div>

                {/* Right: Controls Grid (unchanged) */}
                <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-shrink-0">
                    {/* Top Row: Connection, Battery, Operation Mode */}
                    <div className="flex flex-wrap justify-end items-center gap-2 sm:gap-3">
                        <ConnectionStatus wsConnected={wsConnected} />
                        <HomeButton />
                        <BatteryIndicator
                            level={battery.level}
                            status={battery.status}
                            minimumCharge={minimumCharge}
                        />
                        <div className={`transition-opacity duration-300 ${isLoadingMode ? "opacity-60" : "opacity-100"}`}>
                            <OperationModeButton mode={operationMode} />
                        </div>
                    </div>

                    {/* Bottom Row: Robot Status Panel, Date/Time */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <RobotStatusPanel robotStatus={robotStatus} />
                        <DateTimeDisplay time={time} />
                    </div>
                </div>

            </div>
        </header>
    );
};

export default RobotDashboardHeader;