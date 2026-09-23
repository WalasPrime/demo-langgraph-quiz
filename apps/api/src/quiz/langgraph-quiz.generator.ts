import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { AppConfig } from '../config/configuration';
import { QuizQuestionGenerator } from './quiz.orchestration';
import { QuizQuestion as DomainQuestion } from './quiz.types';
import { QuizGraphCheckpointer } from './langgraph-checkpointer';
import { createHash } from 'node:crypto';

export const QUIZ_MODEL = Symbol('QUIZ_MODEL');
export interface StructuredQuizModel { invoke(input: string): Promise<unknown>; }

const optionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
const questionSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1), prompt: z.string().min(1), type: z.literal('single-choice'), options: z.array(optionSchema).length(4), correctOptionId: z.string().min(1) }),
  z.object({ id: z.string().min(1), prompt: z.string().min(1), type: z.literal('multi-choice'), options: z.array(optionSchema).length(4), requiredOptionIds: z.array(z.string().min(1)).min(1) }),
]);
export const quizSchema = z.object({ questions: z.array(questionSchema).min(5).max(8) });
const graphState = Annotation.Root({ markdown: Annotation<string>(), topic: Annotation<string>(), repair: Annotation<string>(), output: Annotation<unknown>() });

@Injectable()
export class LangGraphQuizQuestionGenerator implements QuizQuestionGenerator {
  private graphPromise?: Promise<any>;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly checkpointer: QuizGraphCheckpointer,
    @Inject(QUIZ_MODEL) private readonly model: StructuredQuizModel,
  ) {}

  async generate(markdown: string, topic: string, threadId?: string): Promise<readonly DomainQuestion[]> {
    const workflowThreadId = threadId ?? createHash('sha256').update(`${topic}\0${markdown}`).digest('hex');
    const graph = await this.graph();
    let repair = '';
    let lastError = 'No valid quiz generated';
    for (let attempt = 0; attempt <= this.config.getOrThrow('QUIZ_GENERATION_RETRIES'); attempt += 1) {
      const state = await graph.invoke({ markdown, topic, repair }, { configurable: { thread_id: workflowThreadId } });
      const parsed = quizSchema.safeParse(state.output);
      if (parsed.success) {
        try {
          this.validateDomain(parsed.data.questions as readonly DomainQuestion[]);
          return parsed.data.questions as readonly DomainQuestion[];
        } catch (error) {
          lastError = (error as Error).message;
          repair = `The previous output was invalid: ${lastError}. Return a complete corrected quiz with 5-8 questions.`;
          continue;
        }
      }
      lastError = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      repair = `The previous output was invalid: ${lastError}. Return a complete corrected quiz with 5-8 questions.`;
    }
    throw new BadRequestException(`Quiz generation failed validation after bounded retries: ${lastError}`);
  }

  private async graph(): Promise<any> {
    this.graphPromise ??= this.createGraph();
    return this.graphPromise;
  }

  private async createGraph(): Promise<any> {
    const saver = await this.checkpointer.get();
    return new StateGraph(graphState)
      .addNode('generate', async (state) => ({ output: await this.model.invoke(this.prompt(state.markdown, state.topic, state.repair)) }))
      .addEdge(START, 'generate')
      .addEdge('generate', END)
      .compile({ checkpointer: saver });
  }

  private prompt(markdown: string, topic: string, repair: string): string {
    return `Create a short quiz about "${topic}" using only this Markdown source. Generate 5-8 questions. Every question must have exactly four unique options. Use single-choice with one correctOptionId or multi-choice with requiredOptionIds. ${repair}\n\nMARKDOWN:\n${markdown}`;
  }

  private validateDomain(questions: readonly DomainQuestion[]): void {
    const ids = new Set<string>();
    for (const question of questions) {
      if (ids.has(question.id) || new Set(question.options.map((option) => option.id)).size !== 4) throw new Error('Generated quiz has duplicate question or option IDs');
      ids.add(question.id);
      const optionIds = new Set(question.options.map((option) => option.id));
      if (question.type === 'single-choice' && !optionIds.has(question.correctOptionId)) throw new Error('Generated single-choice answer is invalid');
      if (question.type === 'multi-choice' && question.requiredOptionIds.some((id) => !optionIds.has(id))) throw new Error('Generated multi-choice answer is invalid');
    }
  }
}