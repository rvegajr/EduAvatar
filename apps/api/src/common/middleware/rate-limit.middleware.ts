import { Injectable, NestMiddleware, HttpStatus, SetMetadata } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';

const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Decorator to set custom rate-limit thresholds on a controller or handler.
 * Falls back to 100 requests / 60 seconds when not specified.
 */
export const RateLimit = (maxRequests: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxRequests, windowSeconds } as RateLimitOptions);

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private static readonly DEFAULT_MAX = 100;
  private static readonly DEFAULT_WINDOW = 60;

  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const options = this.resolveOptions(req);
    const { maxRequests, windowSeconds } = options;

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';
    const redisKey = `rl:${ip}:${req.baseUrl || req.path}`;

    const current = await this.redis.client.incr(redisKey);

    if (current === 1) {
      await this.redis.client.expire(redisKey, windowSeconds);
    }

    const ttl = await this.redis.client.ttl(redisKey);
    const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(maxRequests - current, 0));
    res.setHeader('X-RateLimit-Reset', resetAt);

    if (current > maxRequests) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests. Please try again later.',
        error: 'Too Many Requests',
        retryAfter: Math.max(ttl, 0),
      });
      return;
    }

    next();
  }

  private resolveOptions(req: Request): RateLimitOptions {
    const handler = (req as any).route?.stack?.[0]?.handle;
    const meta: RateLimitOptions | undefined = handler
      ? this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, handler)
      : undefined;

    return {
      maxRequests: meta?.maxRequests ?? RateLimitMiddleware.DEFAULT_MAX,
      windowSeconds: meta?.windowSeconds ?? RateLimitMiddleware.DEFAULT_WINDOW,
    };
  }
}
