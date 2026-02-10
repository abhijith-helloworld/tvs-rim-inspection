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
}