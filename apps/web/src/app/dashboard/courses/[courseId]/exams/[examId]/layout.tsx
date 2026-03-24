"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";

interface Exam {
  id: string;
  title: string;
  courseId: string;
}

const tabs = [
  { label: "Setup", segment: "setup" },
  { label: "Rubric", segment: "rubric" },
  { label: "Accommodations", segment: "accommodations" },
  { label: "Grading", segment: "grading" },
] as const;

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { courseId, examId } = useParams<{ courseId: string; examId: string }>();
  const pathname = usePathname();

  const { data: exam, loading } = useFetch<Exam>(`/exams/${examId}`);

  const basePath = `/dashboard/courses/${courseId}/exams/${examId}`;

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Link>

      {/* Exam title */}
      <div className="mb-6">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-text-primary">
            {exam?.title}
          </h1>
        )}
      </div>

      {/* Tab navigation */}
      <nav className="mb-8 flex gap-1 border-b border-neutral-border">
        {tabs.map((tab) => {
          const href = `${basePath}/${tab.segment}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
