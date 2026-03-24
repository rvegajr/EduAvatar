import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type { ClientEvents, ServerEvents, ExamSettingsDto } from '@stupath/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { ExamOrchestratorService } from '../orchestrator/exam-orchestrator.service';
import { TimerService } from '../timer/timer.service';
import { LockdownService } from '../lockdown/lockdown.service';
import { SessionsService } from '../sessions.service';

interface AuthenticatedSocket extends Socket {
  data: { userId: string; sessionId?: string };
}

type ServerEventEmitter = Server<ClientEvents, ServerEvents>;

@WebSocketGateway({ namespace: '/exam', cors: { origin: '*' } })
export class ExamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: ServerEventEmitter;

  private readonly logger = new Logger(ExamGateway.name);
  private audioBuffers = new Map<string, Buffer[]>();

  constructor(
    private orchestrator: ExamOrchestratorService,
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
    private timer: TimerService,
    private lockdown: LockdownService,
    private sessions: SessionsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new UnauthorizedException('Missing auth token');

      const secret = this.config.get<string>('JWT_SECRET', 'changeme');
      const payload = jwt.verify(token, secret) as { sub: string };
      client.data.userId = payload.sub;

      await this.redis.set(`ws:user:${payload.sub}`, client.id, 86400);
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Auth failed for socket ${client.id}`);
      client.emit('error', { message: 'Authentication failed', code: 'AUTH_FAILED' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data?.userId;
    if (userId) {
      await this.redis.del(`ws:user:${userId}`);
    }
    this.audioBuffers.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  async handleSessionJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ClientEvents['session:join'],
  ) {
    try {
      const session = await this.prisma.examSession.findUnique({
        where: { id: data.sessionId },
        include: {
          examination: { include: { settings: true } },
        },
      });

      if (!session) {
        return this.emitError(client, 'Session not found', 'SESSION_NOT_FOUND');
      }
      if (session.studentId !== client.data.userId) {
        return this.emitError(client, 'Session does not belong to this user', 'FORBIDDEN');
      }
      if (session.status === 'completed' || session.status === 'terminated') {
        return this.emitError(client, 'Session already ended', 'SESSION_ENDED');
      }

      client.data.sessionId = data.sessionId;
      await client.join(data.sessionId);

      await this.sessions.updateStatus(data.sessionId, 'in_progress');

      const settings = session.effectiveSettings as ExamSettingsDto;
      if (settings.maxTimeSeconds) {
        await this.timer.startTimer(data.sessionId, settings.maxTimeSeconds);
        this.server.to(data.sessionId).emit('timer:start', {
          maxTimeSeconds: settings.maxTimeSeconds,
          startedAt: new Date().toISOString(),
        });
        this.scheduleTimeReminders(data.sessionId, settings.maxTimeSeconds);
      }

      const firstQuestion = await this.orchestrator.startExam(data.sessionId);
      const audioUrl = await this.orchestrator.generateQuestionAudio(firstQuestion);

      this.server.to(data.sessionId).emit('question:ask', {
        questionText: firstQuestion,
        audioUrl,
        isFollowup: false,
      });

      await this.storeServerEvent(data.sessionId, 'question:ask', {
        questionText: firstQuestion,
        audioUrl,
        isFollowup: false,
      });
    } catch (err) {
      this.logger.error(`session:join failed: ${(err as Error).message}`, (err as Error).stack);
      this.emitError(client, 'Failed to join session', 'JOIN_FAILED');
    }
  }

  @SubscribeMessage('session:reconnect')
  async handleSessionReconnect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ClientEvents['session:reconnect'],
  ) {
    try {
      const session = await this.prisma.examSession.findUnique({
        where: { id: data.sessionId },
      });
      if (!session || session.studentId !== client.data.userId) {
        return this.emitError(client, 'Invalid session', 'INVALID_SESSION');
      }

      client.data.sessionId = data.sessionId;
      await client.join(data.sessionId);

      await this.redis.set(`ws:user:${client.data.userId}`, client.id, 86400);

      const eventsJson = await this.redis.get(`session:${data.sessionId}:events`);
      if (eventsJson) {
        const events: { id: string; event: string; payload: unknown }[] = JSON.parse(eventsJson);
        const missedIdx = events.findIndex((e) => e.id === data.lastEventId);
        const missed = missedIdx >= 0 ? events.slice(missedIdx + 1) : events;

        for (const evt of missed) {
          client.emit(evt.event as keyof ServerEvents, evt.payload as any);
        }
      }

      this.logger.log(`Client reconnected to session ${data.sessionId}`);
    } catch (err) {
      this.logger.error(`session:reconnect failed: ${(err as Error).message}`);
      this.emitError(client, 'Reconnection failed', 'RECONNECT_FAILED');
    }
  }

  @SubscribeMessage('audio:chunk')
  async handleAudioChunk(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() audioData: ClientEvents['audio:chunk'],
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return this.emitError(client, 'Not in a session', 'NO_SESSION');

    try {
      const buffer = Buffer.from(audioData);
      if (!this.audioBuffers.has(client.id)) {
        this.audioBuffers.set(client.id, []);
      }
      this.audioBuffers.get(client.id)!.push(buffer);

      const accumulated = Buffer.concat(this.audioBuffers.get(client.id)!);
      const CHUNK_THRESHOLD = 32_000; // ~2 seconds of audio at 16kHz

      if (accumulated.byteLength >= CHUNK_THRESHOLD) {
        this.audioBuffers.set(client.id, []);

        const result = await this.orchestrator.processAudioChunk(sessionId, accumulated);
        if (result) {
          await this.emitQuestionOrEnd(sessionId, result);
        }
      }
    } catch (err) {
      this.logger.error(`audio:chunk failed: ${(err as Error).message}`);
      this.emitError(client, 'Audio processing failed', 'AUDIO_ERROR');
    }
  }

  @SubscribeMessage('response:text')
  async handleResponseText(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ClientEvents['response:text'],
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return this.emitError(client, 'Not in a session', 'NO_SESSION');

    try {
      const result = await this.orchestrator.processStudentResponse(sessionId, data.text);
      if (result) {
        await this.emitQuestionOrEnd(sessionId, result);
      }
    } catch (err) {
      this.logger.error(`response:text failed: ${(err as Error).message}`);
      this.emitError(client, 'Response processing failed', 'RESPONSE_ERROR');
    }
  }

  @SubscribeMessage('break:request')
  async handleBreakRequest(@ConnectedSocket() client: AuthenticatedSocket) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return this.emitError(client, 'Not in a session', 'NO_SESSION');

    try {
      const session = await this.prisma.examSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) return this.emitError(client, 'Session not found', 'SESSION_NOT_FOUND');

      const settings = session.effectiveSettings as ExamSettingsDto;

      if (settings.allowBreaks) {
        this.server.to(sessionId).emit('break:ask_confirm', {
          message: 'Would you like to take a break? The timer will be paused.',
        });
        await this.storeServerEvent(sessionId, 'break:ask_confirm', {
          message: 'Would you like to take a break? The timer will be paused.',
        });
      } else {
        this.server.to(sessionId).emit('break:denied', {
          message: 'Breaks are not allowed for this examination. Let\'s continue.',
        });
        await this.storeServerEvent(sessionId, 'break:denied', {
          message: 'Breaks are not allowed for this examination. Let\'s continue.',
        });

        const result = await this.orchestrator.processStudentResponse(
          sessionId,
          '[STUDENT_REQUESTED_BREAK_DENIED]',
        );
        if (result) await this.emitQuestionOrEnd(sessionId, result);
      }
    } catch (err) {
      this.logger.error(`break:request failed: ${(err as Error).message}`);
      this.emitError(client, 'Break request failed', 'BREAK_ERROR');
    }
  }

  @SubscribeMessage('break:confirm')
  async handleBreakConfirm(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ClientEvents['break:confirm'],
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return this.emitError(client, 'Not in a session', 'NO_SESSION');

    try {
      if (data.confirmed) {
        await this.timer.pauseTimer(sessionId);
        await this.sessions.requestBreak(sessionId);

        this.server.to(sessionId).emit('break:approved', {
          message: 'Break started. The timer has been paused. Say "ready" or click resume when you\'re back.',
        });
        await this.storeServerEvent(sessionId, 'break:approved', {
          message: 'Break started. The timer has been paused.',
        });
      } else {
        const state = await this.orchestrator.getExamState(sessionId);
        const currentQ = state?.selectedQuestionIds[state.currentQuestionIndex];
        if (currentQ) {
          const question = await this.prisma.question.findUnique({ where: { id: currentQ } });
          if (question) {
            this.server.to(sessionId).emit('question:ask', {
              questionText: `Let's continue. ${question.questionText}`,
              isFollowup: false,
            });
          }
        }
      }
    } catch (err) {
      this.logger.error(`break:confirm failed: ${(err as Error).message}`);
      this.emitError(client, 'Break confirmation failed', 'BREAK_CONFIRM_ERROR');
    }
  }

  @SubscribeMessage('timer:toggle')
  async handleTimerToggle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ClientEvents['timer:toggle'],
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return;

    try {
      await this.sessions.updateTimerVisibility(sessionId, data.visible);
    } catch (err) {
      this.logger.error(`timer:toggle failed: ${(err as Error).message}`);
    }
  }

  @SubscribeMessage('lockdown:violation')
  async handleLockdownViolation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ClientEvents['lockdown:violation'],
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return this.emitError(client, 'Not in a session', 'NO_SESSION');

    try {
      await this.lockdown.logViolation(sessionId, {
        type: data.type,
        timestamp: data.timestamp,
      });
      this.logger.warn(
        `Lockdown violation in session ${sessionId}: ${data.type} at ${data.timestamp}`,
      );
    } catch (err) {
      this.logger.error(`lockdown:violation failed: ${(err as Error).message}`);
    }
  }

  private async emitQuestionOrEnd(
    sessionId: string,
    result: { type: 'question'; text: string; isFollowup: boolean } | { type: 'end' },
  ) {
    if (result.type === 'end') {
      await this.sessions.updateStatus(sessionId, 'completed');
      await this.lockdown.persistViolations(sessionId);
      this.server.to(sessionId).emit('session:end', { reason: 'completed' });
      await this.storeServerEvent(sessionId, 'session:end', { reason: 'completed' });
      return;
    }

    const audioUrl = await this.orchestrator.generateQuestionAudio(result.text);
    this.server.to(sessionId).emit('question:ask', {
      questionText: result.text,
      audioUrl,
      isFollowup: result.isFollowup,
    });
    await this.storeServerEvent(sessionId, 'question:ask', {
      questionText: result.text,
      audioUrl,
      isFollowup: result.isFollowup,
    });
  }

  private emitError(client: AuthenticatedSocket, message: string, code: string) {
    client.emit('error', { message, code });
  }

  private async storeServerEvent(sessionId: string, event: string, payload: unknown) {
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const eventsKey = `session:${sessionId}:events`;
    const existing = await this.redis.get(eventsKey);
    const events: { id: string; event: string; payload: unknown }[] = existing
      ? JSON.parse(existing)
      : [];
    events.push({ id: eventId, event, payload });

    const MAX_STORED_EVENTS = 200;
    if (events.length > MAX_STORED_EVENTS) events.splice(0, events.length - MAX_STORED_EVENTS);

    await this.redis.set(eventsKey, JSON.stringify(events), 86400);
  }

  private scheduleTimeReminders(sessionId: string, maxTimeSeconds: number) {
    const INTERVAL = 300; // 5 minutes
    const FINAL = 120;    // 2 minutes

    const intervalHandle = setInterval(async () => {
      const remaining = await this.timer.getRemainingTime(sessionId);
      if (remaining === null || remaining <= 0) {
        clearInterval(intervalHandle);
        return;
      }

      if (remaining <= FINAL) {
        clearInterval(intervalHandle);
        return;
      }

      const mins = Math.floor(remaining / 60);
      this.server.to(sessionId).emit('time:reminder', {
        remainingSeconds: remaining,
        message: `You have approximately ${mins} minute${mins !== 1 ? 's' : ''} remaining.`,
      });
      await this.storeServerEvent(sessionId, 'time:reminder', {
        remainingSeconds: remaining,
        message: `You have approximately ${mins} minute${mins !== 1 ? 's' : ''} remaining.`,
      });
    }, INTERVAL * 1000);

    const finalDelay = (maxTimeSeconds - FINAL) * 1000;
    if (finalDelay > 0) {
      setTimeout(async () => {
        const remaining = await this.timer.getRemainingTime(sessionId);
        if (remaining !== null && remaining > 0 && remaining <= FINAL + 10) {
          this.server.to(sessionId).emit('time:reminder', {
            remainingSeconds: remaining,
            message: 'You have approximately 2 minutes remaining.',
          });
          await this.storeServerEvent(sessionId, 'time:reminder', {
            remainingSeconds: remaining,
            message: 'You have approximately 2 minutes remaining.',
          });
        }
      }, finalDelay);
    }

    const expiryHandle = setTimeout(async () => {
      clearInterval(intervalHandle);
      const expired = await this.timer.isExpired(sessionId);
      if (expired) {
        await this.sessions.updateStatus(sessionId, 'completed');
        await this.lockdown.persistViolations(sessionId);
        this.server.to(sessionId).emit('session:end', { reason: 'time' });
        await this.storeServerEvent(sessionId, 'session:end', { reason: 'time' });
      }
    }, maxTimeSeconds * 1000);

    this.redis.set(
      `session:${sessionId}:timers`,
      JSON.stringify({
        intervalHandle: 'active',
        expiryHandle: 'active',
      }),
    );
  }
}
