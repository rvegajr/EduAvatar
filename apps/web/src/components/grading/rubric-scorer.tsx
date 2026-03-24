"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface RubricRow {
  id: string;
  elementName: string;
  maxScore: number;
  aiSuggestion?: string;
}

export interface RubricScore {
  rubricRowId: string;
  score: number | null;
  notes: string;
}

interface RubricScorerProps {
  rubricRows: RubricRow[];
  scores: Record<string, RubricScore>;
  onScoreChange: (rubricRowId: string, score: number | null) => void;
  onRowNotesChange: (rubricRowId: string, notes: string) => void;
  totalScore: number;
  maxTotal: number;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function RubricScorer({
  rubricRows,
  scores,
  onScoreChange,
  onRowNotesChange,
  totalScore,
  maxTotal,
  notes,
  onNotesChange,
}: RubricScorerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Instructor Rubric
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {rubricRows.map((row) => {
          const rowScore = scores[row.id];
          return (
            <div
              key={row.id}
              className="rounded-lg border border-neutral-200 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary">
                    {row.elementName}
                  </p>
                  {row.aiSuggestion && (
                    <p className="mt-0.5 text-xs italic text-neutral-400">
                      AI suggestion: {row.aiSuggestion}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={row.maxScore}
                    value={rowScore?.score ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onScoreChange(
                        row.id,
                        val === "" ? null : Number(val)
                      );
                    }}
                    className="h-8 w-20 text-center text-sm"
                    placeholder="—"
                  />
                  <span className="text-xs text-neutral-400">
                    / {row.maxScore}
                  </span>
                </div>
              </div>
              <Textarea
                value={rowScore?.notes ?? ""}
                onChange={(e) => onRowNotesChange(row.id, e.target.value)}
                placeholder="Notes for this element..."
                className="min-h-[48px] text-xs"
              />
            </div>
          );
        })}

        <div className="rounded-lg bg-neutral-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-text-primary">Total</span>
            <span className="text-lg font-bold text-text-primary">
              {totalScore}
              <span className="text-sm font-normal text-neutral-400">
                {" "}
                / {maxTotal}
              </span>
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">
            Instructor Notes
          </label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Overall notes about this submission..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}
