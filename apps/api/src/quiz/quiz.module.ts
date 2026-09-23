import { Module } from '@nestjs/common';
import { QuizScoringService } from './quiz.scoring';
import { QuizController } from './quiz.controller';
import { QuizApplicationService } from './quiz.application';
import { QUIZ_SESSION_STORE } from './quiz.persistence';
import { MarkdownSourceService } from '../source/markdown-source.service';
import { MongoQuizSessionStore } from './mongodb-quiz.persistence';
import { LangGraphQuizQuestionGenerator, QUIZ_MODEL } from './langgraph-quiz.generator';
import { QuizGraphCheckpointer } from './langgraph-checkpointer';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { QUIZ_QUESTION_GENERATOR } from './quiz.orchestration';
import { LangGraphQuizWorkflow } from './langgraph-quiz.workflow';

@Module({
  controllers: [QuizController],
  providers: [
    QuizScoringService,
    QuizApplicationService,
    MarkdownSourceService,
    MongoQuizSessionStore,
    QuizGraphCheckpointer,
    LangGraphQuizQuestionGenerator,
    LangGraphQuizWorkflow,
    { provide: QUIZ_QUESTION_GENERATOR, useExisting: LangGraphQuizQuestionGenerator },
    {
      provide: QUIZ_MODEL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new ChatOpenAI({
          apiKey: config.getOrThrow('OPENAI_API_KEY'),
          model: config.getOrThrow('OPENAI_MODEL'),
          timeout: config.getOrThrow('OPENAI_TIMEOUT_MS'),
          maxTokens: config.getOrThrow('OPENAI_MAX_TOKENS'),
          configuration: { baseURL: config.getOrThrow('OPENAI_BASE_URL') },
        }),
    },
    { provide: QUIZ_SESSION_STORE, useExisting: MongoQuizSessionStore },
  ],
  exports: [QuizScoringService, QuizApplicationService],
})
export class QuizModule {}
