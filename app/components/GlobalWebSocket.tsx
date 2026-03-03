"use client";

import { useEffect, useRef } from "react";
import { useModal } from "./ModalContext";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export default function GlobalWebSocket() {
  const { showModal } = useModal();
  const showModalRef = useRef(showModal);

  useEffect(() => {
    showModalRef.current = showModal;
  }, [showModal]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isManualClose = false;

    const connect = () => {
      const roboId = localStorage.getItem("robo_id");
      if (!roboId) {
        // Retry after a short delay if robo_id isn't available yet
        reconnectTimeout = setTimeout(connect, 1000);
        return;
      }

      ws = new WebSocket(`${WS_URL}/ws/robot_message/${roboId}/`);

      ws.onopen = () => console.log("GlobalWebSocket connected");

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("GlobalWebSocket event:", data.event, data); // ← debug log

          if (data.event === "robot_unassigned") {
            showModalRef.current(data.data?.message ?? "Robot Unassigned");
          }
        } catch (err) {
          console.error("GlobalWebSocket parse error:", err);
        }
      };

      ws.onclose = () => {
        if (!isManualClose) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => console.error("GlobalWebSocket error:", err);
    };

    connect();

    return () => {
      isManualClose = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []); // stable — uses refs for callbacks

  return null;
}