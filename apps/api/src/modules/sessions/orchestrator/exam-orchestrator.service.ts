import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../../common/ai/ai.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { StorageService } from '../../../common/storage/storage.service';
import { DEPTH_LABELS } from '@stupath/shared';
import type { ExamSettingsDto } from '@stupath/shared';

export interface ExamState {
  currentQuestionIndex: number;
  totalQuestions: number;
  selectedQuestionIds: string[];
  conversationHistory: { role: string; content: string }[];
  startedAt: string;
}

interface OrchestratorResult {
  type: 'question' | 'end';
  text: string;
  isFollowup: boolean;
}

const REDIS_STATE_TTL = 86400; // 24 hours

@Injectable()
export class ExamOrchestratorService {
  private readonly logger = new Logger(ExamOrchestratorService.name);

  constructor(
    private ai: AiService,
    private prisma: PrismaService,
    private redis: RedisService,
    private storage: StorageService,
  ) {}

  async startExam(sessionId: string): Promise<string> {
    const session = await this.prisma.examSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        examination: {
          include: {
            settings: true,
            questions: true,
          },
        },
      },
    });

    const settings = session.effectiveSettings as ExamSettingsDto;
    const questions = session.examination.questions;

    if (!questions.length) {
      throw new Error('No questions found for this examination');
    }

    let selectedIds: string[];
    const numToSelect = Math.min(settings.numStartingQuestions, questions.length);

    if (settings.randomQuestions) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      selectedIds = shuffled.slice(0, numToSelect).map((q) => q.id);
    } else {
      selectedIds = questions
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, numToSelect)
        .map((q) => q.id);
    }

    const state: ExamState = {
      currentQuestionIndex: 0,
      totalQuestions: selectedIds.length,
      selectedQuestionIds: selectedIds,
      conversationHistory: [],
      startedAt: new Date().toISOString(),
    };

    await this.setExamState(sessionId, state);

    const firstQuestion = await this.prisma.question.findUniqueOrThrow({
      where: { id: selectedIds[0] },
    });

    state.conversationHistory.push({
      role: 'assistant',
      content: firstQuestion.questionText,
    });
    await this.setExamState(sessionId, state);

    await this.prisma.sessionResponse.create({
      data: {
        examSessionId: sessionId,
        questionId: firstQuestion.id,
        speaker: 'ai',
        content: firstQuestion.questionText,
        sortOrder: 0,
      },
    });

    return firstQuestion.questionText;
  }

  async processStudentResponse(
    sessionId: string,
    text: string,
    audioPath?: string,
  ): Promise<OrchestratorResult | null> {
    const state = await this.getExamState(sessionId);
    if (!state) throw new Error(`No exam state found for session ${sessionId}`);

    const currentQuestionId = state.selectedQuestionIds[state.currentQuestionIndex];

    const sortOrder = await this.prisma.sessionResponse.count({
      where: { examSessionId: sessionId },
    });

    await this.prisma.sessionResponse.create({
      data: {
        examSessionId: sessionId,
        questionId: currentQuestionId,
        speaker: 'student',
        content: text,
        audioStoragePath: audioPath ?? null,
        sortOrder,
      },
    });

    state.conversationHistory.push({ role: 'user', content: text });

    const prompt = await this.buildPrompt(sessionId, text, state);
    const aiResponse = await this.ai.chat(prompt, { temperature: 0.6, maxTokens: 512 });

    if (aiResponse.includes('[ADVANCE]')) {
      const nextIndex = state.currentQuestionIndex + 1;

      if (nextIndex >= state.totalQuestions) {
        await this.setExamState(sessionId, state);
        return { type: 'end', text: '', isFollowup: false };
      }

      state.currentQuestionIndex = nextIndex;
      const nextQuestionId = state.selectedQuestionIds[nextIndex];
      const nextQuestion = await this.prisma.question.findUniqueOrThrow({
        where: { id: nextQuestionId },
      });

      state.conversationHistory.push({
        role: 'assistant',
        content: nextQuestion.questionText,
      });
      await this.setExamState(sessionId, state);

      const newSortOrder = sortOrder + 1;
      await this.prisma.sessionResponse.create({
        data: {
          examSessionId: sessionId,
          questionId: nextQuestionId,
          speaker: 'ai',
          content: nextQuestion.questionText,
          sortOrder: newSortOrder,
        },
      });

      return { type: 'question', text: nextQuestion.questionText, isFollowup: false };
    }

    const followUpText = aiResponse.replace('[ADVANCE]', '').trim();

    state.conversationHistory.push({ role: 'assistant', content: followUpText });
    await this.setExamState(sessionId, state);

    const followUpSortOrder = sortOrder + 1;
    await this.prisma.sessionResponse.create({
      data: {
        examSessionId: sessionId,
        questionId: currentQuestionId,
        speaker: 'ai',
        content: followUpText,
        sortOrder: followUpSortOrder,
      },
    });

    return { type: 'question', text: followUpText, isFollowup: true };
  }

  async processAudioChunk(
    sessionId: string,
    audioBuffer: Buffer,
  ): Promise<OrchestratorResult | null> {
    const transcription = await this.ai.transcribe(audioBuffer);

    if (!transcription.text || transcription.text.trim().length === 0) {
      return null;
    }

    const audioKey = `sessions/${sessionId}/audio/${Date.now()}.webm`;
    await this.storage.upload(audioKey, audioBuffer, 'audio/webm');

    return this.processStudentResponse(sessionId, transcription.text, audioKey);
  }

  async generateQuestionAudio(text: string): Promise<string> {
    try {
      const audioBuffer = await this.ai.textToSpeech(text);
      const key = `audio/questions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.opus`;
      await this.storage.upload(key, audioBuffer, 'audio/opus');
      return this.storage.getSignedUrl(key);
    } catch (err) {
      this.logger.error(`TTS generation failed: ${(err as Error).message}`);
      return '';
    }
  }

  private async buildPrompt(
    sessionId: string,
    studentResponse: string,
    state: ExamState,
  ): Promise<{ role: 'system' | 'user' | 'assistant'; content: string }[]> {
    const session = await this.prisma.examSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        examination: {
          include: {
            settings: true,
            rubric: { include: { rows: { include: { cells: true } } } },
            materials: true,
          },
        },
      },
    });

    const settings = session.effectiveSettings as ExamSettingsDto;
    const depth = settings.depthOfQuestions;
    const depthLabel = DEPTH_LABELS[depth] ?? `Depth level ${depth}`;

    let ragContext = '';
    try {
      const embedding = await this.ai.generateEmbedding(studentResponse);
      const vectorQuery = `
        SELECT content, metadata
        FROM material_chunks
        WHERE examination_id = $1
        ORDER BY embedding <=> $2::vector
        LIMIT 3
      `;
      const chunks: { content: string; metadata: unknown }[] =
        await this.prisma.$queryRawUnsafe(vectorQuery, session.examinationId, JSON.stringify(embedding));

      if (chunks.length > 0) {
        ragContext = chunks.map((c) => c.content).join('\n\n---\n\n');
      }
    } catch (err) {
      this.logger.warn(`RAG retrieval failed, proceeding without context: ${(err as Error).message}`);
    }

    let rubricContext = '';
    if (session.examination.rubric) {
      const rubric = session.examination.rubric;
      rubricContext = rubric.rows
        .map((row) => {
          const cells = row.cells.map((c) => `  - ${c.content}`).join('\n');
          return `Element: ${row.header}\n${cells}`;
        })
        .join('\n\n');
    }

    const currentQuestionId = state.selectedQuestionIds[state.currentQuestionIndex];
    const currentQuestion = await this.prisma.question.findUnique({
      where: { id: currentQuestionId },
    });

    const systemMessage = [
      'You are an AI oral examination proctor conducting a student exam.',
      `The current depth setting is ${depth}/10 (${depthLabel}).`,
      '',
      'Depth behavior guide:',
      '- 0: Ask no follow-up questions. Always respond with [ADVANCE].',
      '- 1-3: Ask at most 1 brief clarifying follow-up before advancing.',
      '- 4-6: Ask 1-3 follow-up questions to probe understanding moderately.',
      '- 7-8: Ask 2-4 detailed follow-up questions probing for deeper understanding.',
      '- 9-10: Ask 3-5 complex, multi-layered follow-up questions pushing the student to demonstrate mastery.',
      '',
      'Rules:',
      '- Be professional, encouraging, and neutral.',
      '- Do not reveal answers or correct the student during the exam.',
      '- When you determine the student has been sufficiently examined on the current topic, respond with exactly [ADVANCE] (no additional text).',
      '- If the student\'s response is off-topic or unclear, ask a clarifying follow-up.',
      '- If the student says something indicating they want to move on, respect that and respond with [ADVANCE].',
      '',
      currentQuestion ? `Current base question: "${currentQuestion.questionText}"` : '',
      `Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}.`,
      '',
      ragContext ? `Relevant course material for reference (do NOT share with student):\n${ragContext}` : '',
      rubricContext ? `Rubric elements being assessed:\n${rubricContext}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemMessage },
    ];

    for (const entry of state.conversationHistory) {
      messages.push({
        role: entry.role as 'user' | 'assistant',
        content: entry.content,
      });
    }

    return messages;
  }

  async getExamState(sessionId: string): Promise<ExamState | null> {
    const raw = await this.redis.get(`session:${sessionId}:examState`);
    if (!raw) return null;
    return JSON.parse(raw) as ExamState;
  }

  async setExamState(sessionId: string, state: ExamState): Promise<void> {
    await this.redis.set(
      `session:${sessionId}:examState`,
      JSON.stringify(state),
      REDIS_STATE_TTL,
    );
  }
}
