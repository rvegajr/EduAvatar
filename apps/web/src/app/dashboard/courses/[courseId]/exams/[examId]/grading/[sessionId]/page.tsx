"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  TranscriptPanel,
  type TranscriptSegment,
} from "@/components/grading/transcript-panel";
import {
  VideoPlayer,
  type VideoPlayerHandle,
} from "@/components/grading/video-player";
import {
  RubricScorer,
  type RubricRow,
  type RubricScore,
} from "@/components/grading/rubric-scorer";

interface SessionGradingData {
  sessionId: string;
  studentName: string;
  examTitle: string;
  recordingUrl: string;
  transcript: { segments: TranscriptSegment[] };
  rubric: { rows: RubricRow[] };
  grade: {
    id: string;
    status: "draft" | "finalized";
    scores: Record<string, RubricScore>;
    instructorNotes: string;
  };
  navigation: {
    prevSessionId: string | null;
    prevStudentName: string | null;
    nextSessionId: string | null;
    nextStudentName: string | null;
    currentIndex: number;
    totalCount: number;
  };
}

interface AiEvaluation {
  overallNotes: string;
  elements: { elementName: string; suggestion: string; scoreRange: string }[];
}

interface IntegrityReport {
  riskLevel: "low" | "medium" | "high";
  pauseAnalysis: string;
  behavioralFlags: string[];
  externalSourceAnalysis: string;
}

const RISK_BADGE_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

const AUTOSAVE_DELAY_MS = 800;

