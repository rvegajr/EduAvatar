import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface NrpsMember {
  user_id: string;
  name?: string;
  email?: string;
  roles: string[];
  status: string;
}

interface NrpsMembershipResponse {
  id: string;
  context: { id: string; label?: string; title?: string };
  members: NrpsMember[];
}

type InternalRole = 'instructor' | 'ta' | 'student';

@Injectable()
export class NrpsService {
  private readonly logger = new Logger(NrpsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async syncRoster(
    courseId: string,
    platformUrl: string,
    contextMembershipsUrl: string,
    accessToken: string,
  ): Promise<{ synced: number; errors: number }> {
    this.logger.log(`Starting roster sync for course ${courseId}`);

    const response = await fetch(contextMembershipsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
      },
    });

    if (!response.ok) {
      this.logger.error(`NRPS fetch failed: ${response.status} ${response.statusText}`);
      throw new BadGatewayException(
        `Failed to fetch membership from LMS: ${response.status}`,
      );
    }

    const membership: NrpsMembershipResponse = await response.json();
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
    });

    let synced = 0;
    let errors = 0;

    for (const member of membership.members) {
      try {
        if (member.status !== 'Active') continue;

        const role = this.mapLtiRoleToInternal(member.roles);
        const user = await this.prisma.user.upsert({
          where: {
            institutionId_externalId: {
              institutionId: course.institutionId,
              externalId: member.user_id,
            },
          },
          create: {
            institutionId: course.institutionId,
            externalId: member.user_id,
            email: member.email ?? `${member.user_id}@lti.unknown`,
            fullName: member.name ?? 'Unknown User',
            role,
          },
          update: {
            email: member.email ?? undefined,
            fullName: member.name ?? undefined,
          },
        });

        await this.prisma.enrollment.upsert({
          where: { courseId_userId: { courseId, userId: user.id } },
          create: {
            courseId,
            userId: user.id,
            ltiRole: role === 'admin' ? 'instructor' : (role as InternalRole),
          },
          update: {
            ltiRole: role === 'admin' ? 'instructor' : (role as InternalRole),
          },
        });

        synced++;
      } catch (error) {
        this.logger.error(`Failed to sync member ${member.user_id}`, error);
        errors++;
      }
    }

    this.logger.log(`Roster sync complete: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  }

  async getAccessToken(
    platformUrl: string,
    clientId: string,
    scope: string,
  ): Promise<string> {
    const privateKey = this.config.get<string>('LTI_PRIVATE_KEY');
    if (!privateKey) {
      throw new InternalServerErrorException('LTI_PRIVATE_KEY is not configured');
    }

    const tokenEndpoint = `${platformUrl}/api/lti/token`;
    const kid = this.config.get<string>('LTI_KEY_ID', 'stupath-lti-key');

    const assertion = jwt.sign(
      {
        iss: clientId,
        sub: clientId,
        aud: tokenEndpoint,
        jti: crypto.randomUUID(),
      },
      privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '5m',
        keyid: kid,
      },
    );

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type:
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
      scope,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Token request failed: ${response.status} — ${errorBody}`);
      throw new BadGatewayException('Failed to obtain access token from LMS');
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  }

  private mapLtiRoleToInternal(roles: string[]): InternalRole {
    const roleStr = roles.join(',').toLowerCase();
    if (roleStr.includes('instructor') || roleStr.includes('faculty')) return 'instructor';
    if (roleStr.includes('teachingassistant')) return 'ta';
    return 'student';
  }
}
