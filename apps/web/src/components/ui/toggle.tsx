"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const Toggle = React.forwardRef<HTMLLabelElement, ToggleProps>(
  ({ checked, onChange, disabled, label, className }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 select-none",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className,
        )}
      >
        <span className="relative inline-flex h-6 w-11 shrink-0">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span
            className={cn(
              "absolute inset-0 rounded-full transition-colors duration-200",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2",
              checked ? "bg-primary" : "bg-neutral-border",
            )}
          />
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              checked && "translate-x-5",
            )}
          />
        </span>
        {label && (
          <span className="text-sm text-text-primary">{label}</span>
        )}
      </label>
    );
  },
);
Toggle.displayName = "Toggle";

export { Toggle };
