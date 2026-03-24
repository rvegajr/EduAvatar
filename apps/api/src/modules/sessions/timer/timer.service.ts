import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../common/redis/redis.service';

interface TimerState {
  startedAt: number;
  maxTimeSeconds: number;
  pausedAt?: number;
  elapsedBeforePause?: number;
}

const TIMER_KEY_PREFIX = 'session:timer:';
const TIMER_TTL = 86400;

@Injectable()
export class TimerService {
  private readonly logger = new Logger(TimerService.name);

  constructor(private redis: RedisService) {}

  async startTimer(sessionId: string, maxTimeSeconds: number): Promise<void> {
    const state: TimerState = {
      startedAt: Date.now(),
      maxTimeSeconds,
    };
    await this.redis.set(
      `${TIMER_KEY_PREFIX}${sessionId}`,
      JSON.stringify(state),
      TIMER_TTL,
    );
    this.logger.log(`Timer started for session ${sessionId}: ${maxTimeSeconds}s`);
  }

  async pauseTimer(sessionId: string): Promise<void> {
    const state = await this.loadState(sessionId);
    if (!state) return;

    if (state.pausedAt) {
      this.logger.warn(`Timer already paused for session ${sessionId}`);
      return;
    }

    const now = Date.now();
    const elapsedMs = now - state.startedAt;
    const previousElapsed = state.elapsedBeforePause ?? 0;

    state.pausedAt = now;
    state.elapsedBeforePause = previousElapsed + elapsedMs / 1000;

    await this.saveState(sessionId, state);
    this.logger.log(`Timer paused for session ${sessionId}`);
  }

  async resumeTimer(sessionId: string): Promise<void> {
    const state = await this.loadState(sessionId);
    if (!state) return;

    if (!state.pausedAt) {
      this.logger.warn(`Timer not paused for session ${sessionId}`);
      return;
    }

    state.startedAt = Date.now();
    delete state.pausedAt;

    await this.saveState(sessionId, state);
    this.logger.log(`Timer resumed for session ${sessionId}`);
  }

  async getRemainingTime(sessionId: string): Promise<number | null> {
    const state = await this.loadState(sessionId);
    if (!state) return null;

    if (state.pausedAt) {
      const elapsed = state.elapsedBeforePause ?? 0;
      return Math.max(0, state.maxTimeSeconds - elapsed);
    }

    const elapsedSinceStart = (Date.now() - state.startedAt) / 1000;
    const previousElapsed = state.elapsedBeforePause ?? 0;
    const totalElapsed = previousElapsed + elapsedSinceStart;

    return Math.max(0, state.maxTimeSeconds - totalElapsed);
  }

  async isExpired(sessionId: string): Promise<boolean> {
    const remaining = await this.getRemainingTime(sessionId);
    return remaining !== null && remaining <= 0;
  }

  private async loadState(sessionId: string): Promise<TimerState | null> {
    const raw = await this.redis.get(`${TIMER_KEY_PREFIX}${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as TimerState;
  }

  private async saveState(sessionId: string, state: TimerState): Promise<void> {
    await this.redis.set(
      `${TIMER_KEY_PREFIX}${sessionId}`,
      JSON.stringify(state),
      TIMER_TTL,
    );
  }
}
