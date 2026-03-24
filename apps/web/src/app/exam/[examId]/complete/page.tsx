"use client";

import { CheckCircle } from "lucide-react";

const CONFETTI_DOTS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${((i * 41 + 7) % 100)}%`,
  top: `${((i * 29 + 13) % 100)}%`,
  delay: `${(i * 0.4) % 5}s`,
  duration: `${4 + (i % 3) * 2}s`,
  size: i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 8,
  color: ["bg-blue-300/40", "bg-green-300/40", "bg-amber-300/40", "bg-purple-300/40", "bg-pink-300/40"][i % 5],
}));

export default function ExamCompletePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes confetti-drift {
              0% { transform: translateY(0) scale(1); opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { transform: translateY(-60px) scale(0.6); opacity: 0; }
            }
          `,
        }}
      />

      {CONFETTI_DOTS.map((dot) => (
        <span
          key={dot.id}
          className={`absolute rounded-full ${dot.color}`}
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            animation: `confetti-drift ${dot.duration} ease-in-out ${dot.delay} infinite`,
          }}
          aria-hidden="true"
        />
      ))}

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/90 p-10 text-center shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle
            className="h-8 w-8 text-green-600"
            aria-hidden="true"
          />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-text-primary">
          Examination Complete
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          Thank you for completing your examination. Your responses have been
          recorded and will be reviewed by your instructor.
        </p>

        <p className="text-xs text-text-secondary">
          You may now close this window or return to your LMS.
        </p>
      </div>
    </main>
  );
}
