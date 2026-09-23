import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Annotation, Command, END, interrupt, START, StateGraph } from '@langchain/langgraph';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { MarkdownSourceService } from '../source/markdown-source.service';
import { QUIZ_MODEL, QuizModel, quizSchema } from './langgraph-quiz.generator';
import { QuizGraphCheckpointer } from './langgraph-checkpointer';
import { QuizScoringService } from './quiz.scoring';
import { quizAnswerSchema, quizQuestionsSchema, quizScoreSchema, publicQuizQuestionSchema } from './quiz.schemas';
import { QuizAnswer, QuizQuestion, QuizScore } from './quiz.types';

const graphState = Annotation.Root({
  sessionId: Annotation<string>(),
  sourceUrl: Annotation<string>(),
  finalUrl: Annotation<string>(),
  topic: Annotation<string>(),
  markdown: Annotation<string>(),
  questions: Annotation<QuizQuestion[]>({ reducer: (_, value) => value, default: () => [] }),
  answers: Annotation<QuizAnswer[]>({ reducer: (_, value) => value, default: () => [] }),
  pendingAnswer: Annotation<QuizAnswer | undefined>({ reducer: (_, value) => value, default: () => undefined }),
  score: Annotation<QuizScore | undefined>({ reducer: (_, value) => value, default: () => undefined }),
  status: Annotation<GraphStatus>({ reducer: (_, value) => value, default: () => 'starting' }),
  runRequested: Annotation<boolean>({ reducer: (_, value) => value, default: () => false }),
  runningAt: Annotation<string | undefined>({ reducer: (_, value) => value, default: () => undefined }),
  updatedAt: Annotation<string>({ reducer: (_, value) => value, default: () => new Date().toISOString() }),
  error: Annotation<GraphError | undefined>({ reducer: (_, value) => value, default: () => undefined }),
});

type GraphStatus = 'pending' | 'running' | 'starting' | 'fetching' | 'generating' | 'awaiting_answer' | 'grading' | 'completed' | 'error';
interface GraphError { code: string; message: string; }

export const quizAnswerResumeSchema = quizAnswerSchema;
export const publicGraphStateSchema = z.object({
  id: z.string().uuid(),
  sourceUrl: z.string().url(),
  topic: z.string().min(1),
  finalUrl: z.string().url().optional(),
  questions: z.array(publicQuizQuestionSchema),
  answers: z.array(quizAnswerSchema),
  status: z.enum(['pending', 'running', 'starting', 'fetching', 'generating', 'awaiting_answer', 'grading', 'completed', 'error']),
  runningAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  currentQuestionIndex: z.number().int().min(0).optional(),
  score: quizScoreSchema.optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
}).strict();

export type PublicGraphState = z.infer<typeof publicGraphStateSchema>;
export type GraphState = typeof graphState.State;
type Graph = any;

@Injectable()
export class LangGraphQuizWorkflow {
  private graphPromise?: Promise<Graph>;

  constructor(
    private readonly sourceService: MarkdownSourceService,
    private readonly checkpointer: QuizGraphCheckpointer,
    private readonly scoring: QuizScoringService,
    @Inject(QUIZ_MODEL) private readonly model: QuizModel,
  ) {}

  async start(sourceUrl: string, topic: string): Promise<GraphState> {
    const sessionId = randomUUID();
    const graph = await this.graph();
    await graph.invoke({ sessionId, sourceUrl, topic, status: 'pending', runRequested: false, updatedAt: new Date().toISOString() }, this.config(sessionId));
    return this.state(sessionId);
  }

  async run(sessionId: string): Promise<GraphState> {
    try {
      const current = await this.state(sessionId);
      if (current.status !== 'pending') return current;
      const graph = await this.graph();
      await graph.invoke({ runRequested: true, updatedAt: new Date().toISOString() }, this.config(sessionId));
      return this.state(sessionId);
    } catch (error) {
      await this.fail(sessionId, error);
      return this.state(sessionId);
    }
  }

  private async fail(sessionId: string, error: unknown): Promise<void> {
    const graph = await this.graph();
    await graph.updateState(this.config(sessionId), {
      status: 'error',
      updatedAt: new Date().toISOString(),
      error: this.safeError(error, 'WORKFLOW_FAILED'),
    });
  }

  async resume(sessionId: string, answer: QuizAnswer): Promise<GraphState> {
    quizAnswerResumeSchema.parse(answer);
    const graph = await this.graph();
    const current = await this.state(sessionId);
    if (current.status !== 'awaiting_answer') throw new BadRequestException('Quiz is not waiting for an answer');
    await graph.invoke(new Command({ resume: answer }), this.config(sessionId));
    return this.state(sessionId);
  }

  async state(sessionId: string): Promise<GraphState> {
    const snapshot = await (await this.graph()).getState(this.config(sessionId));
    if (!snapshot?.values?.sessionId) throw new NotFoundException('Quiz session not found');
    return snapshot.values as GraphState;
  }

