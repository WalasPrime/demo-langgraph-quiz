import { QuizAnswer, QuizSession } from './quiz.types';

export const QUIZ_SESSION_STORE = Symbol('QUIZ_SESSION_STORE');

export interface QuizSessionStore {
  create(sourceUrl: string, topic: string, questions: QuizSession['questions']): Promise<QuizSession>;
  get(sessionId: string): Promise<QuizSession | undefined>;
  submitAnswer(sessionId: string, answer: QuizAnswer, version: number): Promise<QuizSession>;
  saveScore(sessionId: string, score: QuizSession['score']): Promise<QuizSession>;
}