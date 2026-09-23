import { QuizAnswer, QuizQuestion, QuizScore, QuizSession } from './quiz.types';

export const QUIZ_SESSION_STORE = Symbol('QUIZ_SESSION_STORE');

export interface QuizSessionStore {
  create(sourceUrl: string, topic: string, questions: readonly QuizQuestion[], sessionId?: string): Promise<QuizSession>;
  get(sessionId: string): Promise<QuizSession | undefined>;
  submitAnswer(sessionId: string, answer: QuizAnswer, version: number): Promise<QuizSession>;
  saveScore(sessionId: string, score: QuizScore): Promise<QuizSession>;
}