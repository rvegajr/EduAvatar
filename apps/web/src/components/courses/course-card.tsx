"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface CourseCardProps {
  id: string;
  title: string;
  examCount: number;
  createdAt: string;
}

export function CourseCard({ id, title, examCount, createdAt }: CourseCardProps) {
  return (
    <Link href={`/dashboard/courses/${id}`} className="group block">
      <Card className="transition-shadow duration-200 group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>{examCount} examination{examCount !== 1 ? "s" : ""}</CardDescription>
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Created: {new Date(createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
