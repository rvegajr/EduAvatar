"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SubmissionStatus = "pending" | "graded" | "finalized";

interface Submission {
  id: string;
  sessionId: string;
  studentName: string;
  status: SubmissionStatus;
  score: number | null;
  maxScore: number;
  dateCompleted: string;
}

interface SubmissionsResponse {
  examTitle: string;
  submissions: Submission[];
}

const STATUS_BADGE_VARIANT: Record<
  SubmissionStatus,
  "warning" | "default" | "success"
> = {
  pending: "warning",
  graded: "default",
  finalized: "success",
};

const FILTER_TABS: { label: string; value: SubmissionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Graded", value: "graded" },
  { label: "Finalized", value: "finalized" },
];

export default function GradingSubmissionsPage() {
  const { courseId, examId } = useParams<{
    courseId: string;
    examId: string;
  }>();
  const { data, loading, error } = useFetch<SubmissionsResponse>(
    `/exams/${examId}/submissions`
  );
  const [filter, setFilter] = useState<SubmissionStatus | "all">("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.submissions;
    return data.submissions.filter((s) => s.status === filter);
  }, [data, filter]);

  const gradedCount = data
    ? data.submissions.filter(
        (s) => s.status === "graded" || s.status === "finalized"
      ).length
    : 0;
  const totalCount = data?.submissions.length ?? 0;
  const progressPct = totalCount > 0 ? (gradedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-secondary">
        Loading submissions...
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link
          href={`/dashboard/courses/${courseId}/exams/${examId}/setup`}
          className="text-sm text-primary hover:underline"
        >
          &larr; Back to Exam
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text-primary">
          {data?.examTitle}
        </h1>
        <p className="text-sm text-text-secondary">Submissions</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grading Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {gradedCount} of {totalCount} graded
            </span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === tab.value
                ? "bg-primary text-white"
                : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left font-semibold text-text-primary">
                  Student Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">
                  Score
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">
                  Date Completed
                </th>
                <th className="px-4 py-3 text-right font-semibold text-text-primary">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-text-secondary"
                  >
                    No submissions found.
                  </td>
                </tr>
              )}
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {sub.studentName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[sub.status]}>
                      {sub.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">
                    {sub.score !== null
                      ? `${sub.score} / ${sub.maxScore}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(sub.dateCompleted).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/courses/${courseId}/exams/${examId}/grading/${sub.sessionId}`}
                    >
                      <Button size="sm" variant="outline">
                        Grade
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
