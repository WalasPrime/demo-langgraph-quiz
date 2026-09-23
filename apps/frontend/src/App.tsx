import { useEffect, useState } from 'react';
import { api } from './api';
import {
  Body1, Button, Card, CardHeader, Checkbox, Divider, Field, FluentProvider,
  Input, MessageBar, MessageBarBody, MessageBarTitle, ProgressBar, Radio,
  RadioGroup, Spinner, Title1, Title2, Title3, createLightTheme, type BrandVariants,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, CheckmarkCircleRegular, DismissCircleRegular, TrophyRegular } from '@fluentui/react-icons';
import type { QuizResult, QuizSession } from './api/types';

const brandRamp: BrandVariants = {
  10: '#061625', 20: '#0A253B', 30: '#0E3856', 40: '#124A70',
  50: '#155A8A', 60: '#1769AA', 70: '#2E78B4', 80: '#4788BF',
  90: '#5F98C9', 100: '#77A8D2', 110: '#8FB8DC', 120: '#A7C7E5',
  130: '#BED6EC', 140: '#D5E4F3', 150: '#E9F2F9', 160: '#F5FAFD',
};
const theme = createLightTheme(brandRamp);
const SESSION_STORAGE_KEY = 'toploox.quiz.sessionId';
type View = 'setup' | 'loading' | 'active' | 'completed' | 'error';

export function App(): JSX.Element {
  const [view, setView] = useState<View>('setup');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [sourceUrl, setSourceUrl] = useState('https://github.com/pipecatai/pipecat/blob/main/README.md');
  const [topic, setTopic] = useState('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (error: unknown): void => {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to reach the quiz service.');
    setView('error');
  };

  const openSession = (nextSession: QuizSession): void => {
    setSession(nextSession);
    localStorage.setItem(SESSION_STORAGE_KEY, nextSession.id);
    setSelectedOptionIds([]);
    if (nextSession.status === 'completed') {
      void api.getResult(nextSession.id).then(setResult).then(() => setView('completed')).catch(showError);
    } else {
      setView('active');
    }
  };

  const startQuiz = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setView('loading');
    setErrorMessage(null);
    void api.startQuiz(sourceUrl, topic.trim()).then(openSession).catch(showError);
  };

  const resumeQuiz = (): void => {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    setView('loading');
    void api.getSession(sessionId).then(openSession).catch(showError);
  };

  useEffect(() => {
    resumeQuiz();
  }, []);

  const restart = (): void => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setResult(null);
    setSelectedOptionIds([]);
    setErrorMessage(null);
    setView('setup');
  };

  return (
    <FluentProvider theme={theme} className="app-shell">
      <header className="app-header">
        <div className="brand-lockup"><div className="brand-mark"><CheckmarkCircleRegular /></div><div><span className="eyebrow">Knowledge check</span><Title1>Build your quiz</Title1></div></div>
        {session && <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={restart}>Restart</Button>}
      </header>

      <main>
        {view === 'setup' && <SetupForm sourceUrl={sourceUrl} topic={topic} onSourceUrlChange={setSourceUrl} onTopicChange={setTopic} onSubmit={startQuiz} />}
        {view === 'loading' && <LoadingState />}
        {view === 'error' && <ErrorState message={errorMessage ?? 'Unable to reach the quiz service.'} onRetry={session ? resumeQuiz : () => setView('setup')} />}
        {view === 'active' && session && <QuizView session={session} selectedOptionIds={selectedOptionIds} onSelectionChange={setSelectedOptionIds} onSubmit={(answer) => {
          setView('loading');
          void api.submitAnswer(session.id, answer, session.version).then(openSession).catch(showError);
        }} />}
        {view === 'completed' && session && result && <ResultView session={session} result={result} onRestart={restart} />}
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

function QuizView({ session, selectedOptionIds, onSelectionChange, onSubmit }: { session: QuizSession; selectedOptionIds: string[]; onSelectionChange: (ids: string[]) => void; onSubmit: (answer: { questionId: string; selectedOptionIds: string[] }) => void }): JSX.Element {
  const questionIndex = session.questions.findIndex((question) => !session.answers.some((answer) => answer.questionId === question.id));
  const question = session.questions[questionIndex] ?? session.questions[session.questions.length - 1];
  const choose = (optionId: string, checked: boolean): void => {
    onSelectionChange(checked ? [...selectedOptionIds, optionId] : selectedOptionIds.filter((id) => id !== optionId));
  };
  return <Card className="question-card"><div className="question-meta"><span>Question {questionIndex + 1} of {session.questions.length}</span><span>{question.type === 'multi-choice' ? 'Select all that apply' : 'Select one answer'}</span></div><ProgressBar value={(questionIndex + 1) / session.questions.length} /><Title2>{question.prompt}</Title2>{question.type === 'single-choice' ? <RadioGroup value={selectedOptionIds[0] ?? ''} onChange={(_, data) => onSelectionChange(data.value ? [data.value] : [])}>{question.options.map((option) => <Radio key={option.id} value={option.id} label={option.label} />)}</RadioGroup> : <div className="option-list">{question.options.map((option) => <Checkbox key={option.id} label={option.label} checked={selectedOptionIds.includes(option.id)} onChange={(_, data) => choose(option.id, data.checked === true)} />)}</div>}<Button appearance="primary" disabled={selectedOptionIds.length === 0} onClick={() => onSubmit({ questionId: question.id, selectedOptionIds })}>{questionIndex === session.questions.length - 1 ? 'Finish quiz' : 'Submit answer'}</Button></Card>;
}

function LoadingState(): JSX.Element {
  return <Card className="state-card"><Spinner label="Loading quiz..." /></Card>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
  return <MessageBar intent="error"><DismissCircleRegular /><MessageBarBody><MessageBarTitle>We couldn&apos;t load the quiz</MessageBarTitle><div>{message}</div><Button appearance="primary" onClick={onRetry}>Try again</Button></MessageBarBody></MessageBar>;
}

function ResultView({ session, result, onRestart }: { session: QuizSession; result: QuizResult; onRestart: () => void }): JSX.Element {
  return <Card className="result-card"><div className="result-heading"><TrophyRegular /><div><span className="eyebrow">Quiz complete</span><Title2>{session.topic}</Title2></div></div><div className="score"><strong>{result.weightedAverage.toFixed(2)}</strong><span>out of 4 weighted average</span></div><Title3>Score breakdown</Title3><div className="breakdown">{result.questionScores.map((score, index) => <div className="breakdown-row" key={score.questionId}><span>Question {index + 1}</span><strong>{score.score.toFixed(2)} / 4</strong><span>Weight {score.weight.toFixed(2)}</span></div>)}</div><Button appearance="primary" onClick={onRestart}>Start another quiz</Button></Card>;
}
