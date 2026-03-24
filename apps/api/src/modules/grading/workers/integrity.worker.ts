import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../../common/ai/ai.service';
import { RedisService } from '../../../common/redis/redis.service';
import { QueueService, QUEUE_NAMES } from '../../../common/queue/queue.service';

const VIOLATIONS_KEY_PREFIX = 'session:violations:';

interface PauseAnalysis {
  totalPauses: number;
  averageDurationMs: number;
  longestPauseMs: number;
  suspiciousPatterns: string[];
}

@Injectable()
export class IntegrityWorker implements OnModuleInit {
  private readonly logger = new Logger(IntegrityWorker.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private redis: RedisService,
    private queue: QueueService,
  ) {}

  onModuleInit() {
    this.queue.startWorker(QUEUE_NAMES.INTEGRITY_ANALYSIS, (data) =>
      this.process(data),
    );
  }

  private async process(data: { sessionId: string }): Promise<void> {
    const { sessionId } = data;

    try {
      const transcript = await this.prisma.transcript.findUnique({
        where: { examSessionId: sessionId },
        include: { segments: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!transcript) throw new Error(`Transcript not found for session ${sessionId}`);

      const lockdownViolations = await this.loadLockdownViolations(sessionId);
      const pauseAnalysis = this.analyzePauses(transcript.segments);

      const segmentsText = transcript.segments
        .map((s) => {
          if (s.isPause) return s.text;
          return `[${s.speaker}]: ${s.text}`;
        })
        .join('\n');

      const violationsSummary =
        lockdownViolations.length > 0
          ? lockdownViolations
              .map((v: any) => `- ${v.type} at ${new Date(v.timestamp).toISOString()}`)
              .join('\n')
          : 'No browser lockdown violations detected.';

      const prompt = [
        'Analyze the following exam transcript for academic integrity concerns.',
        '',
        '## Transcript',
        segmentsText,
        '',
        '## Pause Analysis',
        `Total pauses (>2s): ${pauseAnalysis.totalPauses}`,
        `Average pause duration: ${Math.round(pauseAnalysis.averageDurationMs)}ms`,
        `Longest pause: ${pauseAnalysis.longestPauseMs}ms`,
        pauseAnalysis.suspiciousPatterns.length > 0
          ? `Suspicious patterns: ${pauseAnalysis.suspiciousPatterns.join('; ')}`
          : 'No suspicious pause patterns detected.',
        '',
        '## Browser Lockdown Violations',
        violationsSummary,
        '',
        '## Instructions',
        'Analyze for academic integrity considering:',
        '- Pause patterns that may suggest looking up information',
        '- Consistency of knowledge depth throughout the exam',
        '- Signs of reading from external sources (unnatural phrasing, sudden vocabulary shifts)',
        '- Sudden changes in complexity or detail level',
        '- Correlation between pauses and subsequent answer quality',
        '',
        'Respond in JSON:',
        '```json',
        '{',
        '  "riskLevel": "low" | "medium" | "high",',
        '  "overallNotes": "Summary of integrity assessment...",',
        '  "pauseAnalysis": "Assessment of pause patterns...",',
        '  "externalSourceAnalysis": "Assessment of potential external source use...",',
        '  "consistencyAnalysis": "Assessment of knowledge consistency...",',
        '  "flags": ["specific concern 1", "specific concern 2"]',
        '}',
        '```',
      ].join('\n');

      const llmResponse = await this.ai.chat(
        [
          {
            role: 'system',
            content:
              'You are an academic integrity analyst. You evaluate exam transcripts for signs ' +
              'of potential academic dishonesty. Be fair and evidence-based. Always respond in valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.2, maxTokens: 2048 },
      );

      const analysis = this.parseIntegrityResponse(llmResponse);

      const behavioralFlags = lockdownViolations.map((v: any) => ({
        type: v.type,
        timestamp: v.timestamp,
        detectedAt: new Date(v.timestamp).toISOString(),
      }));

      await this.prisma.integrityReport.upsert({
        where: { examSessionId: sessionId },
        update: {
          riskLevel: analysis.riskLevel,
          overallNotes: analysis.overallNotes,
          pauseAnalysis: analysis.pauseAnalysis,
          externalSourceAnalysis: analysis.externalSourceAnalysis,
          consistencyAnalysis: analysis.consistencyAnalysis,
          flags: analysis.flags,
          behavioralFlags,
          rawResponse: llmResponse,
        },
        create: {
          examSessionId: sessionId,
          riskLevel: analysis.riskLevel,
          overallNotes: analysis.overallNotes,
          pauseAnalysis: analysis.pauseAnalysis,
          externalSourceAnalysis: analysis.externalSourceAnalysis,
          consistencyAnalysis: analysis.consistencyAnalysis,
          flags: analysis.flags,
          behavioralFlags,
          rawResponse: llmResponse,
        },
      });

      this.logger.log(`Integrity analysis complete for session ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Integrity analysis failed for session ${sessionId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async loadLockdownViolations(sessionId: string): Promise<any[]> {
    const key = `${VIOLATIONS_KEY_PREFIX}${sessionId}`;
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }

    const report = await this.prisma.integrityReport.findUnique({
      where: { examSessionId: sessionId },
    });
    return (report?.behavioralFlags as any[]) ?? [];
  }

  private analyzePauses(
    segments: Array<{ isPause: boolean; startMs: number; endMs: number; text: string }>,
  ): PauseAnalysis {
    const pauses = segments.filter((s) => s.isPause);
    const durations = pauses.map((p) => p.endMs - p.startMs);

    const suspiciousPatterns: string[] = [];

    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const longPauses = durations.filter((d) => d > avgDuration * 2.5);
      if (longPauses.length >= 2) {
        suspiciousPatterns.push(
          `${longPauses.length} pauses significantly longer than average (>2.5x)`,
        );
      }

      for (let i = 1; i < pauses.length; i++) {
        const gap = pauses[i].startMs - pauses[i - 1].endMs;
        if (gap < 30_000 && durations[i] > 5000 && durations[i - 1] > 5000) {
          suspiciousPatterns.push(
            `Cluster of long pauses near ${Math.round(pauses[i].startMs / 1000)}s`,
          );
        }
      }
    }

    return {
      totalPauses: pauses.length,
      averageDurationMs:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      longestPauseMs: durations.length > 0 ? Math.max(...durations) : 0,
      suspiciousPatterns,
    };
  }

  private parseIntegrityResponse(response: string): {
    riskLevel: string;
    overallNotes: string;
    pauseAnalysis: string;
    externalSourceAnalysis: string;
    consistencyAnalysis: string;
    flags: string[];
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel)
          ? parsed.riskLevel
          : 'low',
        overallNotes: String(parsed.overallNotes ?? ''),
        pauseAnalysis: String(parsed.pauseAnalysis ?? ''),
        externalSourceAnalysis: String(parsed.externalSourceAnalysis ?? ''),
        consistencyAnalysis: String(parsed.consistencyAnalysis ?? ''),
        flags: Array.isArray(parsed.flags)
          ? parsed.flags.map(String)
          : [],
      };
    } catch {
      this.logger.warn('Failed to parse integrity response as JSON, using defaults');
      return {
        riskLevel: 'low',
        overallNotes: response,
        pauseAnalysis: '',
        externalSourceAnalysis: '',
        consistencyAnalysis: '',
        flags: [],
      };
    }
  }
}
