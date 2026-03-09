"use client";

import React, { useEffect, useState, useCallback } from "react";
import { API_BASE_URL, fetchWithAuth } from "@/app/lib/auth";

/* ===============================
   TYPES & INTERFACES
================================ */
type Hand = "left" | "right";

interface HandState {
    left: boolean;
    right: boolean;
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
const INITIAL_HAND_STATE: HandState = { left: false, right: false };

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
                        You have an active calibration session. Closing now will discard all unsaved progress. Are you sure?
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
    // Profile state
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [newProfileName, setNewProfileName] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Calibration state
    const [calibrationActive, setCalibrationActive] = useState(false);
    const [handsReady, setHandsReady] = useState(false);
    const [hands, setHands] = useState<HandState>(INITIAL_HAND_STATE);

    // Tracks which hands have been tested (locked until test_completed received)
    const [handTested, setHandTested] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

    // Tracks which hands have completed (show popup)
    const [testCompleted, setTestCompleted] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

    // Tracks which hands have been started (Start clicked, awaiting Stop)
    const [handStarted, setHandStarted] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

    // Camera state
    const [activeHandCamera, setActiveHandCamera] = useState<Hand | null>(null);

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

    // Session state
    const [readyForDataCollection, setReadyForDataCollection] = useState<ReadyForDataCollectionData | null>(null);
    const [showPrematureCloseModal, setShowPrematureCloseModal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

    /* ===============================
       HELPERS
    ================================ */
    const clearReadyForDataCollection = useCallback(() => {
        setReadyForDataCollection(null);
        setHandsReady(false);
    }, []);

    const hasActiveSession = useCallback(() => {
        return readyForDataCollection !== null || calibrationActive;
    }, [readyForDataCollection, calibrationActive]);

    const resetCalibrationState = useCallback(() => {
        setHands(INITIAL_HAND_STATE);
        setHandsReady(false);
        setActiveHandCamera(null);
        setHandTested({ left: false, right: false });
        setTestCompleted({ left: false, right: false });
        setHandStarted({ left: false, right: false });
    }, []);

    const handleApiError = (error: unknown, context: string) => {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        setError(`${context}: ${message}`);
    };

    const clearError = () => setError(null);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleString("en-US", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });

    /* ===============================
       EFFECTS
    ================================ */
    useEffect(() => { fetchProfiles(); }, [robotId]);

    useEffect(() => {
        if (selectedProfileId) fetchCalibrationStatus(selectedProfileId);
    }, [selectedProfileId]);

