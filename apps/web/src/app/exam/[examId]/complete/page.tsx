"use client";

import { CheckCircle } from "lucide-react";

export default function ExamCompletePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-bg px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-text-primary">
          Exam Complete
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          Thank you for completing your examination. Your responses have been
          recorded and will be reviewed by your instructor.
        </p>

        <p className="text-xs text-text-secondary">
          You may now close this window.
        </p>
      </div>
    </main>
  );
}
