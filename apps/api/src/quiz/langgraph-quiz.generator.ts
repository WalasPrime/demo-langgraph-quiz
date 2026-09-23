import { z } from 'zod';
import { quizQuestionSchema } from './quiz.schemas';

export const QUIZ_MODEL = Symbol('QUIZ_MODEL');
export interface QuizModel {
  withStructuredOutput(
    schema: z.ZodTypeAny,
    config: { method: 'jsonSchema'; name?: string; strict?: boolean },
  ): {
    invoke(input: unknown): Promise<unknown>;
  };
}

export const quizSchema = z
  .object({
    answerable: z.boolean(),
    reason: z.string(),
    questions: z.array(quizQuestionSchema).max(8),
  })
  .strict();
export const injectionSchema = z.object({ injectionDetected: z.boolean() }).strict();
