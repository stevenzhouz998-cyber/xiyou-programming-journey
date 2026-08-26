import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../context/ProgressContext';
import { createInitialProgress, serializeProgress } from '../progress/progress';
import { createMissionSession, updateWorkspaceDraft } from '../progress/session';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import { WeekTwoHorseExperience } from './WeekTwoHorseExperience';

const draft = {
  version: 1 as const,
  missionId: 'w2-m1' as const,
  blocks: [
    { id: 'accept', type: 'xiyou_accept_stable_post' as const, nextId: 'repeat', parentBlockId: null, repeatCount: null, x: 0, y: 0 },
    { id: 'repeat', type: 'xiyou_repeat_horse_care' as const, nextId: 'rank', parentBlockId: null, repeatCount: 3, x: 0, y: 50 },
    { id: 'care', type: 'xiyou_care_next_horse' as const, nextId: null, parentBlockId: 'repeat', repeatCount: null, x: 20, y: 70 },
    { id: 'rank', type: 'xiyou_learn_stable_rank' as const, nextId: 'leave', parentBlockId: null, repeatCount: null, x: 0, y: 120 },
    { id: 'leave', type: 'xiyou_leave_heaven' as const, nextId: null, parentBlockId: null, repeatCount: null, x: 0, y: 170 },
  ],
};

describe('WeekTwoHorseExperience', () => {
  beforeEach(() => {
    localStorage.clear();
    const progress = createInitialProgress();
    progress.sessions['w2-m1'] = updateWorkspaceDraft(createMissionSession('w2-m1'), draft, new Date(0).toISOString());
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
  });

  it('persists the real expanded loop before completing after scene playback', async () => {
    const onComplete = vi.fn();
    render(<ProgressProvider><WeekTwoHorseExperience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);

    fireEvent.load(await screen.findByAltText('天宫御马监庭院'));
    fireEvent.load(screen.getByAltText('三匹天马循环照料状态'));
    fireEvent.click(await screen.findByRole('button', { name: '执行弼马温循环' }));

    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m1']).toMatchObject({
      totalRuns: 1,
      lastRun: { completed: true, finalState: 'left-heaven', caredHorses: 3 },
    }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('shows and persists a child-readable failure when the visible loop runs only twice', async () => {
    const onComplete = vi.fn();
    render(<ProgressProvider><WeekTwoHorseExperience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('天宫御马监庭院'));
    fireEvent.load(screen.getByAltText('三匹天马循环照料状态'));

    fireEvent.click(await screen.findByRole('button', { name: '减少循环次数' }));
    await waitFor(() => expect(screen.getByText(/重复照料天马：2 次/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '执行弼马温循环' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('御马监今天有三匹天马');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m1']).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 1,
      lastRun: { completed: false, finalState: 'horses-cared-2', caredHorses: 2 },
    }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('keeps an unsaved successful run hidden until visible retry durably saves and replays it', async () => {
    let calls = 0;
    let failedRun = false;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      calls += 1;
      if (!failedRun && progress.sessions['w2-m1']?.lastRun?.completed === true) {
        failedRun = true;
        return { status: 'unsaved' as const, progress, error: 'synthetic w2 run fault' };
      }
      localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
      return { status: 'saved' as const, revision: calls, progress };
    });
    const onComplete = vi.fn();
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekTwoHorseExperience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('天宫御马监庭院'));
    fireEvent.load(screen.getByAltText('三匹天马循环照料状态'));

    fireEvent.click(await screen.findByRole('button', { name: '执行弼马温循环' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('本次学习记录尚未保存');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m1'].lastRun).toMatchObject({ completed: true, caredHorses: 3 });
  });
});
