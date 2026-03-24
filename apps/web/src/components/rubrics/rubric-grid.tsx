"use client";

import { useCallback } from "react";
import { RUBRIC_MAX_COLUMNS, RUBRIC_MAX_ROWS } from "@stupath/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RubricCell {
  description: string;
  scoringMode: "fixed" | "range";
  pointsFixed: number;
  pointsMin: number;
  pointsMax: number;
}

export interface RubricRow {
  element: string;
  cells: RubricCell[];
}

export interface Rubric {
  columnHeaders: string[];
  rows: RubricRow[];
}

interface RubricGridProps {
  rubric: Rubric;
  onChange: (updated: Rubric) => void;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function emptyCell(): RubricCell {
  return { description: "", scoringMode: "fixed", pointsFixed: 0, pointsMin: 0, pointsMax: 0 };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RubricGrid({ rubric, onChange, disabled }: RubricGridProps) {
  const { columnHeaders, rows } = rubric;
  const colCount = columnHeaders.length;

  const update = useCallback(
    (fn: (draft: Rubric) => Rubric) => {
      onChange(fn(structuredClone(rubric)));
    },
    [rubric, onChange],
  );

  /* ---------- Column mutations ---------- */

  const setColumnHeader = (idx: number, value: string) =>
    update((d) => {
      d.columnHeaders[idx] = value;
      return d;
    });

  const addColumn = () =>
    update((d) => {
      d.columnHeaders.push(`Level ${d.columnHeaders.length + 1}`);
      d.rows.forEach((r) => r.cells.push(emptyCell()));
      return d;
    });

  const removeColumn = (idx: number) =>
    update((d) => {
      d.columnHeaders.splice(idx, 1);
      d.rows.forEach((r) => r.cells.splice(idx, 1));
      return d;
    });

  /* ---------- Row mutations ---------- */

  const setRowElement = (idx: number, value: string) =>
    update((d) => {
      d.rows[idx].element = value;
      return d;
    });

  const addRow = () =>
    update((d) => {
      d.rows.push({
        element: `Element ${d.rows.length + 1}`,
        cells: Array.from({ length: d.columnHeaders.length }, emptyCell),
      });
      return d;
    });

  const removeRow = (idx: number) =>
    update((d) => {
      d.rows.splice(idx, 1);
      return d;
    });

  /* ---------- Cell mutations ---------- */

  const updateCell = (rowIdx: number, colIdx: number, patch: Partial<RubricCell>) =>
    update((d) => {
      d.rows[rowIdx].cells[colIdx] = { ...d.rows[rowIdx].cells[colIdx], ...patch };
      return d;
    });

  /* ---------- Grid template ---------- */

  const gridCols = `200px repeat(${colCount}, minmax(150px, 1fr)) 40px`;

  return (
    <div className="space-y-3">
      {/* ---- Grid ---- */}
      <div className="overflow-x-auto rounded-lg border border-neutral-border">
        <div className="inline-grid min-w-full" style={{ gridTemplateColumns: gridCols }}>
          {/* ===== Header row ===== */}
          <div className="sticky left-0 z-10 border-b border-r border-neutral-border bg-neutral-bg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Element
          </div>

          {columnHeaders.map((header, ci) => (
            <div
              key={ci}
              className="group relative border-b border-r border-neutral-border bg-neutral-bg px-2 py-2"
            >
              <input
                value={header}
                disabled={disabled}
                onChange={(e) => setColumnHeader(ci, e.target.value)}
                className="w-full bg-transparent text-center text-xs font-semibold uppercase tracking-wide text-text-secondary outline-none placeholder:text-text-secondary/50 focus:ring-1 focus:ring-primary/40 rounded px-1"
                placeholder="Level name"
              />
              {!disabled && colCount > 1 && (
                <button
                  type="button"
                  onClick={() => removeColumn(ci)}
                  className="absolute -right-0.5 -top-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] text-white shadow group-hover:flex"
                  title="Remove column"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Spacer for row-delete column */}
          <div className="border-b border-neutral-border bg-neutral-bg" />

          {/* ===== Data rows ===== */}
          {rows.map((row, ri) => (
            <>
              {/* Row header */}
              <div
                key={`rh-${ri}`}
                className="group sticky left-0 z-10 border-b border-r border-neutral-border bg-white px-2 py-2"
              >
                <input
                  value={row.element}
                  disabled={disabled}
                  onChange={(e) => setRowElement(ri, e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-secondary/50 focus:ring-1 focus:ring-primary/40 rounded px-1"
                  placeholder="Element name"
                />
              </div>

              {/* Cells */}
              {row.cells.map((cell, ci) => (
                <div
                  key={`c-${ri}-${ci}`}
                  className="flex flex-col gap-1.5 border-b border-r border-neutral-border bg-white px-2 py-2"
                >
                  <textarea
                    value={cell.description}
                    disabled={disabled}
                    onChange={(e) => updateCell(ri, ci, { description: e.target.value })}
                    rows={3}
                    className="w-full resize-none rounded border border-neutral-border bg-neutral-bg/40 px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:ring-1 focus:ring-primary/40"
                    placeholder="Description…"
                  />

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        updateCell(ri, ci, {
                          scoringMode: cell.scoringMode === "fixed" ? "range" : "fixed",
                        })
                      }
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase transition-colors",
                        cell.scoringMode === "fixed"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning",
                      )}
                    >
                      {cell.scoringMode === "fixed" ? "Fixed" : "Range"}
                    </button>

                    {cell.scoringMode === "fixed" ? (
                      <input
                        type="number"
                        min={0}
                        disabled={disabled}
                        value={cell.pointsFixed}
                        onChange={(e) =>
                          updateCell(ri, ci, { pointsFixed: Number(e.target.value) })
                        }
                        className="w-14 rounded border border-neutral-border px-1.5 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    ) : (
                      <div className="flex items-center gap-1 text-xs">
                        <input
                          type="number"
                          min={0}
                          disabled={disabled}
                          value={cell.pointsMin}
                          onChange={(e) =>
                            updateCell(ri, ci, { pointsMin: Number(e.target.value) })
                          }
                          className="w-12 rounded border border-neutral-border px-1 py-0.5 text-center outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <span className="text-text-secondary">–</span>
                        <input
                          type="number"
                          min={0}
                          disabled={disabled}
                          value={cell.pointsMax}
                          onChange={(e) =>
                            updateCell(ri, ci, { pointsMax: Number(e.target.value) })
                          }
                          className="w-12 rounded border border-neutral-border px-1 py-0.5 text-center outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                    )}
                    <span className="ml-auto text-[10px] text-text-secondary">pts</span>
                  </div>
                </div>
              ))}

              {/* Row delete button */}
              <div
                key={`rd-${ri}`}
                className="flex items-start justify-center border-b border-neutral-border bg-white pt-2"
              >
                {!disabled && rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Remove row"
                  >
                    ✕
                  </button>
                )}
              </div>
            </>
          ))}
        </div>
      </div>

      {/* ---- Action buttons ---- */}
      {!disabled && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={rows.length >= RUBRIC_MAX_ROWS}
          >
            + Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addColumn}
            disabled={colCount >= RUBRIC_MAX_COLUMNS}
          >
            + Add Column
          </Button>
          {rows.length >= RUBRIC_MAX_ROWS && (
            <span className="ml-2 self-center text-xs text-text-secondary">
              Max {RUBRIC_MAX_ROWS} rows
            </span>
          )}
          {colCount >= RUBRIC_MAX_COLUMNS && (
            <span className="ml-2 self-center text-xs text-text-secondary">
              Max {RUBRIC_MAX_COLUMNS} columns
            </span>
          )}
        </div>
      )}
    </div>
  );
}
