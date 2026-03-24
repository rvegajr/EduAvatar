import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { QueueService, QUEUE_NAMES } from '../../../common/queue/queue.service';

const NOTIFICATION_MESSAGES: Record<string, (sessionId: string) => string> = {
  evaluation_ready: (sessionId) =>
    `AI evaluation is ready for review on session ${sessionId}.`,
  transcription_ready: (sessionId) =>
    `Transcription is ready for session ${sessionId}.`,
  grading_complete: (sessionId) =>
    `Grading is complete for session ${sessionId}.`,
};

@Injectable()
export class NotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  onModuleInit() {
    this.queue.startWorker(QUEUE_NAMES.NOTIFICATION, (data) =>
      this.process(data),
    );
  }

  private async process(data: {
    userId: string;
    type: string;
    sessionId: string;
  }): Promise<void> {
    const { userId, type, sessionId } = data;

    try {
      const messageFn = NOTIFICATION_MESSAGES[type];
      const message = messageFn
        ? messageFn(sessionId)
        : `Notification: ${type} for session ${sessionId}.`;

      await this.prisma.notification.create({
        data: {
          userId,
          type: type as any,
          referenceId: sessionId,
          message,
        },
      });

      this.logger.log(
        `Notification created for user ${userId}: ${type}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
