"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "@stupath/shared";

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useSocket(sessionId: string) {
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const socket: Socket<ServerEvents, ClientEvents> = io(`${WS_URL}/exam`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      const lastEventId = sessionStorage.getItem(
        `exam:${sessionId}:lastEventId`,
      );
      if (lastEventId) {
        socket.emit("session:reconnect" as keyof ClientEvents, {
          sessionId,
          lastEventId,
        } as never);
      } else {
        socket.emit("session:join" as keyof ClientEvents, {
          sessionId,
        } as never);
      }
    });

    socket.on("disconnect", () => setConnected(false));

    socket.onAny((_event: string, data: { eventId?: string }) => {
      if (data?.eventId) {
        sessionStorage.setItem(`exam:${sessionId}:lastEventId`, data.eventId);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const emit = useCallback(
    <E extends keyof ClientEvents>(
      event: E,
      ...args: Parameters<ClientEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    [],
  );

  const on = useCallback(
    <E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) => {
      socketRef.current?.on(event as string, handler as never);
    },
    [],
  );

  const off = useCallback(
    <E extends keyof ServerEvents>(event: E, handler?: ServerEvents[E]) => {
      socketRef.current?.off(event as string, handler as never);
    },
    [],
  );

  return { socket: socketRef.current, connected, emit, on, off };
}
