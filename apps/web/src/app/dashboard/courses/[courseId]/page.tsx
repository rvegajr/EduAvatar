"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  FileText,
  Loader2,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { ExamStatus } from "@stupath/shared";

interface Course {
  id: string;
  title: string;
  createdAt: string;
}

interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  questionCount: number;
  createdAt: string;
}

const statusBadgeVariant: Record<ExamStatus, "default" | "success" | "secondary"> = {
  draft: "secondary",
  published: "success",
  archived: "default",
};

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  const {
    data: course,
    loading: courseLoading,
  } = useFetch<Course>(`/courses/${courseId}`);

  const {
    data: exams,
    loading: examsLoading,
    mutate: refreshExams,
  } = useFetch<Exam[]>(`/exams/course/${courseId}`);

  const [createOpen, setCreateOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    if (!newExamTitle.trim()) return;
    setCreating(true);
    try {
      await api.post("/exams", { title: newExamTitle.trim(), courseId });
      setNewExamTitle("");
      setCreateOpen(false);
      refreshExams();
    } catch {
      // error handled silently for now
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(examId: string) {
    try {
      await api.post(`/exams/${examId}/duplicate`);
      refreshExams();
    } catch {
      // silent
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/exams/${deleteTarget.id}`);
      setDeleteTarget(null);
      refreshExams();
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  }

  const loading = courseLoading || examsLoading;

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </button>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          {courseLoading ? (
            <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
          ) : (
            <h1 className="text-2xl font-bold text-text-primary">
              {course?.title}
            </h1>
          )}
        </div>
      </div>

      {/* Examinations section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          Examinations
        </h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Exam
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : !exams || exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-border py-16">
          <FileText className="mb-3 h-10 w-10 text-text-secondary" />
          <p className="mb-1 text-sm font-medium text-text-primary">
            No examinations yet
          </p>
          <p className="mb-4 text-sm text-text-secondary">
            Create your first exam to get started.
          </p>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="group relative transition-shadow hover:shadow-md">
              <Link
                href={`/dashboard/courses/${courseId}/exams/${exam.id}/setup`}
                className="absolute inset-0 z-0"
              >
                <span className="sr-only">Open {exam.title}</span>
              </Link>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={statusBadgeVariant[exam.status]}>
                    {exam.status}
                  </Badge>
                  <div className="relative z-10 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDuplicate(exam.id);
                      }}
                      className="rounded p-1.5 text-text-secondary opacity-0 transition-all hover:bg-neutral-100 hover:text-text-primary group-hover:opacity-100"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget(exam);
                      }}
                      className="rounded p-1.5 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <CardTitle className="text-base">{exam.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-text-secondary">
                  <span>{exam.questionCount} question{exam.questionCount !== 1 ? "s" : ""}</span>
                  <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create exam dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Examination"
        description="Add a new exam to this course."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateExam}
              disabled={!newExamTitle.trim() || creating}
            >
              {creating ? "Creating..." : "Create Exam"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateExam}>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Exam Title
          </label>
          <Input
            value={newExamTitle}
            onChange={(e) => setNewExamTitle(e.target.value)}
            placeholder="e.g. Midterm Oral Examination"
            autoFocus
          />
        </form>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Examination"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          All questions, materials, and settings associated with this exam will
          be permanently removed.
        </p>
      </Dialog>
    </div>
  );
}
