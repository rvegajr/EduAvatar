import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';

interface AuditEntry {
  userId: string | null;
  method: string;
  path: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  durationMs: number;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUDIT_STREAM_KEY = 'audit:log';

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditLogMiddleware.name);

  constructor(private readonly redis: RedisService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const start = Date.now();

    res.on('finish', () => {
      const entry: AuditEntry = {
        userId: (req as any).user?.sub ?? (req as any).user?.id ?? null,
        method: req.method,
        path: req.originalUrl || req.url,
        timestamp: new Date().toISOString(),
        ip:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
          req.ip ??
          'unknown',
        userAgent: req.headers['user-agent'] ?? 'unknown',
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      };

      this.persistEntry(entry);
    });

    next();
  }

  /**
   * Writes the audit entry to a Redis stream. Falls back to structured JSON
   * logging when Redis is unavailable so audit data is never silently lost.
   */
  private async persistEntry(entry: AuditEntry): Promise<void> {
    try {
      await this.redis.client.xadd(
        AUDIT_STREAM_KEY,
        '*',
        'userId',
        entry.userId ?? '',
        'method',
        entry.method,
        'path',
        entry.path,
        'timestamp',
        entry.timestamp,
        'ip',
        entry.ip,
        'userAgent',
        entry.userAgent,
        'statusCode',
        String(entry.statusCode),
        'durationMs',
        String(entry.durationMs),
      );
    } catch {
      this.logger.warn('Redis stream unavailable — falling back to structured log');
      this.logger.log(JSON.stringify(entry));
    }
  }
}
