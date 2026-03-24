"use client";

import { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  maxTimeSeconds: number | null;
  startedAt: string;
  visible: boolean;
  onToggleVisibility: () => void;
}

export function TimerDisplay({
  maxTimeSeconds,
  startedAt,
  visible,
  onToggleVisibility,
}: TimerDisplayProps) {
  const [remaining, setRemaining] = useState<number>(maxTimeSeconds ?? 0);

  useEffect(() => {
    if (!maxTimeSeconds) return;

    function tick() {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      setRemaining(Math.max(0, Math.ceil(maxTimeSeconds! - elapsed)));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [maxTimeSeconds, startedAt]);

  const formatted = useMemo(() => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remaining]);

  if (!maxTimeSeconds) return null;

  const colorClass =
    remaining <= 120
      ? "text-red-500"
      : remaining <= 300
        ? "text-amber-500"
        : "text-text-primary";

  return (
    <div className="flex items-center gap-2">
      {visible && (
        <div
          className={cn(
            "flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums",
            colorClass,
          )}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span
            aria-live="polite"
            aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
          >
            {formatted}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onToggleVisibility}
        className="rounded-md p-1.5 text-text-secondary hover:bg-neutral-bg transition-colors"
        aria-label={visible ? "Hide timer" : "Show timer"}
      >
        {visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
