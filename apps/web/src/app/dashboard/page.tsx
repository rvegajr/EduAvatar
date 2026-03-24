"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/course-card";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import { useFetch } from "@/hooks/use-fetch";

interface Course {
  id: string;
  title: string;
  examCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: courses, loading, mutate } = useFetch<Course[]>("/courses");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">My Courses</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-lg border border-neutral-border bg-white"
            />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-border py-16">
          <Plus className="mb-2 h-8 w-8 text-text-secondary" />
          <p className="mb-1 text-sm font-medium text-text-primary">
            No courses yet
          </p>
          <p className="mb-4 text-sm text-text-secondary">
            Create your first course to get started.
          </p>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              examCount={course.examCount}
              createdAt={course.createdAt}
            />
          ))}

          {/* Add new card */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-border p-6 text-text-secondary transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="mb-2 h-8 w-8" />
            <span className="text-sm font-medium">Add Course</span>
          </button>
        </div>
      )}

      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={mutate}
      />
    </div>
  );
}
