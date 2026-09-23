import { MemorySaver } from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';
import { LangGraphQuizQuestionGenerator } from './langgraph-quiz.generator';

describe('LangGraphQuizQuestionGenerator', () => {
  const validQuestions = Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index}`,
    prompt: `Question ${index}`,
    type: 'single-choice' as const,
    correctOptionId: 'a',
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
  }));
  const config = { getOrThrow: jest.fn((key: string) => key === 'QUIZ_GENERATION_RETRIES' ? 1 : undefined) } as unknown as ConfigService<any, true>;
  const checkpointer = { get: jest.fn().mockResolvedValue(new MemorySaver()) };

  it('repairs invalid structured output without a live provider call', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest.fn()
          .mockResolvedValueOnce({ questions: validQuestions.slice(0, 4) })
          .mockResolvedValueOnce({ questions: validQuestions }),
      }),
    };
    const generator = new LangGraphQuizQuestionGenerator(config, checkpointer as never, model);

    await expect(generator.generate('# source', 'TypeScript', '00000000-0000-4000-8000-000000000001')).resolves.toHaveLength(5);
    const invoke = model.withStructuredOutput.mock.results[0].value.invoke;
    expect(model.withStructuredOutput).toHaveBeenCalledWith(expect.anything(), { method: 'jsonSchema' });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][0]).toContain('previous output was invalid');
  });
});