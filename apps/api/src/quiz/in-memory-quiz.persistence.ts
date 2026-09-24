import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QuizAnswer, QuizQuestion, QuizScore, QuizSession } from './quiz.types';
import { QuizSessionStore } from './quiz.persistence';
import { sameAnswerSelection } from './quiz.validation';

@Injectable()
export class InMemoryQuizSessionStore implements QuizSessionStore {
	private readonly sessions = new Map<string, QuizSession>();

	async create(
		sourceUrl: string,
		topic: string,
		questions: readonly QuizQuestion[],
		sessionId = randomUUID(),
	): Promise<QuizSession> {
		const session: QuizSession = {
			id: sessionId,
			sourceUrl,
			topic,
			questions: [...questions],
			answers: [],
			status: 'active',
			version: 0,
		};

		this.sessions.set(session.id, session);

		return session;
	}

	async get(sessionId: string): Promise<QuizSession | undefined> {
		return this.sessions.get(sessionId);
	}

	async submitAnswer(sessionId: string, answer: QuizAnswer, version: number): Promise<QuizSession> {
		const session = this.sessions.get(sessionId);

		if (!session) throw new NotFoundException('Quiz session not found');

		const previous = session.answers.find((item) => item.questionId === answer.questionId);

		if (previous && sameAnswerSelection(previous, answer)) return session;

		if (session.version !== version) throw new ConflictException('Quiz session version is stale');

		if (previous) throw new ConflictException('Question has already been answered');

		const updated: QuizSession = { ...session, answers: [...session.answers, answer], version: session.version + 1 };

		this.sessions.set(sessionId, updated);

		return updated;
	}

	async saveScore(sessionId: string, score: QuizScore): Promise<QuizSession> {
		const session = this.sessions.get(sessionId);

		if (!session) throw new NotFoundException('Quiz session not found');

		const updated = {
			...session,
			score: { ...score, questionScores: [...score.questionScores] },
			status: 'completed' as const,
		};

		this.sessions.set(sessionId, updated);

		return updated;
	}
}
