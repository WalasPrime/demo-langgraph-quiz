import { InMemoryQuizSessionStore } from './in-memory-quiz.persistence';
import { QuizApplicationService } from './quiz.application';
import { QuizQuestion } from './quiz.types';

describe('QuizApplicationService', () => {
  const questions: QuizQuestion[] = Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index}`,
    prompt: `Question ${index}`,
    type: 'single-choice',
    correctOptionId: 'a',
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
  }));
  it('rebuilds the domain projection before resuming a graph session', async () => {
    const graphState = {
      sessionId: '00000000-0000-4000-8000-000000000001',
      sourceUrl: 'https://example.com/readme.md',
      finalUrl: 'https://example.com/readme.md',
      topic: 'TypeScript',
      questions,
      answers: [{ questionId: 'question-0', selectedOptionIds: ['a'] }],
    };
    const workflow = {
      state: jest.fn().mockResolvedValue(graphState),
      resume: jest.fn().mockResolvedValue({
        ...graphState,
        answers: [...graphState.answers, { questionId: 'question-1', selectedOptionIds: ['b'] }],
      }),
      toPublic: jest.fn((state) => state),
    };
    const graphStore = new InMemoryQuizSessionStore();
    const graphService = new QuizApplicationService(graphStore, workflow as any);

    await expect(
      graphService.resumeGraph(graphState.sessionId, { questionId: 'question-1', selectedOptionIds: ['b'] }),
    ).resolves.toEqual(expect.objectContaining({ sessionId: graphState.sessionId }));
    await expect(graphStore.get(graphState.sessionId)).resolves.toEqual(
      expect.objectContaining({
        answers: [
          { questionId: 'question-0', selectedOptionIds: ['a'] },
          { questionId: 'question-1', selectedOptionIds: ['b'] },
        ],
      }),
    );
  });

  it('reconciles a partially persisted projection before resuming', async () => {
    const sessionId = '00000000-0000-4000-8000-000000000002';
    const graphState = {
      sessionId,
      sourceUrl: 'https://example.com/readme.md',
      finalUrl: 'https://example.com/readme.md',
      topic: 'TypeScript',
      questions,
      answers: [{ questionId: 'question-0', selectedOptionIds: ['a'] }],
    };
    const graphStore = new InMemoryQuizSessionStore();
    await graphStore.create(graphState.sourceUrl, graphState.topic, questions, sessionId);
    const workflow = {
      state: jest.fn().mockResolvedValue(graphState),
      resume: jest.fn().mockResolvedValue({
        ...graphState,
        answers: [...graphState.answers, { questionId: 'question-1', selectedOptionIds: ['b'] }],
      }),
      toPublic: jest.fn((state) => state),
    };
    const graphService = new QuizApplicationService(graphStore, workflow as any);

    await graphService.resumeGraph(sessionId, { questionId: 'question-1', selectedOptionIds: ['b'] });

    await expect(graphStore.get(sessionId)).resolves.toEqual(
      expect.objectContaining({
        answers: [
          { questionId: 'question-0', selectedOptionIds: ['a'] },
          { questionId: 'question-1', selectedOptionIds: ['b'] },
        ],
        version: 2,
      }),
    );
  });
});
