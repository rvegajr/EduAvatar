import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ExamsModule } from './modules/exams/exams.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { RubricsModule } from './modules/rubrics/rubrics.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { GradingModule } from './modules/grading/grading.module';
import { LtiModule } from './modules/lti/lti.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';
import { AiModule } from './common/ai/ai.module';
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AiModule,
    QueueModule,
    AuthModule,
    LtiModule,
    CoursesModule,
    ExamsModule,
    QuestionsModule,
    MaterialsModule,
    RubricsModule,
    SessionsModule,
    GradingModule,
    NotificationsModule,
  ],
})
export class AppModule {}
