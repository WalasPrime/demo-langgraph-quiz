import { QuizQuestion } from './quiz.types';

export const QUIZ_QUESTION_GENERATOR = Symbol('QUIZ_QUESTION_GENERATOR');

export interface QuizQuestionGenerator {
  generate(markdown: string, topic: string, threadId?: string): Promise<readonly QuizQuestion[]>;
}
