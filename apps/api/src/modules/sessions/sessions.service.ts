import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { Modality, SessionStatus } from '@stupath/shared';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(examId: string, studentId: string, modality: Modality) {
    const exam = await this.prisma.examination.findFirst({
      where: { id: examId, isDeleted: false, status: 'published' },
      include: { settings: true },
    });
    if (!exam) throw new NotFoundException('Published examination not found');
    if (!exam.settings) throw new BadRequestException('Exam settings not configured');

    const previousAttempts = await this.prisma.examSession.count({
      where: { examinationId: examId, studentId },
    });

    if (previousAttempts > exam.settings.retakesAllowed) {
      throw new BadRequestException('Maximum retakes exceeded');
    }

    const accommodation = await this.prisma.accommodation.findUnique({
      where: { examinationId_studentId: { examinationId: examId, studentId } },
    });

    const baseSettings = {
      numStartingQuestions: exam.settings.numStartingQuestions,
      maxTimeSeconds: exam.settings.maxTimeSeconds,
      retakesAllowed: exam.settings.retakesAllowed,
      endProcess: exam.settings.endProcess,
      randomQuestions: exam.settings.randomQuestions,
      depthOfQuestions: exam.settings.depthOfQuestions,
      delayResponseSeconds: exam.settings.delayResponseSeconds,
      idCheckEnabled: exam.settings.idCheckEnabled,
      browserLockdown: exam.settings.browserLockdown,
      allowBreaks: exam.settings.allowBreaks,
    };

    const effectiveSettings = accommodation
      ? { ...baseSettings, ...(accommodation.overrides as Record<string, any>) }
      : baseSettings;

    const session = await this.prisma.examSession.create({
      data: {
        examinationId: examId,
        studentId,
        attemptNumber: previousAttempts + 1,
        modality,
        status: 'not_started',
        effectiveSettings,
      },
      include: { examination: { select: { title: true } } },
    });

    await this.redis.set(
      `session:${session.id}:status`,
      'not_started',
      effectiveSettings.maxTimeSeconds ?? undefined,
    );

    return session;
  }

  async findOne(id: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id },
      include: {
        examination: { select: { title: true, courseId: true } },
        responses: { orderBy: { sortOrder: 'asc' } },
        breakLogs: { orderBy: { breakStartedAt: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateStatus(id: string, status: SessionStatus) {
    const session = await this.prisma.examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    const data: Record<string, any> = { status };
    if (status === 'in_progress' && !session.startedAt) {
      data.startedAt = new Date();
    }
    if (status === 'completed' || status === 'terminated') {
      data.endedAt = new Date();
    }

    const updated = await this.prisma.examSession.update({ where: { id }, data });
    await this.redis.set(`session:${id}:status`, status);

    return updated;
  }

  async recordConsent(id: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.examSession.update({
      where: { id },
      data: { recordingConsentAt: new Date() },
    });
  }

  async submitIdCheck(id: string, images: { idImagePath: string; faceImagePath: string }) {
    const session = await this.prisma.examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.examSession.update({
      where: { id },
      data: {
        idCheckImagePath: images.idImagePath,
        faceCheckImagePath: images.faceImagePath,
      },
    });
  }

  async updateTimerVisibility(id: string, visible: boolean) {
    const session = await this.prisma.examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.examSession.update({
      where: { id },
      data: { showTimer: visible },
    });
  }

  async requestBreak(id: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    const settings = session.effectiveSettings as Record<string, any>;
    if (!settings.allowBreaks) {
      throw new BadRequestException('Breaks are not allowed for this examination');
    }

    await this.prisma.examSession.update({
      where: { id },
      data: { status: 'paused' },
    });

    const breakLog = await this.prisma.breakLog.create({
      data: {
        examSessionId: id,
        breakStartedAt: new Date(),
      },
    });

    await this.redis.set(`session:${id}:status`, 'paused');

    return breakLog;
  }

  async resumeFromBreak(id: string, reVerificationImagePath?: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'paused') {
      throw new BadRequestException('Session is not currently paused');
    }

    const activeBreak = await this.prisma.breakLog.findFirst({
      where: { examSessionId: id, breakEndedAt: null },
      orderBy: { breakStartedAt: 'desc' },
    });

    if (activeBreak) {
      await this.prisma.breakLog.update({
        where: { id: activeBreak.id },
        data: {
          breakEndedAt: new Date(),
          reVerificationImagePath,
        },
      });
    }

    const updated = await this.prisma.examSession.update({
      where: { id },
      data: { status: 'in_progress' },
    });

    await this.redis.set(`session:${id}:status`, 'in_progress');

    return updated;
  }

  async end(id: string) {
    return this.updateStatus(id, 'completed' as SessionStatus);
  }
}
