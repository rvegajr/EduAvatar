import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export const QUEUE_NAMES = {
  TRANSCRIPTION: 'transcription',
  AI_EVALUATION: 'ai-evaluation',
  INTEGRITY_ANALYSIS: 'integrity-analysis',
  NOTIFICATION: 'notification',
} as const;

const BLPOP_TIMEOUT = 5;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private shuttingDown = false;

  constructor(private redis: RedisService) {}

  async enqueue(queueName: string, jobData: any): Promise<void> {
    const payload = JSON.stringify({
      id: `${queueName}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      data: jobData,
      enqueuedAt: new Date().toISOString(),
    });
    await this.redis.client.rpush(`queue:${queueName}`, payload);
    this.logger.log(`Enqueued job on [${queueName}]`);
  }

  async dequeue(queueName: string): Promise<any | null> {
    const result = await this.redis.client.blpop(`queue:${queueName}`, BLPOP_TIMEOUT);
    if (!result) return null;
    const [, payload] = result;
    return JSON.parse(payload);
  }

  startWorker(
    queueName: string,
    handler: (data: any) => Promise<void>,
  ): void {
    this.logger.log(`Starting worker for queue [${queueName}]`);

    const poll = async () => {
      while (!this.shuttingDown) {
        try {
          const job = await this.dequeue(queueName);
          if (!job) continue;

          this.logger.log(`Processing job ${job.id} from [${queueName}]`);
          await handler(job.data);
          this.logger.log(`Completed job ${job.id} from [${queueName}]`);
        } catch (error) {
          this.logger.error(
            `Error processing job from [${queueName}]: ${error.message}`,
            error.stack,
          );
        }
      }
      this.logger.log(`Worker for [${queueName}] stopped`);
    };

    poll();
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
  }
}
