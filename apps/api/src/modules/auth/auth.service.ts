import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { JwtPayload, AuthTokens, Role } from '@stupath/shared';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async generateTokens(userId: string, email: string, role: Role, institutionId: string): Promise<AuthTokens> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      role,
      institutionId,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    await this.redis.set(`refresh:${userId}`, refreshToken, 7 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken);
      const stored = await this.redis.get(`refresh:${payload.sub}`);
      if (stored !== refreshToken) return null;

      return this.generateTokens(payload.sub, payload.email, payload.role, payload.institutionId);
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
  }
}
