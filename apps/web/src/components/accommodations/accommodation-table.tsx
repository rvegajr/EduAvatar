"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AccommodationOverrides {
  timeExtension: number;
  allowExtraBreaks: boolean;
  customOverrides: string;
}

interface AccommodationTableProps {
  examId: string;
  students: EnrolledStudent[];
  accommodations: Record<string, AccommodationOverrides>;
  onUpdate: (studentId: string, overrides: AccommodationOverrides) => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_OVERRIDES: AccommodationOverrides = {
  timeExtension: 0,
  allowExtraBreaks: false,
  customOverrides: "{}",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AccommodationTable({
  students,
  accommodations,
  onUpdate,
}: AccommodationTableProps) {
  const enrolledStudents = students.filter((s) => s.role === "student");

  const getOverrides = useCallback(
    (studentId: string): AccommodationOverrides =>
      accommodations[studentId] ?? { ...DEFAULT_OVERRIDES },
    [accommodations],
  );

  const handleField = useCallback(
    (studentId: string, field: keyof AccommodationOverrides, value: unknown) => {
      const current = getOverrides(studentId);
      onUpdate(studentId, { ...current, [field]: value });
    },
    [getOverrides, onUpdate],
  );

  if (enrolledStudents.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-border bg-neutral-bg/50 px-6 py-10 text-center text-sm text-text-secondary">
        No students enrolled in this course.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-border bg-neutral-bg text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <th className="px-4 py-3">Student Name</th>
            <th className="px-4 py-3 text-center">Time Extension (%)</th>
            <th className="px-4 py-3 text-center">Extra Breaks</th>
            <th className="px-4 py-3">Custom Overrides</th>
          </tr>
        </thead>
        <tbody>
          {enrolledStudents.map((student) => {
            const overrides = getOverrides(student.id);
            return (
              <tr
                key={student.id}
                className="border-b border-neutral-border last:border-b-0 hover:bg-neutral-bg/40 transition-colors"
              >
                {/* Student name */}
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">{student.name}</div>
                  <div className="text-xs text-text-secondary">{student.email}</div>
                </td>

                {/* Time extension */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={overrides.timeExtension}
                      onChange={(e) =>
                        handleField(student.id, "timeExtension", Number(e.target.value))
                      }
                      className={cn(
                        "w-20 rounded border border-neutral-border px-2 py-1 text-center text-sm outline-none",
                        "focus:ring-2 focus:ring-primary/40",
                      )}
                    />
                    <span className="text-xs text-text-secondary">%</span>
                  </div>
                </td>

                {/* Extra breaks toggle */}
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <Toggle
                      checked={overrides.allowExtraBreaks}
                      onChange={(v) => handleField(student.id, "allowExtraBreaks", v)}
                    />
                  </div>
                </td>

                {/* Custom overrides JSON */}
                <td className="px-4 py-3">
                  <textarea
                    rows={2}
                    value={overrides.customOverrides}
                    onChange={(e) =>
                      handleField(student.id, "customOverrides", e.target.value)
                    }
                    className={cn(
                      "w-full min-w-[200px] resize-y rounded border border-neutral-border bg-neutral-bg/30 px-2 py-1 font-mono text-xs outline-none",
                      "focus:ring-2 focus:ring-primary/40",
                    )}
                    placeholder="{}"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
