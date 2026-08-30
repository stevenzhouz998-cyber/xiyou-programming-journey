import { describe, expect, it, vi } from 'vitest';
import { createMissionSession } from '../progress/session';

const session = createMissionSession('w3-m4', '2026-08-28T00:00:00.000Z');
vi.mock('../context/ProgressContext', () => ({
  useProgress: () => ({
    saveStatus: 'idle',
    progress: { sessions: { 'w3-m4': session }, abilities: { conditionObservation: { acquiredAt: 'x', stableUnlockedAt: 'x' } } },
    updateMissionSession: async (_id: string, update: any) => ({ status: 'saved', progress: { sessions: { 'w3-m4': update(session) } } }),
    createBackup: () => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' }),
    reloadExternalProgress: () => null,
  }),
}));
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { WeekThreeBajieJoiningRouteBoundary } from './MissionPageContent';

describe('W3-M4 lazy route', () => {
  afterEach(cleanup);
  it('uses the default statically analyzable loader to load the formal Experience', async () => {
    render(<WeekThreeBajieJoiningRouteBoundary reducedMotion muted onComplete={() => true} />);
    expect(await screen.findByText('原著情境·八戒归队')).toBeInTheDocument();
  });

  it('renders an injected formal experience inside the isolated route boundary', async () => {
    render(
      <WeekThreeBajieJoiningRouteBoundary
        reducedMotion
        muted
        onComplete={() => true}
        loader={async () => ({ default: () => <p>formal-bajie</p> })}
      />,
    );

    expect(await screen.findByText('formal-bajie')).toBeInTheDocument();
    expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
  });

  it('retries only its own experience chunk after a loading failure', async () => {
    const RecoveredExperience = () => <p>formal-bajie-recovered</p>;
    const loader = vi.fn<() => Promise<{ default: typeof RecoveredExperience }>>()
      .mockRejectedValueOnce(new Error('chunk unavailable'))
      .mockResolvedValueOnce({ default: RecoveredExperience });
    render(<WeekThreeBajieJoiningRouteBoundary reducedMotion muted onComplete={() => true} loader={loader} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('八戒归队条件任务加载失败');
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
    expect(await screen.findByText('formal-bajie-recovered')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('uses injected full-page retry for a failing production-default lazy module, not local remounting', async () => {
    const reloadPage = vi.fn();
    vi.resetModules();
    vi.doMock('./WeekThreeBajieJoiningExperience', () => ({
      WeekThreeBajieJoiningExperience: () => { throw new Error('production chunk unavailable'); },
    }));
    const { WeekThreeBajieJoiningRouteBoundary: DefaultRoute } = await import('./MissionPageContent');
    render(<DefaultRoute reducedMotion muted onComplete={() => true} reloadPage={reloadPage} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('八戒归队条件任务加载失败');
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    vi.doUnmock('./WeekThreeBajieJoiningExperience');
  });
});
