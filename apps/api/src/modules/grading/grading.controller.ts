import {
  Controller, Get, Post, Put,
  Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { GradingService } from './grading.service';
import type { GradeSubmission } from '@stupath/shared';

@ApiTags('grading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class GradingController {
  constructor(private gradingService: GradingService) {}

  @Get('exams/:examId/submissions')
  @Roles('instructor', 'admin')
  getSubmissions(@Param('examId') examId: string) {
    return this.gradingService.getSubmissions(examId);
  }

  @Get('sessions/:sessionId/transcript')
  @Roles('instructor', 'admin')
  getTranscript(@Param('sessionId') sessionId: string) {
    return this.gradingService.getTranscript(sessionId);
  }

  @Get('sessions/:sessionId/ai-evaluation')
  @Roles('instructor', 'admin')
  getAiEvaluation(@Param('sessionId') sessionId: string) {
    return this.gradingService.getAiEvaluation(sessionId);
  }

  @Get('sessions/:sessionId/integrity-report')
  @Roles('instructor', 'admin')
  getIntegrityReport(@Param('sessionId') sessionId: string) {
    return this.gradingService.getIntegrityReport(sessionId);
  }

  @Get('sessions/:sessionId/recording')
  @Roles('instructor', 'admin')
  getRecordingUrl(@Param('sessionId') sessionId: string) {
    return this.gradingService.getRecordingUrl(sessionId);
  }

  @Post('sessions/:sessionId/grade')
  @Roles('instructor', 'admin')
  saveGrade(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() body: GradeSubmission,
  ) {
    return this.gradingService.saveGrade(sessionId, req.user.id, body);
  }

  @Put('grades/:gradeId')
  @Roles('instructor', 'admin')
  updateGrade(@Param('gradeId') gradeId: string, @Body() body: Partial<GradeSubmission>) {
    return this.gradingService.updateGrade(gradeId, body);
  }

  @Post('grades/:gradeId/finalize')
  @Roles('instructor', 'admin')
  finalize(@Param('gradeId') gradeId: string) {
    return this.gradingService.finalize(gradeId);
  }

  @Put('sessions/:sessionId/transcript')
  @Roles('instructor', 'admin')
  updateTranscript(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() body: { editedText: string },
  ) {
    return this.gradingService.updateTranscript(sessionId, body.editedText, req.user.id);
  }

  @Post('grades/:gradeId/publish')
  @Roles('instructor', 'admin')
  publishResults(@Param('gradeId') gradeId: string) {
    return this.gradingService.publishResults(gradeId);
  }

  @Get('sessions/:sessionId/results')
  @Roles('student')
  getStudentResults(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.gradingService.getStudentResults(sessionId, req.user.id);
  }
}
