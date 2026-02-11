"use client";

import { useEffect, useState } from "react";
import SchedulesList from "./[id]/page";
import CreateSchedule from "./Shedulecreat";
import { tokenStorage, API_BASE_URL, fetchWithAuth } from "../lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Calendar, Cpu, Loader2, ArrowLeft } from "lucide-react";

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get robot_id from URL params - FIXED: proper initialization
    const [robotId, setRobotId] = useState<string>("");
    const [isInitialized, setIsInitialized] = useState(false);

    const [statusTotals, setStatusTotals] = useState({
        pending: 0,
        processing: 0,
        completed: 0,
        total: 0,
    });
    const [loading, setLoading] = useState(true);

    const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    /* ===================== INITIALIZE ROBOT ID - CRITICAL FIX ===================== */
    useEffect(() => {
        const robotIdParam = searchParams.get("robot_id");
        const id = robotIdParam;


        setRobotId(id);
        setIsInitialized(true);
    }, [searchParams]);

    /* ===================== AUTH CHECK ===================== */
    useEffect(() => {
        if (!tokenStorage.isAuthenticated()) {
            router.replace("/login");
        }
    }, [router]);

    /* ===================== FETCH STATUS TOTALS ===================== */
    useEffect(() => {
        const fetchStatusTotals = async () => {
            // CRITICAL: Don't fetch if robotId is not initialized
            if (!robotId || !isInitialized) {
                return;
            }

            try {
                setLoading(true);

                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/schedules/`,
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch schedules");
                }

                const data = await response.json();
                if (data.success && data.data.status_totals) {
                    setStatusTotals(data.data.status_totals);
                }
            } catch (error) {
                console.error("Error fetching status totals:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatusTotals();
    }, [robotId, isInitialized]);

    // Show loading state while initializing
    if (!isInitialized || !robotId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Initializing dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50/30 p-6">
            <header className="mb-6 bg-gray-100 px-3 py-3 rounded-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
                            <Cpu className="text-slate-700" size={28} />
                            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Robot Schedule Dashboard
                            </span>
                        </h1>
                        <p className="text-slate-500 text-[17px] mt-1 ml-10 font-light">
                            Real time scheduling 
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

            {/* Main Content */}
            <div>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                    {/* Total Inspections Card */}
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-100 shadow-sm backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.total}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Total Inspections
                            </p>
                        </div>
                    </div>

                    {/* Completed Card */}
                    <div className="bg-green-50 rounded-2xl shadow-sm border border-green-100 p-6 transition-all duration-200 hover:shadow-lg hover:border-green-100 backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.completed}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Completed
                            </p>
                        </div>
                    </div>

                    {/* Pending Card */}
                    <div className="bg-amber-50 border-amber-100 rounded-2xl shadow-sm border border-amber-100 p-6 transition-all duration-200 hover:shadow-lg hover:border-amber-100 backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.pending}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Pending
                            </p>
                        </div>
                    </div>

                    {/* Processing Card */}
                    <div className="bg-blue-50 rounded-2xl shadow-sm border border-gray-200/50 p-6 transition-all duration-200 hover:shadow-lg hover:border-gray-300 backdrop-blur-sm">
                        <div className="flex flex-col">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                {loading ? "..." : statusTotals.processing}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                                Processing
                            </p>
                        </div>
                    </div>
                </div>

                {/* Schedule Section */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Schedule List - CRITICAL: Pass robotId and only render when ready */}
                    <div className="flex-1">
                        <div className="rounded-2xl border border-gray-200/50 bg-white shadow-lg overflow-hidden backdrop-blur-sm">
                            {robotId && isInitialized ? (
                                <SchedulesList robotId={robotId} />
                            ) : (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mr-3" />
                                    <p className="text-gray-400">
                                        Loading robot data...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Create Schedule Sidebar */}
                    <div className="w-[23%]">
                        <div className="rounded-2xl bg-white shadow-lg overflow-hidden backdrop-blur-sm sticky top-20">
                            <CreateSchedule />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    return <DashboardContent />;
}
