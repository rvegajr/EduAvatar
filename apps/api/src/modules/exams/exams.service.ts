import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async findAllByCourse(courseId: string) {
    return this.prisma.examination.findMany({
      where: { courseId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        settings: true,
        _count: { select: { questions: true, sessions: true } },
      },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.examination.findFirst({
      where: { id, isDeleted: false },
      include: {
        settings: true,
        questions: { orderBy: { sortOrder: 'asc' } },
        materials: true,
        rubric: { include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } } },
        _count: { select: { sessions: true } },
      },
    });
    if (!exam) throw new NotFoundException('Examination not found');
    return exam;
  }

  async create(courseId: string, data: { title: string }) {
    return this.prisma.examination.create({
      data: {
        courseId,
        title: data.title,
        settings: {
          create: {},
        },
      },
      include: { settings: true },
    });
  }

  async update(id: string, data: { title?: string; status?: 'draft' | 'published' | 'archived' }) {
    const exam = await this.prisma.examination.findFirst({ where: { id, isDeleted: false } });
    if (!exam) throw new NotFoundException('Examination not found');

    return this.prisma.examination.update({
      where: { id },
      data,
      include: { settings: true },
    });
  }

  async duplicate(id: string) {
    const source = await this.prisma.examination.findFirst({
      where: { id, isDeleted: false },
      include: {
        settings: true,
        questions: { orderBy: { sortOrder: 'asc' } },
        rubric: { include: { rows: { include: { cells: true }, orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!source) throw new NotFoundException('Examination not found');

    return this.prisma.examination.create({
      data: {
        courseId: source.courseId,
        title: `${source.title} (Copy)`,
        status: 'draft',
        ...(source.settings && {
          settings: {
            create: {
              numStartingQuestions: source.settings.numStartingQuestions,
              maxTimeSeconds: source.settings.maxTimeSeconds,
              retakesAllowed: source.settings.retakesAllowed,
              endProcess: source.settings.endProcess,
              randomQuestions: source.settings.randomQuestions,
              depthOfQuestions: source.settings.depthOfQuestions,
              delayResponseSeconds: source.settings.delayResponseSeconds,
              idCheckEnabled: source.settings.idCheckEnabled,
              browserLockdown: source.settings.browserLockdown,
              allowBreaks: source.settings.allowBreaks,
            },
          },
        }),
        questions: {
          create: source.questions.map((q) => ({
            questionText: q.questionText,
            sortOrder: q.sortOrder,
          })),
        },
        ...(source.rubric && {
          rubric: {
            create: {
              source: source.rubric.source,
              columnHeaders: source.rubric.columnHeaders,
              rows: {
                create: source.rubric.rows.map((row) => ({
                  elementHeader: row.elementHeader,
                  sortOrder: row.sortOrder,
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
          },
        }),
      },
      include: { settings: true, questions: true },
    });
  }

  async delete(id: string) {
    const exam = await this.prisma.examination.findFirst({ where: { id, isDeleted: false } });
    if (!exam) throw new NotFoundException('Examination not found');

    return this.prisma.examination.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getSettings(examId: string) {
    const settings = await this.prisma.examSettings.findUnique({
      where: { examinationId: examId },
    });
    if (!settings) throw new NotFoundException('Exam settings not found');
    return settings;
  }

  async updateSettings(examId: string, data: Partial<{
    numStartingQuestions: number;
    maxTimeSeconds: number | null;
    retakesAllowed: number;
    endProcess: 'hard_stop' | 'complete_round';
    randomQuestions: boolean;
    depthOfQuestions: number;
    delayResponseSeconds: number;
    idCheckEnabled: boolean;
    browserLockdown: boolean;
    allowBreaks: boolean;
  }>) {
    const settings = await this.prisma.examSettings.findUnique({
      where: { examinationId: examId },
    });
    if (!settings) throw new NotFoundException('Exam settings not found');

    return this.prisma.examSettings.update({
      where: { examinationId: examId },
      data,
    });
  }

  async publish(examId: string) {
    const exam = await this.prisma.examination.findFirst({
      where: { id: examId, isDeleted: false },
      include: { settings: true, questions: true },
    });
    if (!exam) throw new NotFoundException('Examination not found');

    return this.prisma.examination.update({
      where: { id: examId },
      data: { status: 'published' },
    });
  }
}
