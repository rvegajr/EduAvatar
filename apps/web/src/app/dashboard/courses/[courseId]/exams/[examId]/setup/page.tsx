"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  Upload,
  FileIcon,
  Check,
  Loader2,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  DEPTH_MIN,
  DEPTH_MAX,
  DEPTH_LABELS,
} from "@stupath/shared";
import type { ExamStatus, EndProcess } from "@stupath/shared";

/* ---------- types ---------- */

interface Question {
  id: string;
  text: string;
  order: number;
}

interface Material {
  id: string;
  filename: string;
  sizeBytes: number;
  url: string;
}

interface ExamData {
  id: string;
  title: string;
  status: ExamStatus;
  courseId: string;
  numStartingQuestions: number;
  maxTimeSeconds: number | null;
  retakesAllowed: number;
  endProcess: EndProcess;
  randomQuestions: boolean;
  depthOfQuestions: number;
  delayResponseSeconds: number;
  idCheckEnabled: boolean;
  browserLockdown: boolean;
  allowBreaks: boolean;
}

/* ---------- helpers ---------- */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------- collapsible section ---------- */

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-neutral-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {open ? (
          <ChevronDown className="h-5 w-5 text-text-secondary" />
        ) : (
          <ChevronRight className="h-5 w-5 text-text-secondary" />
        )}
      </button>
      {open && <div className="border-t border-neutral-border p-5">{children}</div>}
    </div>
  );
}

/* ---------- toggle ---------- */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-neutral-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

/* ---------- page ---------- */

