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

/* ===============================
   CONSTANTS
================================ */
const HANDS: Hand[] = ["left", "right"];
const POINTS: Point[] = ["point_one", "point_two", "point_three"];

const INITIAL_HAND_STATE: HandState = {
    left: false,
    right: false,
};

const INITIAL_POINTS_STATE: PointsState = {
    left: { point_one: false, point_two: false, point_three: false },
    right: { point_one: false, point_two: false, point_three: false },
};

/* ===============================
   MAIN COMPONENT
================================ */
export default function ArmCalibration({
    robotId,
    roboId,
    onClose,
}: RobotCalibrationProps) {
    // Robot & Profile State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [newProfileName, setNewProfileName] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Calibration State
    const [calibrationActive, setCalibrationActive] = useState(false);
    const [handsReady, setHandsReady] = useState(false);
    const [hands, setHands] = useState<HandState>(INITIAL_HAND_STATE);
    const [points, setPoints] = useState<PointsState>(INITIAL_POINTS_STATE);

    // Multiple selected points per hand
    const [selectedPoints, setSelectedPoints] = useState<{
        left: Set<Point>;
        right: Set<Point>;
    }>({
        left: new Set(),
        right: new Set(),
    });

    // Point data values from WebSocket
    const [pointData, setPointData] = useState<{
        left: {
            point_one: number[] | null;
            point_two: number[] | null;
            point_three: number[] | null;
        };
        right: {
            point_one: number[] | null;
            point_two: number[] | null;
            point_three: number[] | null;
        };
    }>({
        left: { point_one: null, point_two: null, point_three: null },
        right: { point_one: null, point_two: null, point_three: null },
    });

    // UI State
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // WebSocket State
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsMessage, setWsMessage] = useState<string | null>(null);

    // Test Completion Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [testCompletedHands, setTestCompletedHands] = useState<{
        left: boolean;
        right: boolean;
    }>({
        left: false,
        right: false,
    });

    // Camera Feed State
    const [activeHandCamera, setActiveHandCamera] = useState<Hand | null>(null);

    /* ===============================
       EFFECTS
    ================================ */
    useEffect(() => {
        fetchProfiles();
    }, [robotId]);

    // Fetch calibration status whenever selectedProfileId changes
    useEffect(() => {
        if (selectedProfileId) {
            fetchCalibrationStatus(selectedProfileId);
        }
    }, [selectedProfileId]);

    // WebSocket connection effect
    useEffect(() => {
        const wsUrl = `ws://192.168.0.216:8002/ws/robot_message/${roboId}/profile/`;

        const websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
            setWsConnected(true);

            if (selectedProfileId) {
                const message = {
                    event: "profile_clicked",
                    data: {
                        profile_id: selectedProfileId,
                    },
                };
                websocket.send(JSON.stringify(message));
            }
        };

        websocket.onmessage = (event) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);

                if (
                    data.type === "hand_toggle" &&
                    data.hand !== undefined &&
                    data.active !== undefined
                ) {
                    setHands((prev) => ({
                        ...prev,
                        [data.hand!]: data.active!,
                    }));
                    if (!data.active) {
                        resetHandPoints(data.hand);
                    }
                    setWsMessage(
                        `${data.hand} hand ${data.active ? "enabled" : "disabled"}`,
                    );
                    setTimeout(() => setWsMessage(null), 3000);
                } else if (
                    data.type === "point_toggle" &&
                    data.hand !== undefined &&
                    data.point !== undefined &&
                    data.active !== undefined
                ) {
                    setPoints((prev) => ({
                        ...prev,
                        [data.hand!]: {
                            ...prev[data.hand!],
                            [data.point!]: data.active!,
                        },
                    }));
                    const pointName = data.point.replace(/_/g, " ");
                    setWsMessage(
                        `${data.hand} ${pointName} ${data.active ? "set" : "unset"}`,
                    );
                    setTimeout(() => setWsMessage(null), 3000);
                } else if (data.calibration_status !== undefined) {
                    setCalibrationActive(data.calibration_status);
                    if (!data.calibration_status) {
                        resetCalibrationState();
                    }
                    setWsMessage(
                        `Calibration ${data.calibration_status ? "activated" : "deactivated"}`,
                    );
                    setTimeout(() => setWsMessage(null), 3000);
                }

                const pointDataEventPattern =
                    /^(left|right)_(point_one|point_two|point_three)_data$/;
                const match = (data as any).event?.match(pointDataEventPattern);

                if (match) {
                    const hand = match[1] as Hand;
                    const point = match[2] as Point;
                    const values = (data as any).data?.data?.values;

                    if (values && Array.isArray(values)) {
                        setPointData((prev) => ({
                            ...prev,
                            [hand]: {
                                ...prev[hand],
                                [point]: values,
                            },
                        }));
                        setWsMessage(
                            `${hand} ${point.replace(/_/g, " ")} data received`,
                        );
                        setTimeout(() => setWsMessage(null), 3000);
                    }
                }

                const testCompletedPattern = /^test_completed_(left|right)$/;
                const testMatch = (data as any).event?.match(testCompletedPattern);

                if (testMatch) {
                    const hand = testMatch[1] as Hand;
                    const value = (data as any).data?.value;

                    if (value === "true" || value === true) {
                        setTestCompletedHands((prev) => ({
                            ...prev,
                            [hand]: true,
                        }));
                        setShowTestModal(true);
                        setWsMessage(`Test completed for ${hand} hand`);
                        setTimeout(() => setWsMessage(null), 3000);
                    }
                }

                // Handle ready_for_data_collection event
                if ((data as any).event === "ready_for_data_collection") {
                    setHandsReady(true);
                    setWsMessage("Ready for data collection - You can now select a hand");
                    setTimeout(() => setWsMessage(null), 3000);
                }
            } catch (err) {}
        };

        websocket.onerror = () => {
            setWsConnected(false);
        };

        websocket.onclose = () => {
            setWsConnected(false);
        };

        setWs(websocket);

        return () => {
            if (websocket.readyState === WebSocket.OPEN) {
                websocket.close();
            }
        };
    }, [robotId, roboId, selectedProfileId]);

    // Camera feed sync effect
    useEffect(() => {
        if (hands.left && !hands.right) {
            setActiveHandCamera("left");
        } else if (hands.right && !hands.left) {
            setActiveHandCamera("right");
        } else if (!hands.left && !hands.right) {
            setActiveHandCamera(null);
        }
    }, [hands.left, hands.right]);

    /* ===============================
       UTILITY FUNCTIONS
    ================================ */
    const resetCalibrationState = useCallback(() => {
        setHands(INITIAL_HAND_STATE);
        setPoints(INITIAL_POINTS_STATE);
        setSelectedPoints({
            left: new Set(),
            right: new Set(),
        });
        setPointData({
            left: { point_one: null, point_two: null, point_three: null },
            right: { point_one: null, point_two: null, point_three: null },
        });
        setHandsReady(false);
        setActiveHandCamera(null);
    }, []);

    const resetHandPoints = useCallback((hand: Hand) => {
        setPoints((prev) => ({
            ...prev,
            [hand]: { point_one: false, point_two: false, point_three: false },
        }));
        setPointData((prev) => ({
            ...prev,
            [hand]: { point_one: null, point_two: null, point_three: null },
        }));
        setSelectedPoints((prev) => ({
            ...prev,
            [hand]: new Set(),
        }));
    }, []);

    const handleApiError = (error: unknown, context: string) => {
        const message =
            error instanceof Error
                ? error.message
                : "An unexpected error occurred";
        setError(`${context}: ${message}`);
    };

    const clearError = () => setError(null);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    /* ===============================
       API CALLS
    ================================ */

    // ─── Fetch calibration status from GET endpoint ────────────────────────────
    const fetchCalibrationStatus = async (profileId: number = selectedProfileId!) => {
        if (!profileId) return;
        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${profileId}/calibration/`,
                { method: "GET" }
            );
            if (!res.ok) throw new Error(`Failed to fetch calibration status: ${res.statusText}`);

            const json = await res.json();
            const d = json?.data;
            if (!d) return;

            // 1. Calibration active
            const isActive = Boolean(d.calibration_status);
            setCalibrationActive(isActive);

            // 2. Hand active states
            const leftActive  = Boolean(d.left_hand_active);
            const rightActive = Boolean(d.right_hand_active);
            setHands({ left: leftActive, right: rightActive });

            // 3. Point data values
            setPointData({
                left: {
                    point_one:   d.left_point_one?.values   ?? null,
                    point_two:   d.left_point_two?.values   ?? null,
                    point_three: d.left_point_three?.values ?? null,
                },
                right: {
                    point_one:   d.right_point_one?.values   ?? null,
                    point_two:   d.right_point_two?.values   ?? null,
                    point_three: d.right_point_three?.values ?? null,
                },
            });

            // 4. Point active states -> selectedPoints
            const buildSelectedSet = (p1: boolean, p2: boolean, p3: boolean): Set<Point> => {
                const s = new Set<Point>();
                if (p1) s.add("point_one");
                if (p2) s.add("point_two");
                if (p3) s.add("point_three");
                return s;
            };

            setSelectedPoints({
                left: buildSelectedSet(
                    Boolean(d.left_point_one_active),
                    Boolean(d.left_point_two_active),
                    Boolean(d.left_point_three_active),
                ),
                right: buildSelectedSet(
                    Boolean(d.right_point_one_active),
                    Boolean(d.right_point_two_active),
                    Boolean(d.right_point_three_active),
                ),
            });

            // 5. Points state
            setPoints({
                left: {
                    point_one:   Boolean(d.left_point_one_active),
                    point_two:   Boolean(d.left_point_two_active),
                    point_three: Boolean(d.left_point_three_active),
                },
                right: {
                    point_one:   Boolean(d.right_point_one_active),
                    point_two:   Boolean(d.right_point_two_active),
                    point_three: Boolean(d.right_point_three_active),
                },
            });

            // 6. If calibration off -> full reset
            if (!isActive) {
                resetCalibrationState();
            }
        } catch (err) {
            handleApiError(err, "Failed to fetch calibration status");
        }
    };
    // ──────────────────────────────────────────────────────────────────────────

    const fetchProfiles = async () => {
        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/`,
                { method: "GET" },
            );

            if (!res.ok)
                throw new Error(`Failed to fetch profiles: ${res.statusText}`);

            const response = await res.json();
            let profilesArray: Profile[] = [];

            if (response.success && Array.isArray(response.data)) {
                profilesArray = response.data;
            } else if (Array.isArray(response)) {
                profilesArray = response;
            } else if (response && Array.isArray(response.results)) {
                profilesArray = response.results;
            } else if (response && Array.isArray(response.profiles)) {
                profilesArray = response.profiles;
            } else if (response && typeof response === "object") {
                profilesArray = [response];
            }

            setProfiles(profilesArray);
        } catch (err) {
            handleApiError(err, "Failed to load profiles");
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async () => {
        if (!newProfileName.trim()) {
            setError("Profile name cannot be empty");
            return;
        }

        clearError();
        setCreatingProfile(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/`,
                {
                    method: "POST",
                    body: JSON.stringify({ name: newProfileName.trim() }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to create profile: ${res.statusText}`);

            const data: Profile = await res.json();
            setProfiles((prev) => [...prev, data]);
            setNewProfileName("");
            setShowCreateForm(false);
            selectProfile(data);
        } catch (err) {
            handleApiError(err, "Failed to create profile");
        } finally {
            setCreatingProfile(false);
        }
    };

    const deleteProfile = async (profileId: number) => {
        if (!confirm("Are you sure you want to delete this profile?")) return;

        clearError();
        setDeletingId(profileId);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${profileId}/`,
                { method: "DELETE" },
            );

            if (!res.ok)
                throw new Error(`Failed to delete profile: ${res.statusText}`);

            setProfiles((prev) => prev.filter((p) => p.id !== profileId));

            if (selectedProfileId === profileId) {
                setSelectedProfileId(null);
                setSelectedProfile(null);
                resetCalibrationState();
            }
        } catch (err) {
            handleApiError(err, "Failed to delete profile");
        } finally {
            setDeletingId(null);
        }
    };

    const toggleCalibration = async (active: boolean) => {
        if (!selectedProfileId) {
            setError("Profile must be selected first");
            return false;
        }

        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ calibration_status: active }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to toggle calibration: ${res.statusText}`);

            // ─── Re-fetch calibration status after PATCH ───────────────────
            await fetchCalibrationStatus(selectedProfileId);
            // ──────────────────────────────────────────────────────────────

            return true;
        } catch (err) {
            handleApiError(err, "Failed to toggle calibration");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toggleHand = async (hand: Hand, active: boolean) => {
        if (!selectedProfileId) {
            setError("Profile must be selected first");
            return false;
        }

        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/hand/`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ hand, active }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to toggle ${hand} hand: ${res.statusText}`);

            // ─── Re-fetch calibration status after PATCH ───────────────────
            await fetchCalibrationStatus(selectedProfileId);
            // ──────────────────────────────────────────────────────────────

            return true;
        } catch (err) {
            handleApiError(err, `Failed to toggle ${hand} hand`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const togglePoint = async (hand: Hand, point: Point, active: boolean) => {
        if (!selectedProfileId) {
            setError("Profile must be selected first");
            return false;
        }

        if (!hands[hand]) {
            setError(`${hand} hand must be enabled first`);
            return false;
        }

        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/point/`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ hand, point, active }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to toggle ${hand} ${point}: ${res.statusText}`);

            // ─── Re-fetch calibration status after PATCH ───────────────────
            await fetchCalibrationStatus(selectedProfileId);
            // ──────────────────────────────────────────────────────────────

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
        if (!selectedProfileId) {
            setError("Profile must be selected first");
            return false;
        }

        if (!hands[hand]) {
            setError(`${hand} hand must be enabled first`);
            return false;
        }

        const pointsToTest = Array.from(selectedPoints[hand]);
        if (pointsToTest.length === 0) {
            setError(`Please select at least one point for ${hand} hand`);
            return false;
        }

        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/test/`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ hand, points: pointsToTest }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to test ${hand} hand: ${res.statusText}`);

            // ─── Re-fetch calibration status after PATCH ───────────────────
            await fetchCalibrationStatus(selectedProfileId);
            // ──────────────────────────────────────────────────────────────

            setWsMessage(`Testing ${pointsToTest.length} point(s) on ${hand} hand...`);
            setTimeout(() => setWsMessage(null), 3000);
            return true;
        } catch (err) {
            handleApiError(err, `Failed to test ${hand} hand points`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const retryPoints = async (hand: Hand) => {
        if (!selectedProfileId) {
            setError("Profile must be selected first");
            return false;
        }

        if (!hands[hand]) {
            setError(`${hand} hand must be enabled first`);
            return false;
        }

        const pointsToRetry = Array.from(selectedPoints[hand]);
        if (pointsToRetry.length === 0) {
            setError(`Please select at least one point for ${hand} hand`);
            return false;
        }

        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/retry/`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ hand, points: pointsToRetry }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to retry ${hand} hand: ${res.statusText}`);

            // ─── Re-fetch calibration status after PATCH ───────────────────
            await fetchCalibrationStatus(selectedProfileId);
            // ──────────────────────────────────────────────────────────────

            setWsMessage(`Retrying ${pointsToRetry.length} point(s) on ${hand} hand...`);
            setTimeout(() => setWsMessage(null), 3000);
            return true;
        } catch (err) {
            handleApiError(err, `Failed to retry ${hand} hand points`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updatePoints = async (hand: Hand) => {
        if (!selectedProfileId) {
            setError("Profile must be selected first");
            return false;
        }

        if (!hands[hand]) {
            setError(`${hand} hand must be enabled first`);
            return false;
        }

        const pointsToUpdate = Array.from(selectedPoints[hand]);
        if (pointsToUpdate.length === 0) {
            setError(`Please select at least one point for ${hand} hand`);
            return false;
        }

        const missingData = pointsToUpdate.filter((point) => !pointData[hand][point]);
        if (missingData.length > 0) {
            setError(
                `Missing data for: ${missingData.map((p) => p.replace(/_/g, " ")).join(", ")}`,
            );
            return false;
        }

        clearError();
        setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE_URL}/robots/${robotId}/profiles/${selectedProfileId}/calibration/update/`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ hand }),
                },
            );

            if (!res.ok)
                throw new Error(`Failed to update ${hand} hand: ${res.statusText}`);

            // ─── Re-fetch calibration status after PATCH ───────────────────
            await fetchCalibrationStatus(selectedProfileId);
            // ──────────────────────────────────────────────────────────────

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
        setCalibrationActive(false);
        // fetchCalibrationStatus is triggered via useEffect on selectedProfileId change
    };

    const deselectProfile = () => {
        setSelectedProfile(null);
        setSelectedProfileId(null);
        resetCalibrationState();
        setCalibrationActive(false);
    };

    const onCalibrationToggle = async () => {
        if (!selectedProfileId) {
            setError("Please select a profile first");
            return;
        }

        const next = !calibrationActive;
        await toggleCalibration(next);
        // State is now set inside fetchCalibrationStatus called inside toggleCalibration
    };

    const onHandToggle = async (hand: Hand) => {
        if (!calibrationActive) {
            setError("Calibration must be active to toggle hands");
            return;
        }

        if (!handsReady) {
            setError("Waiting for ready_for_data_collection event...");
            return;
        }

        const next = !hands[hand];

        if (next) {
            const otherHand: Hand = hand === "left" ? "right" : "left";

            if (hands[otherHand]) {
                const disableSuccess = await toggleHand(otherHand, false);
                if (!disableSuccess) {
                    setError(`Failed to disable ${otherHand} hand`);
                    return;
                }
                setHands((prev) => ({ ...prev, [otherHand]: false }));
                resetHandPoints(otherHand);
            }
        }

        const success = await toggleHand(hand, next);
        if (success) {
            setHands((prev) => ({ ...prev, [hand]: next }));
            if (!next) resetHandPoints(hand);
        }
    };

    const onPointClick = async (hand: Hand, point: Point) => {
        if (!hands[hand]) {
            setError(`${hand} hand must be enabled first`);
            return;
        }

        const isCurrentlySelected = selectedPoints[hand].has(point);
        if (isCurrentlySelected) return;

        const success = await togglePoint(hand, point, true);

        if (success) {
            setSelectedPoints((prev) => {
                const newSet = new Set(prev[hand]);
                newSet.add(point);
                return { ...prev, [hand]: newSet };
            });
        }
    };

    const closeTestModal = () => {
        setShowTestModal(false);
        setTestCompletedHands({ left: false, right: false });
    };

    const handleTestModalRetry = async (hand: Hand) => {
        const success = await retryPoints(hand);
        if (success) closeTestModal();
    };

    const handleTestModalUpdate = async (hand: Hand) => {
        const success = await updatePoints(hand);
        if (success) closeTestModal();
    };

    const handleClose = () => {
        resetCalibrationState();
        setCalibrationActive(false);
        setSelectedProfile(null);
        setSelectedProfileId(null);
        onClose();
    };

    /* ===============================
       RENDER
    ================================ */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* Modal Container */}
            <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-[80%] max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Robotic Calibration Dashboard
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Robot ID: {roboId}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                                    wsConnected
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-red-50 border-red-200"
                                }`}
                            >
                                <div
                                    className={`w-2 h-2 rounded-full ${
                                        wsConnected ? "bg-emerald-500" : "bg-red-500"
                                    }`}
                                ></div>
                                <span
                                    className={`text-sm font-medium ${
                                        wsConnected ? "text-emerald-700" : "text-red-700"
                                    }`}
                                >
                                    {wsConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-100px)] bg-gray-50">
                    <div className="p-8">
                        {/* WS Notification */}
                        {wsMessage && (
                            <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <p className="text-sm text-blue-700">{wsMessage}</p>
                            </div>
                        )}

                        {/* ERROR */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-red-900">Error</p>
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                    <button
                                        onClick={clearError}
                                        className="text-red-500 hover:text-red-700 text-xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* MAIN GRID */}
                        <div className="grid grid-cols-12 gap-6">
                            {/* LEFT SIDEBAR: PROFILE LIST */}
                            <div className="col-span-3">
                                <div className="bg-white rounded-lg border border-gray-200 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-base font-semibold text-gray-900">
                                            Profiles
                                        </h2>
                                        <button
                                            onClick={() => setShowCreateForm(!showCreateForm)}
                                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                                        >
                                            {showCreateForm ? "Cancel" : "+ New"}
                                        </button>
                                    </div>

                                    {showCreateForm && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                createProfile();
                                            }}
                                            className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                        >
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
                                                        <h3 className="text-sm font-medium text-gray-900">
                                                            {profile.name}
                                                        </h3>
                                                        {selectedProfileId === profile.id && (
                                                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded font-medium">
                                                                Active
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDate(profile.created_at)}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PANEL: CALIBRATION CONTROLS */}
                            <div className="col-span-9">
                                {!selectedProfile ? (
                                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                        <p className="text-gray-500">
                                            Select a profile to begin calibration
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* CALIBRATION STATUS CARD */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Calibration Mode
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        Profile: {selectedProfile.name}
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={calibrationActive}
                                                        onChange={onCalibrationToggle}
                                                        disabled={loading}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-14 h-7 bg-gray-300 rounded-full peer peer-checked:bg-emerald-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-200 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-7"></div>
                                                </label>
                                            </div>
                                            <div
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                    calibrationActive
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        calibrationActive ? "bg-emerald-500" : "bg-gray-400"
                                                    }`}
                                                ></div>
                                                {calibrationActive ? "Active" : "Inactive"}
                                            </div>

                                            {/* Loading indicator */}
                                            {loading && (
                                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                                    <svg
                                                        className="animate-spin h-3 w-3"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8v8z"
                                                        />
                                                    </svg>
                                                    Syncing with server...
                                                </div>
                                            )}
                                        </div>

                                        {/* CAMERA FEED SECTION */}
                                        {(hands.left || hands.right) && (
                                            <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden border-2 border-gray-300">
                                                {activeHandCamera ? (
                                                    <img
                                                        src="http://192.168.1.140:5000/video"
                                                        alt="camera"
                                                        className="w-full h-full object-cover"
                                                        style={{
                                                            transform:
                                                                activeHandCamera === "right"
                                                                    ? "scaleX(-1)"
                                                                    : "scaleX(1)",
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                        <p className="text-gray-400 text-xl">
                                                            Enable Left or Right Hand
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* HANDS GRID */}
                                        {calibrationActive && (
                                            <div className="grid grid-cols-2 gap-6">
                                                {HANDS.map((hand) => (
                                                    <div
                                                        key={hand}
                                                        className="bg-white rounded-lg border border-gray-200 p-6"
                                                    >
                                                        {/* HAND HEADER */}
                                                        <div className="mb-4">
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    !calibrationActive ||
                                                                    !handsReady ||
                                                                    loading
                                                                }
                                                                onClick={() => onHandToggle(hand)}
                                                                className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                                                                    hands[hand]
                                                                        ? "bg-emerald-600 text-white shadow-sm"
                                                                        : !handsReady
                                                                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                                }`}
                                                            >
                                                                <span className="capitalize">
                                                                    {hand} Hand
                                                                </span>
                                                                {!handsReady && (
                                                                    <span className="block text-xs mt-1 opacity-75">
                                                                        Waiting for ready signal...
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* POINTS */}
                                                        <div className="space-y-2 mb-4">
                                                            {POINTS.map((point) => {
                                                                const isSelected =
                                                                    selectedPoints[hand].has(point);
                                                                const hasData =
                                                                    pointData[hand][point] !== null;

                                                                return (
                                                                    <div key={point} className="space-y-1">
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                !hands[hand] || loading
                                                                            }
                                                                            onClick={() =>
                                                                                onPointClick(hand, point)
                                                                            }
                                                                            className={`w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all border flex items-center justify-between ${
                                                                                isSelected
                                                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                                                    : hands[hand]
                                                                                      ? "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
                                                                                      : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                                                                            }`}
                                                                        >
                                                                            <span className="flex items-center gap-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {}}
                                                                                    disabled={!hands[hand]}
                                                                                    className="w-4 h-4 rounded pointer-events-none"
                                                                                />
                                                                                {point
                                                                                    .replace(/_/g, " ")
                                                                                    .replace(
                                                                                        /\b\w/g,
                                                                                        (l) => l.toUpperCase(),
                                                                                    )}
                                                                            </span>
                                                                            {hasData && (
                                                                                <span className="text-xs text-blue-600 font-medium">
                                                                                    ✓ Data
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                        {hasData &&
                                                                            pointData[hand][point] && (
                                                                                <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                                                                                    <span className="text-blue-700 font-medium">
                                                                                        Values:{" "}
                                                                                    </span>
                                                                                    <span className="text-blue-900 font-mono">
                                                                                        [
                                                                                        {pointData[hand][
                                                                                            point
                                                                                        ]!.join(", ")}
                                                                                        ]
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* ACTION BUTTONS */}
                                                        <div className="pt-4 border-t border-gray-200">
                                                            <p className="text-xs text-gray-500 mb-3">
                                                                {selectedPoints[hand].size} point(s) selected
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => testPoints(hand)}
                                                                    disabled={
                                                                        !hands[hand] ||
                                                                        loading ||
                                                                        selectedPoints[hand].size === 0
                                                                    }
                                                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    Test
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => retryPoints(hand)}
                                                                    disabled={
                                                                        !hands[hand] ||
                                                                        loading ||
                                                                        selectedPoints[hand].size === 0
                                                                    }
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

                {/* TEST COMPLETION MODAL */}
                {showTestModal && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    Test Completed! 🎉
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    The test has been completed successfully. What would you like to do next?
                                </p>
                            </div>

                            <div className="space-y-4">
                                {testCompletedHands.left && hands.left && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">
                                            Left Hand
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleTestModalRetry("left")}
                                                disabled={loading}
                                                className="px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Retry
                                            </button>
                                            <button
                                                onClick={() => handleTestModalUpdate("left")}
                                                disabled={
                                                    loading ||
                                                    Array.from(selectedPoints.left).some(
                                                        (p) => !pointData.left[p],
                                                    )
                                                }
                                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {testCompletedHands.right && hands.right && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">
                                            Right Hand
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleTestModalRetry("right")}
                                                disabled={loading}
                                                className="px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Retry
                                            </button>
                                            <button
                                                onClick={() => handleTestModalUpdate("right")}
                                                disabled={
                                                    loading ||
                                                    Array.from(selectedPoints.right).some(
                                                        (p) => !pointData.right[p],
                                                    )
                                                }
                                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={closeTestModal}
                                disabled={loading}
                                className="w-full mt-6 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-all"
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