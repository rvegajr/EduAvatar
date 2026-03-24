import {
  Controller, Get, Post, Delete,
  Param, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { MaterialsService } from './materials.service';

@ApiTags('materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams/:examId/materials')
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  @Roles('instructor', 'admin')
  findAll(@Param('examId') examId: string) {
    return this.materialsService.findAllByExam(examId);
  }

  @Post()
  @Roles('instructor', 'admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('examId') examId: string, @UploadedFile() file: Express.Multer.File) {
    return this.materialsService.upload(examId, file);
  }

  @Delete(':materialId')
  @Roles('instructor', 'admin')
  delete(@Param('materialId') materialId: string) {
    return this.materialsService.delete(materialId);
  }
}
