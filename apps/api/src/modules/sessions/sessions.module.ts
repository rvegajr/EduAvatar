import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { ExamGateway } from './gateway/exam.gateway';
import { ExamOrchestratorService } from './orchestrator/exam-orchestrator.service';
import { TimerService } from './timer/timer.service';
import { LockdownService } from './lockdown/lockdown.service';

@Module({
  providers: [
    SessionsService,
    ExamGateway,
    ExamOrchestratorService,
    TimerService,
    LockdownService,
  ],
  controllers: [SessionsController],
  exports: [SessionsService, ExamOrchestratorService, TimerService, LockdownService],
})
export class SessionsModule {}
