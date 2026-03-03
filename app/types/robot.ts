// ============================================================
//  Shared types — import from this file in all components
// ============================================================

export interface Robot {
    id: number;
    robo_id: string;
    name: string;
    local_ip: string | null;
    is_active: boolean;
    status: "active" | "idle" | "offline" | "error" | "maintenance";
    last_seen: string | null;
    created_at: string;
    updated_at: string;
    battery_level?: number;
    location?: string;
    firmware_version?: string;
    inspection_count?: number;
    // ✅ Use unknown instead of number — allows all value types
    [key: string]: unknown;
}

export interface RobotData {
    id: string | number;
    name: string;
    status: string;
    robo_id: string;               // required — use "" as fallback when setting state
    minimum_battery_charge?: number;
    robot_type?: string;
    model_number?: string | null;
    local_ip?: string | null;
    inspection_status?: string;
    battery_level?: number;
    schedule_summary?: {
        total: number;
        scheduled: number;
        processing: number;
        completed: number;
    };
    inspection_summary?: {
        total: number;
        defected: number;
        non_defected: number;
    };
    [key: string]: unknown;
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

export interface Schedule {
    id: number;
    location: string;
    scheduled_date: string;
    scheduled_time: string;
    end_time: string;
    is_canceled: boolean;
    status: "scheduled" | "processing" | "completed";
    created_at: string;
    robot: number;
}

export interface Pagination {
    current_page: number;
    total_pages: number;
    total_records: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
}

export interface FilterData {
    filter_type: "day" | "week" | "month" | "range";
    date: string;
    start_date: string;
    end_date: string;
}