import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CoursesService } from './courses.service';
import type { PaginationQuery } from '@stupath/shared';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @Roles('instructor', 'admin')
  findAll(@Req() req: any, @Query() query: PaginationQuery) {
    return this.coursesService.findAll(req.user.institutionId, query);
  }

  @Get(':id')
  @Roles('instructor', 'admin')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @Roles('instructor', 'admin')
  create(@Req() req: any, @Body() body: { title: string; ltiContextId?: string }) {
    return this.coursesService.create({
      institutionId: req.user.institutionId,
      instructorId: req.user.id,
      title: body.title,
      ltiContextId: body.ltiContextId,
    });
  }

  @Put(':id')
  @Roles('instructor', 'admin')
  update(@Param('id') id: string, @Body() body: { title?: string; ltiContextId?: string }) {
    return this.coursesService.update(id, body);
  }

  @Post(':id/duplicate')
  @Roles('instructor', 'admin')
  duplicate(@Param('id') id: string) {
    return this.coursesService.duplicate(id);
  }

  @Delete(':id')
  @Roles('instructor', 'admin')
  delete(@Param('id') id: string) {
    return this.coursesService.delete(id);
  }
}
