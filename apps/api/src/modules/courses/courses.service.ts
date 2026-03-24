import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { PaginationQuery } from '@stupath/shared';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId: string, query: PaginationQuery) {
    const { page = 1, perPage = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * perPage;

    const where = {
      institutionId,
      isDeleted: false,
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { examinations: { where: { isDeleted: false } } } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, isDeleted: false },
      include: {
        examinations: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
        enrollments: { include: { user: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: { institutionId: string; instructorId: string; title: string; ltiContextId?: string }) {
    return this.prisma.course.create({ data });
  }

  async update(id: string, data: { title?: string; ltiContextId?: string }) {
    const course = await this.prisma.course.findFirst({ where: { id, isDeleted: false } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.course.update({ where: { id }, data });
  }

  async duplicate(id: string) {
    const source = await this.prisma.course.findFirst({
      where: { id, isDeleted: false },
      include: {
        examinations: {
          where: { isDeleted: false },
          include: { settings: true, questions: true },
        },
      },
    });
    if (!source) throw new NotFoundException('Course not found');

    return this.prisma.course.create({
      data: {
        institutionId: source.institutionId,
        instructorId: source.instructorId,
        title: `${source.title} (Copy)`,
        examinations: {
          create: source.examinations.map((exam) => ({
            title: exam.title,
            status: 'draft' as const,
            questions: {
              create: exam.questions.map((q) => ({
                questionText: q.questionText,
                sortOrder: q.sortOrder,
              })),
            },
            ...(exam.settings && {
              settings: {
                create: {
                  numStartingQuestions: exam.settings.numStartingQuestions,
                  maxTimeSeconds: exam.settings.maxTimeSeconds,
                  retakesAllowed: exam.settings.retakesAllowed,
                  endProcess: exam.settings.endProcess,
                  randomQuestions: exam.settings.randomQuestions,
                  depthOfQuestions: exam.settings.depthOfQuestions,
                  delayResponseSeconds: exam.settings.delayResponseSeconds,
                  idCheckEnabled: exam.settings.idCheckEnabled,
                  browserLockdown: exam.settings.browserLockdown,
                  allowBreaks: exam.settings.allowBreaks,
                },
              },
            }),
          })),
        },
      },
      include: { examinations: true },
    });
  }

  async delete(id: string) {
    const course = await this.prisma.course.findFirst({ where: { id, isDeleted: false } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.course.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
