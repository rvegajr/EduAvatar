"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { RubricGrid, type Rubric } from "@/components/rubrics/rubric-grid";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function RubricPage() {
  const { examId } = useParams<{ courseId: string; examId: string }>();

  const { data, loading, error, mutate } = useFetch<Rubric>(
    `/exams/${examId}/rubric`,
  );

  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (data) setRubric(data);
  }, [data]);

  /* ---- Auto-save with debounce ---- */

  const persist = useCallback(
    async (r: Rubric) => {
      setSaveStatus("saving");
      try {
        await api.put(`/exams/${examId}/rubric`, r);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [examId],
  );

  const handleChange = useCallback(
    (updated: Rubric) => {
      setRubric(updated);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => persist(updated), 800);
    },
    [persist],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  /* ---- AI Generate ---- */

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post(`/exams/${examId}/rubric/generate`);
      mutate();
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Import Excel ---- */

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

    await fetch(`${baseUrl}/exams/${examId}/rubric/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    mutate();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---- Column totals ---- */

  const columnTotals =
    rubric?.columnHeaders.map((_, ci) =>
      rubric.rows.reduce((sum, row) => {
        const cell = row.cells[ci];
        return sum + (cell.scoringMode === "fixed" ? cell.pointsFixed : cell.pointsMax);
      }, 0),
    ) ?? [];

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        Failed to load rubric: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
              </svg>
              AI Generate
            </span>
          )}
        </Button>

        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <span className="inline-flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Import Excel
          </span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleImport}
        />

        {/* Save status */}
        <span className="ml-auto text-xs text-text-secondary">
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "✓ Saved"}
          {saveStatus === "error" && (
            <span className="text-danger">Save failed</span>
          )}
        </span>
      </div>

      {/* ---- Rubric Grid ---- */}
      {rubric && <RubricGrid rubric={rubric} onChange={handleChange} />}

      {/* ---- Column totals ---- */}
      {rubric && columnTotals.length > 0 && (
        <div
          className="inline-grid min-w-full"
          style={{
            gridTemplateColumns: `200px repeat(${rubric.columnHeaders.length}, minmax(150px, 1fr)) 40px`,
          }}
        >
          <div className="px-3 py-2 text-right text-xs font-semibold uppercase text-text-secondary">
            Total
          </div>
          {columnTotals.map((total, ci) => (
            <div
              key={ci}
              className="rounded-b-lg bg-neutral-bg px-3 py-2 text-center text-sm font-bold text-text-primary"
            >
              {total} pts
            </div>
          ))}
          <div />
        </div>
      )}
    </div>
  );
}
