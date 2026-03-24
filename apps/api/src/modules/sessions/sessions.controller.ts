import {
  Controller, Get, Post, Put,
  Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { SessionsService } from './sessions.service';
import type { Modality } from '@stupath/shared';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post('exams/:examId/sessions')
  @Roles('student')
  create(
    @Param('examId') examId: string,
    @Req() req: any,
    @Body() body: { modality: Modality },
  ) {
    return this.sessionsService.create(examId, req.user.id, body.modality);
  }

  @Get(':sessionId')
  findOne(@Param('sessionId') sessionId: string) {
    return this.sessionsService.findOne(sessionId);
  }

  @Post(':sessionId/consent')
  @Roles('student')
  recordConsent(@Param('sessionId') sessionId: string) {
    return this.sessionsService.recordConsent(sessionId);
  }

  @Post(':sessionId/id-check')
  @Roles('student')
  submitIdCheck(
    @Param('sessionId') sessionId: string,
    @Body() body: { idImagePath: string; faceImagePath: string },
  ) {
    return this.sessionsService.submitIdCheck(sessionId, body);
  }

  @Put(':sessionId/timer-visibility')
  @Roles('student')
  updateTimerVisibility(
    @Param('sessionId') sessionId: string,
    @Body() body: { visible: boolean },
  ) {
    return this.sessionsService.updateTimerVisibility(sessionId, body.visible);
  }

  @Post(':sessionId/break')
  @Roles('student')
  requestBreak(@Param('sessionId') sessionId: string) {
    return this.sessionsService.requestBreak(sessionId);
  }

  @Post(':sessionId/resume')
  @Roles('student')
  resumeFromBreak(
    @Param('sessionId') sessionId: string,
    @Body() body: { reVerificationImagePath?: string },
  ) {
    return this.sessionsService.resumeFromBreak(sessionId, body.reVerificationImagePath);
  }

  @Post(':sessionId/end')
  @Roles('student')
  end(@Param('sessionId') sessionId: string) {
    return this.sessionsService.end(sessionId);
  }
}
