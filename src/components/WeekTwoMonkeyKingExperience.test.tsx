import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonkeyKingWorkspaceDraftV1 } from '../blockly/weekTwoMonkeyKingContract';
import { ProgressProvider } from '../context/ProgressContext';
import { createInitialProgress, serializeProgress } from '../progress/progress';
import { createMissionSession, updateWorkspaceDraft } from '../progress/session';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';

async function loadExperience() {
  const modulePath = './WeekTwoMonkeyKingExperience';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

const correctDraft: MonkeyKingWorkspaceDraftV1 = {
  version: 1,
  missionId: 'w2-m2',
  blocks: [
    { id: 'return-hat', type: 'xiyou_on_return_flower_fruit', nextId: null, parentBlockId: null, x: 0, y: 0 },
    { id: 'raise-flag', type: 'xiyou_raise_great_sage_flag', nextId: null, parentBlockId: 'return-hat', x: 20, y: 50 },
    { id: 'title-hat', type: 'xiyou_on_heavenly_title', nextId: null, parentBlockId: null, x: 320, y: 0 },
    { id: 'accept-title', type: 'xiyou_accept_great_sage_title', nextId: 'build-home', parentBlockId: 'title-hat', x: 340, y: 50 },
    { id: 'build-home', type: 'xiyou_build_great_sage_residence', nextId: null, parentBlockId: 'title-hat', x: 340, y: 100 },
  ],
};

function seed(draft: MonkeyKingWorkspaceDraftV1 = correctDraft) {
  const progress = createInitialProgress();
  progress.sessions['w2-m2'] = updateWorkspaceDraft(createMissionSession('w2-m2'), draft, new Date(0).toISOString());
  localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
}

describe('WeekTwoMonkeyKingExperience', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('persists the event trace before completing after scene playback', async () => {
    const module = await loadExperience();
    expect(module).not.toBeNull();
    const onComplete = vi.fn();
    const Experience = module!.WeekTwoMonkeyKingExperience;
    render(<ProgressProvider><Experience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);

    fireEvent.load(await screen.findByAltText('花果山齐天大圣营地'));
    fireEvent.load(screen.getByAltText('齐天大圣事件进度状态'));
    fireEvent.click(await screen.findByRole('button', { name: '派发两个事件' }));

    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m2']).toMatchObject({ totalRuns: 1, lastRun: { completed: true, finalState: 'residence-built' } }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('explains and persists an action connected under the wrong event', async () => {
    const wrong = structuredClone(correctDraft);
    wrong.blocks[1].type = 'xiyou_accept_great_sage_title';
    localStorage.clear();
    seed(wrong);
    const module = await loadExperience();
    expect(module).not.toBeNull();
    const Experience = module!.WeekTwoMonkeyKingExperience;
    render(<ProgressProvider><Experience reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('花果山齐天大圣营地'));
    fireEvent.load(screen.getByAltText('齐天大圣事件进度状态'));
    fireEvent.click(await screen.findByRole('button', { name: '派发两个事件' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('错误的事件帽');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m2']).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastRun: { completed: false, diagnostic: { sourceBlockId: 'raise-flag', concept: 'event-routing' } } }));
  });

  it('keeps an unsaved successful run hidden until visible retry durably saves it', async () => {
    let calls = 0;
    let failedRun = false;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      calls += 1;
      if (!failedRun && progress.sessions['w2-m2']?.lastRun?.completed === true) {
        failedRun = true;
        return { status: 'unsaved' as const, progress, error: 'synthetic w2-m2 run fault' };
      }
      localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
      return { status: 'saved' as const, revision: calls, progress };
    });
    const module = await loadExperience();
    expect(module).not.toBeNull();
    const onComplete = vi.fn();
    const Experience = module!.WeekTwoMonkeyKingExperience;
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><Experience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('花果山齐天大圣营地'));
    fireEvent.load(screen.getByAltText('齐天大圣事件进度状态'));

    fireEvent.click(await screen.findByRole('button', { name: '派发两个事件' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('本次学习记录尚未保存');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m2'].lastRun).toMatchObject({ completed: true, finalState: 'residence-built' });
  });

  it('unlocks the editor after a failed draft is visibly retried and saved', async () => {
    localStorage.clear();
    seed({ version: 1, missionId: 'w2-m2', blocks: [] });
    let failed = false;
    let revision = 0;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      revision += 1;
      if (!failed && progress.sessions['w2-m2']?.workspace.blocks.length === 1) {
        failed = true;
        return { status: 'unsaved' as const, progress, error: 'synthetic draft fault' };
      }
      localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
      return { status: 'saved' as const, revision, progress };
    });
    const module = await loadExperience();
    expect(module).not.toBeNull();
    const Experience = module!.WeekTwoMonkeyKingExperience;
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><Experience reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>);

    fireEvent.click(await screen.findByRole('button', { name: '添加事件帽：返回花果山' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('本次学习记录尚未保存');
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '添加事件帽：天庭正式授号' })).toBeEnabled());
  });
});
