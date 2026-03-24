import {
  Controller, Get, Post, Put,
  Param, Body, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { RubricsService } from './rubrics.service';

@ApiTags('rubrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams/:examId/rubric')
export class RubricsController {
  constructor(private rubricsService: RubricsService) {}

  @Get()
  @Roles('instructor', 'admin')
  findByExam(@Param('examId') examId: string) {
    return this.rubricsService.findByExam(examId);
  }

  @Put()
  @Roles('instructor', 'admin')
  upsert(@Param('examId') examId: string, @Body() body: any) {
    return this.rubricsService.update(examId, body);
  }

  @Post('generate')
  @Roles('instructor', 'admin')
  generate(@Param('examId') examId: string) {
    return this.rubricsService.generateWithAi(examId);
  }

  @Post('import')
  @Roles('instructor', 'admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@Param('examId') examId: string, @UploadedFile() file: Express.Multer.File) {
    return this.rubricsService.importFromExcel(examId, file);
  }
}
