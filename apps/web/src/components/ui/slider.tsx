"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  labels?: Record<number, string>;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ min, max, step = 1, value, onChange, labels, className, disabled }, ref) => {
    const pct = ((value - min) / (max - min)) * 100;
    const currentLabel = labels?.[value];

    return (
      <div className={cn("flex w-full flex-col gap-1.5", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-border outline-none transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110",
          )}
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-neutral-border) ${pct}%)`,
          }}
        />
        {currentLabel !== undefined && (
          <span className="text-center text-xs font-medium text-text-secondary">
            {currentLabel}
          </span>
        )}
      </div>
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
