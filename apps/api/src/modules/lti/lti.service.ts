import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { Role, AuthTokens } from '@stupath/shared';

@Injectable()
export class LtiService implements OnModuleInit {
  private readonly logger = new Logger(LtiService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async onModuleInit() {
    this.logger.log('LTI 1.3 service initialized');
  }

  async handleLaunch(idToken: LtiIdToken): Promise<{ tokens: AuthTokens; redirectUrl: string }> {
    const institution = await this.prisma.institution.upsert({
      where: { ltiPlatformId: idToken.iss },
      create: {
        name: idToken.iss,
        ltiPlatformId: idToken.iss,
      },
      update: {},
    });

    const role = this.mapLtiRole(idToken.roles);
    const user = await this.prisma.user.upsert({
      where: {
        institutionId_externalId: {
          institutionId: institution.id,
          externalId: idToken.sub,
        },
      },
      create: {
        institutionId: institution.id,
        externalId: idToken.sub,
        email: idToken.email ?? `${idToken.sub}@${institution.domain ?? 'unknown'}`,
        fullName: idToken.name ?? 'Unknown User',
        role,
      },
      update: {
        email: idToken.email ?? undefined,
        fullName: idToken.name ?? undefined,
        lastLoginAt: new Date(),
      },
    });

    if (idToken.context?.id) {
      const course = await this.prisma.course.findFirst({
        where: { ltiContextId: idToken.context.id, institutionId: institution.id },
      });

      if (course) {
        await this.prisma.enrollment.upsert({
          where: { courseId_userId: { courseId: course.id, userId: user.id } },
          create: {
            courseId: course.id,
            userId: user.id,
            ltiRole: role === 'admin' ? 'instructor' : role === 'ta' ? 'ta' : role as any,
          },
          update: {},
        });
      }
    }

    const tokens = await this.authService.generateTokens(user.id, user.email, role, institution.id);

    let redirectUrl = this.config.get('APP_URL', 'http://localhost:3000');
    if (role === 'instructor' || role === 'ta') {
      redirectUrl += '/dashboard';
    } else {
      const examId = idToken.resourceLink?.id;
      redirectUrl += examId ? `/exam/${examId}/lobby` : '/dashboard';
    }

    return { tokens, redirectUrl };
  }

  private mapLtiRole(roles: string[]): Role {
    const roleStr = roles.join(',').toLowerCase();
    if (roleStr.includes('administrator')) return 'admin';
    if (roleStr.includes('instructor') || roleStr.includes('faculty')) return 'instructor';
    if (roleStr.includes('teachingassistant')) return 'ta';
    return 'student';
  }
}

interface LtiIdToken {
  iss: string;
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  context?: { id: string; label?: string; title?: string };
  resourceLink?: { id: string; title?: string };
}
