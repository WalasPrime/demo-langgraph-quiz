import { QuizScoringService } from './quiz.scoring';
import { QuizQuestion } from './quiz.types';

describe('QuizScoringService', () => {
  const service = new QuizScoringService();

  it('scores single-choice answers as 4 or 0', () => {
    const question: QuizQuestion = {
      id: 'single',
      prompt: 'Pick one',
      options: [],
      type: 'single-choice',
      correctOptionId: 'b',
    };

    expect(service.scoreAnswer(question, { questionId: 'single', selectedOptionIds: ['b'] })).toBe(4);
    expect(service.scoreAnswer(question, { questionId: 'single', selectedOptionIds: ['a'] })).toBe(0);
    expect(service.scoreAnswer(question, { questionId: 'single', selectedOptionIds: ['b', 'a'] })).toBe(0);
  });

  it('awards one point per selected required multi-choice option without penalties', () => {
    const question: QuizQuestion = {
      id: 'multi',
      prompt: 'Pick all that apply',
      options: [],
      type: 'multi-choice',
      requiredOptionIds: ['a', 'c', 'd'],
    };

    expect(
      service.scoreAnswer(question, { questionId: 'multi', selectedOptionIds: ['a', 'x', 'a'] }),
    ).toBe(1);
    expect(
      service.scoreAnswer(question, { questionId: 'multi', selectedOptionIds: ['a', 'c', 'd', 'x'] }),
    ).toBe(3);
  });

  it('uses geometric weights for the weighted average', () => {
    const questions: QuizQuestion[] = [
      { id: 'first', prompt: '', options: [], type: 'single-choice', correctOptionId: 'a' },
      { id: 'second', prompt: '', options: [], type: 'single-choice', correctOptionId: 'a' },
    ];

    const result = service.scoreQuiz(questions, [
      { questionId: 'first', selectedOptionIds: ['a'] },
      { questionId: 'second', selectedOptionIds: ['b'] },
    ]);

    expect(result.questionScores.map(({ weight }) => weight)).toEqual([1, 1.1]);
    expect(result.weightedAverage).toBeCloseTo(4 / 2.1);
  });
});