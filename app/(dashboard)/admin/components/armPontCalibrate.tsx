"use client";

import React, { useEffect, useState, useCallback } from "react";
import { API_BASE_URL, fetchWithAuth } from "@/app/lib/auth";

/* ===============================
   TYPES & INTERFACES
================================ */
type Hand = "left" | "right";
type Point = "point_one" | "point_two" | "point_three";

interface HandState {
    left: boolean;
    right: boolean;
}

interface PointsState {
    left: {
        point_one: boolean;
        point_two: boolean;
        point_three: boolean;
    };
    right: {
        point_one: boolean;
        point_two: boolean;
        point_three: boolean;
    };
}

interface Profile {
    id: number;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface RobotCalibrationProps {
    robotId: number;
    roboId: string;
    onClose: () => void;
}

interface WebSocketMessage {
    type?: string;
    hand?: Hand;
    point?: Point;
    active?: boolean;
    calibration_status?: boolean;
    message?: string;
}

interface ReadyForDataCollectionData {
    hand?: Hand;
    receivedAt: number;
}

/* ===============================
   CONSTANTS
================================ */
const HANDS: Hand[] = ["left", "right"];
const POINTS: Point[] = ["point_one", "point_two", "point_three"];

const INITIAL_HAND_STATE: HandState = { left: false, right: false };

const INITIAL_POINTS_STATE: PointsState = {
    left: { point_one: false, point_two: false, point_three: false },
    right: { point_one: false, point_two: false, point_three: false },
};

const INITIAL_POINT_DATA = {
    left: { point_one: null, point_two: null, point_three: null },
    right: { point_one: null, point_two: null, point_three: null },
};

/* ===============================
   DELETE CONFIRM MODAL
================================ */
function DeleteConfirmModal({
    profile,
    isDeleting,
    onConfirm,
    onCancel,
}: {
    profile: Profile;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                style={{ animation: "modalPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
                <style>{`
                    @keyframes modalPop {
                        from { opacity: 0; transform: scale(0.92) translateY(8px); }
                        to   { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
                <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-400" />
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-100 mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Delete Profile</h3>
                    <p className="text-sm text-gray-500 text-center mb-1">Are you sure you want to delete</p>
                    <p className="text-sm font-semibold text-gray-800 text-center mb-5 truncate px-2">&ldquo;{profile.name}&rdquo;?</p>
                    <p className="text-xs text-red-500 text-center mb-6">This action cannot be undone.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={onCancel} disabled={isDeleting} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                            Cancel
                        </button>
                        <button type="button" onClick={onConfirm} disabled={isDeleting} className="px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            {isDeleting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Deleting...
                                </>
                            ) : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ===============================
   PREMATURE CLOSE WARNING MODAL
================================ */
function PrematureCloseModal({
    onClose,
    onContinue,
    isClosing = false,
}: {
    onClose: () => void;
    onContinue: () => void;
    isClosing?: boolean;
}) {
    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                style={{ animation: "modalPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
                <style>{`
                    @keyframes modalPop {
                        from { opacity: 0; transform: scale(0.92) translateY(8px); }
                        to   { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-100 mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Calibration In Progress</h3>
                    <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                        You have an active calibration session. Closing now will discard all unsaved progress and clear the collected data. Are you sure?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={onClose} disabled={isClosing} className="px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                            {isClosing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Closing...
                                </>
                            ) : "Close Anyway"}
                        </button>
                        <button type="button" onClick={onContinue} disabled={isClosing} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ===============================
   MAIN COMPONENT
================================ */
export default function ArmCalibration({ robotId, roboId, onClose }: RobotCalibrationProps) {

    // Profile management
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [newProfileName, setNewProfileName] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Calibration status
    const [calibrationActive, setCalibrationActive] = useState(false);
    const [handsReady, setHandsReady] = useState(false);
    const [hands, setHands] = useState<HandState>(INITIAL_HAND_STATE);
    const [points, setPoints] = useState<PointsState>(INITIAL_POINTS_STATE);

    const [selectedPoints, setSelectedPoints] = useState<{ left: Set<Point>; right: Set<Point> }>({
        left: new Set(), right: new Set(),
    });

    const [pointsUnlocked, setPointsUnlocked] = useState<{ left: boolean; right: boolean }>({
        left: false, right: false,
    });

    const [pointData, setPointData] = useState<{
        left: { point_one: number[] | null; point_two: number[] | null; point_three: number[] | null };
        right: { point_one: number[] | null; point_two: number[] | null; point_three: number[] | null };
    }>(INITIAL_POINT_DATA);

    // UI state
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    // WebSocket state
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsMessage, setWsMessage] = useState<string | null>(null);

    // Test completion modal
    const [showTestModal, setShowTestModal] = useState(false);
    const [testCompletedHands, setTestCompletedHands] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
    const [testCompletedPoints, setTestCompletedPoints] = useState<{ left: Point[]; right: Point[] }>({ left: [], right: [] });
    const [testingHands, setTestingHands] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

    // Unsaved points warning modal
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [pendingHandSwitch, setPendingHandSwitch] = useState<Hand | null>(null);
    const [unsavedHand, setUnsavedHand] = useState<Hand | null>(null);
    const [testInProgress, setTestInProgress] = useState(false);

    // Ready for data collection
    const [readyForDataCollection, setReadyForDataCollection] = useState<ReadyForDataCollectionData | null>(null);

    // Premature close modal
    const [showPrematureCloseModal, setShowPrematureCloseModal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

    /* ===============================
       HELPER FUNCTIONS
    ================================ */
    const clearReadyForDataCollection = useCallback(() => {
        setReadyForDataCollection(null);
        setHandsReady(false);
        setPointsUnlocked({ left: false, right: false });
    }, []);

    const hasActiveSession = useCallback(() => {
        return readyForDataCollection !== null || calibrationActive;
    }, [readyForDataCollection, calibrationActive]);

    /* ===============================
       EFFECTS
    ================================ */
    useEffect(() => { fetchProfiles(); }, [robotId]);

    useEffect(() => {
        if (selectedProfileId) fetchCalibrationStatus(selectedProfileId);
    }, [selectedProfileId]);

    useEffect(() => {
        const wsUrl = `${WS_URL}/ws/robot_message/${roboId}/profile/`;
        let destroyed = false;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let retryCount = 0;
        const MAX_BACKOFF_MS = 30_000;

        const clearReconnectTimer = () => {
            if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        };

        const connect = () => {
            if (destroyed) return;
            const websocket = new WebSocket(wsUrl);

            websocket.onopen = () => {
                if (destroyed) { websocket.close(); return; }
                retryCount = 0;
                setWsConnected(true);
                setWs(websocket);
            };

            websocket.onmessage = (event) => {
                if (destroyed) return;
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);

                    if (data.type === "hand_toggle" && data.hand !== undefined && data.active !== undefined) {
                        setWsMessage(`${data.hand} hand ${data.active ? "enabled" : "disabled"}`);
                        setTimeout(() => setWsMessage(null), 3000);
                    } else if (data.type === "point_toggle" && data.hand !== undefined && data.point !== undefined && data.active !== undefined) {
                        setWsMessage(`${data.hand} ${data.point.replace(/_/g, " ")} ${data.active ? "set" : "unset"}`);
                        setTimeout(() => setWsMessage(null), 3000);
                    } else if ((data as any).event === "calibration_status") {
                        const value = (data as any).data?.value;
                        const isActive = value === true || value === "true";
                        setCalibrationActive(isActive);
                        if (!isActive) {
                            resetCalibrationStateExceptPointData();
                            clearReadyForDataCollection();
                        }
                        setWsMessage(`Calibration ${isActive ? "activated" : "deactivated"}`);
                        setTimeout(() => setWsMessage(null), 3000);
                    }

                    const pointDataEventPattern = /^(left|right)_(point_one|point_two|point_three)_data$/;
                    const match = (data as any).event?.match(pointDataEventPattern);
                    if (match) {
                        const hand = match[1] as Hand;
                        const point = match[2] as Point;
                        const values = (data as any).data?.data?.values;
                        if (values && Array.isArray(values)) {
                            setPointData((prev) => ({ ...prev, [hand]: { ...prev[hand], [point]: values } }));
                            setPointsUnlocked((prev) => ({ ...prev, [hand]: true }));
                            setWsMessage(`${hand} ${point.replace(/_/g, " ")} data received`);
                            setTimeout(() => setWsMessage(null), 3000);
                        }
                    }

                    const testCompletedPattern = /^test_completed_(left|right)$/;
                    const testMatch = (data as any).event?.match(testCompletedPattern);
                    if (testMatch) {
                        const hand = testMatch[1] as Hand;
                        const value = (data as any).data?.value;
                        if (value === "true" || value === true) {
                            setSelectedPoints((currentSelectedPoints) => {
                                const snapshot = Array.from(currentSelectedPoints[hand]);
                                setTestCompletedPoints((prev) => ({ ...prev, [hand]: snapshot }));
                                return currentSelectedPoints;
                            });
                            setTestCompletedHands((prev) => ({ ...prev, [hand]: true }));
                            setTestingHands((prev) => ({ ...prev, [hand]: false }));
                            setShowTestModal(true);
                            setWsMessage(`Test completed for ${hand} hand`);
                            setTimeout(() => setWsMessage(null), 3000);
                        }
                    }

                    if ((data as any).event === "ready_for_data_collection") {
                        const activeHand: Hand | undefined = (data as any).data?.hand;
                        setReadyForDataCollection({ hand: activeHand, receivedAt: Date.now() });
                        setHandsReady(true);
                        setPointsUnlocked({ left: true, right: true });
                        setWsMessage("Ready for data collection — you can now select hands and points");
                        setTimeout(() => setWsMessage(null), 3000);
                    }
                } catch (err) {}
            };

            websocket.onerror = () => { setWsConnected(false); };

            websocket.onclose = () => {
                if (destroyed) return;
                setWsConnected(false);
                setWs(null);
                const delay = Math.min(1_000 * 2 ** retryCount, MAX_BACKOFF_MS);
                retryCount += 1;
                reconnectTimer = setTimeout(connect, delay);
            };
        };

        connect();

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                setWs((currentWs) => {
                    if (!currentWs || currentWs.readyState === WebSocket.CLOSED || currentWs.readyState === WebSocket.CLOSING) {
                        clearReconnectTimer();
                        retryCount = 0;
                        connect();
                    }
                    return currentWs;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            destroyed = true;
            clearReconnectTimer();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            setWs((currentWs) => {
                if (currentWs && currentWs.readyState === WebSocket.OPEN) currentWs.close();
                return null;
            });
        };
    }, [robotId, roboId]);

    /* ===============================
       UTILITY FUNCTIONS
    ================================ */
    const resetCalibrationState = useCallback(() => {
        setHands(INITIAL_HAND_STATE);
        setPoints(INITIAL_POINTS_STATE);
        setSelectedPoints({ left: new Set(), right: new Set() });
        setPointData(INITIAL_POINT_DATA);
        setHandsReady(false);
        setPointsUnlocked({ left: false, right: false });
    }, []);

    const resetCalibrationStateExceptPointData = useCallback(() => {
        setHands(INITIAL_HAND_STATE);
        setPoints(INITIAL_POINTS_STATE);
        setSelectedPoints({ left: new Set(), right: new Set() });
        setHandsReady(false);
        setPointsUnlocked({ left: false, right: false });
    }, []);

    const resetHandPoints = useCallback((hand: Hand) => {
        setPoints((prev) => ({ ...prev, [hand]: { point_one: false, point_two: false, point_three: false } }));
        setSelectedPoints((prev) => ({ ...prev, [hand]: new Set() }));
        setPointsUnlocked((prev) => ({ ...prev, [hand]: false }));
    }, []);

    const handleApiError = (error: unknown, context: string) => {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        setError(`${context}: ${message}`);
    };

    const clearError = () => setError(null);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleString("en-US", {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });

    /* ===============================
       API CALLS
    ================================ */
    const fetchCalibrationStatus = async (profileId: number = selectedProfileId!) => {
        if (!profileId) return;
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${profileId}/calibration/`,
                { method: "GET" },
            );
            if (!res.ok) throw new Error(`Failed to fetch calibration status: ${res.statusText}`);

            const json = await res.json();
            const d = json?.data;
            if (!d) return;

            const isActive = Boolean(d.calibration_status);
            setCalibrationActive(isActive);

            if (!isActive) {
                resetCalibrationStateExceptPointData();
                clearReadyForDataCollection();
            } else {
                setHands({ left: Boolean(d.left_hand_active), right: Boolean(d.right_hand_active) });

                setPointData((prev) => ({
                    left: {
                        point_one: d.left_point_one?.values ?? prev.left.point_one,
                        point_two: d.left_point_two?.values ?? prev.left.point_two,
                        point_three: d.left_point_three?.values ?? prev.left.point_three,
                    },
                    right: {
                        point_one: d.right_point_one?.values ?? prev.right.point_one,
                        point_two: d.right_point_two?.values ?? prev.right.point_two,
                        point_three: d.right_point_three?.values ?? prev.right.point_three,
                    },
                }));

                const buildSelectedSet = (p1: boolean, p2: boolean, p3: boolean): Set<Point> => {
                    const s = new Set<Point>();
                    if (p1) s.add("point_one");
                    if (p2) s.add("point_two");
                    if (p3) s.add("point_three");
                    return s;
                };

                setSelectedPoints({
                    left: buildSelectedSet(
                        Boolean(d.left_point_one_active) || Boolean(d.left_point_one?.values),
                        Boolean(d.left_point_two_active) || Boolean(d.left_point_two?.values),
                        Boolean(d.left_point_three_active) || Boolean(d.left_point_three?.values),
                    ),
                    right: buildSelectedSet(
                        Boolean(d.right_point_one_active) || Boolean(d.right_point_one?.values),
                        Boolean(d.right_point_two_active) || Boolean(d.right_point_two?.values),
                        Boolean(d.right_point_three_active) || Boolean(d.right_point_three?.values),
                    ),
                });

                setPoints({
                    left: {
                        point_one: Boolean(d.left_point_one_active),
                        point_two: Boolean(d.left_point_two_active),
                        point_three: Boolean(d.left_point_three_active),
                    },
                    right: {
                        point_one: Boolean(d.right_point_one_active),
                        point_two: Boolean(d.right_point_two_active),
                        point_three: Boolean(d.right_point_three_active),
                    },
                });
            }
        } catch (err) {
            handleApiError(err, "Failed to fetch calibration status");
        }
    };

    const fetchProfiles = async () => {
        clearError();
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/profiles/`, { method: "GET" });
            if (!res.ok) throw new Error(`Failed to fetch profiles: ${res.statusText}`);

            const response = await res.json();
            let profilesArray: Profile[] = [];
            if (response.success && Array.isArray(response.data)) profilesArray = response.data;
            else if (Array.isArray(response)) profilesArray = response;
            else if (response?.results && Array.isArray(response.results)) profilesArray = response.results;
            else if (response?.profiles && Array.isArray(response.profiles)) profilesArray = response.profiles;
            else if (response && typeof response === "object") profilesArray = [response];
            setProfiles(profilesArray);
        } catch (err) {
            handleApiError(err, "Failed to load profiles");
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async () => {
        if (!newProfileName.trim()) { setError("Profile name cannot be empty"); return; }
        clearError();
        setCreatingProfile(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/profiles/`, {
                method: "POST",
                body: JSON.stringify({ name: newProfileName.trim() }),
            });
            if (!res.ok) throw new Error(`Failed to create profile: ${res.statusText}`);

            const response = await res.json();
            let profile: Profile;
            if (response?.success && response?.data) profile = response.data;
            else if (response?.id) profile = response;
            else throw new Error("Unexpected response format from server");

            setProfiles((prev) => [...prev, profile]);
            setNewProfileName("");
            setShowCreateForm(false);
            selectProfile(profile);
        } catch (err) {
            handleApiError(err, "Failed to create profile");
        } finally {
            setCreatingProfile(false);
        }
    };

    const deleteProfile = async (profileId: number) => {
        clearError();
        setDeletingId(profileId);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/robots/${robotId}/profiles/${profileId}/`, { method: "DELETE" });
            if (!res.ok) throw new Error(`Failed to delete profile: ${res.statusText}`);
            setProfiles((prev) => prev.filter((p) => p.id !== profileId));
            if (selectedProfileId === profileId) {
                setSelectedProfileId(null);
                setSelectedProfile(null);
                resetCalibrationState();
                clearReadyForDataCollection();
            }
        } catch (err) {
            handleApiError(err, "Failed to delete profile");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const toggleCalibration = async (active: boolean) => {
        if (!selectedProfileId || !selectedProfile) { setError("Profile must be selected first"); return false; }
        clearError();
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/`,
                { method: "PATCH", body: JSON.stringify({ calibration_status: active }) },
            );
            if (!res.ok) throw new Error(`Failed to toggle calibration: ${res.statusText}`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "calibration_status", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, value: active } }));
            }

            if (active) {
                setHands(INITIAL_HAND_STATE);
                setPoints(INITIAL_POINTS_STATE);
                setSelectedPoints({ left: new Set(), right: new Set() });
                setPointsUnlocked({ left: false, right: false });
                setCalibrationActive(true);
            } else {
                await fetchCalibrationStatus(selectedProfileId);
            }
            return true;
        } catch (err) {
            handleApiError(err, "Failed to toggle calibration");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toggleHand = async (hand: Hand, active: boolean) => {
        if (!selectedProfileId || !selectedProfile) { setError("Profile must be selected first"); return false; }
        clearError();
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/hand/`,
                { method: "PATCH", body: JSON.stringify({ hand, active }) },
            );
            if (!res.ok) throw new Error(`Failed to toggle ${hand} hand: ${res.statusText}`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "hand_toggle", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, hand, active } }));
            }
            return true;
        } catch (err) {
            handleApiError(err, `Failed to toggle ${hand} hand`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const togglePoint = async (hand: Hand, point: Point, active: boolean) => {
        if (!selectedProfileId || !selectedProfile) { setError("Profile must be selected first"); return false; }
        if (!hands[hand]) { setError(`${hand} hand must be enabled first`); return false; }
        clearError();
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/point/`,
                { method: "PATCH", body: JSON.stringify({ hand, point, active }) },
            );
            if (!res.ok) throw new Error(`Failed to toggle ${hand} ${point}: ${res.statusText}`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "point_toggle", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, hand, point, active } }));
            }
            setWsMessage(`${hand} ${point.replace(/_/g, " ")} ${active ? "activated" : "deactivated"}`);
            setTimeout(() => setWsMessage(null), 3000);
            return true;
        } catch (err) {
            handleApiError(err, `Failed to toggle ${hand} ${point}`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const testPoints = async (hand: Hand) => {
        if (!selectedProfileId || !selectedProfile) { setError("Profile must be selected first"); return false; }
        if (!hands[hand]) { setError(`${hand} hand must be enabled first`); return false; }
        const pointsToTest = Array.from(selectedPoints[hand]);
        if (pointsToTest.length === 0) { setError(`Please select at least one point for ${hand} hand`); return false; }
        clearError();
        setLoading(true);
        setTestingHands((prev) => ({ ...prev, [hand]: true }));
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/test/`,
                { method: "PATCH", body: JSON.stringify({ hand, points: pointsToTest }) },
            );
            if (!res.ok) throw new Error(`Failed to test ${hand} hand: ${res.statusText}`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "test_points", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, hand, points: pointsToTest } }));
            }
            setWsMessage(`Testing ${pointsToTest.length} point(s) on ${hand} hand...`);
            setTimeout(() => setWsMessage(null), 3000);
            return true;
        } catch (err) {
            setTestingHands((prev) => ({ ...prev, [hand]: false }));
            handleApiError(err, `Failed to test ${hand} hand points`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ★ Reset: only clears pointData (Values). Selections and interactivity stay intact.
    const retryPoints = async (hand: Hand) => {
        if (!selectedProfileId || !selectedProfile) { setError("Profile must be selected first"); return false; }
        if (!hands[hand]) { setError(`${hand} hand must be enabled first`); return false; }

        // Use selected points, or fall back to all points that have collected data
        let pointsToRetry = Array.from(selectedPoints[hand]);
        if (pointsToRetry.length === 0) {
            pointsToRetry = POINTS.filter((p) => pointData[hand][p] !== null);
        }

        clearError();
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/retry/`,
                { method: "PATCH", body: JSON.stringify({ hand, points: pointsToRetry }) },
            );
            if (!res.ok) throw new Error(`Failed to retry ${hand} hand: ${res.statusText}`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "retry_points", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, hand, points: pointsToRetry } }));
            }
            setWsMessage(`Retrying ${pointsToRetry.length} point(s) on ${hand} hand...`);
            setTimeout(() => setWsMessage(null), 3000);

            // ★ Only clear stored point values — selections and unlock state remain
            // ★ Clear stored point values AND selections on reset
            setPointData((prev) => ({
                ...prev,
                [hand]: { point_one: null, point_two: null, point_three: null },
            }));
            setSelectedPoints((prev) => ({ ...prev, [hand]: new Set() }));

            return true;
        } catch (err) {
            handleApiError(err, `Failed to retry ${hand} hand points`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updatePoints = async (hand: Hand, explicitPoints?: Point[]) => {
        if (!selectedProfileId || !selectedProfile) { setError("Profile must be selected first"); return false; }
        if (!hands[hand]) { setError(`${hand} hand must be enabled first`); return false; }

        let pointsToUpdate: Point[] =
            explicitPoints && explicitPoints.length > 0
                ? explicitPoints
                : Array.from(selectedPoints[hand]);

        if (pointsToUpdate.length === 0) {
            pointsToUpdate = POINTS.filter((p) => pointData[hand][p] !== null);
        }
        if (pointsToUpdate.length === 0) { setError(`Please select at least one point for ${hand} hand`); return false; }

        const missingData = pointsToUpdate.filter((point) => !pointData[hand][point]);
        if (missingData.length > 0) {
            setError(`Missing data for: ${missingData.map((p) => p.replace(/_/g, " ")).join(", ")}`);
            return false;
        }
        clearError();
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/update/`,
                { method: "PATCH", body: JSON.stringify({ hand }) },
            );
            if (!res.ok) throw new Error(`Failed to update ${hand} hand: ${res.statusText}`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "update_points", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, hand, points: pointsToUpdate } }));
            }
            setWsMessage(`Updated ${pointsToUpdate.length} point(s) on ${hand} hand successfully`);
            setTimeout(() => setWsMessage(null), 3000);
            return true;
        } catch (err) {
            handleApiError(err, `Failed to update ${hand} hand points`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    /* ===============================
       EVENT HANDLERS
    ================================ */
    const selectProfile = (profile: Profile) => {
        setSelectedProfile(profile);
        setSelectedProfileId(profile.id);
        resetCalibrationState();
        clearReadyForDataCollection();
        setCalibrationActive(false);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "profile_clicked", data: { profile_id: profile.id, profile_name: profile.name } }));
        }
    };

    const onCalibrationToggle = async () => {
        if (!selectedProfileId) { setError("Please select a profile first"); return; }
        await toggleCalibration(!calibrationActive);
    };

    const onHandToggle = async (hand: Hand) => {
        if (!calibrationActive) { setError("Calibration must be active to toggle hands"); return; }
        if (!handsReady) { setError("Waiting for robot database"); return; }

        const otherHand: Hand = hand === "left" ? "right" : "left";
        if (testingHands[otherHand]) {
            setUnsavedHand(otherHand); setPendingHandSwitch(hand); setTestInProgress(true); setShowUnsavedWarning(true);
            return;
        }
        if (hands[otherHand] && selectedPoints[otherHand].size > 0) {
            setUnsavedHand(otherHand); setPendingHandSwitch(hand); setTestInProgress(false); setShowUnsavedWarning(true);
            return;
        }
        await performHandSwitch(hand);
    };

    const performHandSwitch = async (hand: Hand) => {
        try {
            if (hands[hand]) {
                const success = await toggleHand(hand, false);
                if (!success) return;
                setHands({ left: false, right: false });
                resetHandPoints(hand);
                return;
            }
            const otherHand: Hand = hand === "left" ? "right" : "left";
            if (hands[otherHand]) {
                const success = await toggleHand(otherHand, false);
                if (!success) return;
                setHands((prev) => ({ ...prev, [otherHand]: false }));
                resetHandPoints(otherHand);
                setPointsUnlocked((prev) => ({ ...prev, [otherHand]: false }));
            }
            const success = await toggleHand(hand, true);
            if (!success) return;
            setHands({ left: hand === "left", right: hand === "right" });
            setPointsUnlocked((prev) => ({ ...prev, [hand]: true }));
        } catch (error) {
            handleApiError(error, `Failed to toggle ${hand} hand`);
        }
    };

    const onPointClick = async (hand: Hand, point: Point) => {
        if (!hands[hand]) { setError(`${hand} hand must be enabled first`); return; }
        if (!pointsUnlocked[hand]) { setError(`Point data not available for ${hand} hand yet`); return; }
        if (selectedPoints[hand].has(point)) return;
        const success = await togglePoint(hand, point, true);
        if (success) {
            setSelectedPoints((prev) => {
                const s = new Set(prev[hand]);
                s.add(point);
                return { ...prev, [hand]: s };
            });
        }
    };

    const closeTestModal = () => {
        setShowTestModal(false);
        setTestCompletedHands({ left: false, right: false });
        setTestCompletedPoints({ left: [], right: [] });
    };

    const handleTestModalRetry = async (hand: Hand) => {
        const success = await retryPoints(hand);
        if (success) closeTestModal();
    };

    const handleTestModalUpdate = async (hand: Hand) => {
        const snapshotPoints = testCompletedPoints[hand];
        const success = await updatePoints(hand, snapshotPoints);
        if (success) {
            setSelectedPoints((prev) => ({ ...prev, [hand]: new Set() }));
            closeTestModal();
        }
    };

    const handleClose = () => {
        if (hasActiveSession()) { setShowPrematureCloseModal(true); return; }
        performClose();
    };

    const performClose = () => {
        clearReadyForDataCollection();
        setHands(INITIAL_HAND_STATE);
        setPoints(INITIAL_POINTS_STATE);
        setSelectedPoints({ left: new Set(), right: new Set() });
        setHandsReady(false);
        setPointsUnlocked({ left: false, right: false });
        setCalibrationActive(false);
        setSelectedProfile(null);
        setSelectedProfileId(null);
        setShowPrematureCloseModal(false);
        setTestCompletedHands({ left: false, right: false });
        setTestCompletedPoints({ left: [], right: [] });
        setShowTestModal(false);
        setError(null);
        setWsMessage(null);
        onClose();
    };

    const handlePrematureClose = async () => {
        setIsClosing(true);
        if (calibrationActive && selectedProfileId && selectedProfile) {
            try {
                await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/`,
                    { method: "PATCH", body: JSON.stringify({ calibration_status: false }) },
                );
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ event: "calibration_status", data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, value: false } }));
                }
            } catch { /* Best-effort */ }
        }
        setIsClosing(false);
        performClose();
    };

    const handleContinueSession = () => { setShowPrematureCloseModal(false); };

    const profileToDelete = confirmDeleteId !== null
        ? (profiles.find((p) => p.id === confirmDeleteId) ?? null)
        : null;

    /* ===============================
       RENDER
    ================================ */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-[80%] max-h-[90vh] overflow-hidden">

                {showPrematureCloseModal && (
                    <PrematureCloseModal onClose={handlePrematureClose} onContinue={handleContinueSession} isClosing={isClosing} />
                )}

                {profileToDelete && !showPrematureCloseModal && (
                    <DeleteConfirmModal
                        profile={profileToDelete}
                        isDeleting={deletingId === profileToDelete.id}
                        onConfirm={() => deleteProfile(profileToDelete.id)}
                        onCancel={() => setConfirmDeleteId(null)}
                    />
                )}

                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Robotic Calibration Dashboard</h1>
                            <p className="text-sm text-gray-500 mt-1">Robot ID: {roboId}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {readyForDataCollection && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-amber-50 border-amber-200">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-sm font-medium text-amber-700">Session Active</span>
                                </div>
                            )}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${wsConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                                <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                                <span className={`text-sm font-medium ${wsConnected ? "text-emerald-700" : "text-red-700"}`}>
                                    {wsConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-100px)] bg-gray-50">
                    <div className="p-8">
                        {wsMessage && (
                            <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <p className="text-sm text-blue-700">{wsMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-red-900">Error</p>
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                    <button onClick={clearError} className="text-red-500 hover:text-red-700 text-xl font-bold">×</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-12 gap-6">
                            {/* LEFT SIDEBAR: Profile List */}
                            <div className="col-span-3">
                                <div className="bg-white rounded-lg border border-gray-200 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-base font-semibold text-gray-900">Profiles</h2>
                                        <button onClick={() => setShowCreateForm(!showCreateForm)} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                                            {showCreateForm ? "Cancel" : "+ New"}
                                        </button>
                                    </div>

                                    {showCreateForm && (
                                        <form onSubmit={(e) => { e.preventDefault(); createProfile(); }} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                placeholder="Profile name"
                                                value={newProfileName}
                                                onChange={(e) => setNewProfileName(e.target.value)}
                                                disabled={creatingProfile}
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={creatingProfile || !newProfileName.trim()}
                                                className="w-full mt-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {creatingProfile ? "Creating..." : "Create Profile"}
                                            </button>
                                        </form>
                                    )}

                                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                        {profiles.length === 0 ? (
                                            <div className="text-center py-8">
                                                <p className="text-sm text-gray-500">No profiles yet</p>
                                            </div>
                                        ) : (
                                            profiles.map((profile) => (
                                                <div
                                                    key={profile.id}
                                                    onClick={() => selectProfile(profile)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedProfileId === profile.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">{profile.name}</h3>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            {selectedProfileId === profile.id && (
                                                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded font-medium">Active</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={deletingId === profile.id}
                                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(profile.id); }}
                                                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                title="Delete profile"
                                                            >
                                                                {deletingId === profile.id ? (
                                                                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500">{formatDate(profile.created_at)}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PANEL: Calibration Controls */}
                            <div className="col-span-9">
                                {!selectedProfile ? (
                                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                        <p className="text-gray-500">Select a profile to begin calibration</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Calibration Status Card */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">Calibration Mode</h3>
                                                    <p className="text-sm text-gray-500 mt-0.5">Profile: {selectedProfile.name}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={calibrationActive} onChange={onCalibrationToggle} disabled={loading} className="sr-only peer" />
                                                    <div className="w-14 h-7 bg-gray-300 rounded-full peer peer-checked:bg-emerald-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-200 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-7" />
                                                </label>
                                            </div>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${calibrationActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                                <div className={`w-2 h-2 rounded-full ${calibrationActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                                                {calibrationActive ? "Active" : "Inactive"}
                                            </div>
                                            {loading && (
                                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                    </svg>
                                                    Syncing with server...
                                                </div>
                                            )}
                                        </div>

                                        {/* Hands Grid */}
                                        {calibrationActive && (
                                            <div className="grid grid-cols-2 gap-6">
                                                {HANDS.map((hand) => (
                                                    <div key={hand} className="bg-white rounded-lg border border-gray-200 p-6">
                                                        {/* Hand toggle button */}
                                                        <div className="mb-4">
                                                            <button
                                                                type="button"
                                                                disabled={!calibrationActive || !handsReady || loading}
                                                                onClick={() => onHandToggle(hand)}
                                                                className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                                                                    hands[hand]
                                                                        ? "bg-emerald-600 text-white shadow-sm"
                                                                        : !handsReady
                                                                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                                }`}
                                                            >
                                                                <span className="capitalize">{hand} Hand</span>
                                                                {!handsReady && (
                                                                    <span className="block text-xs mt-1 opacity-75">Waiting for robot database</span>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Points */}
                                                        <div className="space-y-2 mb-4">
                                                            {POINTS.map((point) => {
                                                                const hasData = pointData[hand][point] !== null;
                                                                const isSelected = selectedPoints[hand].has(point);
                                                                const isPointInteractive = hands[hand] && pointsUnlocked[hand] && !loading;

                                                                return (
                                                                    <div key={point} className="space-y-1">
                                                                        <button
                                                                            type="button"
                                                                            disabled={!isPointInteractive}
                                                                            onClick={() => {
                                                                                if (!isPointInteractive) return;
                                                                                if (isSelected) {
                                                                                    // Always allow deselecting, regardless of data
                                                                                    setSelectedPoints((prev) => {
                                                                                        const s = new Set(prev[hand]);
                                                                                        s.delete(point);
                                                                                        return { ...prev, [hand]: s };
                                                                                    });
                                                                                } else if (hasData) {
                                                                                    // Re-select a point that already has data
                                                                                    setSelectedPoints((prev) => {
                                                                                        const s = new Set(prev[hand]);
                                                                                        s.add(point);
                                                                                        return { ...prev, [hand]: s };
                                                                                    });
                                                                                } else {
                                                                                    // No data yet — trigger API call to activate the point
                                                                                    onPointClick(hand, point);
                                                                                }
                                                                            }}
                                                                            title={hasData ? (isSelected ? "Deselect this point" : "Select for Test/Reset") : undefined}
                                                                            className={`w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all border flex items-center justify-between ${
                                                                                isSelected
                                                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                                                    : isPointInteractive
                                                                                      ? "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
                                                                                      : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
                                                                            }`}
                                                                        >
                                                                            <span className="flex items-center gap-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {}}
                                                                                    disabled={!isPointInteractive}
                                                                                    className="w-4 h-4 rounded pointer-events-none"
                                                                                />
                                                                                {point.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                                            </span>
                                                                            {hasData ? (
                                                                                <span className="text-xs text-emerald-600 font-medium">✓ Data</span>
                                                                            ) : null}
                                                                        </button>

                                                                        {hasData && pointData[hand][point] && (
                                                                            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                                                                                <span className="text-blue-700 font-medium">Values: </span>
                                                                                <span className="text-blue-900 font-mono">[{pointData[hand][point]!.join(", ")}]</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="pt-4 border-t border-gray-200">
                                                            <p className="text-xs text-gray-500 mb-3">{selectedPoints[hand].size} point(s) selected</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => testPoints(hand)}
                                                                    disabled={!hands[hand] || loading || selectedPoints[hand].size === 0}
                                                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    Test
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => retryPoints(hand)}
                                                                    disabled={!hands[hand] || loading}
                                                                    className="px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unsaved Points Warning Modal */}
                {showUnsavedWarning && unsavedHand && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                            <style>{`
                                @keyframes modalPop {
                                    from { opacity: 0; transform: scale(0.92) translateY(8px); }
                                    to   { opacity: 1; transform: scale(1) translateY(0); }
                                }
                            `}</style>
                            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-400" />
                            <div className="p-6">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-100 mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4v2m0-10a8 8 0 110 16 8 8 0 010-16z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                                    {testInProgress ? "Test In Progress" : "Unsaved Points"}
                                </h3>
                                <p className="text-sm text-gray-600 text-center mb-4">
                                    {testInProgress ? (
                                        <>
                                            Testing is currently running on the <span className="font-semibold capitalize">{unsavedHand}</span> hand.
                                            <span className="block mt-2 text-xs text-orange-600 font-medium">⏳ Please wait for the test to complete before switching.</span>
                                        </>
                                    ) : (
                                        <>You have selected points on the <span className="font-semibold capitalize">{unsavedHand}</span> hand that haven't been tested or saved yet.</>
                                    )}
                                </p>

                                {!testInProgress && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                                        <p className="text-xs font-semibold text-blue-900 mb-2">✓ Recorded Values:</p>
                                        <div className="space-y-1">
                                            {Array.from(selectedPoints[unsavedHand]).map((point) => (
                                                <div key={point} className="text-xs text-blue-800">
                                                    <span className="font-medium">{point.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:</span>
                                                    {pointData[unsavedHand][point] ? (
                                                        <span className="ml-2 font-mono">[{pointData[unsavedHand][point]!.join(", ")}]</span>
                                                    ) : (
                                                        <span className="ml-2">No data yet</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {testInProgress ? (
                                    <p className="text-xs text-orange-600 text-center mb-6 font-medium">⏳ Please wait for test to complete...</p>
                                ) : (
                                    <p className="text-xs text-amber-600 text-center mb-6 font-medium">⚠ These values will be lost if you continue!</p>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowUnsavedWarning(false); setUnsavedHand(null); setPendingHandSwitch(null); setTestInProgress(false); }}
                                        className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        {testInProgress ? "Wait" : "Cancel"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setShowUnsavedWarning(false);
                                            if (pendingHandSwitch && !testInProgress) await performHandSwitch(pendingHandSwitch);
                                            setUnsavedHand(null); setPendingHandSwitch(null); setTestInProgress(false);
                                        }}
                                        disabled={testInProgress}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${testInProgress ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-amber-600 text-white hover:bg-amber-700"}`}
                                    >
                                        {testInProgress ? "Testing..." : "Continue"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Test Completion Modal */}
                {showTestModal && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                            <div className="text-center mb-2">
                                <h3 className="text-xl font-bold text-gray-900">Test Completed! 🎉</h3>
                                <p className="text-gray-600 text-sm">The test has been completed successfully. What would you like to do next?</p>
                            </div>
                            <button
                                onClick={closeTestModal}
                                disabled={loading}
                                className="w-full mt-3 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
