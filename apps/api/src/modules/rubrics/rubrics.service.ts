import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../../common/ai/ai.service';
import { RUBRIC_MAX_COLUMNS, RUBRIC_MAX_ROWS } from '@stupath/shared';

interface RubricRowInput {
  elementHeader: string;
  cells: {
    columnIndex: number;
    description: string;
    scoringMode: 'fixed' | 'range';
    pointsFixed?: number;
    pointsMin?: number;
    pointsMax?: number;
  }[];
}

interface RubricInput {
  columnHeaders: string[];
  rows: RubricRowInput[];
}

@Injectable()
export class RubricsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  async findByExam(examId: string) {
    const rubric = await this.prisma.rubric.findUnique({
      where: { examinationId: examId },
      include: {
        rows: {
          include: { cells: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return rubric;
  }

  async create(examId: string, data: RubricInput) {
    this.validateRubricDimensions(data);

    const existing = await this.prisma.rubric.findUnique({ where: { examinationId: examId } });
    if (existing) {
      throw new BadRequestException('Rubric already exists for this exam. Use PUT to update.');
    }

    return this.prisma.rubric.create({
      data: {
        examinationId: examId,
        source: 'manual',
        columnHeaders: data.columnHeaders,
        rows: {
          create: data.rows.map((row, idx) => ({
            elementHeader: row.elementHeader,
            sortOrder: idx,
            cells: {
              create: row.cells.map((cell) => ({
                columnIndex: cell.columnIndex,
                description: cell.description,
                scoringMode: cell.scoringMode,
                pointsFixed: cell.pointsFixed,
                pointsMin: cell.pointsMin,
                pointsMax: cell.pointsMax,
              })),
            },
          })),
        },
      },
      include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(examId: string, data: RubricInput) {
    this.validateRubricDimensions(data);

    const existing = await this.prisma.rubric.findUnique({
      where: { examinationId: examId },
      include: { rows: { include: { cells: true } } },
    });
    if (!existing) throw new NotFoundException('Rubric not found');

    for (const row of existing.rows) {
      await this.prisma.rubricCell.deleteMany({ where: { rubricRowId: row.id } });
    }
    await this.prisma.rubricRow.deleteMany({ where: { rubricId: existing.id } });

    return this.prisma.rubric.update({
      where: { id: existing.id },
      data: {
        columnHeaders: data.columnHeaders,
        rows: {
          create: data.rows.map((row, idx) => ({
            elementHeader: row.elementHeader,
            sortOrder: idx,
            cells: {
              create: row.cells.map((cell) => ({
                columnIndex: cell.columnIndex,
                description: cell.description,
                scoringMode: cell.scoringMode,
                pointsFixed: cell.pointsFixed,
                pointsMin: cell.pointsMin,
                pointsMax: cell.pointsMax,
              })),
            },
          })),
        },
      },
      include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async generateWithAi(examId: string) {
    const exam = await this.prisma.examination.findFirst({
      where: { id: examId, isDeleted: false },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        materials: { select: { extractedText: true, fileName: true } },
      },
    });
    if (!exam) throw new NotFoundException('Examination not found');

    const questionsText = exam.questions.map((q) => q.questionText).join('\n');
    const materialsContext = exam.materials
      .filter((m) => m.extractedText)
      .map((m) => `[${m.fileName}]: ${m.extractedText!.slice(0, 2000)}`)
      .join('\n\n');

    const prompt = [
      `Generate a rubric for an oral examination titled "${exam.title}".`,
      `Maximum ${RUBRIC_MAX_COLUMNS} achievement-level columns and ${RUBRIC_MAX_ROWS} element rows.`,
      `Questions:\n${questionsText}`,
      materialsContext ? `Course material excerpts:\n${materialsContext}` : '',
      'Respond in valid JSON with this schema:',
      '{ "columnHeaders": string[], "rows": [{ "elementHeader": string, "cells": [{ "columnIndex": number, "description": string, "scoringMode": "fixed", "pointsFixed": number }] }] }',
    ].filter(Boolean).join('\n\n');

    const response = await this.ai.chat([
      { role: 'system', content: 'You are an assessment design expert. Generate rubrics in strict JSON only.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.4, maxTokens: 4096 });

    const rubricData: RubricInput = JSON.parse(response);
    this.validateRubricDimensions(rubricData);

    const existing = await this.prisma.rubric.findUnique({ where: { examinationId: examId } });

    if (existing) {
      const rows = await this.prisma.rubricRow.findMany({
        where: { rubricId: existing.id },
        select: { id: true },
      });
      for (const row of rows) {
        await this.prisma.rubricCell.deleteMany({ where: { rubricRowId: row.id } });
      }
      await this.prisma.rubricRow.deleteMany({ where: { rubricId: existing.id } });

      return this.prisma.rubric.update({
        where: { id: existing.id },
        data: {
          source: 'ai_generated',
          columnHeaders: rubricData.columnHeaders,
          rows: {
            create: rubricData.rows.map((row, idx) => ({
              elementHeader: row.elementHeader,
              sortOrder: idx,
              cells: {
                create: row.cells.map((cell) => ({
                  columnIndex: cell.columnIndex,
                  description: cell.description,
                  scoringMode: cell.scoringMode,
                  pointsFixed: cell.pointsFixed,
                  pointsMin: cell.pointsMin,
                  pointsMax: cell.pointsMax,
                })),
              },
            })),
          },
        },
        include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } },
      });
    }

    return this.prisma.rubric.create({
      data: {
        examinationId: examId,
        source: 'ai_generated',
        columnHeaders: rubricData.columnHeaders,
        rows: {
          create: rubricData.rows.map((row, idx) => ({
            elementHeader: row.elementHeader,
            sortOrder: idx,
            cells: {
              create: row.cells.map((cell) => ({
                columnIndex: cell.columnIndex,
                description: cell.description,
                scoringMode: cell.scoringMode,
                pointsFixed: cell.pointsFixed,
                pointsMin: cell.pointsMin,
                pointsMax: cell.pointsMax,
              })),
            },
          })),
        },
      },
      include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async importFromExcel(examId: string, file: Express.Multer.File) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length < 2) {
      throw new BadRequestException('Excel file must have at least a header row and one data row.');
    }

    const headerRow = rawData[0];
    const columnHeaders = headerRow.slice(1).map(String);
    const rows: RubricRowInput[] = rawData.slice(1).map((row) => ({
      elementHeader: String(row[0] || ''),
      cells: columnHeaders.map((_, colIdx) => ({
        columnIndex: colIdx,
        description: String(row[colIdx + 1] || ''),
        scoringMode: 'fixed' as const,
        pointsFixed: 0,
      })),
    }));

    this.validateRubricDimensions({ columnHeaders, rows });

    const existing = await this.prisma.rubric.findUnique({
      where: { examinationId: examId },
      include: { rows: true },
    });

    if (existing) {
      for (const row of existing.rows) {
        await this.prisma.rubricCell.deleteMany({ where: { rubricRowId: row.id } });
      }
      await this.prisma.rubricRow.deleteMany({ where: { rubricId: existing.id } });

      return this.prisma.rubric.update({
        where: { id: existing.id },
        data: {
          source: 'excel_import',
          columnHeaders,
          rows: {
            create: rows.map((row, idx) => ({
              elementHeader: row.elementHeader,
              sortOrder: idx,
              cells: { create: row.cells },
            })),
          },
        },
        include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } },
      });
    }

    return this.prisma.rubric.create({
      data: {
        examinationId: examId,
        source: 'excel_import',
        columnHeaders,
        rows: {
          create: rows.map((row, idx) => ({
            elementHeader: row.elementHeader,
            sortOrder: idx,
            cells: { create: row.cells },
          })),
        },
      },
      include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  private validateRubricDimensions(data: RubricInput) {
    if (data.columnHeaders.length > RUBRIC_MAX_COLUMNS) {
      throw new BadRequestException(`Rubric cannot have more than ${RUBRIC_MAX_COLUMNS} columns.`);
    }
    if (data.rows.length > RUBRIC_MAX_ROWS) {
      throw new BadRequestException(`Rubric cannot have more than ${RUBRIC_MAX_ROWS} rows.`);
    }
  }
}
