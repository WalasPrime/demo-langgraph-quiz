import { BadRequestException } from '@nestjs/common';
import { startQuizSchema, submitAnswerSchema } from './quiz.contracts';
import { QuizController } from './quiz.controller';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('quiz request contracts', () => {
  it('rejects malformed start and answer payloads through the same validation pipe configuration', async () => {
    const startPipe = new ZodValidationPipe(startQuizSchema);
    const answerPipe = new ZodValidationPipe(submitAnswerSchema);
    const startPayload = { sourceUrl: 'http://localhost', topic: '' };
    const answerPayload = { questionId: '', selectedOptionIds: ['a'], version: -1 };

    expect(() => startPipe.transform(startPayload, { type: 'body' })).toThrow(BadRequestException);
    expect(() => answerPipe.transform(answerPayload, { type: 'body' })).toThrow(BadRequestException);
  });

  it('delegates REST transitions to the application service', async () => {
    const session = {
      id: '00000000-0000-4000-8000-000000000001',
      sourceUrl: 'https://example.com',
      topic: 'TypeScript',
      questions: Array.from({ length: 5 }, (_, index) => ({
        id: `q${index}`,
        prompt: 'Question',
        type: 'single-choice' as const,
        options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
        correctOptionId: 'a',
      })),
      answers: [],
      status: 'active' as const,
      version: 0,
    };
    const service = {
      start: jest.fn().mockResolvedValue(session),
      get: jest.fn().mockResolvedValue(session),
      submit: jest.fn().mockResolvedValue({ ...session, version: 1 }),
      result: jest.fn().mockResolvedValue({ weightedAverage: 4, questionScores: [] }),
    };
    const controller = new QuizController(service as never);

    await expect(controller.start({ sourceUrl: 'https://example.com/readme.md', topic: 'TypeScript' })).resolves.toEqual(expect.objectContaining({ id: session.id }));
    await expect(controller.get(session.id)).resolves.toEqual(expect.objectContaining({ id: session.id }));
    await expect(controller.submit(session.id, { questionId: 'q', selectedOptionIds: ['a'], version: 0 })).resolves.toEqual(expect.objectContaining({ version: 1 }));
    await expect(controller.result(session.id)).resolves.toEqual({ weightedAverage: 4, questionScores: [] });
    expect(service.submit).toHaveBeenCalledWith(session.id, { questionId: 'q', selectedOptionIds: ['a'], version: 0 }, 0);
  });
});