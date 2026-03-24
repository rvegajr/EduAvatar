import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { GradeSubmission } from '@stupath/shared';

@Injectable()
export class GradingService {
  constructor(private prisma: PrismaService) {}

  async getSubmissions(examId: string) {
    return this.prisma.examSession.findMany({
      where: { examinationId: examId, status: 'completed' },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        instructorGrade: { select: { id: true, status: true, totalScore: true } },
        aiEvaluation: { select: { id: true, processingStatus: true } },
      },
      orderBy: { endedAt: 'desc' },
    });
  }

  async getTranscript(sessionId: string) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { examSessionId: sessionId },
      include: {
        segments: { orderBy: { sortOrder: 'asc' } },
        editedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!transcript) throw new NotFoundException('Transcript not found');
    return transcript;
  }

  async getAiEvaluation(sessionId: string) {
    const evaluation = await this.prisma.aIEvaluation.findUnique({
      where: { examSessionId: sessionId },
      include: {
        scores: {
          include: {
            rubricRow: { select: { elementHeader: true, sortOrder: true } },
          },
          orderBy: { rubricRow: { sortOrder: 'asc' } },
        },
      },
    });
    if (!evaluation) throw new NotFoundException('AI evaluation not found');
    return evaluation;
  }

  async getIntegrityReport(sessionId: string) {
    const report = await this.prisma.integrityReport.findUnique({
      where: { examSessionId: sessionId },
    });
    if (!report) throw new NotFoundException('Integrity report not found');
    return report;
  }

  async getRecordingUrl(sessionId: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { examSessionId: sessionId },
    });
    if (!recording) throw new NotFoundException('Recording not found');
    return { storagePath: recording.storagePath, durationMs: recording.durationMs };
  }

  async saveGrade(sessionId: string, instructorId: string, data: GradeSubmission) {
    const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const existing = await this.prisma.instructorGrade.findUnique({
      where: { examSessionId: sessionId },
    });
    if (existing) {
      throw new BadRequestException('Grade already exists. Use PUT /grades/:gradeId to update.');
    }

    return this.prisma.instructorGrade.create({
      data: {
        examSessionId: sessionId,
        instructorId,
        notes: data.notes,
        status: 'draft',
        scores: {
          create: data.rubricScores.map((score) => ({
            rubricRowId: score.rubricRowId,
            notes: score.notes,
            score: score.score,
          })),
        },
      },
      include: {
        scores: {
          include: { rubricRow: { select: { elementHeader: true } } },
        },
      },
    });
  }

  async updateGrade(gradeId: string, data: Partial<GradeSubmission>) {
    const grade = await this.prisma.instructorGrade.findUnique({ where: { id: gradeId } });
    if (!grade) throw new NotFoundException('Grade not found');
    if (grade.status === 'finalized') {
      throw new BadRequestException('Cannot modify a finalized grade');
    }

    if (data.rubricScores) {
      await this.prisma.instructorRubricScore.deleteMany({
        where: { instructorGradeId: gradeId },
      });
    }

    return this.prisma.instructorGrade.update({
      where: { id: gradeId },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.rubricScores && {
          scores: {
            create: data.rubricScores.map((score) => ({
              rubricRowId: score.rubricRowId,
              notes: score.notes,
              score: score.score,
            })),
          },
        }),
      },
      include: {
        scores: {
          include: { rubricRow: { select: { elementHeader: true } } },
        },
      },
    });
  }

  async finalize(gradeId: string) {
    const grade = await this.prisma.instructorGrade.findUnique({
      where: { id: gradeId },
      include: { scores: true },
    });
    if (!grade) throw new NotFoundException('Grade not found');
    if (grade.status === 'finalized') {
      throw new BadRequestException('Grade is already finalized');
    }
    if (!grade.scores.length) {
      throw new BadRequestException('Cannot finalize a grade with no rubric scores');
    }

    const totalScore = grade.scores.reduce(
      (sum, s) => sum + (s.score ? Number(s.score) : 0),
      0,
    );

    return this.prisma.instructorGrade.update({
      where: { id: gradeId },
      data: { status: 'finalized', totalScore },
    });
  }

  async updateTranscript(sessionId: string, editedText: string, userId: string) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { examSessionId: sessionId },
    });
    if (!transcript) throw new NotFoundException('Transcript not found');

    return this.prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        editedText,
        editedById: userId,
        editedAt: new Date(),
      },
    });
  }

  async publishResults(gradeId: string) {
    const grade = await this.prisma.instructorGrade.findUnique({ where: { id: gradeId } });
    if (!grade) throw new NotFoundException('Grade not found');
    if (grade.status !== 'finalized') {
      throw new BadRequestException('Grade must be finalized before publishing');
    }

    return this.prisma.instructorGrade.update({
      where: { id: gradeId },
      data: { publishedAt: new Date() },
    });
  }

  async getStudentResults(sessionId: string, studentId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        instructorGrade: {
          include: {
            scores: {
              include: { rubricRow: { select: { elementHeader: true } } },
            },
          },
        },
        examination: { select: { title: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.studentId !== studentId) {
      throw new BadRequestException('You can only view your own results');
    }
    if (!session.instructorGrade?.publishedAt) {
      throw new NotFoundException('Results have not been published yet');
    }

    return {
      examTitle: session.examination.title,
      totalScore: session.instructorGrade.totalScore,
      notes: session.instructorGrade.notes,
      scores: session.instructorGrade.scores,
    };
  }
}
