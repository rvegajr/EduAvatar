import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { AiService } from '../../common/ai/ai.service';
import { SUPPORTED_MATERIAL_TYPES } from '@stupath/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class MaterialsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ai: AiService,
  ) {}

  async findAllByExam(examId: string) {
    return this.prisma.examMaterial.findMany({
      where: { examinationId: examId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(examId: string, file: Express.Multer.File) {
    if (!SUPPORTED_MATERIAL_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${SUPPORTED_MATERIAL_TYPES.join(', ')}`,
      );
    }

    const exam = await this.prisma.examination.findFirst({
      where: { id: examId, isDeleted: false },
    });
    if (!exam) throw new NotFoundException('Examination not found');

    const storagePath = `materials/${examId}/${randomUUID()}-${file.originalname}`;
    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    const material = await this.prisma.examMaterial.create({
      data: {
        examinationId: examId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        storagePath,
      },
    });

    this.generateEmbeddings(material.id).catch((err) => {
      console.error(`Failed to generate embeddings for material ${material.id}:`, err);
    });

    return material;
  }

  async delete(id: string) {
    const material = await this.prisma.examMaterial.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material not found');

    await this.prisma.materialEmbedding.deleteMany({
      where: { examMaterialId: id },
    });

    await this.storage.delete(material.storagePath);
    await this.prisma.examMaterial.delete({ where: { id } });

    return { deleted: true };
  }

  async generateEmbeddings(materialId: string) {
    const material = await this.prisma.examMaterial.findUnique({ where: { id: materialId } });
    if (!material) throw new NotFoundException('Material not found');
    if (!material.extractedText) return;

    await this.prisma.materialEmbedding.deleteMany({
      where: { examMaterialId: materialId },
    });

    const chunkSize = 1000;
    const overlap = 200;
    const text = material.extractedText;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.ai.generateEmbedding(chunks[i]);
      await this.prisma.$executeRaw`
        INSERT INTO material_embeddings (id, exam_material_id, chunk_index, chunk_text, embedding)
        VALUES (uuid_generate_v4(), ${materialId}::uuid, ${i}, ${chunks[i]}, ${JSON.stringify(embedding)}::vector)
      `;
    }
  }
}
