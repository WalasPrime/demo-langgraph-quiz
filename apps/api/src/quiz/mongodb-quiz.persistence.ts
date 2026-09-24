import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection } from 'mongodb';
import { AppConfig } from '../config/configuration';
import { QuizAnswer, QuizQuestion, QuizScore, QuizSession } from './quiz.types';
import { QuizSessionStore } from './quiz.persistence';
import { randomUUID } from 'node:crypto';
import { quizSessionSchema } from './quiz.schemas';
import { MongoClientProvider } from './mongo-client';
import { sameAnswerSelection } from './quiz.validation';

interface QuizDocument {
	_id: string;
	sourceUrl: string;
	topic: string;
	questions: QuizQuestion[];
	answers: QuizAnswer[];
	status: QuizSession['status'];
	version: number;
	score?: QuizScore;
}

@Injectable()
export class MongoQuizSessionStore implements QuizSessionStore {
	private collectionPromise?: Promise<Collection<QuizDocument>>;

	constructor(
		private readonly config: ConfigService<AppConfig, true>,
		private readonly mongo: MongoClientProvider,
	) {}

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

		await (await this.collection()).insertOne(this.toDocument(session));

		return session;
	}

	async get(sessionId: string): Promise<QuizSession | undefined> {
		const document = await (await this.collection()).findOne({ _id: sessionId });

		return document ? this.fromDocument(document) : undefined;
	}

	async submitAnswer(sessionId: string, answer: QuizAnswer, version: number): Promise<QuizSession> {
		const collection = await this.collection();
		const current = await collection.findOne({ _id: sessionId });

		if (!current)
			throw new NotFoundException('Quiz session not found');

		const previous = current.answers.find((item) => item.questionId === answer.questionId);
		const selectedOptionIds = [...answer.selectedOptionIds].sort();

		if (previous && sameAnswerSelection(previous, answer))
			return this.fromDocument(current);

		if (current.version !== version)
			throw new ConflictException('Quiz session version is stale');

		if (previous)
			throw new ConflictException('Question has already been answered');

		const update = await collection.updateOne(
			{ _id: sessionId, version, 'answers.questionId': { $ne: answer.questionId } },
			{ $push: { answers: { questionId: answer.questionId, selectedOptionIds } }, $inc: { version: 1 } },
		);

		if (update.modifiedCount !== 1)
			throw new ConflictException('Quiz session changed during answer submission');

		return this.fromDocument((await collection.findOne({ _id: sessionId }))!);
	}

	async saveScore(sessionId: string, score: QuizScore): Promise<QuizSession> {
		const collection = await this.collection();
		const result = await collection.findOneAndUpdate(
			{ _id: sessionId },
			{ $set: { score: { ...score, questionScores: [...score.questionScores] }, status: 'completed' } },
			{ returnDocument: 'after' },
		);

		if (!result)
			throw new NotFoundException('Quiz session not found');

		return this.fromDocument(result);
	}

	private async collection(): Promise<Collection<QuizDocument>> {
		this.collectionPromise ??= this.connect();

		return this.collectionPromise;
	}

	private async connect(): Promise<Collection<QuizDocument>> {
		const client = await this.mongo.get();

		return client.db(this.config.getOrThrow('MONGODB_DB')).collection<QuizDocument>('quiz_sessions');
	}

	private toDocument(session: QuizSession): QuizDocument {
		const parsed = quizSessionSchema.parse(session);

		return {
			_id: parsed.id,
			sourceUrl: parsed.sourceUrl,
			topic: parsed.topic,
			questions: [...parsed.questions],
			answers: [...parsed.answers],
			status: parsed.status,
			version: parsed.version,
			score: parsed.score,
		};
	}

	private fromDocument(document: QuizDocument): QuizSession {
		return quizSessionSchema.parse({
			id: document._id,
			sourceUrl: document.sourceUrl,
			topic: document.topic,
			questions: document.questions,
			answers: document.answers,
			status: document.status,
			version: document.version,
			score: document.score ?? undefined,
		});
	}
}
