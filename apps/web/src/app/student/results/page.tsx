"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RubricFeedback {
  elementName: string;
  score: number;
  maxScore: number;
  instructorNotes: string;
}

interface TranscriptEntry {
  speaker: "ai" | "student";
  text: string;
  isPause: boolean;
  pauseDurationSeconds?: number;
}

interface ExamResult {
  id: string;
  examTitle: string;
  courseName: string;
  score: number;
  maxScore: number;
  dateCompleted: string;
  rubricFeedback: RubricFeedback[];
  transcript: TranscriptEntry[];
}

export default function StudentResultsPage() {
  const { data, loading, error } = useFetch<ExamResult[]>(
    "/student/results"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-secondary">
        Loading your results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-text-primary">My Results</h1>
        <p className="mt-4 text-sm text-text-secondary">
          No published results yet. Check back after your exams have been graded.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text-primary">My Results</h1>

      <div className="space-y-4">
        {data.map((result) => {
          const expanded = expandedId === result.id;
          const pct = Math.round((result.score / result.maxScore) * 100);

          return (
            <Card key={result.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedId(expanded ? null : result.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {result.examTitle}
                    </CardTitle>
                    <p className="text-xs text-text-secondary">
                      {result.courseName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={pct >= 70 ? "success" : pct >= 50 ? "warning" : "destructive"}
                    >
                      {result.score} / {result.maxScore} ({pct}%)
                    </Badge>
                    <span className="text-xs text-text-secondary">
                      {new Date(result.dateCompleted).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {expanded ? "▾" : "▸"}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {expanded && (
                <CardContent className="space-y-6">
                  {/* Rubric Feedback */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">
                      Rubric Feedback
                    </h3>
                    <div className="space-y-3">
                      {result.rubricFeedback.map((fb, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-neutral-200 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-primary">
                              {fb.elementName}
                            </span>
                            <span className="text-sm tabular-nums font-semibold text-text-primary">
                              {fb.score} / {fb.maxScore}
                            </span>
                          </div>
                          {fb.instructorNotes && (
                            <p className="mt-1 text-xs text-text-secondary">
                              {fb.instructorNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transcript */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">
                      Transcript
                    </h3>
                    <div className="max-h-80 overflow-y-auto rounded-lg border border-neutral-200 p-3 space-y-2">
                      {result.transcript.map((entry, i) => {
                        if (entry.isPause) {
                          return (
                            <p
                              key={i}
                              className="text-center text-xs italic text-neutral-400"
                            >
                              [pause {entry.pauseDurationSeconds} seconds]
                            </p>
                          );
                        }
                        return (
                          <div key={i}>
                            <span
                              className={cn(
                                "text-xs font-semibold uppercase tracking-wide",
                                entry.speaker === "ai"
                                  ? "text-violet-600"
                                  : "text-emerald-600"
                              )}
                            >
                              {entry.speaker === "ai"
                                ? "AI Examiner"
                                : "Student"}
                            </span>
                            <p className="text-sm leading-relaxed text-text-primary">
                              {entry.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
