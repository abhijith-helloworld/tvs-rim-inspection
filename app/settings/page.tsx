"use client";

import React, { useEffect, useState } from "react";
import {
  Battery,
  Thermometer,
  Zap,
  AlertTriangle,
  Activity,
  Settings,
} from "lucide-react";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  "ws://192.168.0.224:8002/ws/robot_message/";

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);

  const [robot, setRobot] = useState({
    soc: "0%",
    voltage: "0 V",
    temp: "0 °C",
    faults: "0",
    status: "IDLE",
  });

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 🔥 Adjust keys based on backend payload
        setRobot({
          soc: `${data.soc ?? 0}%`,
          voltage: `${data.voltage ?? 0} V`,
          temp: `${data.temperature ?? 0} °C`,
          faults: `${data.faults ?? 0}`,
          status: data.status ?? "UNKNOWN",
        });
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("❌ WS Error", err);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Robot Settings & Status
          </h1>

          <span
            className={`px-4 py-1 text-sm rounded-full ${
              connected
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        {/* Robot Status */}
        <div className="bg-[#020617] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Robot Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-400">Robot ID</p>
              <p className="font-semibold text-lg">GEN2 - Daksha</p>

              <div className="flex items-center gap-2 text-sm text-green-400 mt-4">
                <Activity className="w-4 h-4" />
                {connected ? "Telemetry Live" : "Disconnected"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <StatusItem icon={<Battery />} label="SOC" value={robot.soc} />
              <StatusItem icon={<Zap />} label="Voltage" value={robot.voltage} />
              <StatusItem
                icon={<Thermometer />}
                label="Temp"
                value={robot.temp}
              />
              <StatusItem
                icon={<AlertTriangle />}
                label="Faults"
                value={robot.faults}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */

function StatusItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-[#020617] border border-gray-700 rounded-lg p-3">
      <div className="text-blue-400">{icon}</div>
      <div>
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
