/* ===================== WEBSOCKET UTILITIES ===================== */

import React from "react";

export interface WebSocketMessage {
    type: string;
    data?: any;
    timestamp?: string;
    event?: string;
    robot_id?: string;
}

export interface RobotWebSocketConfig {
    robotId: string;
    baseUrl: string; // e.g., "ws://192.168.1.100:8002"
    onMessage?: (message: WebSocketMessage) => void;
    onScheduleUpdated?: () => void;
    onError?: (error: Error) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

/**
 * WebSocket Manager for Robot Real-time Updates
 * Handles connection, reconnection, and message routing
 */
export class RobotWebSocketManager {
    private ws: WebSocket | null = null;
    private config: RobotWebSocketConfig;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000; // 3 seconds
    private isManuallyDisconnected = false;
    private messageQueue: WebSocketMessage[] = [];
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(config: RobotWebSocketConfig) {
        this.config = config;
        console.log("🔌 WebSocket Manager initialized for robot:", config.robotId);
    }

    /**
     * Connect to WebSocket
     */
    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${this.config.baseUrl}/ws/robot_message/${this.config.robotId}/`;
                console.log("🔗 Connecting to WebSocket:", wsUrl);

                this.ws = new WebSocket(wsUrl);

                // Connection opened
                this.ws.onopen = () => {
                    console.log("✅ WebSocket connected for robot:", this.config.robotId);
                    this.reconnectAttempts = 0;
                    this.isManuallyDisconnected = false;

                    // Start heartbeat
                    this.startHeartbeat();

                    // Process queued messages
                    this.processMessageQueue();

                    if (this.config.onConnected) {
                        this.config.onConnected();
                    }

                    resolve();
                };

                // Message received
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                // Error occurred
                this.ws.onerror = (event) => {
                    console.error("❌ WebSocket error:", event);
                    if (this.config.onError) {
                        this.config.onError(new Error("WebSocket error occurred"));
                    }
                    reject(new Error("WebSocket connection failed"));
                };

                // Connection closed
                this.ws.onclose = () => {
                    console.warn("⚠️  WebSocket disconnected");
                    this.stopHeartbeat();

                    if (this.config.onDisconnected) {
                        this.config.onDisconnected();
                    }

                    // Attempt to reconnect if not manually disconnected
                    if (!this.isManuallyDisconnected) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                console.error("❌ WebSocket connection error:", error);
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket
     */
    public disconnect(): void {
        console.log("🔌 Disconnecting WebSocket");
        this.isManuallyDisconnected = true;
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Send message to WebSocket
     */
    public send(message: WebSocketMessage): boolean {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                console.log("📤 Sending WebSocket message:", message);
                this.ws.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error("❌ Failed to send message:", error);
                return false;
            }
        } else {
            console.warn("⚠️  WebSocket not connected, queueing message");
            this.messageQueue.push(message);
            return false;
        }
    }

    /**
     * Check if WebSocket is connected
     */
    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(data: string): void {
        try {
            const message: WebSocketMessage = JSON.parse(data);
            console.log("📥 WebSocket message received:", message);

            // Route message to appropriate handler
            switch (message.type || message.event) {
                case "schedule_updated":
                    console.log("📅 Schedule updated event received!");
                    if (this.config.onScheduleUpdated) {
                        this.config.onScheduleUpdated();
                    }
                    break;

                case "robot_status":
                    console.log("🤖 Robot status update:", message.data);
                    break;

                case "connection_established":
                    console.log("🔗 Connection established message received");
                    break;

                default:
                    console.log("📨 Generic message:", message);
                    if (this.config.onMessage) {
                        this.config.onMessage(message);
                    }
            }
        } catch (error) {
            console.error("❌ Failed to parse WebSocket message:", error);
        }
    }

    /**
     * Process queued messages when connection is re-established
     */
    private processMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                console.log("📤 Processing queued message:", message);
                this.send(message);
            }
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(
                "❌ Max reconnection attempts reached. Stopping reconnect."
            );
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

        console.log(
            `⏳ Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
        );

        setTimeout(() => {
            this.connect().catch((error) => {
                console.error("❌ Reconnection failed:", error);
            });
        }, delay);
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({
                    type: "ping",
                    timestamp: new Date().toISOString(),
                });
            }
        }, 30000); // Send ping every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Get connection status
     */
    public getStatus(): {
        connected: boolean;
        reconnectAttempts: number;
        queuedMessages: number;
    } {
        return {
            connected: this.isConnected(),
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
        };
    }
}

/**
 * React Hook for WebSocket management
 */
export function useRobotWebSocket(
    robotId: string,
    baseUrl: string,
    onScheduleUpdated: () => void
) {
    const [connected, setConnected] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const wsManagerRef = React.useRef<RobotWebSocketManager | null>(null);

    React.useEffect(() => {
        if (!robotId) {
            console.warn("⚠️  No robotId provided to useRobotWebSocket");
            return;
        }

        console.log("🎣 useRobotWebSocket hook initialized for robot:", robotId);

        // Initialize WebSocket manager
        wsManagerRef.current = new RobotWebSocketManager({
            robotId,
            baseUrl,
            onScheduleUpdated,
            onConnected: () => {
                console.log("✅ WebSocket connected");
                setConnected(true);
                setError(null);
            },
            onDisconnected: () => {
                console.log("❌ WebSocket disconnected");
                setConnected(false);
            },
            onError: (err) => {
                console.error("⚠️  WebSocket error:", err);
                setError(err.message);
            },
        });

        // Connect
        wsManagerRef.current.connect().catch((err) => {
            console.error("❌ Failed to connect WebSocket:", err);
            setError(err.message);
        });

        // Cleanup on unmount
        return () => {
            if (wsManagerRef.current) {
                wsManagerRef.current.disconnect();
            }
        };
    }, [robotId, baseUrl, onScheduleUpdated]);

    return {
        connected,
        error,
        wsManager: wsManagerRef.current,
    };
}

export default RobotWebSocketManager;