import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

interface LockdownViolation {
  type: string;
  timestamp: number;
}

const VIOLATIONS_KEY_PREFIX = 'session:violations:';
const VIOLATIONS_TTL = 86400;

@Injectable()
export class LockdownService {
  private readonly logger = new Logger(LockdownService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async logViolation(sessionId: string, violation: LockdownViolation): Promise<void> {
    const key = `${VIOLATIONS_KEY_PREFIX}${sessionId}`;
    const existing = await this.redis.get(key);
    const violations: LockdownViolation[] = existing ? JSON.parse(existing) : [];

    violations.push(violation);

    await this.redis.set(key, JSON.stringify(violations), VIOLATIONS_TTL);
    this.logger.warn(
      `Violation logged for session ${sessionId}: ${violation.type}`,
    );
  }

  async getViolations(sessionId: string): Promise<LockdownViolation[]> {
    const key = `${VIOLATIONS_KEY_PREFIX}${sessionId}`;
    const raw = await this.redis.get(key);
    if (!raw) return [];
    return JSON.parse(raw) as LockdownViolation[];
  }

  async persistViolations(sessionId: string): Promise<void> {
    const violations = await this.getViolations(sessionId);
    if (violations.length === 0) return;

    const existingReport = await this.prisma.integrityReport.findUnique({
      where: { examSessionId: sessionId },
    });

    const behavioralFlags = violations.map((v) => ({
      type: v.type,
      timestamp: v.timestamp,
      detectedAt: new Date(v.timestamp).toISOString(),
    }));

    if (existingReport) {
      const existingFlags = (existingReport.behavioralFlags as unknown[]) ?? [];
      await this.prisma.integrityReport.update({
        where: { examSessionId: sessionId },
        data: {
          behavioralFlags: [...existingFlags, ...behavioralFlags],
        },
      });
    } else {
      await this.prisma.integrityReport.create({
        data: {
          examSessionId: sessionId,
          behavioralFlags,
        },
      });
    }

    await this.redis.del(`${VIOLATIONS_KEY_PREFIX}${sessionId}`);
    this.logger.log(
      `Persisted ${violations.length} violations for session ${sessionId}`,
    );
  }
}
