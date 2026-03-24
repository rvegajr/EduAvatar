import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../../common/ai/ai.service';
import { StorageService } from '../../../common/storage/storage.service';
import { QueueService, QUEUE_NAMES } from '../../../common/queue/queue.service';

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

const PAUSE_THRESHOLD_SECONDS = 2;

@Injectable()
export class TranscriptionWorker implements OnModuleInit {
  private readonly logger = new Logger(TranscriptionWorker.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private storage: StorageService,
    private queue: QueueService,
  ) {}

  onModuleInit() {
    this.queue.startWorker(QUEUE_NAMES.TRANSCRIPTION, (data) =>
      this.process(data),
    );
  }

  private async process(data: { sessionId: string }): Promise<void> {
    const { sessionId } = data;

    try {
      await this.prisma.transcript.upsert({
        where: { examSessionId: sessionId },
        update: { processingStatus: 'processing' },
        create: { examSessionId: sessionId, processingStatus: 'processing', rawText: '' },
      });

      const recording = await this.prisma.recording.findUnique({
        where: { examSessionId: sessionId },
      });
      if (!recording) throw new Error(`No recording found for session ${sessionId}`);

      const audioBuffer = await this.storage.download(recording.storagePath);

      const whisperResult = await this.ai.transcribe(audioBuffer);
      const rawText = whisperResult.text;
      const words: WhisperWord[] = (whisperResult as any).words ?? [];

      const normalizedText = await this.normalizeTranscript(rawText, words);

      const segments = this.buildSegments(normalizedText, words);

      await this.prisma.$transaction(async (tx) => {
        const transcript = await tx.transcript.update({
          where: { examSessionId: sessionId },
          data: {
            rawText,
            normalizedText,
            processingStatus: 'complete',
          },
        });

        if (segments.length > 0) {
          await tx.transcriptSegment.createMany({
            data: segments.map((seg, idx) => ({
              transcriptId: transcript.id,
              speaker: seg.speaker,
              text: seg.text,
              startMs: seg.startMs,
              endMs: seg.endMs,
              isPause: seg.isPause,
              sortOrder: idx,
            })),
          });
        }
      });

      await Promise.all([
        this.queue.enqueue(QUEUE_NAMES.AI_EVALUATION, { sessionId }),
        this.queue.enqueue(QUEUE_NAMES.INTEGRITY_ANALYSIS, { sessionId }),
      ]);

      this.logger.log(`Transcription complete for session ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Transcription failed for session ${sessionId}: ${error.message}`,
        error.stack,
      );
      await this.prisma.transcript
        .update({
          where: { examSessionId: sessionId },
          data: { processingStatus: 'failed' },
        })
        .catch(() => {});
    }
  }

  private async normalizeTranscript(
    rawText: string,
    words: WhisperWord[],
  ): Promise<string> {
    const textWithPauses = this.insertPauseAnnotations(rawText, words);

    const result = await this.ai.chat(
      [
        {
          role: 'system',
          content:
            'You are a transcript normalization assistant. ' +
            'Normalize the following transcript for spelling, grammar, and punctuation. ' +
            'Preserve the meaning exactly. Keep all [pause X seconds] annotations intact. ' +
            'Do not add commentary — return only the normalized transcript.',
        },
        { role: 'user', content: textWithPauses },
      ],
      { temperature: 0.1, maxTokens: 4096 },
    );

    return result;
  }

  private insertPauseAnnotations(rawText: string, words: WhisperWord[]): string {
    if (words.length < 2) return rawText;

    const parts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i > 0) {
        const gap = words[i].start - words[i - 1].end;
        if (gap >= PAUSE_THRESHOLD_SECONDS) {
          parts.push(` [pause ${Math.round(gap)} seconds] `);
        }
      }
      parts.push(words[i].word);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private buildSegments(
    normalizedText: string,
    words: WhisperWord[],
  ): Array<{
    speaker: string;
    text: string;
    startMs: number;
    endMs: number;
    isPause: boolean;
  }> {
    if (words.length === 0) {
      return [
        {
          speaker: 'student',
          text: normalizedText,
          startMs: 0,
          endMs: 0,
          isPause: false,
        },
      ];
    }

    const segments: Array<{
      speaker: string;
      text: string;
      startMs: number;
      endMs: number;
      isPause: boolean;
    }> = [];

    let currentWords: WhisperWord[] = [];
    let currentSpeaker = 'student';

    for (let i = 0; i < words.length; i++) {
      if (i > 0) {
        const gap = words[i].start - words[i - 1].end;
        if (gap >= PAUSE_THRESHOLD_SECONDS) {
          if (currentWords.length > 0) {
            segments.push({
              speaker: currentSpeaker,
              text: currentWords.map((w) => w.word).join(' '),
              startMs: Math.round(currentWords[0].start * 1000),
              endMs: Math.round(currentWords[currentWords.length - 1].end * 1000),
              isPause: false,
            });
            currentWords = [];
          }
          segments.push({
            speaker: 'system',
            text: `[pause ${Math.round(gap)} seconds]`,
            startMs: Math.round(words[i - 1].end * 1000),
            endMs: Math.round(words[i].start * 1000),
            isPause: true,
          });
        }
      }
      currentWords.push(words[i]);
    }

    if (currentWords.length > 0) {
      segments.push({
        speaker: currentSpeaker,
        text: currentWords.map((w) => w.word).join(' '),
        startMs: Math.round(currentWords[0].start * 1000),
        endMs: Math.round(currentWords[currentWords.length - 1].end * 1000),
        isPause: false,
      });
    }

    return segments;
  }
}
