import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../../common/ai/ai.service';
import { QueueService, QUEUE_NAMES } from '../../../common/queue/queue.service';

interface ParsedElementScore {
  elementHeader: string;
  notes: string;
  suggestedMin: number;
  suggestedMax: number;
}

@Injectable()
export class AiEvaluationWorker implements OnModuleInit {
  private readonly logger = new Logger(AiEvaluationWorker.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private queue: QueueService,
  ) {}

  onModuleInit() {
    this.queue.startWorker(QUEUE_NAMES.AI_EVALUATION, (data) =>
      this.process(data),
    );
  }

  private async process(data: { sessionId: string }): Promise<void> {
    const { sessionId } = data;

    try {
      const session = await this.prisma.examSession.findUnique({
        where: { id: sessionId },
        include: {
          examination: {
            include: {
              rubric: { include: { rows: { orderBy: { sortOrder: 'asc' }, include: { cells: true } } } },
              questions: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });
      if (!session) throw new Error(`Session ${sessionId} not found`);

      const transcript = await this.prisma.transcript.findUnique({
        where: { examSessionId: sessionId },
      });
      if (!transcript) throw new Error(`Transcript not found for session ${sessionId}`);

      const evaluation = await this.prisma.aIEvaluation.upsert({
        where: { examSessionId: sessionId },
        update: { processingStatus: 'processing' },
        create: { examSessionId: sessionId, processingStatus: 'processing' },
      });

      const rubric = session.examination.rubric;
      if (!rubric) throw new Error(`No rubric found for examination ${session.examinationId}`);

      const transcriptText = transcript.normalizedText || transcript.rawText;
      const rubricDescription = this.formatRubricForPrompt(rubric);
      const questionsText = session.examination.questions
        .map((q, i) => `${i + 1}. ${q.questionText}`)
        .join('\n');

      const prompt = this.buildEvaluationPrompt(
        transcriptText,
        rubricDescription,
        questionsText,
      );

      const llmResponse = await this.ai.chat(
        [
          {
            role: 'system',
            content:
              'You are an academic assessment expert. You evaluate oral examination transcripts ' +
              'against rubrics. Always respond in valid JSON format.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, maxTokens: 4096 },
      );

      const scores = this.parseEvaluationResponse(llmResponse, rubric.rows);

      await this.prisma.$transaction(async (tx) => {
        await tx.aIRubricScore.deleteMany({
          where: { aiEvaluationId: evaluation.id },
        });

        for (const score of scores) {
          const rubricRow = rubric.rows.find(
            (r) => r.elementHeader.toLowerCase() === score.elementHeader.toLowerCase(),
          );
          if (!rubricRow) continue;

          await tx.aIRubricScore.create({
            data: {
              aiEvaluationId: evaluation.id,
              rubricRowId: rubricRow.id,
              notes: score.notes,
              suggestedMin: score.suggestedMin,
              suggestedMax: score.suggestedMax,
            },
          });
        }

        await tx.aIEvaluation.update({
          where: { id: evaluation.id },
          data: {
            processingStatus: 'complete',
            rawResponse: llmResponse,
          },
        });
      });

      const instructorId = session.examination.instructorId;
      await this.queue.enqueue(QUEUE_NAMES.NOTIFICATION, {
        userId: instructorId,
        type: 'evaluation_ready',
        sessionId,
      });

      this.logger.log(`AI evaluation complete for session ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `AI evaluation failed for session ${sessionId}: ${error.message}`,
        error.stack,
      );
      await this.prisma.aIEvaluation
        .update({
          where: { examSessionId: sessionId },
          data: { processingStatus: 'failed' },
        })
        .catch(() => {});
    }
  }

  private formatRubricForPrompt(rubric: any): string {
    const lines: string[] = [`Rubric: "${rubric.title}"`];
    for (const row of rubric.rows) {
      lines.push(`\nElement: "${row.elementHeader}"`);
      for (const cell of row.cells) {
        lines.push(`  - Level "${cell.levelLabel}": ${cell.description} (${cell.pointValue ?? cell.minPoints + '-' + cell.maxPoints} pts)`);
      }
    }
    return lines.join('\n');
  }

  private buildEvaluationPrompt(
    transcript: string,
    rubric: string,
    questions: string,
  ): string {
    return [
      'Evaluate the following student oral examination transcript against the provided rubric.',
      '',
      '## Exam Questions',
      questions,
      '',
      '## Rubric',
      rubric,
      '',
      '## Student Transcript',
      transcript,
      '',
      '## Instructions',
      'For each rubric element, provide:',
      '1. Detailed notes on the student\'s performance for that element',
      '2. A suggested minimum score (conservative assessment)',
      '3. A suggested maximum score (generous assessment)',
      'Do NOT provide a single grade — provide a range.',
      '',
      'Respond in JSON format:',
      '```json',
      '[',
      '  {',
      '    "elementHeader": "Element Name",',
      '    "notes": "Detailed performance notes...",',
      '    "suggestedMin": 0,',
      '    "suggestedMax": 0',
      '  }',
      ']',
      '```',
    ].join('\n');
  }

  private parseEvaluationResponse(
    response: string,
    rubricRows: any[],
  ): ParsedElementScore[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');

      const parsed = JSON.parse(jsonMatch[0]) as ParsedElementScore[];
      return parsed.map((item) => ({
        elementHeader: String(item.elementHeader ?? ''),
        notes: String(item.notes ?? ''),
        suggestedMin: Number(item.suggestedMin) || 0,
        suggestedMax: Number(item.suggestedMax) || 0,
      }));
    } catch (parseError) {
      this.logger.warn(`Failed to parse LLM response as JSON, using fallback`);
      return rubricRows.map((row) => ({
        elementHeader: row.elementHeader,
        notes: response,
        suggestedMin: 0,
        suggestedMax: 0,
      }));
    }
  }
}
