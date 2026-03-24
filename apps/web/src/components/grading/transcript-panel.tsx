"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TRANSCRIPT_VIDEO_OFFSET_MS } from "@stupath/shared";

export interface TranscriptSegment {
  id: string;
  speaker: "ai" | "student";
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  isPause: boolean;
  pauseDurationSeconds?: number;
}

interface TranscriptPanelProps {
  sessionId: string;
  segments: TranscriptSegment[];
  onSeek: (timeMs: number) => void;
  editable: boolean;
  onToggleEdit: () => void;
  editedSegments: Record<string, string>;
  onSegmentEdit: (segmentId: string, text: string) => void;
  onSave: () => void;
  currentTimeMs: number;
  saving?: boolean;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function TranscriptPanel({
  segments,
  onSeek,
  editable,
  onToggleEdit,
  editedSegments,
  onSegmentEdit,
  onSave,
  currentTimeMs,
  saving,
}: TranscriptPanelProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  const activeSegmentId = segments.find(
    (s) => !s.isPause && currentTimeMs >= s.startTimeMs && currentTimeMs < s.endTimeMs
  )?.id;

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSegmentId]);

  const handleSeek = useCallback(
    (startTimeMs: number) => {
      const seekTo = Math.max(0, startTimeMs - TRANSCRIPT_VIDEO_OFFSET_MS);
      onSeek(seekTo);
    },
    [onSeek]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Transcript</h3>
        <div className="flex items-center gap-2">
          {editable && (
            <Button variant="default" size="sm" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            {editable ? "Cancel" : "Edit Transcript"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {segments.map((segment) => {
          if (segment.isPause) {
            return (
              <div
                key={segment.id}
                className="cursor-pointer py-1 text-center text-xs italic text-neutral-400 hover:text-neutral-600"
                onClick={() => handleSeek(segment.startTimeMs)}
              >
                [pause {segment.pauseDurationSeconds} seconds]
              </div>
            );
          }

          const isActive = segment.id === activeSegmentId;
          const displayText = editedSegments[segment.id] ?? segment.text;

          return (
            <div
              key={segment.id}
              ref={isActive ? activeRef : undefined}
              className={cn(
                "group cursor-pointer rounded-lg p-3 transition-colors",
                isActive
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : "hover:bg-neutral-50"
              )}
              onClick={() => !editable && handleSeek(segment.startTimeMs)}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    segment.speaker === "ai"
                      ? "text-violet-600"
                      : "text-emerald-600"
                  )}
                >
                  {segment.speaker === "ai" ? "AI Examiner" : "Student"}
                </span>
                <span className="text-[10px] tabular-nums text-neutral-400">
                  {formatTimestamp(segment.startTimeMs)}
                </span>
              </div>

              {editable ? (
                <Textarea
                  value={displayText}
                  onChange={(e) => onSegmentEdit(segment.id, e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              ) : (
                <p className="text-sm leading-relaxed text-text-primary">
                  {displayText}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
