"use client";

import { useCallback, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import {
  AccommodationTable,
  type AccommodationOverrides,
  type EnrolledStudent,
} from "@/components/accommodations/accommodation-table";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AccommodationsPayload {
  students: EnrolledStudent[];
  accommodations: Record<string, AccommodationOverrides>;
}

export default function AccommodationsPage() {
  const { courseId, examId } = useParams<{ courseId: string; examId: string }>();

  const { data: studentsData, loading: studentsLoading } = useFetch<EnrolledStudent[]>(
    `/courses/${courseId}/enrollments`,
  );
  const { data: accData, loading: accLoading } = useFetch<
    Record<string, AccommodationOverrides>
  >(`/exams/${examId}/accommodations`);

  const [localAcc, setLocalAcc] = useState<Record<string, AccommodationOverrides>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [search, setSearch] = useState("");
  const initializedRef = useRef(false);

  if (accData && !initializedRef.current) {
    initializedRef.current = true;
    setLocalAcc(accData);
  }

  const loading = studentsLoading || accLoading;

  /* ---- Save handler ---- */

  const handleUpdate = useCallback(
    async (studentId: string, overrides: AccommodationOverrides) => {
      setLocalAcc((prev) => ({ ...prev, [studentId]: overrides }));
      setSaveStatus("saving");
      try {
        await api.put(`/exams/${examId}/accommodations`, {
          studentId,
          overrides,
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [examId],
  );

  /* ---- Filter students by search ---- */

  const filteredStudents = (studentsData ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- Toolbar ---- */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="h-10 w-full rounded-lg border border-neutral-border bg-white pl-9 pr-3 text-sm text-text-primary shadow-sm outline-none placeholder:text-text-secondary/60 focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <span className="ml-auto text-xs text-text-secondary">
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "✓ Saved"}
          {saveStatus === "error" && (
            <span className="text-danger">Save failed</span>
          )}
        </span>
      </div>

      {/* ---- Table ---- */}
      <AccommodationTable
        examId={examId}
        students={filteredStudents}
        accommodations={localAcc}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
