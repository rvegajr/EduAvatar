import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface AgsScore {
  userId: string;
  scoreOf: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  timestamp: string;
  comment?: string;
}

@Injectable()
export class AgsService {
  private readonly logger = new Logger(AgsService.name);

  constructor(private config: ConfigService) {}

  async submitScore(
    lineItemUrl: string,
    userId: string,
    score: number,
    maxScore: number,
    accessToken: string,
  ): Promise<void> {
    const scoresUrl = lineItemUrl.replace(/\/$/, '') + '/scores';

    const agsScore: AgsScore = {
      userId,
      scoreOf: lineItemUrl,
      scoreGiven: score,
      scoreMaximum: maxScore,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `Submitting score for user ${userId}: ${score}/${maxScore} to ${scoresUrl}`,
    );

    const response = await fetch(scoresUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(agsScore),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`AGS score submission failed: ${response.status} — ${errorBody}`);
      throw new BadGatewayException(
        `Failed to submit score to LMS: ${response.status}`,
      );
    }

    this.logger.log(`Score submitted successfully for user ${userId}`);
  }

  async getAccessToken(platformUrl: string, clientId: string): Promise<string> {
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
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`AGS token request failed: ${response.status} — ${errorBody}`);
      throw new BadGatewayException('Failed to obtain AGS access token from LMS');
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  }
}
