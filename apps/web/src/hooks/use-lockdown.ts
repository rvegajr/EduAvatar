"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserLockdown, type LockdownViolation } from "@/lib/lockdown";

interface UseLockdownResult {
  active: boolean;
  violations: LockdownViolation[];
  requestFullscreen: () => void;
}

export function useLockdown(
  enabled: boolean,
  onViolation: (type: string) => void,
): UseLockdownResult {
  const lockdownRef = useRef<BrowserLockdown | null>(null);
  const [active, setActive] = useState(false);
  const [violations, setViolations] = useState<LockdownViolation[]>([]);
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) {
      if (lockdownRef.current) {
        lockdownRef.current.deactivate();
        lockdownRef.current = null;
        setActive(false);
      }
      return;
    }

    const instance = new BrowserLockdown((type: string) => {
      onViolationRef.current(type);
      setViolations((prev) => [...prev, { type, timestamp: Date.now() }]);
    });

    lockdownRef.current = instance;
    instance.activate();
    setActive(true);

    return () => {
      instance.deactivate();
      lockdownRef.current = null;
      setActive(false);
    };
  }, [enabled]);

  const requestFullscreen = useCallback(() => {
    lockdownRef.current?.requestFullscreen();
  }, []);

  return { active, violations, requestFullscreen };
}
