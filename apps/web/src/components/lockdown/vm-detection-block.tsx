"use client";

import { useEffect, useRef } from "react";

export function VmDetectionBlock() {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    // eslint-disable-next-line no-console
    console.error(
      "[StuPath Lockdown] VM environment detected — exam access blocked.",
    );
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-950">
      <div className="mx-4 max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-900/40">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a9 9 0 1 1-18 0V5.25"
            />
          </svg>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-white">
          Virtual Machine Detected
        </h1>

        <p className="mb-4 text-lg text-gray-300">
          This exam cannot be taken in a virtual machine environment.
        </p>

        <p className="text-sm text-gray-500">
          Please close this virtual machine and use a physical computer to
          access your exam. If you believe this is an error, contact your
          instructor.
        </p>
      </div>
    </div>
  );
}
