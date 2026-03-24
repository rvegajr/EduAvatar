"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { BrowserLockdown } from "@/lib/lockdown";
import { VmDetectionBlock } from "./vm-detection-block";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SocketLike {
  emit: (event: string, data: unknown) => void;
}

interface LockdownOverlayProps {
  enabled: boolean;
  sessionId: string;
  socket: SocketLike | null;
  children: ReactNode;
}

export function LockdownOverlay({
  enabled,
  sessionId,
  socket,
  children,
}: LockdownOverlayProps) {
  const lockdownRef = useRef<BrowserLockdown | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [fullscreenExited, setFullscreenExited] = useState(false);
  const [vmDetected, setVmDetected] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViolation = useCallback(
    (type: string) => {
      setViolationCount((c) => c + 1);

      if (type === "vm_detected") {
        setVmDetected(true);
      }

      if (type === "fullscreen_exit") {
        setFullscreenExited(true);
      }

      setShowWarning(true);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => setShowWarning(false), 3000);

      socket?.emit("lockdown:violation", {
        sessionId,
        type,
        timestamp: Date.now(),
      });
    },
    [sessionId, socket],
  );

  useEffect(() => {
    if (!enabled) return;

    const instance = new BrowserLockdown(handleViolation);
    lockdownRef.current = instance;
    instance.activate();

    return () => {
      instance.deactivate();
      lockdownRef.current = null;
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [enabled, handleViolation]);

  const handleReturnFullscreen = () => {
    lockdownRef.current?.requestFullscreen();
    setFullscreenExited(false);
  };

  if (!enabled) return <>{children}</>;

  if (vmDetected) return <VmDetectionBlock />;

  return (
    <div className="relative min-h-screen">
      {/* Warning banner */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[9999] flex items-center justify-center bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300",
          showWarning
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0",
        )}
        role="alert"
      >
        Warning: Lockdown violation detected. This has been logged.
      </div>

      {/* Violation count badge */}
      {violationCount > 0 && (
        <div className="fixed right-4 top-4 z-[9998]">
          <Badge variant="destructive" className="px-3 py-1.5 text-sm tabular-nums">
            {violationCount} {violationCount === 1 ? "violation" : "violations"}
          </Badge>
        </div>
      )}

      {/* Fullscreen-exit modal overlay */}
      {fullscreenExited && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-7 w-7 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Exam Lockdown
            </h2>
            <p className="mb-6 text-gray-600">
              You must remain in fullscreen mode to continue your exam session.
            </p>
            <Button onClick={handleReturnFullscreen} className="w-full">
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
