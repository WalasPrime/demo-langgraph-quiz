import { Injectable } from '@nestjs/common';
import {
  QuizAnswer,
  QuizQuestion,
  QuizScore,
  QuestionScore,
} from './quiz.types';

@Injectable()
export class QuizScoringService {
  scoreAnswer(question: QuizQuestion, answer: QuizAnswer | undefined): number {
    const selectedOptionIds = new Set(answer?.selectedOptionIds ?? []);

    if (question.type === 'single-choice') {
      return selectedOptionIds.size === 1 && selectedOptionIds.has(question.correctOptionId)
        ? 4
        : 0;
    }

    return question.requiredOptionIds.reduce(
      (score, optionId) => score + (selectedOptionIds.has(optionId) ? 1 : 0),
      0,
    );
  }

  scoreQuiz(questions: readonly QuizQuestion[], answers: readonly QuizAnswer[]): QuizScore {
    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const questionScores: QuestionScore[] = questions.map((question, index) => ({
      questionId: question.id,
      score: this.scoreAnswer(question, answersByQuestionId.get(question.id)),
      weight: 1.0 * 1.1 ** index,
    }));
    const totalWeight = questionScores.reduce((sum, item) => sum + item.weight, 0);
    const weightedAverage =
      questionScores.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;

    return { questionScores, weightedAverage };
  }
}