import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams/:examId/questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  @Roles('instructor', 'admin')
  findAll(@Param('examId') examId: string) {
    return this.questionsService.findAllByExam(examId);
  }

  @Post()
  @Roles('instructor', 'admin')
  create(@Param('examId') examId: string, @Body() body: { questionText: string }) {
    return this.questionsService.create(examId, body);
  }

  @Put(':questionId')
  @Roles('instructor', 'admin')
  update(@Param('questionId') questionId: string, @Body() body: { questionText?: string }) {
    return this.questionsService.update(questionId, body);
  }

  @Delete(':questionId')
  @Roles('instructor', 'admin')
  delete(@Param('questionId') questionId: string) {
    return this.questionsService.delete(questionId);
  }

  @Put('reorder')
  @Roles('instructor', 'admin')
  reorder(@Param('examId') examId: string, @Body() body: { orderedIds: string[] }) {
    return this.questionsService.reorder(examId, body.orderedIds);
  }
}
