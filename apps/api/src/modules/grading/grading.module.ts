import { Module } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';
import { TranscriptionWorker } from './workers/transcription.worker';
import { AiEvaluationWorker } from './workers/ai-evaluation.worker';
import { IntegrityWorker } from './workers/integrity.worker';
import { NotificationWorker } from './workers/notification.worker';
import { QueueModule } from '../../common/queue/queue.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [QueueModule, SessionsModule],
  providers: [
    GradingService,
    TranscriptionWorker,
    AiEvaluationWorker,
    IntegrityWorker,
    NotificationWorker,
  ],
  controllers: [GradingController],
  exports: [GradingService],
})
export class GradingModule {}
