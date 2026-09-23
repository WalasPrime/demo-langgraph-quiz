import { useEffect, useState } from 'react';
import {
  Avatar,
  Body1,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Caption1,
  Divider,
  FluentProvider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  Tab,
  TabList,
  Title1,
  Title3,
  Toolbar,
  ToolbarButton,
  createLightTheme,
  type BrandVariants,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  CodeRegular,
  DismissCircleRegular,
  GlobeDesktopRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { api } from './api';
import { previewState, setPreviewState, type PreviewDataState } from './api/previewState';
import type { HealthResponse } from './api/types';

const brandRamp: BrandVariants = {
  10: '#061625', 20: '#0A253B', 30: '#0E3856', 40: '#124A70',
  50: '#155A8A', 60: '#1769AA', 70: '#2E78B4', 80: '#4788BF',
  90: '#5F98C9', 100: '#77A8D2', 110: '#8FB8DC', 120: '#A7C7E5',
  130: '#BED6EC', 140: '#D5E4F3', 150: '#E9F2F9', 160: '#F5FAFD',
};
const theme = createLightTheme(brandRamp);
const states: PreviewDataState[] = ['data', 'loading', 'empty', 'error'];

type LoadState = 'loading' | 'error' | 'empty' | 'data';

export function App(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHealth = (): void => {
    setLoadState('loading');
    setErrorMessage(null);
    void api.getHealth().then((result) => {
      if (result === null) {
        setHealth(null);
        setLoadState('empty');
        return;
      }
      setHealth(result);
      setLoadState('data');
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reach the API.');
      setLoadState('error');
    });
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <FluentProvider theme={theme} className="app-shell">
      <header className="app-header">
        <Toolbar>
          <div className="brand-lockup">
            <Avatar icon={<GlobeDesktopRegular />} color="brand" size={32} />
            <div>
              <Caption1 className="eyebrow">Local service console</Caption1>
              <Title1>Service Health</Title1>
            </div>
          </div>
          <ToolbarButton icon={<ArrowClockwiseRegular />} onClick={loadHealth} aria-label="Refresh health">
            Refresh health
          </ToolbarButton>
        </Toolbar>
        <TabList selectedValue="health" aria-label="Service console navigation">
          <Tab value="health" icon={<CheckmarkCircleRegular />}>Health overview</Tab>
        </TabList>
      </header>

      <main>
        <Card className="overview-card" appearance="filled-alternative">
          <CardHeader
            header={<Title3>Runtime status, at a glance</Title3>}
            description={<Body1>Track the React shell and NestJS API baseline from one quiet surface.</Body1>}
          />
          <div className="status-strip">
            <CheckmarkCircleRegular />
            <strong>{loadState === 'data' ? 'All local services responding' : 'Health check needs attention'}</strong>
            <span>Updated just now</span>
          </div>
        </Card>

        {loadState === 'loading' && <LoadingState />}
        {loadState === 'error' && <ErrorState message={errorMessage ?? 'Unable to reach the API.'} onRetry={loadHealth} />}
        {loadState === 'empty' && <EmptyState onRetry={loadHealth} />}
        {loadState === 'data' && <HealthGrid health={health} />}
      </main>

      <footer className="app-footer">
        <Divider />
        <Caption1>Direct exposure · Docker Compose · No persistence</Caption1>
      </footer>
      {import.meta.env.DEV && <PreviewSwitcher state={previewState} />}
    </FluentProvider>
  );
}

function HealthGrid({ health }: { health: HealthResponse | null }): JSX.Element {
  return (
    <section className="health-grid" aria-label="Service status">
      <StatusCard title="API" icon={<CodeRegular />} status="Operational" endpoint="GET /api/health" detail={health ? `{ status: \"${health.status}\", service: \"${health.service}\" }` : 'No response'} />
      <StatusCard title="Frontend" icon={<GlobeDesktopRegular />} status="Operational" endpoint="http://localhost:5173" detail="React shell loaded" />
      <StatusCard title="API wiring" icon={<WarningRegular />} status="Pending" statusTone="warning" endpoint="Browser fetch placeholder" detail="Ready for the integration step." />
    </section>
  );
}

function StatusCard({ title, icon, status, statusTone = 'success', endpoint, detail }: { title: string; icon: JSX.Element; status: string; statusTone?: 'success' | 'warning'; endpoint: string; detail: string }): JSX.Element {
  return (
    <Card className="status-card">
      <CardHeader image={<Avatar icon={icon} color="neutral" />} header={<Title3>{title}</Title3>} description={<span className={`status status-${statusTone}`}>{status}</span>} />
      <div className="endpoint">{endpoint}</div>
      <Body1 className="muted">{detail}</Body1>
      <CardFooter><Caption1>Local development</Caption1></CardFooter>
    </Card>
  );
}

function LoadingState(): JSX.Element {
  return <Card className="state-card"><Skeleton><div className="skeleton-row" /></Skeleton><Skeleton><div className="skeleton-row short" /></Skeleton></Card>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
  return <MessageBar intent="error"><DismissCircleRegular /><MessageBarBody><MessageBarTitle>API unavailable</MessageBarTitle>{message}<Button appearance="primary" onClick={onRetry}>Retry</Button></MessageBarBody></MessageBar>;
}

function EmptyState({ onRetry }: { onRetry: () => void }): JSX.Element {
  return <Card className="state-card empty-state"><WarningRegular /><Title3>No health response yet</Title3><Body1 className="muted">The mock state returned an empty result.</Body1><Button appearance="primary" onClick={onRetry}>Check again</Button></Card>;
}

function PreviewSwitcher({ state }: { state: PreviewDataState }): JSX.Element {
  return <div className="preview-switcher" aria-label="Preview data state"><span>Preview</span>{states.map((candidate) => <Button key={candidate} size="small" appearance={candidate === state ? 'primary' : 'secondary'} onClick={() => setPreviewState(candidate)}>{candidate}</Button>)}</div>;
}
