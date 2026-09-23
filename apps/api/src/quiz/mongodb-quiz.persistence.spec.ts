import { ConfigService } from '@nestjs/config';
import { MongoQuizSessionStore } from './mongodb-quiz.persistence';
import { QuizQuestion } from './quiz.types';

describe('MongoQuizSessionStore', () => {
  const questions: QuizQuestion[] = Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: 'Question',
    type: 'single-choice' as const,
    correctOptionId: 'a',
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
  }));
  const document = {
    _id: '00000000-0000-4000-8000-000000000001',
    sourceUrl: 'https://example.com/readme.md',
    topic: 'TypeScript',
    questions,
    answers: [],
    status: 'active' as const,
    version: 0,
  };

  it('persists and idempotently replays an answer across store instances', async () => {
    const collection = {
      insertOne: jest.fn(),
      findOne: jest
        .fn()
        .mockResolvedValueOnce(document)
        .mockResolvedValueOnce({ ...document, answers: [{ questionId: 'q1', selectedOptionIds: ['a'] }], version: 1 }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const config = {
      getOrThrow: jest.fn((key: string) => (key === 'MONGODB_URI' ? 'mongodb://localhost:27017/toploox' : 'toploox')),
    } as unknown as ConfigService<any, true>;
    const mongo = { get: jest.fn() } as never;
    const first = new MongoQuizSessionStore(config, mongo);
    const second = new MongoQuizSessionStore(config, mongo);
    (first as any).collectionPromise = Promise.resolve(collection);
    (second as any).collectionPromise = Promise.resolve({
      ...collection,
      findOne: jest
        .fn()
        .mockResolvedValue({ ...document, answers: [{ questionId: 'q1', selectedOptionIds: ['a'] }], version: 1 }),
    });

    const created = await first.create(document.sourceUrl, document.topic, questions);
    const answered = await first.submitAnswer(created.id, { questionId: 'q1', selectedOptionIds: ['a'] }, 0);
    const resumed = await second.submitAnswer(created.id, { questionId: 'q1', selectedOptionIds: ['a'] }, 0);

    expect(created.version).toBe(0);
    expect(answered.version).toBe(1);
    expect(resumed.version).toBe(1);
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
  });
});
