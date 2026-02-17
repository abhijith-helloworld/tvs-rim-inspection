"use client";

import React from "react";
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
    type LucideIcon,
} from "lucide-react";

/* ================= TYPES ================= */

interface BatteryStatus {
    level: number;
    status: "charging" | "discharging" | "full" | "low";
    timeRemaining: string;
    voltage?: number;
    current?: number;
    power?: number;
    dod?: number;
}

interface RobotStatus {
    break_status: boolean;
    emergency_status: boolean;
    Arm_moving: boolean;
}

interface RobotData {
    id: string;
    name: string;
    status: string;
    robo_id?: string;
    minimum_battery_charge?: number;
}

interface RobotDashboardHeaderProps {
    /** Page title shown in the gradient text — pass any string per page */
    title: string;
    /** Subtitle under the title. Defaults to "Robot ID: {robotData.name}" if not passed */
    subtitle?: string;
    /** Lucide icon left of the title. Defaults to Cpu if not passed */
    icon?: LucideIcon;

    robotData: RobotData | null;
    battery: BatteryStatus;
    robotStatus: RobotStatus;
    wsConnected: boolean;
    time: string;
}

/* ================= BATTERY INDICATOR ================= */

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

    const colorScheme = isCharging
        ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500", dot: "bg-emerald-500" }
        : isBelowMin
          ? { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500", dot: "bg-rose-500" }
          : level <= 35
            ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500", dot: "bg-amber-500" }
            : { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: "text-slate-500", dot: "bg-slate-400" };

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text}`}
            title={`Min required: ${minimumCharge}%`}
        >
            <div className="relative flex items-center">
                {isCharging
                    ? <Zap className={`w-4 h-4 ${colorScheme.icon}`} />
                    : <Icon className={`w-4 h-4 ${colorScheme.icon}`} />
                }
                {isBelowMin && !isCharging && (
                    <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${colorScheme.dot} animate-ping`} />
                )}
            </div>
            <div className="flex flex-col leading-none gap-0.5">
                <span className="font-bold">{level.toFixed(1)}%</span>
                <span className="text-[10px] opacity-70">Min: {minimumCharge}%</span>
            </div>
        </div>
    );
};

/* ================= CONNECTION STATUS ================= */

const ConnectionStatus = ({ wsConnected }: { wsConnected: boolean }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
        wsConnected
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-700 border-rose-200"
    }`}>
        <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
        <span>{wsConnected ? "Connected" : "Disconnected"}</span>
    </div>
);

/* ================= ROBOT STATUS PANEL ================= */

const RobotStatusPanel = ({ robotStatus }: { robotStatus: RobotStatus }) => (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full lg:w-auto">
        <div className="flex items-center gap-2">
            <div className="relative">
                <Disc className={`w-5 h-5 ${robotStatus.break_status ? "text-rose-500" : "text-slate-400"}`} />
                {robotStatus.break_status && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
            </div>
            <span className={`text-xs font-medium ${robotStatus.break_status ? "text-rose-600" : "text-slate-500"}`}>
                Brake
            </span>
        </div>

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex items-center gap-2">
            <div className="relative">
                <AlertCircle className={`w-5 h-5 ${robotStatus.emergency_status ? "text-red-600" : "text-slate-400"}`} />
                {robotStatus.emergency_status && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                )}
            </div>
            <span className={`text-xs font-medium ${robotStatus.emergency_status ? "text-red-700" : "text-slate-500"}`}>
                Emergency
            </span>
        </div>

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex items-center gap-2">
            <div className="relative">
                <Move className={`w-5 h-5 ${robotStatus.Arm_moving ? "text-blue-500 animate-pulse" : "text-slate-400"}`} />
                {robotStatus.Arm_moving && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                )}
            </div>
            <span className={`text-xs font-medium ${robotStatus.Arm_moving ? "text-blue-600" : "text-slate-500"}`}>
                Arm Moving
            </span>
        </div>
    </div>
);

/* ================= DATE TIME DISPLAY ================= */

const DateTimeDisplay = ({ time }: { time: string }) => (
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
);

/* ================= MAIN HEADER COMPONENT ================= */

const RobotDashboardHeader: React.FC<RobotDashboardHeaderProps> = ({
    title,
    subtitle,
    icon: Icon = Cpu,
    robotData,
    battery,
    robotStatus,
    wsConnected,
    time,
}) => {
    const minimumCharge = robotData?.minimum_battery_charge ?? 20;

    return (
        <header className="mb-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-100 px-3 py-3 rounded-2xl">

                {/* Title + Subtitle */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
                        <Icon className="text-slate-700" size={28} />
                        <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            {title}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-[17px] mt-1 ml-10 font-light">
                        {subtitle ?? `Robot ID: ${robotData?.name}`}
                    </p>
                </div>

                {/* Right-side controls */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full lg:w-auto">
                    <ConnectionStatus wsConnected={wsConnected} />

                    <BatteryIndicator
                        level={battery.level}
                        status={battery.status}
                        minimumCharge={minimumCharge}
                    />

                    <RobotStatusPanel robotStatus={robotStatus} />

                    <DateTimeDisplay time={time} />
                </div>
            </div>
        </header>
    );
};

export default RobotDashboardHeader;