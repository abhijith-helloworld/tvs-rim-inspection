"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth, API_BASE_URL, tokenStorage } from "../lib/auth";
import {
    CalendarDays,
    Clock,
    MapPin,
    Calendar,
    CheckCircle,
    AlertCircle,
    Loader2,
    Zap,
    ChevronDown,
} from "lucide-react";
import { toast, Toaster } from "sonner";

function ScheduleCreatePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    // CRITICAL FIX: Get robotId from URL params (not route params)
    const robotIdFromUrl = searchParams.get("robot_id");
    const robotIdFromParams = params?.robotId as string;

    // Use URL param first, then route param, then default
    const [robotId, setRobotId] = useState<string>("");
    const [isInitialized, setIsInitialized] = useState(false);

    const [formData, setFormData] = useState({
        location: "",
        date: "",
        time: "",
        endTime: "",
    });

    const [loading, setLoading] = useState(false);
    const [immediateLoading, setImmediateLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [robotInfo, setRobotInfo] = useState<any>(null);
    const [isLoadingRobot, setIsLoadingRobot] = useState(true);
    
    // Location dropdown states
    const [locations, setLocations] = useState<string[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredLocations, setFilteredLocations] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* ===================== INITIALIZE ROBOT ID ===================== */
    useEffect(() => {
        // Priority: URL param > Route param > Default
        const id = robotIdFromUrl || robotIdFromParams || "1";
        if (!id || id === "undefined" || id === "null") {
            console.error("CreateSchedule - Invalid robotId, redirecting...");
            router.push("/dashboard?robot_id=1");
            return;
        }

        setRobotId(id);
        setIsInitialized(true);
    }, [robotIdFromUrl, robotIdFromParams, router]);

    /* ===================== AUTH CHECK ===================== */
    useEffect(() => {
        if (!tokenStorage.isAuthenticated()) {
            router.replace("/login");
        }
    }, [router]);

    /* ===================== FETCH ROBOT INFORMATION ===================== */
    useEffect(() => {
        const fetchRobotInfo = async () => {
            if (!robotId || !isInitialized) {
                return;
            }

            try {
                setIsLoadingRobot(true);
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/`,
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch robot information");
                }

                const data = await response.json();
                setRobotInfo(data.data || data);
            } catch (error) {
                console.error("Error fetching robot info:", error);
                toast.error("Failed to load robot information");
            } finally {
                setIsLoadingRobot(false);
            }
        };

        fetchRobotInfo();
    }, [robotId, isInitialized]);

    /* ===================== FETCH LOCATIONS ===================== */
    useEffect(() => {
        const fetchLocations = async () => {
            if (!robotId || !isInitialized) {
                return;
            }

            try {
                setIsLoadingLocations(true);
                const response = await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/location/`,
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch locations");
                }

                const data = await response.json();
                
                if (data.success && data.data?.location_data?.data?.locations) {
                    const locationsObj = data.data.location_data.data.locations;
                    // Extract location values from the object
                    const locationsList = Object.values(locationsObj).filter(
                        (loc) => loc && typeof loc === "string" && loc.trim() !== ""
                    ) as string[];
                    
                    setLocations(locationsList);
                    setFilteredLocations(locationsList);
                }
            } catch (error) {
                console.error("Error fetching locations:", error);
                // Don't show error toast, just log it - locations are optional
            } finally {
                setIsLoadingLocations(false);
            }
        };

        fetchLocations();
    }, [robotId, isInitialized]);

    /* ===================== CLOSE DROPDOWN ON OUTSIDE CLICK ===================== */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    // Handle location input change with filtering
    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData((prev) => ({
            ...prev,
            location: value,
        }));
        
        // Filter locations based on input
        if (value.trim() === "") {
            setFilteredLocations(locations);
        } else {
            const filtered = locations.filter((loc) =>
                loc.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredLocations(filtered);
        }
        
        setShowDropdown(true);
        
        if (errors.location) {
            setErrors((prev) => ({ ...prev, location: "" }));
        }
    };

    // Handle location selection from dropdown
    const handleLocationSelect = (location: string) => {
        setFormData((prev) => ({
            ...prev,
            location: location,
        }));
        setShowDropdown(false);
        if (errors.location) {
            setErrors((prev) => ({ ...prev, location: "" }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.location.trim()) {
            newErrors.location = "Location is required";
        }

        if (!formData.date) {
            newErrors.date = "Date is required";
        } else {
            const selectedDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.date = "Date cannot be in the past";
            }
        }

        if (!formData.time) {
            newErrors.time = "Start time is required";
        }

        if (!formData.endTime) {
            newErrors.endTime = "End time is required";
        } else if (formData.time && formData.endTime <= formData.time) {
            newErrors.endTime = "End time must be after start time";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // UPDATED: Validate for immediate inspection
    const validateImmediateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.location.trim()) {
            newErrors.location = "Location is required";
        }

        if (!formData.endTime) {
            newErrors.endTime = "End time is required";
        } else {
            // Check if end time is after current time
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            if (formData.endTime <= currentTime) {
                newErrors.endTime = "End time must be in the future";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Create scheduled inspection
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!robotId || !isInitialized) {
            toast.error("Robot ID not initialized");
            return;
        }

        if (!validateForm()) {
            toast.error("Please fix the errors in the form");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                location: formData.location,
                scheduled_date: formData.date,
                scheduled_time: formData.time,
                end_time: formData.endTime,
            };
            const response = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/schedule/create/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || "Failed to create schedule",
                );
            }

            const responseData = await response.json();

            toast.success(
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-400">
                        <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            Schedule Created!
                        </p>
                        <p className="text-sm text-gray-600">
                            Inspection scheduled for {formData.location}
                        </p>
                    </div>
                </div>,
            );

            setFormData({
                location: "",
                date: "",
                time: "",
                endTime: "",
            });
            setErrors({});
        } catch (error) {
            console.error("Error creating schedule:", error);
            toast.error(
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-rose-500 to-red-400">
                        <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            Failed to Create Schedule
                        </p>
                        <p className="text-sm text-gray-600">
                            {error instanceof Error
                                ? error.message
                                : "Please try again later"}
                        </p>
                    </div>
                </div>,
            );
        } finally {
            setLoading(false);
        }
    };

    // UPDATED: Create immediate inspection using existing endTime input
    const handleCreateImmediately = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!robotId || !isInitialized) {
            toast.error("Robot ID not initialized");
            return;
        }

        if (!validateImmediateForm()) {
            toast.error("Please fix the errors in the form");
            return;
        }

        setImmediateLoading(true);

        try {
            const now = new Date();
            const currentDate = now.toISOString().split("T")[0];
            const currentTime = now.toTimeString().slice(0, 5);

            const payload = {
                location: formData.location,
                scheduled_date: currentDate,
                scheduled_time: currentTime,
                end_time: formData.endTime, // Use the existing endTime input
            };
            const response = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/schedule/create-immediately/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || "Failed to create immediate schedule",
                );
            }

            await response.json();

            toast.success(
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-400">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            Immediate Inspection Created!
                        </p>
                        <p className="text-sm text-gray-600">
                            Starting inspection at {formData.location} now
                        </p>
                    </div>
                </div>,
            );

            setFormData({
                location: "",
                date: "",
                time: "",
                endTime: "",
            });
            setErrors({});

            // Redirect back to dashboard with robot_id
            setTimeout(() => {
                router.push(`/dashboard?robot_id=${robotId}`);
            }, 2000);
        } catch (error) {
            console.error("Error creating immediate schedule:", error);
            toast.error(
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-rose-500 to-red-400">
                        <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            Failed to Create Immediate Schedule
                        </p>
                        <p className="text-sm text-gray-600">
                            {error instanceof Error
                                ? error.message
                                : "Please try again later"}
                        </p>
                    </div>
                </div>,
            );
        } finally {
            setImmediateLoading(false);
        }
    };

    // Show loading while initializing
    if (!isInitialized || !robotId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">
                        Initializing schedule creator...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Toaster
                theme="light"
                position="top-right"
                toastOptions={{
                    classNames: {
                        toast: "rounded-xl border border-gray-200/50 bg-white/95 backdrop-blur-sm shadow-lg",
                        title: "font-medium text-gray-800",
                        description: "text-gray-600",
                        actionButton:
                            "bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg",
                        cancelButton: "bg-gray-100 text-gray-700 rounded-lg",
                    },
                }}
            />

            <div className="w-auto">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {/* Form Section */}
                    <div className="lg:col-span-2 ">
                        <div className="rounded-3xl p-6 bg-gradient-to-br from-white to-gray-50/30 shadow-xl overflow-hidden backdrop-blur-sm">
                            {/* Form Header */}
                            <div className=" border-gray-200/30 bg-gradient-to-r from-white to-gray-50/30 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            Schedule Details
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Fill in the inspection information
                                        </p>
                                    </div>
                                    <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200/50">
                                        All Fields Required
                                    </div>
                                </div>
                            </div>

                            <div className="">
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    {/* Location Field with Dropdown */}
                                    <div ref={dropdownRef}>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <div className="p-2 rounded-lg bg-gray-100/50 border border-gray-200/50">
                                                <MapPin className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <label className="text-sm font-medium text-gray-700">
                                                Inspection Location *
                                            </label>
                                            {isLoadingLocations && (
                                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleLocationChange}
                                                onFocus={() => setShowDropdown(true)}
                                                placeholder="Type or select a location"
                                                autoComplete="off"
                                                className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900/20 bg-white/80 border-gray-200/50 text-gray-900 placeholder-gray-400 ${
                                                    errors.location
                                                        ? "border-red-400/50"
                                                        : ""
                                                }`}
                                            />
                                            <ChevronDown 
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-transform ${
                                                    showDropdown ? "rotate-180" : ""
                                                }`}
                                            />
                                            
                                            {/* Dropdown Menu */}
                                            {showDropdown && filteredLocations.length > 0 && (
                                                <div className="absolute z-10 w-full mt-2 bg-white rounded-xl border border-gray-200/50 shadow-lg max-h-60 overflow-y-auto scroll-hide">
                                                    {filteredLocations.map((location, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => handleLocationSelect(location)}
                                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 flex items-center space-x-2"
                                                        >
                                                            <MapPin className="h-4 w-4 text-gray-400" />
                                                            <span className="text-gray-700">{location}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {errors.location && (
                                            <p className="text-red-500 text-sm flex items-center space-x-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>{errors.location}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            {locations.length > 0 
                                                ? "Select from saved locations or type a custom location"
                                                : "Enter the exact location where inspection will occur"
                                            }
                                        </p>
                                    </div>

                                    {/* Date & Time Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Date Field */}
                                        <div>
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="p-2 rounded-lg bg-gray-100/50 border border-gray-200/50">
                                                    <CalendarDays className="h-4 w-4 text-gray-600" />
                                                </div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Inspection Date *
                                                </label>
                                            </div>
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900/20 bg-white/80 border-gray-200/50 text-gray-900 ${
                                                    errors.date
                                                        ? "border-red-400/50"
                                                        : ""
                                                }`}
                                            />
                                            {errors.date && (
                                                <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>{errors.date}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Start Time Field */}
                                        <div>
                                            <div className="flex items-center space-x-2 mb-3">
                                                <div className="p-2 rounded-lg bg-gray-100/50 border border-gray-200/50">
                                                    <Clock className="h-4 w-4 text-gray-600" />
                                                </div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Start Time *
                                                </label>
                                            </div>
                                            <input
                                                type="time"
                                                name="time"
                                                value={formData.time}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900/20 bg-white/80 border-gray-200/50 text-gray-900 ${
                                                    errors.time
                                                        ? "border-red-400/50"
                                                        : ""
                                                }`}
                                            />
                                            {errors.time && (
                                                <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>{errors.time}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* End Time Field */}
                                    <div>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <div className="p-2 rounded-lg bg-gray-100/50 border border-gray-200/50">
                                                <Clock className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <label className="text-sm font-medium text-gray-700">
                                                End Time *
                                            </label>
                                        </div>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900/20 bg-white/80 border-gray-200/50 text-gray-900 ${
                                                errors.endTime
                                                    ? "border-red-400/50"
                                                    : ""
                                            }`}
                                        />
                                        {errors.endTime && (
                                            <p className="text-red-500 text-sm flex items-center space-x-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>{errors.endTime}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            Must be after the start time (for scheduled) or in the future (for immediate)
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3 border-t border-gray-200/30">
                                        {/* Create Schedule Button */}
                                        <button
                                            type="submit"
                                            disabled={
                                                loading || immediateLoading
                                            }
                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span>Creating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Calendar className="h-5 w-5" />
                                                    <span>Create Schedule</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Create Immediately Button */}
                                        <button
                                            type="button"
                                            onClick={handleCreateImmediately}
                                            disabled={
                                                loading || immediateLoading
                                            }
                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {immediateLoading ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span>Creating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="h-5 w-5" />
                                                    <span>
                                                        Create Immediately
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ScheduleCreate() {
    return <ScheduleCreatePage />;
}