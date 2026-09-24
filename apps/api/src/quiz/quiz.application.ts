import { Inject, Injectable } from '@nestjs/common';
import { QuizAnswer } from './quiz.types';
import { QuizSessionStore, QUIZ_SESSION_STORE } from './quiz.persistence';
import { LangGraphQuizWorkflow, PublicGraphState } from './langgraph-quiz.workflow';
import { sameAnswerSelection } from './quiz.validation';

@Injectable()
export class QuizApplicationService {
	constructor(
		@Inject(QUIZ_SESSION_STORE) private readonly store: QuizSessionStore,
		private readonly workflow: LangGraphQuizWorkflow,
	) {}

	async startGraph(sourceUrl: string, topic: string): Promise<PublicGraphState> {
		const state = await this.workflow.start(sourceUrl, topic);

		void this.workflow.run(state.sessionId);

		return this.workflow.toPublic(state);
	}

	async graphState(sessionId: string): Promise<PublicGraphState> {
		return this.workflow.toPublic(await this.workflow.state(sessionId));
	}

	async resumeGraph(sessionId: string, answer: QuizAnswer): Promise<PublicGraphState> {
		const state = await this.workflow.state(sessionId);
		const previous = state.answers.find((item) => item.questionId === answer.questionId);

		if (previous && sameAnswerSelection(previous, answer)) return this.workflow.toPublic(state);

		let projection = await this.store.get(sessionId);

		if (!projection) {
			projection = await this.store.create(state.finalUrl ?? state.sourceUrl, state.topic, state.questions, sessionId);
		}

		for (const previousAnswer of state.answers) {
			if (!projection.answers.some((item) => item.questionId === previousAnswer.questionId)) {
				projection = await this.store.submitAnswer(sessionId, previousAnswer, projection.version);
			}
		}

		const next = await this.workflow.resume(sessionId, answer);

		await this.store.submitAnswer(sessionId, answer, projection.version);

		if (next.status === 'completed' && next.score) await this.store.saveScore(sessionId, next.score);

		return this.workflow.toPublic(next);
	}
}
