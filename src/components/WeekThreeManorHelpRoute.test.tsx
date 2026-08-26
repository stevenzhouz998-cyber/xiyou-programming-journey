import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import {
  MissionPageContent,
  WeekThreeManorHelpRouteBoundary,
} from './MissionPageContent';
import type { WeekThreeManorHelpExperienceProps } from './WeekThreeManorHelpExperience';

describe('formal w3-m1 route', () => {
  beforeEach(() => {
    localStorage.clear();
    let progress = createInitialProgress();
    for (const missionId of [
      'w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5',
      'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5',
    ]) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
  });

  it('loads the manor-help boundary and excludes legacy sequence tools', async () => {
    render(
      <MemoryRouter initialEntries={['/mission/w3-m1']}>
        <ProgressProvider>
          <Routes>
            <Route path="/mission/:id" element={<MissionPageContent reducedMotion onGlobalModalOpenChange={() => undefined} onCompletionPersistenceActiveChange={() => undefined} />} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '庄上求助' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '执行两张口信' })).toBeInTheDocument();
    expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
  });

  it('rebuilds the local lazy route when its first chunk request rejects', async () => {
    const reloadPage = vi.fn();
    const RecoveredExperience = (_props: WeekThreeManorHelpExperienceProps) => <p>本地重试已恢复</p>;
    const loader = vi.fn<() => Promise<{ default: typeof RecoveredExperience }>>()
      .mockRejectedValueOnce(new Error('chunk unavailable'))
      .mockResolvedValueOnce({ default: RecoveredExperience });
    render(
      <WeekThreeManorHelpRouteBoundary
        reducedMotion
        muted
        onComplete={() => undefined}
        loader={loader}
        reloadPage={reloadPage}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('庄上求助条件任务加载失败');
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
    expect(await screen.findByText('本地重试已恢复')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(reloadPage).not.toHaveBeenCalled();
  });
});
