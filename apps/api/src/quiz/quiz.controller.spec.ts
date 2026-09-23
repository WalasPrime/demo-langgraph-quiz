import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StartQuizDto, SubmitAnswerDto } from './quiz.contracts';
import { QuizController } from './quiz.controller';

describe('quiz request contracts', () => {
  it('rejects malformed start and answer payloads through the same validation pipe configuration', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    const startPayload = plainToInstance(StartQuizDto, { sourceUrl: 'http://localhost', topic: '' });
    const answerPayload = plainToInstance(SubmitAnswerDto, { questionId: '', selectedOptionIds: ['a'], version: -1 });

    await expect(pipe.transform(startPayload, { type: 'body', metatype: StartQuizDto })).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform(answerPayload, { type: 'body', metatype: SubmitAnswerDto })).rejects.toBeInstanceOf(BadRequestException);
    expect(await validate(startPayload)).not.toHaveLength(0);
  });

  it('delegates REST transitions to the application service', async () => {
    const service = {
      start: jest.fn().mockResolvedValue({ id: 'session' }),
      get: jest.fn().mockResolvedValue({ id: 'session', sourceUrl: 'https://example.com', topic: 'TypeScript', questions: [], answers: [], status: 'active', version: 0 }),
      submit: jest.fn().mockResolvedValue({ version: 1, questions: [], answers: [], id: 'session', sourceUrl: 'https://example.com', topic: 'TypeScript', status: 'active' }),
      result: jest.fn().mockResolvedValue({ weightedAverage: 4 }),
    };
    const controller = new QuizController(service as never);

    service.start.mockResolvedValue({ id: 'session', sourceUrl: 'https://example.com', topic: 'TypeScript', questions: [], answers: [], status: 'active', version: 0 });
    await expect(controller.start({ sourceUrl: 'https://example.com/readme.md', topic: 'TypeScript' })).resolves.toEqual(expect.objectContaining({ id: 'session' }));
    await expect(controller.get('session')).resolves.toEqual(expect.objectContaining({ id: 'session' }));
    await expect(controller.submit('session', { questionId: 'q', selectedOptionIds: ['a'], version: 0 })).resolves.toEqual(expect.objectContaining({ version: 1 }));
    await expect(controller.result('session')).resolves.toEqual({ weightedAverage: 4 });
    expect(service.submit).toHaveBeenCalledWith('session', { questionId: 'q', selectedOptionIds: ['a'], version: 0 }, 0);
  });
});