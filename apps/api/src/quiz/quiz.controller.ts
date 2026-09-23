import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuizApplicationService } from './quiz.application';
import { PublicQuizSession } from './quiz.types';
import { StartQuizDto, SubmitAnswerDto } from './quiz.contracts';

@Controller('api/quizzes')
export class QuizController {
  constructor(private readonly quizzes: QuizApplicationService) {}

  @Post()
  start(@Body() body: StartQuizDto) {
    return this.quizzes.start(body.sourceUrl, body.topic).then(toPublicSession);
  }

  @Get('sessions/:sessionId')
  get(@Param('sessionId') sessionId: string) {
    return this.quizzes.get(sessionId).then(toPublicSession);
  }

  @Post('sessions/:sessionId/answers')
  submit(@Param('sessionId') sessionId: string, @Body() body: SubmitAnswerDto) {
    return this.quizzes.submit(sessionId, body, body.version).then(toPublicSession);
  }

  @Get('sessions/:sessionId/result')
  result(@Param('sessionId') sessionId: string) {
    return this.quizzes.result(sessionId);
  }
}

function toPublicSession(session: Awaited<ReturnType<QuizApplicationService['get']>>): PublicQuizSession {
  return {
    ...session,
    questions: session.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      options: question.options,
    })),
  };
}