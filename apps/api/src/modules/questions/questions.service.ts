import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findAllByExam(examId: string) {
    return this.prisma.question.findMany({
      where: { examinationId: examId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(examId: string, data: { questionText: string }) {
    const maxOrder = await this.prisma.question.aggregate({
      where: { examinationId: examId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.question.create({
      data: {
        examinationId: examId,
        questionText: data.questionText,
        sortOrder: nextOrder,
      },
    });
  }

  async update(id: string, data: { questionText?: string }) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    return this.prisma.question.update({ where: { id }, data });
  }

  async delete(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    await this.prisma.question.delete({ where: { id } });

    await this.prisma.$executeRaw`
      UPDATE questions
      SET sort_order = sort_order - 1
      WHERE examination_id = ${question.examinationId}::uuid
        AND sort_order > ${question.sortOrder}
    `;

    return { deleted: true };
  }

  async reorder(examId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.question.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);

    return this.findAllByExam(examId);
  }
}
