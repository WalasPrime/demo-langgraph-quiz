import { BadRequestException } from '@nestjs/common';
import { quizAnswerSchema, startQuizSchema } from './quiz.schemas';
import { QuizController } from './quiz.controller';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('quiz request contracts', () => {
  it('rejects malformed start and answer payloads through the same validation pipe configuration', async () => {
    const startPipe = new ZodValidationPipe(startQuizSchema);
    const answerPipe = new ZodValidationPipe(quizAnswerSchema);
    const startPayload = { sourceUrl: 'http://localhost', topic: '' };
    const answerPayload = { questionId: '', selectedOptionIds: [] };

    expect(() => startPipe.transform(startPayload, { type: 'body' })).toThrow(BadRequestException);
    expect(() => answerPipe.transform(answerPayload, { type: 'body' })).toThrow(BadRequestException);
  });

  it('delegates graph REST transitions to the application service', async () => {
    const service = {
      startGraph: jest.fn().mockResolvedValue({ status: 'pending' }),
      graphState: jest.fn().mockResolvedValue({ status: 'awaiting_answer' }),
      resumeGraph: jest.fn().mockResolvedValue({ status: 'awaiting_answer' }),
    };
    const controller = new QuizController(service as never);
    const start = { sourceUrl: 'https://example.com/readme.md', topic: 'TypeScript' };
    const answer = { questionId: 'question-0', selectedOptionIds: ['a'] };

    await expect(controller.startGraph(start)).resolves.toEqual({ status: 'pending' });
    await expect(controller.graphState('session-id')).resolves.toEqual({ status: 'awaiting_answer' });
    await expect(controller.resumeGraph('session-id', answer)).resolves.toEqual({ status: 'awaiting_answer' });
    expect(service.startGraph).toHaveBeenCalledWith(start.sourceUrl, start.topic);
    expect(service.graphState).toHaveBeenCalledWith('session-id');
    expect(service.resumeGraph).toHaveBeenCalledWith('session-id', answer);
  });
});
