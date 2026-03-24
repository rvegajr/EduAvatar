import {
  Controller, Post, Get, Body, Query,
  Req, Res, UseGuards, Logger,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LtiService } from './lti.service';
import { DeepLinkingService } from './deep-linking.service';
import { NrpsService } from './nrps.service';
import { AgsService } from './ags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@ApiTags('lti')
@Controller('lti')
export class LtiController {
  private readonly logger = new Logger(LtiController.name);

  constructor(
    private ltiService: LtiService,
    private deepLinkingService: DeepLinkingService,
    private nrpsService: NrpsService,
    private agsService: AgsService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Get('login')
  @ApiExcludeEndpoint()
  async loginInitiation(@Req() req: Request, @Res() res: Response) {
    this.logger.log('LTI login initiation received');
    res.status(200).json({ message: 'LTI login initiation — ltijs handles this route' });
  }

  @Post('launch')
  @ApiExcludeEndpoint()
  async launch(@Req() req: Request, @Res() res: Response) {
    try {
      const idToken = (req as any).idToken ?? this.extractIdToken(req);
      const { tokens, redirectUrl } = await this.ltiService.handleLaunch(idToken);

      res.redirect(
        `${redirectUrl}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    } catch (error) {
      this.logger.error('LTI launch failed', error);
      res.status(400).json({ error: 'LTI launch failed' });
    }
  }

  // ─── Deep Linking ────────────────────────────────────────────────

  @Get('deep-link/select')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'List exams available for deep linking' })
  async deepLinkSelect(@Req() req: any, @Query('examId') examId?: string) {
    const where: any = {
      course: { institutionId: req.user.institutionId },
      isDeleted: false,
      status: 'published',
    };

    if (examId) {
      where.id = examId;
    }

    const exams = await this.prisma.examination.findMany({
      where,
      select: { id: true, title: true, courseId: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    return { exams };
  }

  @Post('deep-link/return')
  @ApiExcludeEndpoint()
  async deepLinkReturn(@Req() req: Request, @Res() res: Response) {
    try {
      const { contentItems, courseId } = req.body as {
        contentItems: any[];
        courseId: string;
      };

      if (!contentItems?.length || !courseId) {
        throw new BadRequestException('contentItems and courseId are required');
      }

      await this.deepLinkingService.handleDeepLinkReturn(contentItems, courseId);

      this.logger.log('Deep link return processed successfully');
      res.status(200).json({ message: 'Deep link content items registered' });
    } catch (error) {
      this.logger.error('Deep link return failed', error);
      res.status(400).json({ error: 'Deep link return processing failed' });
    }
  }

  // ─── NRPS ────────────────────────────────────────────────────────

  @Post('nrps/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Sync course roster from LMS via NRPS' })
  async syncRoster(@Body() body: { courseId: string }) {
    if (!body.courseId) {
      throw new BadRequestException('courseId is required');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId },
      include: { institution: true },
    });

    if (!course) {
      throw new NotFoundException(`Course ${body.courseId} not found`);
    }

    if (!course.institution.ltiPlatformId) {
      throw new BadRequestException('Course institution is not LTI-enabled');
    }

    const platformUrl = course.institution.ltiPlatformId;
    const clientId = this.config.get<string>('LTI_CLIENT_ID');
    const contextMembershipsUrl = `${platformUrl}/api/lti/courses/${course.ltiContextId}/memberships`;

    const accessToken = await this.nrpsService.getAccessToken(
      platformUrl,
      clientId!,
      'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
    );

    const result = await this.nrpsService.syncRoster(
      body.courseId,
      platformUrl,
      contextMembershipsUrl,
      accessToken,
    );

    return result;
  }

  // ─── AGS ─────────────────────────────────────────────────────────

  @Post('ags/submit-score')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Submit a grade to the LMS via AGS' })
  async submitScore(@Body() body: { gradeId: string }) {
    if (!body.gradeId) {
      throw new BadRequestException('gradeId is required');
    }

    const grade = await this.prisma.instructorGrade.findUnique({
      where: { id: body.gradeId },
      include: {
        examSession: {
          include: {
            student: { include: { institution: true } },
            examination: { include: { course: true } },
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException(`Grade ${body.gradeId} not found`);
    }

    if (!grade.totalScore) {
      throw new BadRequestException('Grade has no total score to submit');
    }

    const institution = grade.examSession.student.institution;
    if (!institution.ltiPlatformId) {
      throw new BadRequestException('Institution is not LTI-enabled');
    }

    const platformUrl = institution.ltiPlatformId;
    const clientId = this.config.get<string>('LTI_CLIENT_ID');

    const accessToken = await this.agsService.getAccessToken(platformUrl, clientId!);

    const exam = grade.examSession.examination;
    const lineItemUrl = `${platformUrl}/api/lti/courses/${exam.course.ltiContextId}/lineitems/${exam.id}`;

    await this.agsService.submitScore(
      lineItemUrl,
      grade.examSession.student.externalId,
      Number(grade.totalScore),
      100,
      accessToken,
    );

    await this.prisma.instructorGrade.update({
      where: { id: body.gradeId },
      data: {
        status: 'submitted_to_lms',
        lmsSubmittedAt: new Date(),
      },
    });

    return { message: 'Score submitted to LMS successfully' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private extractIdToken(req: Request) {
    return {
      iss: req.body?.iss ?? '',
      sub: req.body?.sub ?? '',
      email: req.body?.email,
      name: req.body?.name,
      roles: req.body?.['https://purl.imsglobal.org/spec/lti/claim/roles'] ?? [],
      context: req.body?.['https://purl.imsglobal.org/spec/lti/claim/context'],
      resourceLink: req.body?.['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
    };
  }
}
