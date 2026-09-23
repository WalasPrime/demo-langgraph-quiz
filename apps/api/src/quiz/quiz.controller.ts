import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuizApplicationService } from './quiz.application';
import { PublicQuizSession } from './quiz.types';
import { startQuizSchema, submitAnswerSchema, StartQuizInput, SubmitAnswerInput } from './quiz.contracts';
import { ZodValidationPipe } from './zod-validation.pipe';
import { publicQuizSessionSchema, quizAnswerSchema, quizScoreSchema, QuizAnswerInput } from './quiz.schemas';

@Controller('api/quizzes')
export class QuizController {
  constructor(private readonly quizzes: QuizApplicationService) {}

  @Post()
  start(@Body(new ZodValidationPipe(startQuizSchema)) body: StartQuizInput) {
    return this.quizzes.start(body.sourceUrl, body.topic).then(toPublicSession);
  }

  @Post('graph')
  startGraph(@Body(new ZodValidationPipe(startQuizSchema)) body: StartQuizInput) {
    return this.quizzes.startGraph(body.sourceUrl, body.topic);
  }

  @Get('sessions/:sessionId')
  get(@Param('sessionId') sessionId: string) {
    return this.quizzes.get(sessionId).then(toPublicSession);
  }

  @Get('sessions/:sessionId/graph')
  graphState(@Param('sessionId') sessionId: string) {
    return this.quizzes.graphState(sessionId);
  }

  @Post('sessions/:sessionId/graph/resume')
  resumeGraph(
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(quizAnswerSchema)) body: QuizAnswerInput,
  ) {
    return this.quizzes.resumeGraph(sessionId, body);
  }

  @Post('sessions/:sessionId/answers')
  submit(
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(submitAnswerSchema)) body: SubmitAnswerInput,
  ) {
    return this.quizzes.submit(sessionId, body, body.version).then(toPublicSession);
  }

  @Get('sessions/:sessionId/result')
  result(@Param('sessionId') sessionId: string) {
    return this.quizzes.result(sessionId).then((score) => quizScoreSchema.parse(score));
  }
}

function toPublicSession(session: Awaited<ReturnType<QuizApplicationService['get']>>): PublicQuizSession {
  return publicQuizSessionSchema.parse({
    ...session,
    questions: session.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      options: question.options,
    })),
  });
}
