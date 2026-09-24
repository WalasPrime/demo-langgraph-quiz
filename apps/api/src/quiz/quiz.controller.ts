import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuizApplicationService } from './quiz.application';
import { quizAnswerSchema, startQuizSchema, QuizAnswerInput } from './quiz.schemas';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller('api/quizzes')
export class QuizController {
	constructor(private readonly quizzes: QuizApplicationService) {}

	@Post('graph')
	startGraph(@Body(new ZodValidationPipe(startQuizSchema)) body: { sourceUrl: string; topic: string }) {
		return this.quizzes.startGraph(body.sourceUrl, body.topic);
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
}
