import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import {
  Body1, Button, Card, CardHeader, Checkbox, Divider, Field, FluentProvider,
  Input, MessageBar, MessageBarBody, MessageBarTitle, ProgressBar, Radio,
  RadioGroup, Spinner, Title1, Title2, Title3, createLightTheme, type BrandVariants,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, CheckmarkCircleRegular, DismissCircleRegular, TrophyRegular } from '@fluentui/react-icons';
import type { PublicGraphState } from './api/types';

const brandRamp: BrandVariants = {
  10: '#061625', 20: '#0A253B', 30: '#0E3856', 40: '#124A70',
  50: '#155A8A', 60: '#1769AA', 70: '#2E78B4', 80: '#4788BF',
  90: '#5F98C9', 100: '#77A8D2', 110: '#8FB8DC', 120: '#A7C7E5',
  130: '#BED6EC', 140: '#D5E4F3', 150: '#E9F2F9', 160: '#F5FAFD',
};
const theme = createLightTheme(brandRamp);
type View = 'setup' | 'loading' | 'active' | 'completed' | 'error';
const POLL_INTERVAL_MS = 1000;

function sessionIdFromLocation(): string | null {
  const match = window.location.pathname.match(/^\/quiz\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function App(): JSX.Element {
  const [view, setView] = useState<View>('setup');
  const [graphState, setGraphState] = useState<PublicGraphState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => sessionIdFromLocation());
  const [pollNonce, setPollNonce] = useState(0);
  const [sourceUrl, setSourceUrl] = useState('https://raw.githubusercontent.com/pipecat-ai/pipecat/refs/heads/main/README.md');
  const [topic, setTopic] = useState('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<number | undefined>(undefined);

  const showError = (error: unknown): void => {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to reach the quiz service.');
    setView('error');
  };

  const openState = (nextState: PublicGraphState): void => {
    setGraphState(nextState);
    setSelectedOptionIds([]);
    if (nextState.status === 'completed') setView('completed');
    else if (nextState.status === 'awaiting_answer') setView('active');
    else if (nextState.status === 'error') {
      setErrorMessage(nextState.error?.message ?? 'Quiz generation failed.');
      setView('error');
    } else setView('loading');
  };

  const startQuiz = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setView('loading');
    setErrorMessage(null);
    void api.startGraph(sourceUrl, topic.trim()).then((state) => {
      window.history.pushState({}, '', `/quiz/${encodeURIComponent(state.id)}`);
      setSessionId(state.id);
      openState(state);
    }).catch(showError);
  };

  useEffect(() => {
    const onPopState = (): void => setSessionId(sessionIdFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setGraphState(null);
      setView('setup');
      return;
    }
    let cancelled = false;
    const poll = (): void => {
      void api.getGraphState(sessionId).then((state) => {
        if (cancelled) return;
        openState(state);
        if (['pending', 'running', 'starting', 'fetching', 'generating', 'grading'].includes(state.status)) {
          pollTimer.current = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      }).catch((error: unknown) => {
        if (!cancelled) showError(error);
      });
    };
    setView('loading');
    poll();
    return () => {
      cancelled = true;
      if (pollTimer.current !== undefined) window.clearTimeout(pollTimer.current);
    };
  }, [sessionId, pollNonce]);

  const restart = (): void => {
    if (pollTimer.current !== undefined) window.clearTimeout(pollTimer.current);
    window.history.pushState({}, '', '/');
    setSessionId(null);
    setGraphState(null);
    setSelectedOptionIds([]);
    setErrorMessage(null);
    setView('setup');
  };

  return (
    <FluentProvider theme={theme} className="app-shell">
      <header className="app-header">
        <div className="brand-lockup"><div className="brand-mark"><CheckmarkCircleRegular /></div><div><span className="eyebrow">Knowledge check</span><Title1>Build your quiz</Title1></div></div>
        {sessionId && <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={restart}>Restart</Button>}
      </header>

      <main>
        {view === 'setup' && <SetupForm sourceUrl={sourceUrl} topic={topic} onSourceUrlChange={setSourceUrl} onTopicChange={setTopic} onSubmit={startQuiz} />}
        {view === 'loading' && <LoadingState />}
        {view === 'error' && <ErrorState message={errorMessage ?? 'Unable to reach the quiz service.'} onRetry={() => sessionId ? setPollNonce((value) => value + 1) : setView('setup')} />}
        {view === 'active' && graphState && <QuizView state={graphState} selectedOptionIds={selectedOptionIds} onSelectionChange={setSelectedOptionIds} onSubmit={(answer) => {
          setView('loading');
          if (pollTimer.current !== undefined) window.clearTimeout(pollTimer.current);
          void api.resumeGraph(graphState.id, answer).then(openState).catch(showError);
        }} />}
        {view === 'completed' && graphState?.score && <ResultView state={graphState} onRestart={restart} />}
      </main>

      <footer className="app-footer">
        <Divider />
        <span>Quiz questions are generated from your source and scored by the quiz service.</span>
      </footer>
    </FluentProvider>
  );
}

function SetupForm({ sourceUrl, topic, onSourceUrlChange, onTopicChange, onSubmit }: { sourceUrl: string; topic: string; onSourceUrlChange: (value: string) => void; onTopicChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }): JSX.Element {
  return <Card className="setup-card"><CardHeader header={<Title2>Start a new quiz</Title2>} description={<Body1>Choose a Markdown source and the topic you want to explore.</Body1>} /><form onSubmit={onSubmit} className="quiz-form"><Field label="Markdown source URL" required hint="Use an HTTPS URL to a README or Markdown document."><Input type="url" required value={sourceUrl} onChange={(_, data) => onSourceUrlChange(data.value)} /></Field><Field label="Topic" required><Input required value={topic} onChange={(_, data) => onTopicChange(data.value)} placeholder="For example, async JavaScript" /></Field><Button appearance="primary" type="submit" disabled={!sourceUrl.trim() || !topic.trim()}>Generate quiz</Button></form></Card>;
}

function QuizView({ state, selectedOptionIds, onSelectionChange, onSubmit }: { state: PublicGraphState; selectedOptionIds: string[]; onSelectionChange: (ids: string[]) => void; onSubmit: (answer: { questionId: string; selectedOptionIds: string[] }) => void }): JSX.Element {
  const questionIndex = state.currentQuestionIndex ?? state.answers.length;
  const question = state.questions[questionIndex] ?? state.questions[state.questions.length - 1];
  const choose = (optionId: string, checked: boolean): void => {
    onSelectionChange(checked ? [...selectedOptionIds, optionId] : selectedOptionIds.filter((id) => id !== optionId));
  };
  return <Card className="question-card"><div className="question-meta"><span>Question {questionIndex + 1} of {state.questions.length}</span><span>{question.type === 'multi-choice' ? 'Select all that apply' : 'Select one answer'}</span></div><ProgressBar value={(questionIndex + 1) / state.questions.length} /><Title2>{question.prompt}</Title2>{question.type === 'single-choice' ? <RadioGroup value={selectedOptionIds[0] ?? ''} onChange={(_, data) => onSelectionChange(data.value ? [data.value] : [])}>{question.options.map((option) => <Radio key={option.id} value={option.id} label={option.label} />)}</RadioGroup> : <div className="option-list">{question.options.map((option) => <Checkbox key={option.id} label={option.label} checked={selectedOptionIds.includes(option.id)} onChange={(_, data) => choose(option.id, data.checked === true)} />)}</div>}<Button appearance="primary" disabled={selectedOptionIds.length === 0} onClick={() => onSubmit({ questionId: question.id, selectedOptionIds })}>{questionIndex === state.questions.length - 1 ? 'Finish quiz' : 'Submit answer'}</Button></Card>;
}

function LoadingState(): JSX.Element {
  return <Card className="state-card"><Spinner label="Loading quiz..." /></Card>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
  return <MessageBar intent="error"><DismissCircleRegular /><MessageBarBody><MessageBarTitle>We couldn&apos;t load the quiz</MessageBarTitle><div>{message}</div><Button appearance="primary" onClick={onRetry}>Try again</Button></MessageBarBody></MessageBar>;
}

function ResultView({ state, onRestart }: { state: PublicGraphState; onRestart: () => void }): JSX.Element {
  const result = state.score!;
  return <Card className="result-card"><div className="result-heading"><TrophyRegular /><div><span className="eyebrow">Quiz complete</span><Title2>{state.topic}</Title2></div></div><div className="score"><strong>{result.weightedAverage.toFixed(2)}</strong><span>out of 4 weighted average</span></div><Title3>Score breakdown</Title3><div className="breakdown">{result.questionScores.map((score, index) => <div className="breakdown-row" key={score.questionId}><span>Question {index + 1}</span><strong>{score.score.toFixed(2)} / 4</strong><span>Weight {score.weight.toFixed(2)}</span></div>)}</div><Button appearance="primary" onClick={onRestart}>Start another quiz</Button></Card>;
}
