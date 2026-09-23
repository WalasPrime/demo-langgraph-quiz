import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const question = {
  id: 'q1',
  prompt: 'Which answer is correct?',
  type: 'single-choice' as const,
  options: [{ id: 'a', label: 'Correct choice' }, { id: 'b', label: 'Other choice' }],
};

const session = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1', sourceUrl: 'https://example.com/readme.md', topic: 'TypeScript',
  questions: [question], answers: [], status: 'active' as const, version: 0, ...overrides,
});

function response(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('quiz flow', () => {
  it('renders the initial quiz form', () => {
    render(<App />);
    expect(screen.getByText('Build your quiz')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Generate quiz' })).toBeDisabled();
  });

  it('shows a safe API error when starting fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ message: 'Source could not be fetched' }, false, 400)));
    render(<App />);
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'TypeScript' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }));
    expect(await screen.findByText('Source could not be fetched')).toBeInTheDocument();
    expect(screen.queryByText('Correct choice')).not.toBeInTheDocument();
  });

  it('selects and submits one question with the session version', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session()))
      .mockResolvedValueOnce(response(session({ status: 'completed', version: 1, answers: [{ questionId: 'q1', selectedOptionIds: ['a'] }] })))
      .mockResolvedValueOnce(response({ weightedAverage: 4, questionScores: [{ questionId: 'q1', score: 4, weight: 1 }] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'TypeScript' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }));
    expect(await screen.findByText('Which answer is correct?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Correct choice'));
    fireEvent.click(screen.getByRole('button', { name: 'Finish quiz' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ questionId: 'q1', selectedOptionIds: ['a'], version: 0 });
  });

  it('resumes the stored session on load', async () => {
    localStorage.setItem('toploox.quiz.sessionId', 'session-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(session())));
    render(<App />);
    expect(await screen.findByText('Which answer is correct?')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/quizzes/sessions/session-1', expect.anything());
  });

  it('renders the completed score and breakdown', async () => {
    const completed = session({ status: 'completed' });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(completed))
      .mockResolvedValueOnce(response({ weightedAverage: 3.5, questionScores: [{ questionId: 'q1', score: 3.5, weight: 1 }] })));
    localStorage.setItem('toploox.quiz.sessionId', 'session-1');
    render(<App />);
    expect(await screen.findByText('Quiz complete')).toBeInTheDocument();
    expect(screen.getByText('3.50')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start another quiz' })).toBeInTheDocument();
  });
});