    // WebSocket with auto-reconnect + sleep/wake detection
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
                        setHands((prev) => ({ ...prev, [data.hand!]: data.active! }));
                        setWsMessage(`${data.hand} hand ${data.active ? "enabled" : "disabled"}`);
                        setTimeout(() => setWsMessage(null), 3000);
                    } else if ((data as any).event === "calibration_status") {
                        const value = (data as any).data?.value;
                        const isActive = value === true || value === "true";
                        setCalibrationActive(isActive);
                        if (!isActive) {
                            resetCalibrationState();
                            clearReadyForDataCollection();
                        }
                        setWsMessage(`Calibration ${isActive ? "activated" : "deactivated"}`);
                        setTimeout(() => setWsMessage(null), 3000);
                    } else if ((data as any).event === "ready_for_data_collection") {
                        const activeHand: Hand | undefined = (data as any).data?.hand;
                        setReadyForDataCollection({ hand: activeHand, receivedAt: Date.now() });
                        setHandsReady(true);
                        setWsMessage("Ready for data collection — select a hand to begin");
                        setTimeout(() => setWsMessage(null), 3000);
                    } else if ((data as any).event === "test_completed_left_hand") {
                        setHandTested((prev) => ({ ...prev, left: false }));
                        setTestCompleted((prev) => ({ ...prev, left: true }));
                    } else if ((data as any).event === "test_completed_right_hand") {
                        setHandTested((prev) => ({ ...prev, right: false }));
                        setTestCompleted((prev) => ({ ...prev, right: true }));
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

    // Camera feed sync
    useEffect(() => {
        if (hands.left && !hands.right) setActiveHandCamera("left");
        else if (hands.right && !hands.left) setActiveHandCamera("right");
        else if (hands.left && hands.right) setActiveHandCamera("left");
        else setActiveHandCamera(null);
    }, [hands.left, hands.right]);

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
                resetCalibrationState();
                clearReadyForDataCollection();
            } else {
                setHandsReady((currentReady) => {
                    if (!currentReady) {
                        setHands(INITIAL_HAND_STATE);
                    } else {
                        setHands({
                            left: Boolean(d.left_hand_active),
                            right: Boolean(d.right_hand_active),
                        });
                    }
                    return currentReady;
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
                ws.send(JSON.stringify({
                    event: "calibration_status",
                    data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, value: active },
                }));
            }
            await fetchCalibrationStatus(selectedProfileId);
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
                ws.send(JSON.stringify({
                    event: "hand_toggle",
                    data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, hand, active },
                }));
            }
            return true;
        } catch (err) {
            handleApiError(err, `Failed to toggle ${hand} hand`);
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
            ws.send(JSON.stringify({
                event: "profile_clicked",
                data: { profile_id: profile.id, profile_name: profile.name },
            }));
        }
    };

    const onCalibrationToggle = async () => {
        if (!selectedProfileId) { setError("Please select a profile first"); return; }
        await toggleCalibration(!calibrationActive);
    };

    const onHandToggle = async (hand: Hand) => {
        if (!calibrationActive) { setError("Calibration must be active to toggle hands"); return; }
        if (!handsReady) { setError("Waiting for ready_for_data_collection event..."); return; }
        const next = !hands[hand];
        const otherHand: Hand = hand === "left" ? "right" : "left";

        if (next && hands[otherHand]) {
            // Deactivate other hand — update local state immediately, skip server refetch
            await toggleHand(otherHand, false);
            setHands((prev) => ({ ...prev, [otherHand]: false }));
            setHandStarted((prev) => ({ ...prev, [otherHand]: false }));
            setHandTested((prev) => ({ ...prev, [otherHand]: false }));
            setTestCompleted((prev) => ({ ...prev, [otherHand]: false }));
        }

        const success = await toggleHand(hand, next);
        if (success) {
            // Only update THIS hand — never touch the other hand's state here
            setHands((prev) => ({ ...prev, [hand]: next }));
            if (!next) {
                // Hand was turned off, reset its action state
                setHandStarted((prev) => ({ ...prev, [hand]: false }));
                setHandTested((prev) => ({ ...prev, [hand]: false }));
                setTestCompleted((prev) => ({ ...prev, [hand]: false }));
            }
        }
    };

    // ── Start / Stop / Test / Retry: WebSocket only, no API call ──
    const startHand = (hand: Hand) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) { setError("WebSocket not connected"); return; }
        ws.send(JSON.stringify({
            event: `${hand}_hand_started`,
            data: { profile_id: selectedProfileId, profile_name: selectedProfile?.name, hand, value: true },
        }));
        setHandStarted((prev) => ({ ...prev, [hand]: true }));
        setWsMessage(`${hand} hand start sent`);
        setTimeout(() => setWsMessage(null), 3000);
    };

    const stopHand = (hand: Hand) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) { setError("WebSocket not connected"); return; }
        ws.send(JSON.stringify({
            event: `${hand}_hand_stop`,
            data: { profile_id: selectedProfileId, profile_name: selectedProfile?.name, hand, value: false },
        }));
        setHandStarted((prev) => ({ ...prev, [hand]: false }));
        setHandTested((prev) => ({ ...prev, [hand]: false }));
        setWsMessage(`${hand} hand stop sent`);
        setTimeout(() => setWsMessage(null), 3000);
    };

    const testHand = (hand: Hand) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) { setError("WebSocket not connected"); return; }
        ws.send(JSON.stringify({
            event: `${hand}_hand_test`,
            data: { profile_id: selectedProfileId, profile_name: selectedProfile?.name, hand, value: true },
        }));
        setHandTested((prev) => ({ ...prev, [hand]: true }));
        setWsMessage(`${hand} hand test sent`);
        setTimeout(() => setWsMessage(null), 3000);
    };

    const retryHand = (hand: Hand) => {
        // Reset all action state for this hand back to initial (as if hand was just enabled)
        setHandStarted((prev) => ({ ...prev, [hand]: false }));
        setHandTested((prev) => ({ ...prev, [hand]: false }));
        setTestCompleted((prev) => ({ ...prev, [hand]: false }));
        setWsMessage(`${hand} hand reset — ready to start again`);
        setTimeout(() => setWsMessage(null), 3000);
    };

    const performClose = useCallback(async () => {
        if (calibrationActive && selectedProfileId && selectedProfile) {
            try {
                await fetchWithAuth(
                    `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/`,
                    { method: "PATCH", body: JSON.stringify({ calibration_status: false }) },
                );
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        event: "calibration_status",
                        data: { profile_id: selectedProfileId, profile_name: selectedProfile.name, value: false },
                    }));
                }
            } catch { /* best-effort */ }
        }
        clearReadyForDataCollection();
        resetCalibrationState();
        setCalibrationActive(false);
        setSelectedProfile(null);
        setSelectedProfileId(null);
        setShowPrematureCloseModal(false);
        setError(null);
        onClose();
    }, [calibrationActive, selectedProfileId, selectedProfile, ws, robotId, clearReadyForDataCollection, resetCalibrationState, onClose]);

    const handleClose = async () => {
        if (hasActiveSession()) { setShowPrematureCloseModal(true); return; }
        await performClose();
    };

    const handlePrematureClose = async () => {
        setIsClosing(true);
        await performClose();
        setIsClosing(false);
    };

    const handleContinueSession = () => setShowPrematureCloseModal(false);

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
                    <PrematureCloseModal
                        onClose={handlePrematureClose}
                        onContinue={handleContinueSession}
                        isClosing={isClosing}
                    />
                )}

                {profileToDelete && !showPrematureCloseModal && (
                    <DeleteConfirmModal
                        profile={profileToDelete}
                        isDeleting={deletingId === profileToDelete.id}
                        onConfirm={() => deleteProfile(profileToDelete.id)}
                        onCancel={() => setConfirmDeleteId(null)}
                    />
                )}

                {/* Test Completed Popup */}
                {(testCompleted.left || testCompleted.right) && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                            style={{ animation: "modalPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
                        >
                            <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-green-500" />
                            <div className="p-8 text-center">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 mx-auto mb-5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Completed!</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    {testCompleted.left && testCompleted.right
                                        ? "Both hands test completed successfully."
                                        : testCompleted.left
                                            ? "Left hand test completed successfully."
                                            : "Right hand test completed successfully."}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setTestCompleted({ left: false, right: false })}
                                    className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
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
                            {/* LEFT SIDEBAR */}
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
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                        selectedProfileId === profile.id
                                                            ? "border-emerald-500 bg-emerald-50"
                                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                    }`}
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

                            {/* RIGHT PANEL */}
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
                                                    <input
                                                        type="checkbox"
                                                        checked={calibrationActive}
                                                        onChange={onCalibrationToggle}
                                                        disabled={loading}
                                                        className="sr-only peer"
                                                    />
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

                                        {/* Camera Feed */}
                                        {(hands.left || hands.right) && (
                                            <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden border-2 border-gray-300">
                                                {activeHandCamera ? (
                                                    <img
                                                        src="http://192.168.1.140:5000/video"
                                                        alt="camera"
                                                        className="w-full h-full object-cover"
                                                        style={{ transform: activeHandCamera === "right" ? "scaleX(-1)" : "scaleX(1)" }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                        <p className="text-gray-400 text-xl">Enable Left or Right Hand</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Hands Grid */}
                                        {calibrationActive && (
                                            <div className="grid grid-cols-2 gap-6">
                                                {HANDS.map((hand) => (
                                                    <div key={hand} className="bg-white rounded-lg border border-gray-200 p-6">
                                                        {/* Hand toggle */}
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
                                                                <span className="block text-xs mt-1 opacity-75">Waiting for ready signal...</span>
                                                            )}
                                                        </button>

                                                        {/* Start / Stop / Test / Retry — shown when hand is active */}
                                                        {hands[hand] && (
                                                            <div className="grid grid-cols-4 gap-2 mt-4">
                                                                {/* Start */}
                                                                <button
                                                                    type="button"
                                                                    disabled={!wsConnected || handStarted[hand]}
                                                                    onClick={() => startHand(hand)}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M8 5v14l11-7z" />
                                                                    </svg>
                                                                    Start
                                                                </button>

                                                                {/* Stop */}
                                                                <button
                                                                    type="button"
                                                                    disabled={!wsConnected || !handStarted[hand]}
                                                                    onClick={() => stopHand(hand)}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M6 6h12v12H6z" />
                                                                    </svg>
                                                                    Stop
                                                                </button>

                                                                {/* Test */}
                                                                <button
                                                                    type="button"
                                                                    disabled={!wsConnected || handTested[hand] || handStarted[hand]}
                                                                    onClick={() => testHand(hand)}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    {handTested[hand] ? (
                                                                        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    )}
                                                                    {handTested[hand] ? "Testing..." : "Test"}
                                                                </button>

                                                                {/* Retry */}
                                                                <button
                                                                    type="button"
                                                                    disabled={!wsConnected}
                                                                    onClick={() => retryHand(hand)}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    Retry
                                                                </button>
                                                            </div>
                                                        )}
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
            </div>
        </div>
    );
}