export default function GradingSessionPage() {
  const { courseId, examId, sessionId } = useParams<{
    courseId: string;
    examId: string;
    sessionId: string;
  }>();
  const router = useRouter();

  const { data, loading, error } = useFetch<SessionGradingData>(
    `/sessions/${sessionId}/grading`
  );
  const { data: aiEval } = useFetch<AiEvaluation>(
    `/sessions/${sessionId}/ai-evaluation`
  );
  const { data: integrity } = useFetch<IntegrityReport>(
    `/sessions/${sessionId}/integrity-report`
  );

  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const [scores, setScores] = useState<Record<string, RubricScore>>({});
  const [instructorNotes, setInstructorNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "finalized"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [transcriptEditable, setTranscriptEditable] = useState(false);
  const [editedSegments, setEditedSegments] = useState<Record<string, string>>({});
  const [transcriptSaving, setTranscriptSaving] = useState(false);

  const [showAiEval, setShowAiEval] = useState(true);
  const [showIntegrity, setShowIntegrity] = useState(true);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (data) {
      setScores(data.grade.scores);
      setInstructorNotes(data.grade.instructorNotes);
      if (data.grade.status === "finalized") {
        setSaveStatus("finalized");
      }
    }
  }, [data]);

  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, s) => sum + (s.score ?? 0), 0);
  }, [scores]);

  const maxTotal = useMemo(() => {
    return data?.rubric.rows.reduce((sum, r) => sum + r.maxScore, 0) ?? 0;
  }, [data]);

  const debouncedSave = useCallback(
    (newScores: Record<string, RubricScore>, newNotes: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.put(`/grades/${data?.grade.id}`, {
            scores: newScores,
            instructorNotes: newNotes,
          });
          setSaveStatus("saved");
        } catch {
          setSaveStatus("idle");
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [data?.grade.id]
  );

  const handleScoreChange = useCallback(
    (rubricRowId: string, score: number | null) => {
      setScores((prev) => {
        const next = {
          ...prev,
          [rubricRowId]: { ...prev[rubricRowId], rubricRowId, score },
        };
        debouncedSave(next, instructorNotes);
        return next;
      });
    },
    [debouncedSave, instructorNotes]
  );

  const handleRowNotesChange = useCallback(
    (rubricRowId: string, notes: string) => {
      setScores((prev) => {
        const next = {
          ...prev,
          [rubricRowId]: { ...prev[rubricRowId], rubricRowId, notes },
        };
        debouncedSave(next, instructorNotes);
        return next;
      });
    },
    [debouncedSave, instructorNotes]
  );

  const handleInstructorNotesChange = useCallback(
    (notes: string) => {
      setInstructorNotes(notes);
      debouncedSave(scores, notes);
    },
    [debouncedSave, scores]
  );

  const handleSeek = useCallback((timeMs: number) => {
    videoPlayerRef.current?.seekTo(timeMs);
  }, []);

  const handleTranscriptSave = useCallback(async () => {
    setTranscriptSaving(true);
    try {
      await api.put(`/sessions/${sessionId}/transcript`, {
        segments: editedSegments,
      });
      setTranscriptEditable(false);
    } catch {
      // error silently handled
    } finally {
      setTranscriptSaving(false);
    }
  }, [sessionId, editedSegments]);

  const handleFinalize = useCallback(async () => {
    if (!data) return;
    setFinalizing(true);
    try {
      await api.post(`/grades/${data.grade.id}/finalize`);
      await api.post(`/grades/${data.grade.id}/publish`);
      setSaveStatus("finalized");
      setShowFinalizeDialog(false);
    } catch {
      // error silently handled
    } finally {
      setFinalizing(false);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-text-secondary">
        Loading grading view...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-red-600">
        {error ?? "Failed to load session data."}
      </div>
    );
  }

  const { navigation: nav } = data;

  return (
    <div className="flex h-screen flex-col">
      {/* Top navigation bar */}
      <nav className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
        <Link
          href={`/dashboard/courses/${courseId}/exams/${examId}/grading`}
          className="text-sm text-primary hover:underline"
        >
          &larr; All Submissions
        </Link>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!nav.prevSessionId}
            onClick={() =>
              nav.prevSessionId &&
              router.push(
                `/dashboard/courses/${courseId}/exams/${examId}/grading/${nav.prevSessionId}`
              )
            }
          >
            &larr; {nav.prevStudentName ?? "Prev"}
          </Button>

          <span className="text-sm font-medium text-text-secondary">
            {nav.currentIndex + 1} of {nav.totalCount} submissions
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!nav.nextSessionId}
            onClick={() =>
              nav.nextSessionId &&
              router.push(
                `/dashboard/courses/${courseId}/exams/${examId}/grading/${nav.nextSessionId}`
              )
            }
          >
            {nav.nextStudentName ?? "Next"} &rarr;
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              saveStatus === "saving" && "text-amber-600",
              saveStatus === "saved" && "text-green-600",
              saveStatus === "finalized" && "text-primary",
              saveStatus === "idle" && "text-transparent"
            )}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "finalized" && "Finalized"}
            {saveStatus === "idle" && "\u00A0"}
          </span>
          <span className="text-sm font-semibold text-text-primary">
            {data.studentName}
          </span>
        </div>
      </nav>

      {/* 3-column layout */}
      <div className="grid flex-1 grid-cols-[35%_30%_35%] overflow-hidden">
        {/* Column 1: Transcript */}
        <div className="overflow-hidden border-r border-neutral-200">
          <TranscriptPanel
            sessionId={sessionId}
            segments={data.transcript.segments}
            onSeek={handleSeek}
            editable={transcriptEditable}
            onToggleEdit={() => {
              setTranscriptEditable((prev) => !prev);
              if (transcriptEditable) setEditedSegments({});
            }}
            editedSegments={editedSegments}
            onSegmentEdit={(id, text) =>
              setEditedSegments((prev) => ({ ...prev, [id]: text }))
            }
            onSave={handleTranscriptSave}
            currentTimeMs={currentTimeMs}
            saving={transcriptSaving}
          />
        </div>

        {/* Column 2: Video + AI Evaluation + Integrity */}
        <div className="overflow-y-auto border-r border-neutral-200 p-4 space-y-4">
          <VideoPlayer
            ref={videoPlayerRef}
            src={data.recordingUrl}
            onTimeUpdate={setCurrentTimeMs}
          />

          {/* AI Evaluation */}
          <Card>
            <CardHeader
              className="cursor-pointer pb-2"
              onClick={() => setShowAiEval((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">AI Evaluation</CardTitle>
                <span className="text-xs text-text-secondary">
                  {showAiEval ? "▾" : "▸"}
                </span>
              </div>
            </CardHeader>
            {showAiEval && aiEval && (
              <CardContent className="space-y-3">
                <p className="text-xs italic text-neutral-400">
                  {aiEval.overallNotes}
                </p>
                {aiEval.elements.map((el, i) => (
                  <div key={i} className="border-t border-neutral-100 pt-2">
                    <p className="text-xs font-medium text-text-secondary">
                      {el.elementName}
                    </p>
                    <p className="text-xs italic text-neutral-400">
                      {el.suggestion}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      Suggested range: {el.scoreRange}
                    </p>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Integrity Report */}
          <Card>
            <CardHeader
              className="cursor-pointer pb-2"
              onClick={() => setShowIntegrity((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Integrity Report</CardTitle>
                <span className="text-xs text-text-secondary">
                  {showIntegrity ? "▾" : "▸"}
                </span>
              </div>
            </CardHeader>
            {showIntegrity && integrity && (
              <CardContent className="space-y-3">
                <div>
                  <Badge variant={RISK_BADGE_VARIANT[integrity.riskLevel]}>
                    {integrity.riskLevel} risk
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary">
                    Pause Analysis
                  </p>
                  <p className="text-xs text-neutral-500">
                    {integrity.pauseAnalysis}
                  </p>
                </div>
                {integrity.behavioralFlags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary">
                      Behavioral Flags
                    </p>
                    <ul className="ml-4 list-disc space-y-0.5">
                      {integrity.behavioralFlags.map((flag, i) => (
                        <li key={i} className="text-xs text-neutral-500">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-text-secondary">
                    External Source Analysis
                  </p>
                  <p className="text-xs text-neutral-500">
                    {integrity.externalSourceAnalysis}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Column 3: Instructor Rubric */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <RubricScorer
              rubricRows={data.rubric.rows}
              scores={scores}
              onScoreChange={handleScoreChange}
              onRowNotesChange={handleRowNotesChange}
              totalScore={totalScore}
              maxTotal={maxTotal}
              notes={instructorNotes}
              onNotesChange={handleInstructorNotesChange}
            />
          </div>

          <div className="border-t border-neutral-200 bg-white p-4">
            <Button
              className="w-full"
              disabled={saveStatus === "finalized" || finalizing}
              onClick={() => setShowFinalizeDialog(true)}
            >
              {saveStatus === "finalized"
                ? "Finalized"
                : "Finalize & Submit to LMS"}
            </Button>
          </div>
        </div>
      </div>

      {/* Finalize confirmation dialog */}
      <Dialog
        open={showFinalizeDialog}
        onOpenChange={setShowFinalizeDialog}
        title="Finalize Grade"
        description="This will submit the grade to the LMS. This action cannot be undone."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowFinalizeDialog(false)}
              disabled={finalizing}
            >
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? "Submitting..." : "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          You are about to finalize the grade for{" "}
          <span className="font-semibold">{data.studentName}</span> with a total
          score of{" "}
          <span className="font-semibold">
            {totalScore} / {maxTotal}
          </span>
          . This will publish the grade to the connected LMS.
        </p>
      </Dialog>
    </div>
  );
}
