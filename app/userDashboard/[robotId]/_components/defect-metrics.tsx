"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchWithAuth, API_BASE_URL } from "../../../lib/auth";

import {
  BarChart3,
  AlertTriangle,
  HardDrive,
  Activity,
  Ticket,
  TicketIcon,
  CheckCheck,
} from "lucide-react";

/* ================= TYPES ================= */

interface InspectionStatsResponse {
  success: boolean;
  message: string;
  data: {
    robot_id: number;
    total_inspections: number;
    total_defected: number;
    total_passed: number;
    total_approved: number;
    total_verified: number;
    total_false_detected: number;
  };
}

/* ================= COMPONENT ================= */

const DefectMetrics = () => {
  const params = useParams();
  const robotId = params?.robotId as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] =
    useState<InspectionStatsResponse["data"] | null>(null);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (!robotId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);

        const res = await fetchWithAuth(
          `${API_BASE_URL}/robots/${robotId}/inspection-stats/`
        );

        const json: InspectionStatsResponse = await res.json();

        if (json.success) {
          setStats(json.data);
        }
      } catch (err) {
        console.error("Stats fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [robotId]);

  /* ================= DERIVED DATA ================= */

  const totalScanned = stats?.total_inspections || 0;
  const totalDetected = stats?.total_defected || 0;

  const defectRate =
    totalScanned > 0 ? (totalDetected / totalScanned) * 100 : 0;

  const higherDefect =
    (stats?.total_defected || 0) > (stats?.total_false_detected || 0)
      ? "Critical"
      : "Minor";

  if (loading || !stats) {
    return <div className="p-6">Loading...</div>;
  }

  /* ================= UI ================= */

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-3">
          <BarChart3 className="text-amber-500/80" size={24} />
          <span className="text-slate-800">Defect Analysis</span>
        </h2>

        <div className="px-3 py-1.5 bg-slate-50 border-slate-100 rounded-lg text-xs font-medium border">
          <span className="text-slate-600">Scan Success: </span>
          <span className="text-emerald-600 font-semibold">
            {totalScanned > 0
              ? (((totalScanned - totalDetected) / totalScanned) * 100).toFixed(1)
              : "0.0"}
            %
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Detected */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex justify-between">
            <h3 className="text-xs uppercase">Total Detected</h3>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {totalDetected}
          </div>
        </div>

        {/* Total Scanned */}
        <div className="bg-blue-50-50 p-4 rounded-lg border border-slate-100">
          <div className="flex justify-between">
            <h3 className="text-xs uppercase">Total Scanned</h3>
            <HardDrive size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {totalScanned}
          </div>
        </div>

        {/* Approved */}
        <div className="bg-green-50 p-4 rounded-lg border border-slate-100">
          <div className="flex justify-between">
            <h3 className="text-xs uppercase">Approved</h3>
            <CheckCheck size={18} className="text-green-400" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats.total_approved}
          </div>
        </div>

        {/* Verified */}
        <div className="bg-amber-50 p-4 rounded-lg border border-slate-100">
          <div className="flex justify-between">
            <h3 className="text-xs uppercase">Verified</h3>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats.total_verified}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-8">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium">Defect Rate</h3>
            <p className="text-sm text-slate-500">
              {defectRate.toFixed(2)}% of scanned items have defects
            </p>
          </div>

          <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
            Higher defect: <b>{higherDefect}</b>
          </div>
        </div>

        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-400 to-amber-400"
            style={{ width: `${defectRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DefectMetrics;