export default function ExamSetupPage() {
  const { courseId, examId } = useParams<{
    courseId: string;
    examId: string;
  }>();

  const { data: exam, loading: examLoading, mutate: refreshExam } =
    useFetch<ExamData>(`/exams/${examId}`);
  const { data: questions, mutate: refreshQuestions } =
    useFetch<Question[]>(`/exams/${examId}/questions`);
  const { data: materials, mutate: refreshMaterials } =
    useFetch<Material[]>(`/exams/${examId}/materials`);

  /* ------ local form state ------ */
  const [form, setForm] = useState({
    title: "",
    numStartingQuestions: 5,
    maxTimeSeconds: null as number | null,
    retakesAllowed: 0,
    endProcess: "complete_round" as EndProcess,
    randomQuestions: false,
    depthOfQuestions: 5,
    delayResponseSeconds: 10,
    idCheckEnabled: false,
    browserLockdown: true,
    allowBreaks: false,
  });

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const formInitialized = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Seed form from fetched exam
  useEffect(() => {
    if (exam && !formInitialized.current) {
      setForm({
        title: exam.title,
        numStartingQuestions: exam.numStartingQuestions,
        maxTimeSeconds: exam.maxTimeSeconds,
        retakesAllowed: exam.retakesAllowed,
        endProcess: exam.endProcess,
        randomQuestions: exam.randomQuestions,
        depthOfQuestions: exam.depthOfQuestions,
        delayResponseSeconds: exam.delayResponseSeconds,
        idCheckEnabled: exam.idCheckEnabled,
        browserLockdown: exam.browserLockdown,
        allowBreaks: exam.allowBreaks,
      });
      formInitialized.current = true;
    }
  }, [exam]);

  // Auto-save with 800ms debounce
  const autoSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await api.put(`/exams/${examId}`, form);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [examId, form]);

  useEffect(() => {
    if (!formInitialized.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(autoSave, 800);
    return () => clearTimeout(debounceTimer.current);
  }, [form, autoSave]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ------ question management ------ */
  const [newQuestion, setNewQuestion] = useState("");

  async function addQuestion() {
    if (!newQuestion.trim()) return;
    try {
      await api.post(`/exams/${examId}/questions`, { text: newQuestion.trim() });
      setNewQuestion("");
      refreshQuestions();
    } catch {
      // silent
    }
  }

  async function removeQuestion(qId: string) {
    try {
      await api.del(`/exams/${examId}/questions/${qId}`);
      refreshQuestions();
    } catch {
      // silent
    }
  }

  /* ------ file upload ------ */
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/exams/${examId}/materials`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
            },
            body: formData,
          }
        );
      } catch {
        // silent
      }
    }
    refreshMaterials();
  }

  async function removeMaterial(mId: string) {
    try {
      await api.del(`/exams/${examId}/materials/${mId}`);
      refreshMaterials();
    } catch {
      // silent
    }
  }

  /* ------ publish ------ */
  async function togglePublish() {
    const newStatus: ExamStatus = exam?.status === "published" ? "draft" : "published";
    try {
      await api.put(`/exams/${examId}/status`, { status: newStatus });
      refreshExam();
    } catch {
      // silent
    }
  }

  /* ------ render ------ */

  if (examLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 pb-16">
      {/* Save indicator */}
      <div className="sticky top-0 z-10 flex justify-end py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity",
            saveStatus === "idle" && "opacity-0",
            saveStatus === "saving" && "bg-amber-50 text-amber-700 opacity-100",
            saveStatus === "saved" && "bg-green-50 text-green-700 opacity-100"
          )}
        >
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="h-3 w-3" />
              Saved
            </>
          )}
        </span>
      </div>

      {/* ======== Title & Status ======== */}
      <Section title="Title & Status">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Exam Title
            </label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={
                exam?.status === "published"
                  ? "success"
                  : exam?.status === "archived"
                    ? "default"
                    : "secondary"
              }
            >
              {exam?.status ?? "draft"}
            </Badge>
            <Button size="sm" variant="outline" onClick={togglePublish}>
              {exam?.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </Section>

      {/* ======== Questions ======== */}
      <Section title="Questions">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {questions?.length ?? 0} in bank
          </p>

          {questions?.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 rounded-md border border-neutral-border bg-neutral-bg/50 p-3"
            >
              <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-text-secondary" />
              <p className="flex-1 text-sm text-text-primary">{q.text}</p>
              <button
                onClick={() => removeQuestion(q.id)}
                className="shrink-0 rounded p-1 text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Type a new question..."
              className="min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  addQuestion();
                }
              }}
            />
            <Button
              size="sm"
              className="shrink-0 self-end"
              onClick={addQuestion}
              disabled={!newQuestion.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Section>

      {/* ======== Materials ======== */}
      <Section title="Materials">
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-neutral-300 hover:border-primary/50"
            )}
          >
            <Upload className="mb-2 h-8 w-8 text-text-secondary" />
            <p className="text-sm font-medium text-text-primary">
              Drop files here or click to upload
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              PDF or Word documents
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* File list */}
          {materials && materials.length > 0 && (
            <ul className="space-y-2">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-neutral-border bg-neutral-bg/50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-4 w-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text-primary">
                      {m.filename}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatBytes(m.sizeBytes)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeMaterial(m.id)}
                    className="rounded p-1 text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* ======== Exam Rules ======== */}
      <Section title="Exam Rules">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Number of starting questions
            </label>
            <Input
              type="number"
              min={1}
              value={form.numStartingQuestions}
              onChange={(e) =>
                update("numStartingQuestions", parseInt(e.target.value) || 1)
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Time limit (minutes)
            </label>
            <Input
              type="number"
              min={0}
              placeholder="No limit"
              value={form.maxTimeSeconds != null ? form.maxTimeSeconds / 60 : ""}
              onChange={(e) => {
                const v = e.target.value;
                update(
                  "maxTimeSeconds",
                  v === "" ? null : Math.round(parseFloat(v) * 60)
                );
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Retakes allowed
            </label>
            <Input
              type="number"
              min={0}
              value={form.retakesAllowed}
              onChange={(e) =>
                update("retakesAllowed", parseInt(e.target.value) || 0)
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              End process
            </label>
            <select
              value={form.endProcess}
              onChange={(e) => update("endProcess", e.target.value as EndProcess)}
              className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <option value="complete_round">Complete current round</option>
              <option value="hard_stop">Hard stop</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <Toggle
              checked={form.randomQuestions}
              onChange={(v) => update("randomQuestions", v)}
              label="Randomize question order"
            />
          </div>
        </div>
      </Section>

      {/* ======== AI Behavior ======== */}
      <Section title="AI Behavior">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                Follow-up depth
              </label>
              <span className="text-sm text-text-secondary">
                {form.depthOfQuestions} &mdash; {DEPTH_LABELS[form.depthOfQuestions]}
              </span>
            </div>
            <input
              type="range"
              min={DEPTH_MIN}
              max={DEPTH_MAX}
              step={1}
              value={form.depthOfQuestions}
              onChange={(e) =>
                update("depthOfQuestions", parseInt(e.target.value))
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-text-secondary">
              <span>{DEPTH_LABELS[DEPTH_MIN]}</span>
              <span>{DEPTH_LABELS[DEPTH_MAX]}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Delay response (seconds)
            </label>
            <Input
              type="number"
              min={0}
              value={form.delayResponseSeconds}
              onChange={(e) =>
                update("delayResponseSeconds", parseInt(e.target.value) || 0)
              }
            />
            <p className="mt-1 text-xs text-text-secondary">
              Seconds of silence before the AI escalates a non-response.
            </p>
          </div>
        </div>
      </Section>

      {/* ======== Security ======== */}
      <Section title="Security">
        <div className="space-y-5">
          <Toggle
            checked={form.idCheckEnabled}
            onChange={(v) => update("idCheckEnabled", v)}
            label="ID check"
          />
          <Toggle
            checked={form.browserLockdown}
            onChange={(v) => update("browserLockdown", v)}
            label="Browser lockdown"
          />
          <Toggle
            checked={form.allowBreaks}
            onChange={(v) => update("allowBreaks", v)}
            label="Allow breaks"
          />
        </div>
      </Section>
    </div>
  );
}
