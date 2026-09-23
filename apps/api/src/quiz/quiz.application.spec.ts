import { BadRequestException, ConflictException } from '@nestjs/common';
import { MarkdownSourceService } from '../source/markdown-source.service';
import { InMemoryQuizSessionStore } from './in-memory-quiz.persistence';
import { QuizApplicationService } from './quiz.application';
import { QuizScoringService } from './quiz.scoring';
import { QuizQuestion } from './quiz.types';

describe('QuizApplicationService', () => {
  const questions: QuizQuestion[] = Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index}`,
    prompt: `Question ${index}`,
    type: 'single-choice',
    correctOptionId: 'a',
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
  }));
  const sourceService = { fetch: jest.fn().mockResolvedValue({ content: '# source' }) } as unknown as MarkdownSourceService;
  const store = new InMemoryQuizSessionStore();
  const generator = { generate: jest.fn().mockResolvedValue(questions) };
  const service = new QuizApplicationService(sourceService, new QuizScoringService(), store, generator);

  it('starts a session, advances its version, and returns a scored result', async () => {
    const session = await service.start('https://github.com/acme/docs/blob/main/README.md', 'TypeScript');
    expect(session.id).toEqual(expect.any(String));
    expect(session.version).toBe(0);

    const answer = { questionId: 'question-0', selectedOptionIds: ['a'] };
    const updated = await service.submit(session.id, answer, 0);
    expect(updated.version).toBe(1);
    expect((await service.result(session.id)).questionScores[0].score).toBe(4);
  });

  it('treats an identical repeated answer as idempotent', async () => {
    const session = await service.start('https://github.com/acme/docs/blob/main/README.md', 'TypeScript');
    const answer = { questionId: 'question-0', selectedOptionIds: ['a'] };
    await service.submit(session.id, answer, 0);

    await expect(service.submit(session.id, answer, 0)).resolves.toEqual(await service.get(session.id));
    expect((await service.get(session.id)).version).toBe(1);
  });

  it('rejects stale or conflicting submissions', async () => {
    const session = await service.start('https://github.com/acme/docs/blob/main/README.md', 'TypeScript');
    await service.submit(session.id, { questionId: 'question-0', selectedOptionIds: ['a'] }, 0);

    await expect(service.submit(session.id, { questionId: 'question-1', selectedOptionIds: ['a'] }, 0)).rejects.toThrow(ConflictException);
    await expect(service.submit(session.id, { questionId: 'question-0', selectedOptionIds: ['b'] }, 1)).rejects.toThrow(ConflictException);
  });

  it('rejects unknown questions and options', async () => {
    const session = await service.start('https://github.com/acme/docs/blob/main/README.md', 'TypeScript');
    await expect(service.submit(session.id, { questionId: 'missing', selectedOptionIds: [], }, 0)).rejects.toThrow(BadRequestException);
    await expect(service.submit(session.id, { questionId: 'question-0', selectedOptionIds: ['missing'], }, 0)).rejects.toThrow(BadRequestException);
  });
});