  toPublic(state: GraphState): PublicGraphState {
    return publicGraphStateSchema.parse({
      id: state.sessionId,
      sourceUrl: state.sourceUrl,
      topic: state.topic,
      finalUrl: state.finalUrl,
      questions: state.questions.map((question) => this.publicQuestion(question)),
      answers: state.answers,
      status: state.status,
      runningAt: state.runningAt,
      updatedAt: state.updatedAt,
      currentQuestionIndex: state.status === 'awaiting_answer' ? state.answers.length : undefined,
      score: state.score,
      error: state.error,
    });
  }

  private config(sessionId: string): { configurable: { thread_id: string } } {
    return { configurable: { thread_id: sessionId } };
  }

  private async graph(): Promise<Graph> {
    this.graphPromise ??= this.createGraph();
    return this.graphPromise;
  }

  private async createGraph(): Promise<Graph> {
    const saver = await this.checkpointer.get();
    const structuredModel = this.model.withStructuredOutput(quizSchema, { method: 'jsonSchema' });
    return new StateGraph(graphState)
      .addNode('initialize', async (state: GraphState) => state.sessionId ? { updatedAt: new Date().toISOString() } : { status: 'pending', updatedAt: new Date().toISOString() })
      .addNode('markRunning', async () => ({ status: 'running', runningAt: new Date().toISOString(), updatedAt: new Date().toISOString() }))
      .addNode('fetchMarkdown', async (state: GraphState) => {
        try {
          const source = await this.sourceService.fetch(state.sourceUrl);
          return { finalUrl: source.finalUrl, markdown: source.content, status: 'generating', updatedAt: new Date().toISOString(), error: undefined };
        } catch (error) {
          return { status: 'error', updatedAt: new Date().toISOString(), error: this.safeError(error, 'SOURCE_FETCH_FAILED') };
        }
      })
      .addNode('generateQuiz', async (state: GraphState) => {
        try {
          const result = quizSchema.parse(await structuredModel.invoke(this.prompt(state.markdown, state.topic)));
          this.validateQuestions(result.questions);
          return { questions: result.questions, status: 'awaiting_answer', updatedAt: new Date().toISOString(), error: undefined };
        } catch (error) {
          return { status: 'error', updatedAt: new Date().toISOString(), error: this.safeError(error, 'QUIZ_GENERATION_FAILED') };
        }
      })
      .addNode('awaitAnswer', async (state: GraphState) => ({
        pendingAnswer: quizAnswerResumeSchema.parse(interrupt({
          type: 'answer_required',
          sessionId: state.sessionId,
          question: this.publicQuestion(state.questions[state.answers.length]),
          questionIndex: state.answers.length,
          totalQuestions: state.questions.length,
        })),
        status: 'grading',
        updatedAt: new Date().toISOString(),
      }))
      .addNode('gradeAnswer', async (state: GraphState) => {
        try {
          const answer = quizAnswerResumeSchema.parse(state.pendingAnswer);
          const question = state.questions[state.answers.length];
          if (!question || question.id !== answer.questionId) throw new BadRequestException('Answer is not for the current question');
          if (answer.selectedOptionIds.some((id) => !question.options.some((option) => option.id === id))) throw new BadRequestException('Answer contains an unknown option');
          const answers = [...state.answers, answer];
          return { answers, pendingAnswer: undefined, status: answers.length === state.questions.length ? 'completed' : 'awaiting_answer', updatedAt: new Date().toISOString(), score: answers.length === state.questions.length ? this.scoring.scoreQuiz(state.questions, answers) : undefined };
        } catch (error) {
          return { status: 'error', updatedAt: new Date().toISOString(), error: this.safeError(error, 'ANSWER_REJECTED') };
        }
      })
      .addEdge(START, 'initialize')
      .addConditionalEdges('initialize', (state: GraphState) => state.runRequested ? 'markRunning' : END)
      .addEdge('markRunning', 'fetchMarkdown')
      .addConditionalEdges('fetchMarkdown', (state: GraphState) => state.status === 'error' ? END : 'generateQuiz')
      .addConditionalEdges('generateQuiz', (state: GraphState) => state.status === 'error' ? END : 'awaitAnswer')
      .addEdge('awaitAnswer', 'gradeAnswer')
      .addConditionalEdges('gradeAnswer', (state: GraphState) => state.status === 'awaiting_answer' ? 'awaitAnswer' : END)
      .compile({ checkpointer: saver });
  }

  private prompt(markdown: string, topic: string): string {
    return `Create a short quiz about "${topic}" using only this Markdown source. Generate 5-8 questions. Every question must have exactly four unique options. Use single-choice with one correctOptionId or multi-choice with requiredOptionIds.\n\nMARKDOWN:\n${markdown}`;
  }

  private publicQuestion(question: QuizQuestion | undefined): unknown {
    if (!question) throw new BadRequestException('No question is available');
    return {
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      options: question.options,
    };
  }

  private validateQuestions(questions: readonly QuizQuestion[]): void {
    quizQuestionsSchema.parse(questions);
    const ids = new Set<string>();
    for (const question of questions) {
      if (ids.has(question.id) || new Set(question.options.map((option) => option.id)).size !== 4) throw new Error('Generated quiz has duplicate question or option IDs');
      ids.add(question.id);
    }
  }

  private safeError(error: unknown, code: string): GraphError {
    return { code, message: error instanceof Error ? error.message : 'Quiz workflow failed' };
  }
}
