import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ExamsService } from './exams.service';

@ApiTags('exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Get('course/:courseId')
  @Roles('instructor', 'admin')
  findAllByCourse(@Param('courseId') courseId: string) {
    return this.examsService.findAllByCourse(courseId);
  }

  @Get(':examId')
  @Roles('instructor', 'admin')
  findOne(@Param('examId') examId: string) {
    return this.examsService.findOne(examId);
  }

  @Post('course/:courseId')
  @Roles('instructor', 'admin')
  create(@Param('courseId') courseId: string, @Body() body: { title: string }) {
    return this.examsService.create(courseId, body);
  }

  @Put(':examId')
  @Roles('instructor', 'admin')
  update(
    @Param('examId') examId: string,
    @Body() body: { title?: string; status?: 'draft' | 'published' | 'archived' },
  ) {
    return this.examsService.update(examId, body);
  }

  @Post(':examId/duplicate')
  @Roles('instructor', 'admin')
  duplicate(@Param('examId') examId: string) {
    return this.examsService.duplicate(examId);
  }

  @Delete(':examId')
  @Roles('instructor', 'admin')
  delete(@Param('examId') examId: string) {
    return this.examsService.delete(examId);
  }

  @Get(':examId/settings')
  @Roles('instructor', 'admin')
  getSettings(@Param('examId') examId: string) {
    return this.examsService.getSettings(examId);
  }

  @Put(':examId/settings')
  @Roles('instructor', 'admin')
  updateSettings(@Param('examId') examId: string, @Body() body: Record<string, any>) {
    return this.examsService.updateSettings(examId, body);
  }

  @Post(':examId/publish')
  @Roles('instructor', 'admin')
  publish(@Param('examId') examId: string) {
    return this.examsService.publish(examId);
  }
}
