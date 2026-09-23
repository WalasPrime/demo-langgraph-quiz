import { z } from 'zod';

const quizOptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
  })
  .strict();

const singleChoiceQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.literal('single-choice'),
    options: z.array(quizOptionSchema).length(4),
    correctOptionId: z.string().min(1),
  })
  .strict();

const multiChoiceQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.literal('multi-choice'),
    options: z.array(quizOptionSchema).length(4),
    requiredOptionIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const quizQuestionSchema = z.discriminatedUnion('type', [singleChoiceQuestionSchema, multiChoiceQuestionSchema]);
export const quizQuestionsSchema = z.array(quizQuestionSchema).min(5).max(8);

export const quizAnswerSchema = z
  .object({
    questionId: z.string().min(1),
    selectedOptionIds: z.array(z.string().min(1)).max(4),
  })
  .strict();

export const questionScoreSchema = z
  .object({
    questionId: z.string().min(1),
    score: z.number().finite().min(0),
    weight: z.number().finite().positive(),
  })
  .strict();

export const quizScoreSchema = z
  .object({
    weightedAverage: z.number().finite().min(0),
    questionScores: z.array(questionScoreSchema),
  })
  .strict();

export const quizSessionSchema = z
  .object({
    id: z.string().uuid(),
    sourceUrl: z.string().url(),
    topic: z.string().min(1),
    questions: quizQuestionsSchema,
    answers: z.array(quizAnswerSchema),
    status: z.enum(['active', 'completed']),
    version: z.number().int().min(0),
    score: quizScoreSchema.optional(),
  })
  .strict();

export const publicQuizQuestionSchema = z.discriminatedUnion('type', [
  singleChoiceQuestionSchema.omit({ correctOptionId: true }),
  multiChoiceQuestionSchema.omit({ requiredOptionIds: true }),
]);

export const publicQuizSessionSchema = quizSessionSchema
  .extend({
    questions: z.array(publicQuizQuestionSchema).min(5).max(8),
  })
  .strict();

export const startQuizSchema = z
  .object({
    sourceUrl: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'), 'sourceUrl must use HTTPS'),
    topic: z.string().min(1),
  })
  .strict();

export const submitAnswerSchema = quizAnswerSchema.extend({ version: z.number().int().min(0) }).strict();

export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type QuizQuestionsInput = z.infer<typeof quizQuestionsSchema>;
export type QuizAnswerInput = z.infer<typeof quizAnswerSchema>;
export type QuestionScoreInput = z.infer<typeof questionScoreSchema>;
export type QuizScoreInput = z.infer<typeof quizScoreSchema>;
export type QuizSessionInput = z.infer<typeof quizSessionSchema>;
export type PublicQuizQuestionInput = z.infer<typeof publicQuizQuestionSchema>;
export type PublicQuizSessionInput = z.infer<typeof publicQuizSessionSchema>;
export type StartQuizInput = z.infer<typeof startQuizSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type QuizGenerationInput = z.infer<typeof quizQuestionsSchema>;
