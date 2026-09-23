import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MarkdownSourceService } from '../source/markdown-source.service';
import { QuizScoringService } from './quiz.scoring';
import { QuizAnswer, QuizQuestion, QuizScore, QuizSession } from './quiz.types';
import { QuizSessionStore, QUIZ_SESSION_STORE } from './quiz.persistence';
import { QUIZ_QUESTION_GENERATOR, QuizQuestionGenerator } from './quiz.orchestration';

@Injectable()
export class QuizApplicationService {
  constructor(
    private readonly sourceService: MarkdownSourceService,
    private readonly scoring: QuizScoringService,
    @Inject(QUIZ_SESSION_STORE) private readonly store: QuizSessionStore,
    @Inject(QUIZ_QUESTION_GENERATOR) private readonly generator: QuizQuestionGenerator,
  ) {}

  async start(sourceUrl: string, topic: string): Promise<QuizSession> {
    const source = await this.sourceService.fetch(sourceUrl);
    const questions = await this.generator.generate(source.content, topic);
    this.validateQuestions(questions);
    return this.store.create(source.finalUrl, topic, questions);
  }

  async get(sessionId: string): Promise<QuizSession> {
    const session = await this.store.get(sessionId);
    if (!session) throw new NotFoundException('Quiz session not found');
    return session;
  }

  async submit(sessionId: string, answer: QuizAnswer, version: number): Promise<QuizSession> {
    const session = await this.get(sessionId);
    if (!session.questions.some((question) => question.id === answer.questionId)) throw new BadRequestException('Question does not belong to this quiz');
    const question = session.questions.find((item) => item.id === answer.questionId)!;
    if (answer.selectedOptionIds.some((id) => !question.options.some((option) => option.id === id))) throw new BadRequestException('Answer contains an unknown option');
    return this.store.submitAnswer(sessionId, answer, version);
  }

  async result(sessionId: string): Promise<QuizScore> {
    const session = await this.get(sessionId);
    const score = this.scoring.scoreQuiz(session.questions, session.answers);
    await this.store.saveScore(sessionId, score);
    return score;
  }

  private validateQuestions(questions: readonly QuizQuestion[]): void {
    if (questions.length < 5 || questions.length > 8) throw new BadRequestException('Quiz must contain between five and eight questions');
    const ids = new Set<string>();
    for (const question of questions) {
      if (ids.has(question.id) || question.options.length !== 4 || new Set(question.options.map((option) => option.id)).size !== 4) throw new BadRequestException('Quiz questions must have unique IDs and four unique options');
      ids.add(question.id);
      if (question.type === 'single-choice' && !question.options.some((option) => option.id === question.correctOptionId)) throw new BadRequestException('Single-choice questions need a valid correct option');
      if (question.type === 'multi-choice' && (!question.requiredOptionIds?.length || new Set(question.requiredOptionIds).size !== question.requiredOptionIds.length || question.requiredOptionIds.some((id) => !question.options.some((option) => option.id === id)))) throw new BadRequestException('Multi-choice questions need valid required options');
    }
  }
}