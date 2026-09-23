import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/configuration';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { QuizModule } from './quiz/quiz.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateConfig,
    }),
    QuizModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
