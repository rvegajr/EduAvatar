import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface DeepLinkingSettings {
  deep_link_return_url: string;
  accept_types: string[];
  accept_presentation_document_targets: string[];
  data?: string;
}

interface ContentItem {
  type: string;
  title: string;
  url: string;
  custom?: Record<string, string>;
  lineItem?: {
    scoreMaximum: number;
    label: string;
    resourceId: string;
  };
}

@Injectable()
export class DeepLinkingService {
  private readonly logger = new Logger(DeepLinkingService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  buildContentItemsResponse(
    examId: string,
    examTitle: string,
    platformData: DeepLinkingSettings,
  ): string {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const clientId = this.config.get<string>('LTI_CLIENT_ID');
    const platformIssuer = this.config.get<string>('LTI_PLATFORM_ISSUER');

    const contentItem: ContentItem = {
      type: 'ltiResourceLink',
      title: examTitle,
      url: `${appUrl}/api/lti/launch`,
      custom: {
        exam_id: examId,
      },
      lineItem: {
        scoreMaximum: 100,
        label: examTitle,
        resourceId: examId,
      },
    };

    const payload = {
      iss: clientId,
      aud: platformIssuer,
      nonce: crypto.randomUUID(),
      'https://purl.imsglobal.org/spec/lti/claim/message_type':
        'LtiDeepLinkingResponse',
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': [contentItem],
      'https://purl.imsglobal.org/spec/lti-dl/claim/data': platformData.data,
    };

    return this.signJwt(payload);
  }

  async handleDeepLinkReturn(contentItems: any[], courseId: string): Promise<void> {
    this.logger.log(
      `Processing deep link return with ${contentItems.length} item(s) for course ${courseId}`,
    );

    for (const item of contentItems) {
      if (item.type !== 'ltiResourceLink') continue;

      const examId = item.custom?.exam_id;
      if (!examId) {
        this.logger.warn('Deep link content item missing exam_id custom parameter');
        continue;
      }

      const exam = await this.prisma.examination.findUnique({
        where: { id: examId },
      });

      if (!exam) {
        this.logger.warn(`Examination ${examId} not found, skipping deep link association`);
        continue;
      }

      if (exam.courseId !== courseId) {
        await this.prisma.examination.update({
          where: { id: examId },
          data: { courseId },
        });
        this.logger.log(`Associated exam ${examId} with course ${courseId}`);
      }
    }
  }

  private signJwt(payload: Record<string, any>): string {
    const privateKey = this.config.get<string>('LTI_PRIVATE_KEY');
    if (!privateKey) {
      throw new InternalServerErrorException('LTI_PRIVATE_KEY is not configured');
    }

    const kid = this.config.get<string>('LTI_KEY_ID', 'stupath-lti-key');

    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: '5m',
      keyid: kid,
    });
  }
}
