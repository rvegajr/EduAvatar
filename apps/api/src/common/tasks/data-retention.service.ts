import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  /** Retention periods in days — overridable via environment variables. */
  private readonly recordingRetentionDays: number;
  private readonly idImageRetentionDays: number;
  private readonly softDeleteRetentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.recordingRetentionDays = Number(
      this.config.get('RETENTION_RECORDINGS_DAYS', '365'),
    );
    this.idImageRetentionDays = Number(
      this.config.get('RETENTION_ID_IMAGES_DAYS', '90'),
    );
    this.softDeleteRetentionDays = Number(
      this.config.get('RETENTION_SOFT_DELETE_DAYS', '90'),
    );
  }

  /**
   * Delete exam session recordings whose retention period has elapsed.
   * Removes the object from S3 then marks the database record as purged.
   * Designed to be invoked by a cron scheduler (e.g. `@Cron('0 3 * * *')`).
   */
  async purgeExpiredRecordings(): Promise<number> {
    const cutoff = this.daysAgo(this.recordingRetentionDays);

    const expired = await this.prisma.examSession.findMany({
      where: {
        recordingUrl: { not: null },
        completedAt: { lt: cutoff },
        recordingPurgedAt: null,
      },
      select: { id: true, recordingUrl: true },
    });

    let purgedCount = 0;

    for (const session of expired) {
      try {
        if (session.recordingUrl) {
          await this.storage.delete(session.recordingUrl);
        }
        await this.prisma.examSession.update({
          where: { id: session.id },
          data: { recordingUrl: null, recordingPurgedAt: new Date() },
        });
        purgedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to purge recording for session ${session.id}`,
          (err as Error).stack,
        );
      }
    }

    this.logger.log(`Purged ${purgedCount}/${expired.length} expired recordings`);
    return purgedCount;
  }

  /**
   * Delete student ID verification images older than the configured retention
   * period (~90 days). Removes from S3 and nullifies the database reference.
   */
  async purgeExpiredIdImages(): Promise<number> {
    const cutoff = this.daysAgo(this.idImageRetentionDays);

    const expired = await this.prisma.examSession.findMany({
      where: {
        idImageUrl: { not: null },
        completedAt: { lt: cutoff },
        idImagePurgedAt: null,
      },
      select: { id: true, idImageUrl: true },
    });

    let purgedCount = 0;

    for (const session of expired) {
      try {
        if (session.idImageUrl) {
          await this.storage.delete(session.idImageUrl);
        }
        await this.prisma.examSession.update({
          where: { id: session.id },
          data: { idImageUrl: null, idImagePurgedAt: new Date() },
        });
        purgedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to purge ID image for session ${session.id}`,
          (err as Error).stack,
        );
      }
    }

    this.logger.log(`Purged ${purgedCount}/${expired.length} expired ID images`);
    return purgedCount;
  }

  /**
   * Permanently delete soft-deleted courses and exams that have been in the
   * trash longer than the configured retention period (~90 days).
   */
  async purgeSoftDeletedEntities(): Promise<{ courses: number; exams: number }> {
    const cutoff = this.daysAgo(this.softDeleteRetentionDays);

    const [examsResult, coursesResult] = await this.prisma.$transaction([
      this.prisma.exam.deleteMany({
        where: { deletedAt: { not: null, lt: cutoff } },
      }),
      this.prisma.course.deleteMany({
        where: { deletedAt: { not: null, lt: cutoff } },
      }),
    ]);

    const result = { courses: coursesResult.count, exams: examsResult.count };
    this.logger.log(
      `Permanently deleted ${result.courses} courses, ${result.exams} exams`,
    );
    return result;
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
